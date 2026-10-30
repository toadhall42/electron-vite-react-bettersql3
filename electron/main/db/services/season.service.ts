import { count, eq } from "drizzle-orm";
import { db } from "../db-connect";
import { events, seasons } from "../schema";
import {
  InsertSeasonModel,
  UpdateSeasonModel,
  type Season,
} from "../schema/seasons";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/errors";

export class SeasonService {
  static getAll(): Season[] {
    return db.select().from(seasons).all();
  }

  static getOne(id: number): Season {
    const result = db.select().from(seasons).where(eq(seasons.id, id)).get();
    if (!result) throw new NotFoundError("Season not found");
    return result;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      // Events would be orphaned, so they must be deleted or moved first
      const [{ n }] = tx.select({ n: count() }).from(events).where(eq(events.seasonId, id)).all();
      if (n > 0) {
        throw new ConflictError(`Season has ${n} event${n === 1 ? "" : "s"}; delete or move them first`);
      }
      const result = tx.delete(seasons).where(eq(seasons.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Season not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateSeasonModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx
        .update(seasons)
        .set(parsed.data)
        .where(eq(seasons.id, id))
        .run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertSeasonModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(seasons).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
