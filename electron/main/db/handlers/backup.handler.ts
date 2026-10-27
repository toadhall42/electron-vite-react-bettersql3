import { BackupService } from "../services/backup.service";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

const dbFilters = [{ name: "SQLite Database", extensions: ["db", "sqlite"] }];

ipcMain.handle("db/backup/export", async (event): Promise<QueryResponse> => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)!;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Export Data",
      defaultPath: BackupService.defaultExportName(),
      filters: dbFilters,
    });
    if (canceled || !filePath) return response.ok({ message: "canceled" });

    await BackupService.exportTo(filePath);
    return response.ok({ data: { filePath } });
  } catch (err: unknown) {
    log.error("[BACKUP HANDLER] backup/export failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/backup/import", async (event): Promise<QueryResponse> => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)!;
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "Import Data",
      properties: ["openFile"],
      filters: dbFilters,
    });
    if (canceled || !filePaths[0]) return response.ok({ message: "canceled" });

    const { response: choice } = await dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["Replace Data", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      message: "Replace all current data?",
      detail:
        "Everything in the app will be replaced with the selected file. A backup of the current data is saved first. The app will restart.",
    });
    if (choice !== 0) return response.ok({ message: "canceled" });

    const { safetyCopy } = await BackupService.importFrom(filePaths[0]);
    log.info(`[BACKUP HANDLER] imported ${filePaths[0]}, previous data saved to ${safetyCopy}`);

    // Let the response reach the renderer, then restart on the new database
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 500);
    return response.ok({ data: { safetyCopy } });
  } catch (err: unknown) {
    log.error("[BACKUP HANDLER] backup/import failed", err);
    return toErrorResponse(err);
  }
});
