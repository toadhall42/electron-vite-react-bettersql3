import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { results, drivers, events } from "../schema";
import {
  InsertResultModel,
  UpdateResultModel,
  type ResultWithDetails,
} from "../schema/results";
import { ValidationError, NotFoundError } from "../../utils/errors";

const withDetails = () =>
  db
    .select({
      id: results.id,
      driverId: results.driverId,
      carClass: results.carClass,
      eventId: results.eventId,
      sessionId: results.sessionId,
      positionOverall: results.positionOverall,
      positionInClass: results.positionInClass,
      positionsGained: results.positionsGained,
      startingPosition: results.startingPosition,
      hardCharger: results.hardCharger,
      racePoints: results.racePoints,
      bonusPoints: results.bonusPoints,
      mastersPoints: results.mastersPoints,
      totalPoints: results.totalPoints,
      bonusRacePoints: results.bonusRacePoints,
      tireBrand: results.tireBrand,
      classification: results.classification,
      comments: results.comments,
      driverName: drivers.name,
      eventTrack: events.track,
    })
    .from(results)
    .leftJoin(drivers, eq(results.driverId, drivers.id))
    .leftJoin(events, eq(results.eventId, events.id));

export class ResultService {
  static getAll(): ResultWithDetails[] {
    return withDetails().all() as ResultWithDetails[];
  }

  static getOne(id: number): ResultWithDetails {
    const result = withDetails().where(eq(results.id, id)).get();
    if (!result) throw new NotFoundError("Result not found");
    return result as ResultWithDetails;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const r = tx.delete(results).where(eq(results.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Result not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateResultModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.update(results).set(parsed.data).where(eq(results.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertResultModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.insert(results).values(parsed.data).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
