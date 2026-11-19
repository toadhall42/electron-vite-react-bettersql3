import { asc, eq } from "drizzle-orm";
import { db } from "../db-connect";
import { pickListOptions } from "../schema";
import {
  InsertPickListOptionModel,
  UpdatePickListOptionModel,
  type PickListOption,
} from "../schema/pickListOptions";
import { ValidationError, NotFoundError } from "../../utils/errors";

export class PickListOptionService {
  static getAll(): PickListOption[] {
    return db
      .select()
      .from(pickListOptions)
      .orderBy(asc(pickListOptions.list), asc(pickListOptions.sortOrder), asc(pickListOptions.value))
      .all();
  }

  static delete(id: number) {
    const r = db.delete(pickListOptions).where(eq(pickListOptions.id, id)).run();
    if (r.changes === 0) throw new NotFoundError("Option not found");
  }

  static update(id: number, data: unknown) {
    const parsed = UpdatePickListOptionModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);
    const r = db.update(pickListOptions).set(parsed.data).where(eq(pickListOptions.id, id)).run();
    if (r.changes === 0) throw new NotFoundError("Option not found");
  }

  static insert(data: unknown) {
    const parsed = InsertPickListOptionModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);
    db.insert(pickListOptions).values(parsed.data).run();
  }
}
