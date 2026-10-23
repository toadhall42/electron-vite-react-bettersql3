import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const results = sqliteTable("results", {
  id: integer().primaryKey(),
  driverId: integer().notNull(),
  carClass: text(),
  eventId: integer().notNull(),
  sessionId: text(),
  positionOverall: integer().notNull().default(0),
  positionInClass: integer().notNull().default(0),
  positionsGained: integer().notNull().default(0),
  startingPosition: integer().notNull().default(0),
  hardCharger: integer({ mode: "boolean" }).notNull().default(false),
  racePoints: integer().notNull().default(0),
  bonusPoints: integer().notNull().default(0),
  mastersPoints: integer().notNull().default(0),
  totalPoints: integer().notNull().default(0),
  bonusRacePoints: integer().notNull().default(0),
  tireBrand: text(),
  classification: text(),
  comments: text(),
});

export const ResultModel = createSelectSchema(results);
export const InsertResultModel = createInsertSchema(results).omit({ id: true });
export const UpdateResultModel = createUpdateSchema(results);

export type Result = z.infer<typeof ResultModel>;
export type InsertResult = z.infer<typeof InsertResultModel>;
export type UpdateResult = z.infer<typeof UpdateResultModel>;

export type ResultWithDetails = Result & {
  driverName: string | null;
  eventTrack: string | null;
  sessionName: string | null;
  sessionType: string | null;
  sessionDate: string | null;
  sessionStartTime: string | null;
};
