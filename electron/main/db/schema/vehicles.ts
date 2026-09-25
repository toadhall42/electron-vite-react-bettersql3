import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const vehicles = sqliteTable("vehicles", {
  id: integer().primaryKey(),
  make: text().notNull(),
  model: text().notNull(),
  year: text().notNull(),
  class: text().notNull(),
  transponder: text(),
  chassisid: text(),
});

export const VehicleModel = createSelectSchema(vehicles);
export const InsertVehicleModel = createInsertSchema(vehicles).omit({
  id: true,
});
export const UpdateVehicleModel = createUpdateSchema(vehicles);

export type Vehicle = z.infer<typeof VehicleModel>;
export type InsertVehicle = z.infer<typeof InsertVehicleModel>;
export type UpdateVehicle = z.infer<typeof UpdateVehicleModel>;
