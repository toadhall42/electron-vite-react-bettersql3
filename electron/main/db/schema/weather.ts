import { integer, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const weather = sqliteTable("weather", {
  id: integer().primaryKey(),
  sessionId: integer(),
  weatherTempF: real(),
  weatherWindMph: real(),
  weatherPrecipIn: real(),
  weatherPressureInHg: real(),
  weatherCloudCoverPct: real(),
});

export const WeatherModel = createSelectSchema(weather);
export const InsertWeatherModel = createInsertSchema(weather).omit({ id: true });
export const UpdateWeatherModel = createUpdateSchema(weather);

export type Weather = z.infer<typeof WeatherModel>;
export type InsertWeather = z.infer<typeof InsertWeatherModel>;
export type UpdateWeather = z.infer<typeof UpdateWeatherModel>;

export type WeatherWithDetails = Weather & {
  sessionName: string | null;
};
