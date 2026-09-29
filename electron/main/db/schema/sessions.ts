import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const sessions = sqliteTable("sessions", {
  id: integer().primaryKey(),
  name: text().notNull(),
  eventSequence: integer(),
  seasonRaceNumber: integer(),
  sessionType: text(),
  sessionDate: text(),
  sessionStartTime: text(),
  driverId: integer(),
  eventId: integer(),
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
