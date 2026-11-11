import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db-connect";
import { results, drivers, events, sessions, seasons, pointModels } from "../schema";
import {
  InsertResultModel,
  UpdateResultModel,
  type Result,
  type ResultWithDetails,
} from "../schema/results";
import type { Session, SessionType } from "../schema/sessions";
import type { Event } from "../schema/events";
import type { Season } from "../schema/seasons";
import type { PointModel } from "../schema/pointModels";
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

// Positions with disqualified drivers removed: a DQ scores as unplaced (0) and everyone
// who finished behind them moves up one place per DQ
function effectivePositions(group: Session[]): Map<number, number> {
  const dqPositions = group.filter((r) => r.disqualified && r.position > 0).map((r) => r.position);
  return new Map(group.map((r) => [
    r.id,
    r.disqualified || r.position <= 0 ? 0 : r.position - dqPositions.filter((p) => p < r.position).length,
  ]));
}

const pointsFor = (table: number[], position: number) => (position > 0 ? table[position - 1] ?? 0 : 0);

const TAG_DQ = "Disqualified: No Points";
const TAG_GREEN = "Green Flag";
const TAG_CHARGER = "Hard Charger";
const TAG_POLE = "Pole Position";
const TAG_BONUS_RACE = "Bonus Race";
const POINT_TAGS = [TAG_DQ, TAG_GREEN, TAG_CHARGER, TAG_POLE, TAG_BONUS_RACE];

// Re-derives the point tags each run while keeping any other comment text
function withTags(comments: string | null, tags: string[]): string {
  const rest = (comments ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c && !POINT_TAGS.some((t) => c.startsWith(t.split(":")[0])));
  return [...tags, ...rest].join(", ");
}

type PointsUpdate = Pick<Result,
  "racePoints" | "bonusPoints" | "totalPoints" | "hardCharger" | "bonusRacePoints" | "comments">;

// Every non-DQ driver in a Bonus Race session receives the model's bonus race points
function scoreBonusRace(race: Result[], model: PointModel): Map<number, PointsUpdate> {
  const scored = new Map<number, PointsUpdate>();
  for (const r of race) {
    const isDq = r.classification === "DQ";
    const bonusRacePoints = isDq ? 0 : model.bonusRacePoints;
    scored.set(r.id, {
      racePoints: 0,
      bonusPoints: 0,
      hardCharger: false,
      bonusRacePoints,
      // Bonus race points count toward the driver's total
      totalPoints: bonusRacePoints,
      comments: withTags(r.comments, isDq ? [TAG_DQ] : bonusRacePoints > 0 ? [TAG_BONUS_RACE] : []),
    });
  }
  return scored;
}

// Scores one Race session. Results must belong to a single race session.
function scoreRace(race: Result[], model: PointModel): Map<number, PointsUpdate> {
  const scored = new Map<number, PointsUpdate>();

  // Unplaced (position 0) rows sort last
  const order = [...race].sort((a, b) => (a.positionOverall || Infinity) - (b.positionOverall || Infinity));
  const eligible = order.filter((r) => r.classification !== "DQ" && r.classification !== "DNS");
  // Most positions gained; nobody earns it if no one gained a place. Ties go to the higher finisher.
  const maxGained = Math.max(0, ...eligible.map((r) => r.positionsGained));
  const hardChargerId = maxGained > 0 ? eligible.find((r) => r.positionsGained === maxGained)?.id : undefined;

  // A DQ moves everyone behind them up one place (per class, or overall)
  const dqOffset = new Map<string, number>();

  for (const r of order) {
    const cls = (r.carClass ?? "").trim().toUpperCase();
    const bucket = model.positionBasis === "overall" ? "" : cls;
    const position = model.positionBasis === "overall" ? r.positionOverall : r.positionInClass;
    const isDq = r.classification === "DQ";
    const isDns = r.classification === "DNS";
    const tags: string[] = [];
    let racePoints = 0;
    let bonusPoints = 0;
    const hardCharger = r.id === hardChargerId;

    if (isDq) {
      dqOffset.set(bucket, (dqOffset.get(bucket) ?? 0) + 1);
      tags.push(TAG_DQ);
    } else if ((model.positionBasis === "overall" || cls) && position > 0 && r.classification !== "DNF" && !isDns) {
      racePoints = pointsFor(model.positionPoints, position - (dqOffset.get(bucket) ?? 0));
    }

    if (!isDq && !isDns) {
      const award = (points: number, tag: string) => {
        if (points <= 0) return;
        bonusPoints += points;
        tags.push(tag);
      };
      award(model.greenFlagPoints, TAG_GREEN);
      if (hardCharger) award(model.hardChargerPoints, TAG_CHARGER);
      if (r.startingPosition === 1) award(model.polePositionPoints, TAG_POLE);
    }

    scored.set(r.id, {
      racePoints,
      bonusPoints,
      bonusRacePoints: 0,
      totalPoints: racePoints + bonusPoints,
      hardCharger,
      comments: withTags(r.comments, tags),
    });
  }
  return scored;
}

