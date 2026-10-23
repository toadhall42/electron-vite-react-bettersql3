import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db-connect";
import { results, drivers, events, sessions, entrants } from "../schema";
import {
  InsertResultModel,
  UpdateResultModel,
  type Result,
  type ResultWithDetails,
} from "../schema/results";
import type { Session } from "../schema/sessions";
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
      sessionName: sessions.name,
      sessionType: sessions.sessionType,
      sessionDate: sessions.sessionDate,
      sessionStartTime: sessions.sessionStartTime,
    })
    .from(results)
    .leftJoin(drivers, eq(results.driverId, drivers.id))
    .leftJoin(events, eq(results.eventId, events.id))
    // results.sessionId is text holding the session row id
    .leftJoin(sessions, sql`${results.sessionId} = CAST(${sessions.id} AS TEXT)`);

// A session is the set of driver rows sharing event + date + type + name + start time
const sessionKey = (s: Session) => [s.sessionDate, s.sessionStartTime ?? "", s.name].join("|");
const sortKey = (s: Session) => `${s.sessionDate} ${s.sessionStartTime ?? ""}`;

function groupSessions(rows: Session[]): Session[][] {
  const groups = new Map<string, Session[]>();
  for (const r of rows) {
    const k = sessionKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.values()].sort((a, b) => sortKey(a[0]).localeCompare(sortKey(b[0])));
}

const classOf = (s: Session) => (s.carClass ?? "").trim().toUpperCase();

// Points by finishing position (index 0 = 1st). Ported from Track-Notes Results.tsx
const POINTS_CLASSIC = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const POINTS_2026 = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const POINTS_MASTERS = POINTS_2026;
const pointsFor = (table: number[], position: number) => (position > 0 ? table[position - 1] ?? 0 : 0);

const TAG_DQ = "Disqualified: No Points";
const TAG_GREEN = "Green Flag";
const TAG_CHARGER = "Hard Charger";
const TAG_POLE = "Pole Position";
const POINT_TAGS = [TAG_DQ, TAG_GREEN, TAG_CHARGER, TAG_POLE];

// Re-derives the point tags each run while keeping any other comment text
function withTags(comments: string | null, tags: string[]): string {
  const rest = (comments ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c && !POINT_TAGS.some((t) => c.startsWith(t.split(":")[0])));
  return [...tags, ...rest].join(", ");
}

type PointsUpdate = Pick<Result,
  "racePoints" | "bonusPoints" | "totalPoints" | "hardCharger" | "mastersPoints" | "bonusRacePoints" | "comments">;

// Scores one race. Results must belong to a single race session.
function scoreRace(race: Result[], pointModel: string, masterDriverIds: Set<number>): Map<number, Partial<PointsUpdate>> {
  const scored = new Map<number, Partial<PointsUpdate>>();

  if (pointModel.includes("Bonus Race")) {
    const bonusRacePoints = pointModel === "2025 Bonus Race" ? 2 : 5;
    // Bonus race points count toward the driver's total
    for (const r of race) scored.set(r.id, { racePoints: 0, bonusPoints: 0, bonusRacePoints, totalPoints: bonusRacePoints });
    return scored;
  }

  // "15-12-10" is the 2026 table under its point-model name
  const table = pointModel.includes("2026") || pointModel.includes("15-12-10") ? POINTS_2026 : POINTS_CLASSIC;
  // Unplaced (position 0) rows sort last
  const order = [...race].sort((a, b) => (a.positionOverall || Infinity) - (b.positionOverall || Infinity));
  const maxGained = Math.max(...order.map((r) => r.positionsGained));
  const hardChargerId = order.find((r) => r.positionsGained === maxGained)?.id;

  const dqOffsetByClass = new Map<string, number>();
  // DQ/DNS masters never advance this, so no DQ offset is needed (Track-Notes subtracted it twice)
  let mastersPosition = 1;

  for (const r of order) {
    const cls = (r.carClass ?? "").trim().toUpperCase();
    const isDq = r.classification === "DQ";
    const isDns = r.classification === "DNS";
    const tags: string[] = [];
    let racePoints = 0;
    let bonusPoints = 0;
    let mastersPoints = 0;
    let hardCharger = false;

    if (isDq) {
      dqOffsetByClass.set(cls, (dqOffsetByClass.get(cls) ?? 0) + 1);
      tags.push(TAG_DQ);
    } else if (cls && r.positionInClass > 0 && r.classification !== "DNF" && !isDns) {
      racePoints = pointsFor(table, r.positionInClass - (dqOffsetByClass.get(cls) ?? 0));
    }

    if (masterDriverIds.has(r.driverId) && !isDq && !isDns) {
      mastersPoints = pointsFor(POINTS_MASTERS, mastersPosition);
      mastersPosition++;
    }

    if (!isDq && !isDns) {
      bonusPoints = 1;
      tags.push(TAG_GREEN);
      if (r.id === hardChargerId) {
        bonusPoints++;
        hardCharger = true;
        tags.push(TAG_CHARGER);
      }
      if (r.startingPosition === 1) {
        bonusPoints++;
        tags.push(TAG_POLE);
      }
    }

    scored.set(r.id, {
      racePoints,
      bonusPoints,
      totalPoints: racePoints + bonusPoints,
      hardCharger,
      mastersPoints,
      comments: withTags(r.comments, tags),
    });
  }
  return scored;
}

