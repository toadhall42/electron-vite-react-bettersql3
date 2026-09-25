import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { vehicles } from "../schema";
import {
  InsertVehicleModel,
  UpdateVehicleModel,
  type Vehicle,
} from "../schema/vehicles";
import { ValidationError, NotFoundError } from "../../utils/errors";

export class VehicleService {
  static getAll(): Vehicle[] {
    return db.select().from(vehicles).all();
  }

  static getOne(id: number): Vehicle | null {
    const result = db.select().from(vehicles).where(eq(vehicles.id, id)).get();
    if (!result) throw new NotFoundError("Vehicle not found");
    return result;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const result = tx.delete(vehicles).where(eq(vehicles.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Vehicle not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateVehicleModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx
        .update(vehicles)
        .set(parsed.data)
        .where(eq(vehicles.id, id))
        .run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertVehicleModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(vehicles).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