export type CalculateResultsSummary = { events: number; races: number; inserted: number; updated: number };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The event's own point model, else its season's
function pointModelFor(tx: Tx, event: Event, season: Season | undefined): PointModel {
  const id = event.pointModelId ?? season?.pointModelId;
  if (id == null) {
    throw new NotFoundError(`No point model for event #${event.number} ${event.track}; assign one to ${season?.name ?? "its season"}`);
  }
  const model = tx.select().from(pointModels).where(eq(pointModels.id, id)).get();
  if (!model) throw new NotFoundError(`Point model ${id} not found`);
  return model;
}

const SCORED_TYPES: SessionType[] = ["Race", "Bonus Race"];

const sessionNumber = (name: string) => name.match(/#\s*(\d+)/)?.[1];

// The grid for a race: every Qualify row whose number matches the race's ("Race #5" ↔ "Qualify #5"),
// merged so a row with a mistyped start time still lands on the same grid. Falls back to the most
// recent Qualify session at or before the race.
function qualifyFor(race: Session[], qualifyRows: Session[], qualifies: Session[][]): Session[] | undefined {
  // Bonus Race numbers run separately from Race numbers, so only Races match by number
  const num = race[0].sessionType === "Race" ? sessionNumber(race[0].name) : undefined;
  const byNumber = num ? qualifyRows.filter((q) => sessionNumber(q.name) === num) : [];
  if (byNumber.length > 0) return byNumber;
  const raceAt = sortKey(race[0]);
  return qualifies.filter((q) => sortKey(q[0]) <= raceAt).at(-1);
}

// Builds one Result per driver per Race / Bonus Race session of the event, then scores it with the
// event's point model. Starting position comes from the matching Qualify session (see qualifyFor). DQ comes from the session row; DNF/DNS are kept from the existing Result.
function calculateEvent(tx: Tx, event: Event): CalculateResultsSummary {
  const season = tx.select().from(seasons).where(eq(seasons.id, event.seasonId)).get();
  if (!season) throw new NotFoundError(`Event #${event.number} ${event.track} has no season`);
  const model = pointModelFor(tx, event, season);
  const rows = tx.select().from(sessions).where(eq(sessions.eventId, event.id)).all() as Session[];
  const races = SCORED_TYPES.flatMap((type) =>
    groupSessions(rows.filter((r) => r.sessionType === type)).map((group) => ({ type, group })));
  const qualifyRows = rows.filter((r) => r.sessionType === "Qualify");
  const qualifies = groupSessions(qualifyRows);

  const existing = tx.select().from(results).where(eq(results.eventId, event.id)).all();
  const claimed = new Set<number>();
  const summary: CalculateResultsSummary = { events: 1, races: races.length, inserted: 0, updated: 0 };

  for (const { type, group: race } of races) {
    const qualify = qualifyFor(race, qualifyRows, qualifies);
    const finish = effectivePositions(race);
    const grid = qualify ? effectivePositions(qualify) : new Map<number, number>();
    const pos = (r: Session) => finish.get(r.id) ?? 0;
    const finishers = race.filter((r) => pos(r) > 0).sort((a, b) => pos(a) - pos(b));
    const raceResultIds: number[] = [];

    for (const row of race) {
      const qualifyRow = qualify?.find((q) => q.driverId === row.driverId);
      const startingPosition = qualifyRow ? grid.get(qualifyRow.id) ?? 0 : 0;
      const positionOverall = pos(row);
      const positionInClass = positionOverall > 0
        ? finishers.filter((f) => classOf(f) === classOf(row)).findIndex((f) => f.id === row.id) + 1
        : 0;
      const values = {
        driverId: row.driverId,
        eventId: event.id,
        sessionId: String(row.id),
        carClass: row.carClass,
        positionOverall,
        positionInClass,
        startingPosition,
        positionsGained: startingPosition > 0 && positionOverall > 0 ? startingPosition - positionOverall : 0,
      };

      // Prefer a Result already linked to this session row, else an unlinked one for the driver
      const match =
        existing.find((r) => !claimed.has(r.id) && r.driverId === row.driverId && r.sessionId === values.sessionId) ??
        existing.find((r) => !claimed.has(r.id) && r.driverId === row.driverId && !r.sessionId);

      // The session row decides DQ; any other classification stays as entered on the Result
      const kept = match?.classification === "DQ" ? null : match?.classification ?? null;
      const classification = row.disqualified ? "DQ" : kept;

      if (match) {
        claimed.add(match.id);
        tx.update(results).set({ ...values, classification }).where(eq(results.id, match.id)).run();
        raceResultIds.push(match.id);
        summary.updated++;
      } else {
        const inserted = tx.insert(results).values({ ...values, classification }).returning({ id: results.id }).get();
        raceResultIds.push(inserted.id);
        summary.inserted++;
      }
    }

    const raceResults = tx.select().from(results).where(inArray(results.id, raceResultIds)).all() as Result[];
    const scored = type === "Bonus Race" ? scoreBonusRace(raceResults, model) : scoreRace(raceResults, model);
    for (const [id, points] of scored) {
      tx.update(results).set(points).where(eq(results.id, id)).run();
    }
  }
  return summary;
}

const hasScoredSessions = (tx: Tx, eventId: number) =>
  tx.select({ id: sessions.id }).from(sessions)
    .where(and(eq(sessions.eventId, eventId), inArray(sessions.sessionType, SCORED_TYPES)))
    .limit(1).get() != null;

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

  static calculateForEvent(eventId: number): CalculateResultsSummary {
    return db.transaction((tx) => {
      const event = tx.select().from(events).where(eq(events.id, eventId)).get();
      if (!event) throw new NotFoundError("Event not found");
      if (!hasScoredSessions(tx, eventId)) throw new NotFoundError("No Race or Bonus Race sessions found for this event");
      return calculateEvent(tx, event);
    });
  }

  // Recalculates every event in the season that has Race / Bonus Race sessions,
  // e.g. after the season's point model changes
  static calculateForSeason(seasonId: number): CalculateResultsSummary {
    return db.transaction((tx) => {
      const seasonEvents = tx.select().from(events).where(eq(events.seasonId, seasonId)).all()
        .filter((e) => hasScoredSessions(tx, e.id));
      if (seasonEvents.length === 0) throw new NotFoundError("No Race or Bonus Race sessions found for this season");
      const summary: CalculateResultsSummary = { events: 0, races: 0, inserted: 0, updated: 0 };
      for (const event of seasonEvents) {
        const s = calculateEvent(tx, event);
        summary.events += s.events;
        summary.races += s.races;
        summary.inserted += s.inserted;
        summary.updated += s.updated;
      }
      return summary;
    });
  }
}
