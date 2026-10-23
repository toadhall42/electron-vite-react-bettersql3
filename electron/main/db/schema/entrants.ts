import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const entrants = sqliteTable("entrants", {
  id: integer().primaryKey(),
  driverid: integer().notNull(),
  vehicleid: integer(),
  number: text().notNull(),
  carclass: text(),
  defaulttire: text().notNull(),
  active: integer().notNull().default(1),
  notes: text(),
  master: integer().notNull().default(0),
});

export const EntrantModel = createSelectSchema(entrants);
export const InsertEntrantModel = createInsertSchema(entrants).omit({
  id: true,
});
export const UpdateEntrantModel = createUpdateSchema(entrants);

export type Entrant = z.infer<typeof EntrantModel>;
export type InsertEntrant = z.infer<typeof InsertEntrantModel>;
export type UpdateEntrant = z.infer<typeof UpdateEntrantModel>;

export type EntrantWithDetails = Entrant & {
  driverName: string | null;
  driverFirstName: string | null;
  driverLastName: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: string | null;
  vehicleClass: string | null;
};
