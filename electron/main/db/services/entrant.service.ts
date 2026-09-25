import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { entrants, drivers, vehicles } from "../schema";
import {
  InsertEntrantModel,
  UpdateEntrantModel,
  type EntrantWithDetails,
} from "../schema/entrants";
import { ValidationError, NotFoundError } from "../../utils/errors";

const withDetails = () =>
  db
    .select({
      id: entrants.id,
      driverid: entrants.driverid,
      vehicleid: entrants.vehicleid,
      number: entrants.number,
      defaulttire: entrants.defaulttire,
      active: entrants.active,
      notes: entrants.notes,
      master: entrants.master,
      driverName: drivers.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
    })
    .from(entrants)
    .leftJoin(drivers, eq(entrants.driverid, drivers.id))
    .leftJoin(vehicles, eq(entrants.vehicleid, vehicles.id));

export class EntrantService {
  static getAll(): EntrantWithDetails[] {
    return withDetails().all() as EntrantWithDetails[];
  }

  static getOne(id: number): EntrantWithDetails | null {
    const result = withDetails().where(eq(entrants.id, id)).get();
    if (!result) throw new NotFoundError("Entrant not found");
    return result as EntrantWithDetails;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const result = tx.delete(entrants).where(eq(entrants.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Entrant not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateEntrantModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx
        .update(entrants)
        .set(parsed.data)
        .where(eq(entrants.id, id))
        .run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertEntrantModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(entrants).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
