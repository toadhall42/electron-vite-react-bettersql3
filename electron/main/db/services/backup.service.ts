import Database from "better-sqlite3";
import { copyFileSync, existsSync, readFileSync, rmSync } from "fs";
import path from "path";
import { migrationsDir, sqlite } from "../db-connect";
import { getDbPath } from "../../utils";
import { BackupError } from "../../utils/errors";

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

// Latest migration timestamp this build of the app knows about
const latestMigrationWhen = (): number => {
  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8"),
  ) as { entries: { when: number }[] };
  return Math.max(...journal.entries.map((e) => e.when));
};

// Throws BackupError if the file is not a usable database for this app
const validateImportFile = (filePath: string) => {
  let candidate: Database.Database;
  try {
    candidate = new Database(filePath, { readonly: true, fileMustExist: true });
  } catch {
    throw new BackupError("Could not open the selected file");
  }

  try {
    const integrity = candidate.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      throw new BackupError("The selected database is corrupt");
    }

    const hasMigrations = candidate
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
      )
      .get();
    if (!hasMigrations) {
      throw new BackupError("The selected file is not a database from this app");
    }

    const { lastApplied } = candidate
      .prepare("SELECT MAX(created_at) AS lastApplied FROM __drizzle_migrations")
      .get() as { lastApplied: number | null };
    if ((lastApplied ?? 0) > latestMigrationWhen()) {
      throw new BackupError(
        "The selected database was made by a newer version of the app — update first",
      );
    }
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError("The selected file is not a valid SQLite database");
  } finally {
    candidate.close();
  }
};

export const BackupService = {
  defaultExportName: () => `track-notes-${timestamp()}.db`,

  // Online backup: safe while the app is reading/writing
  exportTo: async (destPath: string) => {
    await sqlite.backup(destPath);
  },

  // Replaces the live database with the file at srcPath. The connection is
  // closed afterwards, so the caller must relaunch the app.
  importFrom: async (srcPath: string) => {
    validateImportFile(srcPath);

    const dbPath = getDbPath();
    const safetyCopy = `${dbPath}.before-import-${timestamp()}.bak`;
    await sqlite.backup(safetyCopy);

    sqlite.close();
    for (const suffix of ["-journal", "-wal", "-shm"]) {
      if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix);
    }
    copyFileSync(srcPath, dbPath);

    return { safetyCopy };
  },
};
