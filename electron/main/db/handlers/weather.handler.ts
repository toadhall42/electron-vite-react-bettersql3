import { WeatherService } from "../services/weather.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/weather/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: WeatherService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[WEATHER HANDLER] weather/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/weather/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: WeatherService.getAll() });
  } catch (err: unknown) {
    log.error("[WEATHER HANDLER] weather/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/weather/delete", (_event, { id }): QueryResponse => {
  try {
    WeatherService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[WEATHER HANDLER] weather/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/weather/add", (_event, data): QueryResponse => {
  try {
    WeatherService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[WEATHER HANDLER] weather/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/weather/update", (_event, arg): QueryResponse => {
  try {
    WeatherService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[WEATHER HANDLER] weather/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
