import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { drivers } from "../schema";
import {
  InsertDriverModel,
  UpdateDriverModel,
  type Driver,
} from "../schema/drivers";
import { ValidationError, NotFoundError } from "../../utils/errors";

export class DriverService {
  static getAll(): Driver[] {
    const result = db.select().from(drivers).all();
    return result;
  }

  static getOne(id: number): Driver | null {
    const result = db.select().from(drivers).where(eq(drivers.id, id)).get();
    if (!result) throw new NotFoundError("Driver not found");

    return result;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const result = tx.delete(drivers).where(eq(drivers.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Driver not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateDriverModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx
        .update(drivers)
        .set(parsed.data)
        .where(eq(drivers.id, id))
        .run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertDriverModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(drivers).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