export type CalculateResultsSummary = { races: number; inserted: number; updated: number };

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

  // Builds one Result per driver per Race session of the event, then scores it with the
  // event's point model. Starting position comes from the most recent Qualify session at or
  // before the race. Classification (DQ/DNF/DNS) is kept from the existing Result.
  static calculateForEvent(eventId: number): CalculateResultsSummary {
    const event = db.select().from(events).where(eq(events.id, eventId)).get();
    if (!event) throw new NotFoundError("Event not found");
    const rows = db.select().from(sessions).where(eq(sessions.eventId, eventId)).all() as Session[];
    const races = groupSessions(rows.filter((r) => r.sessionType === "Race"));
    const qualifies = groupSessions(rows.filter((r) => r.sessionType === "Qualify"));
    if (races.length === 0) throw new NotFoundError("No Race sessions found for this event");

    return db.transaction((tx) => {
      const existing = tx.select().from(results).where(eq(results.eventId, eventId)).all();
      const claimed = new Set<number>();
      const summary: CalculateResultsSummary = { races: races.length, inserted: 0, updated: 0 };
      const raceDriverIds = [...new Set(races.flat().map((r) => r.driverId))];
      const masterDriverIds = new Set(
        tx.select({ driverId: entrants.driverid }).from(entrants)
          .where(and(inArray(entrants.driverid, raceDriverIds), eq(entrants.master, 1)))
          .all()
          .map((e) => e.driverId)
      );

      for (const race of races) {
        const raceAt = sortKey(race[0]);
        const qualify = qualifies.filter((q) => sortKey(q[0]) <= raceAt).at(-1);
        const finishers = race.filter((r) => r.position > 0).sort((a, b) => a.position - b.position);
        const raceResultIds: number[] = [];

        for (const row of race) {
          const startingPosition = qualify?.find((q) => q.driverId === row.driverId)?.position ?? 0;
          const positionInClass = row.position > 0
            ? finishers.filter((f) => classOf(f) === classOf(row)).findIndex((f) => f.id === row.id) + 1
            : 0;
          const values = {
            driverId: row.driverId,
            eventId,
            sessionId: String(row.id),
            carClass: row.carClass,
            positionOverall: row.position,
            positionInClass,
            startingPosition,
            positionsGained: startingPosition > 0 && row.position > 0 ? startingPosition - row.position : 0,
          };

          // Prefer a Result already linked to this session row, else an unlinked one for the driver
          const match =
            existing.find((r) => !claimed.has(r.id) && r.driverId === row.driverId && r.sessionId === values.sessionId) ??
            existing.find((r) => !claimed.has(r.id) && r.driverId === row.driverId && !r.sessionId);

          if (match) {
            claimed.add(match.id);
            tx.update(results).set(values).where(eq(results.id, match.id)).run();
            raceResultIds.push(match.id);
            summary.updated++;
          } else {
            const inserted = tx.insert(results).values(values).returning({ id: results.id }).get();
            raceResultIds.push(inserted.id);
            summary.inserted++;
          }
        }

        const raceResults = tx.select().from(results).where(inArray(results.id, raceResultIds)).all() as Result[];
        for (const [id, points] of scoreRace(raceResults, event.pointModel, masterDriverIds)) {
          tx.update(results).set(points).where(eq(results.id, id)).run();
        }
      }
      return summary;
    });
  }
}
