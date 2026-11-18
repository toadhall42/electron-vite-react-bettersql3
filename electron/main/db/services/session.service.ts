import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db-connect";
import { sessions, drivers, events, results } from "../schema";
import {
  InsertSessionModel,
  UpdateSessionModel,
  type Session,
  type SessionWithDetails,
} from "../schema/sessions";
import { z } from "zod";
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
      carClass: sessions.carClass,
      carNumber: sessions.carNumber,
      position: sessions.position,
      classification: sessions.classification,
      bestLap: sessions.bestLap,
      driverName: drivers.name,
      eventTrack: events.track,
    })
    .from(sessions)
    .leftJoin(drivers, eq(sessions.driverId, drivers.id))
    .leftJoin(events, eq(sessions.eventId, events.id));

// Identifies a session group: the driver rows sharing event + type + name + date + start time
export type SessionGroupKey = Pick<
  Session,
  "eventId" | "sessionType" | "name" | "sessionDate" | "sessionStartTime"
>;

// Only the fields shared by every driver row of a session can be edited as a group
const GroupUpdateModel = UpdateSessionModel.pick({
  name: true,
  sessionType: true,
  sessionDate: true,
  sessionStartTime: true,
  eventSequence: true,
  seasonRaceNumber: true,
});

const matchGroup = (k: SessionGroupKey) =>
  and(
    eq(sessions.eventId, k.eventId),
    eq(sessions.sessionType, k.sessionType),
    eq(sessions.name, k.name),
    eq(sessions.sessionDate, k.sessionDate),
    k.sessionStartTime == null
      ? isNull(sessions.sessionStartTime)
      : eq(sessions.sessionStartTime, k.sessionStartTime)
  );

const PositionModel = z.number().int().min(0);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Places one row at a finishing position within its session and renumbers every placed row 1..N
// in order, so positions never repeat or leave gaps. Rows already sharing a position keep their
// id order. Position 0 takes the row out of the order (unplaced).
function placeInSession(tx: Tx, id: number, position: number) {
  const row = tx.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) throw new NotFoundError("Session not found");
  const placed = tx.select().from(sessions).where(matchGroup(row)).all()
    .filter((r) => r.id !== id && r.position > 0)
    .sort((a, b) => a.position - b.position || a.id - b.id);
  if (position > 0) placed.splice(Math.min(position, placed.length + 1) - 1, 0, row);
  else if (row.position !== 0) tx.update(sessions).set({ position: 0 }).where(eq(sessions.id, id)).run();
  placed.forEach((r, i) => {
    if (r.position !== i + 1 || r.id === id) {
      tx.update(sessions).set({ position: i + 1 }).where(eq(sessions.id, r.id)).run();
    }
  });
}

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
      // The driver's Result for this session row goes with it, so it stops counting toward points
      tx.delete(results).where(eq(results.sessionId, String(id))).run();
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
      return Number(r.lastInsertRowid);
    });
  }

  static updateGroup(key: SessionGroupKey, data: unknown) {
    const parsed = GroupUpdateModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.update(sessions).set(parsed.data).where(matchGroup(key)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Session not found");
      }
    });
  }

  // Moves a driver to a finishing position, shifting the rest of the session to make room
  static setPosition(id: number, position: unknown) {
    const parsed = PositionModel.safeParse(position);
    if (!parsed.success) throw new ValidationError(parsed.error);
    db.transaction((tx) => placeInSession(tx, id, parsed.data));
  }
}
