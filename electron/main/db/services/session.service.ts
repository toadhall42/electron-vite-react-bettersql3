import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { sessions, drivers, events } from "../schema";
import {
  InsertSessionModel,
  UpdateSessionModel,
  type SessionWithDetails,
} from "../schema/sessions";
import { ValidationError, NotFoundError } from "../../utils/errors";

const withDetails = () =>
  db
    .select({
      id: sessions.id,
      name: sessions.name,
      eventSequence: sessions.eventSequence,
      seasonRaceNumber: sessions.seasonRaceNumber,
      sessionType: sessions.sessionType,
      sessionDate: sessions.sessionDate,
      sessionStartTime: sessions.sessionStartTime,
      driverId: sessions.driverId,
      eventId: sessions.eventId,
      driverName: drivers.name,
      eventTrack: events.track,
    })
    .from(sessions)
    .leftJoin(drivers, eq(sessions.driverId, drivers.id))
    .leftJoin(events, eq(sessions.eventId, events.id));

export class SessionService {
  static getAll(): SessionWithDetails[] {
    return withDetails().all() as SessionWithDetails[];
  }

  static getOne(id: number): SessionWithDetails {
    const result = withDetails().where(eq(sessions.id, id)).get();
    if (!result) throw new NotFoundError("Session not found");
    return result as SessionWithDetails;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const r = tx.delete(sessions).where(eq(sessions.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Session not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateSessionModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.update(sessions).set(parsed.data).where(eq(sessions.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertSessionModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.insert(sessions).values(parsed.data).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
