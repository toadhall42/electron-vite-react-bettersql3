import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const SESSION_TYPES = ["Practice", "Qualify", "Race", "Bonus Race"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

// One row per driver per session. A session itself is identified by
// event + sessionDate + sessionType + name (an event can run several per day).
export const sessions = sqliteTable("sessions", {
  id: integer().primaryKey(),
  name: text().notNull(),
  eventSequence: integer(),
  seasonRaceNumber: integer(),
  sessionType: text({ enum: SESSION_TYPES }).notNull(),
  sessionDate: text().notNull(),
  sessionStartTime: text(),
  driverId: integer().notNull(),
  eventId: integer().notNull(),
  carClass: text(),
  carNumber: text(),
  position: integer().notNull().default(0),
  bestLap: text(),
});

export const SessionModel = createSelectSchema(sessions);
export const InsertSessionModel = createInsertSchema(sessions).omit({ id: true });
export const UpdateSessionModel = createUpdateSchema(sessions);

export type Session = z.infer<typeof SessionModel>;
export type InsertSession = z.infer<typeof InsertSessionModel>;
export type UpdateSession = z.infer<typeof UpdateSessionModel>;

export type SessionWithDetails = Session & {
  driverName: string | null;
  eventTrack: string | null;
};
