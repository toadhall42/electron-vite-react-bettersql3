import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const seasons = sqliteTable("seasons", {
  id: integer().primaryKey(),
  name: text().notNull(),
  year: integer().notNull(),
});

export const SeasonModel = createSelectSchema(seasons);
export const InsertSeasonModel = createInsertSchema(seasons).omit({
  id: true,
});
export const UpdateSeasonModel = createUpdateSchema(seasons);

export type Season = z.infer<typeof SeasonModel>;
export type InsertSeason = z.infer<typeof InsertSeasonModel>;
export type UpdateSeason = z.infer<typeof UpdateSeasonModel>;
