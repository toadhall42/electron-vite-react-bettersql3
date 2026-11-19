import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

// Drop-down lists whose values are managed on the Settings page
export const PICK_LISTS = ["carClass", "tireBrand"] as const;
export type PickList = (typeof PICK_LISTS)[number];

export const pickListOptions = sqliteTable(
  "pick_list_options",
  {
    id: integer().primaryKey(),
    list: text({ enum: PICK_LISTS }).notNull(),
    value: text().notNull(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("pick_list_options_list_value_unique").on(t.list, t.value)],
);

const value = z.string().trim().min(1, "Value is required");

export const PickListOptionModel = createSelectSchema(pickListOptions);
export const InsertPickListOptionModel = createInsertSchema(pickListOptions, { value }).omit({ id: true });
export const UpdatePickListOptionModel = createUpdateSchema(pickListOptions, { value: value.optional() });

export type PickListOption = z.infer<typeof PickListOptionModel>;
export type InsertPickListOption = z.infer<typeof InsertPickListOptionModel>;
export type UpdatePickListOption = z.infer<typeof UpdatePickListOptionModel>;
