import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const drivers = sqliteTable("drivers", {
  id: integer().primaryKey(),
  name: text().notNull(),
  firstname: text().notNull(),
  lastname: text().notNull(),
  active: integer( { mode: 'boolean' }).notNull().default(true)
});

export const DriverModel = createSelectSchema(drivers);
export const InsertDriverModel = createInsertSchema(drivers).omit({
  id: true,
});
export const UpdateDriverModel = createUpdateSchema(drivers);

export type Driver = z.infer<typeof DriverModel>;
export type InsertDriver = z.infer<typeof InsertDriverModel>;
export type UpdateDriver = z.infer<typeof UpdateDriverModel>;
