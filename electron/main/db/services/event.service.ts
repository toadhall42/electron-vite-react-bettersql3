import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { events, seasons } from "../schema";
import {
  InsertEventModel,
  UpdateEventModel,
  type EventWithDetails,
} from "../schema/events";
import { ValidationError, NotFoundError } from "../../utils/errors";

const withDetails = () =>
  db
    .select({
      id: events.id,
      track: events.track,
      sanction: events.sanction,
      dates: events.dates,
      number: events.number,
      seasonId: events.seasonId,
      pointModel: events.pointModel,
      seasonName: seasons.name,
    })
    .from(events)
    .leftJoin(seasons, eq(events.seasonId, seasons.id));

export class EventService {
  static getAll(): EventWithDetails[] {
    return withDetails().all() as EventWithDetails[];
  }

  static getOne(id: number): EventWithDetails {
    const result = withDetails().where(eq(events.id, id)).get();
    if (!result) throw new NotFoundError("Event not found");
    return result as EventWithDetails;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const result = tx.delete(events).where(eq(events.id, id)).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Event not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateEventModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx
        .update(events)
        .set(parsed.data)
        .where(eq(events.id, id))
        .run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertEventModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const result = tx.insert(events).values(parsed.data).run();
      if (result.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
