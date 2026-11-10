import { count, eq } from "drizzle-orm";
import { db } from "../db-connect";
import { events, pointModels, seasons } from "../schema";
import {
  InsertPointModelModel,
  UpdatePointModelModel,
  type PointModel,
  type PointModelWithUsage,
} from "../schema/pointModels";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/errors";

export class PointModelService {
  static getAll(): PointModelWithUsage[] {
    const seasonCounts = new Map(
      db.select({ id: seasons.pointModelId, n: count() }).from(seasons).groupBy(seasons.pointModelId).all()
        .map((r) => [r.id, r.n])
    );
    const eventCounts = new Map(
      db.select({ id: events.pointModelId, n: count() }).from(events).groupBy(events.pointModelId).all()
        .map((r) => [r.id, r.n])
    );
    return db.select().from(pointModels).all().map((m) => ({
      ...m,
      seasonCount: seasonCounts.get(m.id) ?? 0,
      eventCount: eventCounts.get(m.id) ?? 0,
    }));
  }

  static getOne(id: number): PointModel {
    const result = db.select().from(pointModels).where(eq(pointModels.id, id)).get();
    if (!result) throw new NotFoundError("Point model not found");
    return result;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const [{ s }] = tx.select({ s: count() }).from(seasons).where(eq(seasons.pointModelId, id)).all();
      const [{ e }] = tx.select({ e: count() }).from(events).where(eq(events.pointModelId, id)).all();
      if (s + e > 0) {
        const uses = [s && `${s} season${s === 1 ? "" : "s"}`, e && `${e} event${e === 1 ? "" : "s"}`].filter(Boolean);
        throw new ConflictError(`Point model is used by ${uses.join(" and ")}; reassign them first`);
      }
      const result = tx.delete(pointModels).where(eq(pointModels.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Point model not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdatePointModelModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.update(pointModels).set(parsed.data).where(eq(pointModels.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertPointModelModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(pointModels).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }

  // Copies a model so next season's scheme can start from this one
  static duplicate(id: number) {
    const { id: _id, ...model } = PointModelService.getOne(id);
    return PointModelService.insert({ ...model, name: `${model.name} (copy)` });
  }
}
