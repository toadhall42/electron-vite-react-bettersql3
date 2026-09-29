import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const events = sqliteTable("events", {
  id: integer().primaryKey(),
  track: text().notNull(),
  sanction: text().notNull(),
  dates: text().notNull(),
  number: integer().notNull(),
  seasonId: integer().notNull(),
  pointModel: text().notNull(),
});

export const EventModel = createSelectSchema(events);
export const InsertEventModel = createInsertSchema(events).omit({ id: true });
export const UpdateEventModel = createUpdateSchema(events);

export type Event = z.infer<typeof EventModel>;
export type InsertEvent = z.infer<typeof InsertEventModel>;
export type UpdateEvent = z.infer<typeof UpdateEventModel>;

export type EventWithDetails = Event & {
  seasonName: string | null;
};
