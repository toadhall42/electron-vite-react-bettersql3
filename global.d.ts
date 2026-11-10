export {};

export type {
  Driver,
  InsertDriver,
  UpdateDriver,
} from "./electron/main/db/schema/drivers";

export type {
  Vehicle,
  InsertVehicle,
  UpdateVehicle,
} from "./electron/main/db/schema/vehicles";

export type {
  Entrant,
  InsertEntrant,
  UpdateEntrant,
  EntrantWithDetails,
} from "./electron/main/db/schema/entrants";

export type {
  Season,
  InsertSeason,
  UpdateSeason,
  SeasonWithDetails,
} from "./electron/main/db/schema/seasons";

export type {
  PointModel,
  InsertPointModel,
  UpdatePointModel,
  PointModelWithUsage,
  PositionBasis,
} from "./electron/main/db/schema/pointModels";

export type {
  Event,
  InsertEvent,
  UpdateEvent,
  EventWithDetails,
} from "./electron/main/db/schema/events";

export type {
  Result,
  InsertResult,
  UpdateResult,
  ResultWithDetails,
} from "./electron/main/db/schema/results";

export type {
  Session,
  InsertSession,
  UpdateSession,
  SessionWithDetails,
} from "./electron/main/db/schema/sessions";

export type {
  Weather,
  InsertWeather,
  UpdateWeather,
  WeatherWithDetails,
} from "./electron/main/db/schema/weather";

export type QueryResponse<T = unknown> = {
  code: number;
  message: string;
  data: T | null;
};
export interface QueryOptions {
  path: string;
  params?: Record<string, any>;
  timeout?: number;
}

interface AppUpdate {
  onUpdateMsg: (callback: (data: { code: number; data?: any }) => void) => void;
  setUrl: (url: string) => void;
  checkUpdate: () => void;
  startDownload: () => void;
  quitAndInstall: () => void;
}

interface Logger {
  warn: (msg: string) => Promise<void>;
  error: (msg: string) => Promise<void>;
  info: (msg: string) => Promise<void>;
  verbose: (msg: string) => Promise<void>;
  debug: (msg: string) => Promise<void>;
  silly: (msg: string) => Promise<void>;
}
declare global {
  interface Window {
    api: {
      db: <T = unknown>(options: QueryOptions) => Promise<QueryResponse<T>>;
      env: "development" | "production";
      update: AppUpdate;
      logger: Logger;
      createWindow: () => Promise<string>;
    };
  }
}
