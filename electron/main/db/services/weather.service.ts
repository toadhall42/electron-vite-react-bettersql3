import { eq } from "drizzle-orm";
import { db } from "../db-connect";
import { weather, sessions } from "../schema";
import {
  InsertWeatherModel,
  UpdateWeatherModel,
  type WeatherWithDetails,
} from "../schema/weather";
import { ValidationError, NotFoundError } from "../../utils/errors";

const withDetails = () =>
  db
    .select({
      id: weather.id,
      sessionId: weather.sessionId,
      weatherTempF: weather.weatherTempF,
      weatherWindMph: weather.weatherWindMph,
      weatherPrecipIn: weather.weatherPrecipIn,
      weatherPressureInHg: weather.weatherPressureInHg,
      weatherCloudCoverPct: weather.weatherCloudCoverPct,
      sessionName: sessions.name,
    })
    .from(weather)
    .leftJoin(sessions, eq(weather.sessionId, sessions.id));

export class WeatherService {
  static getAll(): WeatherWithDetails[] {
    return withDetails().all() as WeatherWithDetails[];
  }

  static getOne(id: number): WeatherWithDetails {
    const result = withDetails().where(eq(weather.id, id)).get();
    if (!result) throw new NotFoundError("Weather not found");
    return result as WeatherWithDetails;
  }

  static delete(id: number) {
    return db.transaction((tx) => {
      const r = tx.delete(weather).where(eq(weather.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new NotFoundError("Weather not found");
      }
    });
  }

  static update(id: number, data: unknown) {
    const parsed = UpdateWeatherModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.update(weather).set(parsed.data).where(eq(weather.id, id)).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("update failed");
      }
    });
  }

  static insert(data: unknown) {
    const parsed = InsertWeatherModel.safeParse(data);
    if (!parsed.success) throw new ValidationError(parsed.error);

    return db.transaction((tx) => {
      const r = tx.insert(weather).values(parsed.data).run();
      if (r.changes === 0) {
        tx.rollback();
        throw new Error("insert failed");
      }
    });
  }
}
