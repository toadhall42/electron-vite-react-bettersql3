import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

// Finishing-position points can be awarded on class position or overall position
export const POSITION_BASES = ["class", "overall"] as const;
export type PositionBasis = (typeof POSITION_BASES)[number];

// A scoring scheme, normally assigned to a whole season (events may override it).
// positionPoints is a JSON array of points by position (index 0 = 1st).
export const pointModels = sqliteTable("point_models", {
  id: integer().primaryKey(),
  name: text().notNull(),
  description: text(),
  positionBasis: text({ enum: POSITION_BASES }).notNull().default("class"),
  positionPoints: text({ mode: "json" }).$type<number[]>().notNull().default([]),
  // Every driver in a Bonus Race session receives this
  bonusRacePoints: integer().notNull().default(0),
  // Circumstance bonuses for Race sessions
  greenFlagPoints: integer().notNull().default(0),
  polePositionPoints: integer().notNull().default(0),
  hardChargerPoints: integer().notNull().default(0),
});

const pointsTable = z.array(z.number().int().min(0));
const name = z.string().trim().min(1, "Name is required");

export const PointModelModel = createSelectSchema(pointModels, {
  positionPoints: pointsTable,
});
export const InsertPointModelModel = createInsertSchema(pointModels, {
  name,
  positionPoints: pointsTable,
}).omit({ id: true });
export const UpdatePointModelModel = createUpdateSchema(pointModels, {
  name,
  positionPoints: pointsTable,
});

export type PointModel = z.infer<typeof PointModelModel>;
export type InsertPointModel = z.infer<typeof InsertPointModelModel>;
export type UpdatePointModel = z.infer<typeof UpdatePointModelModel>;

export type PointModelWithUsage = PointModel & {
  seasonCount: number;
  eventCount: number;
};
