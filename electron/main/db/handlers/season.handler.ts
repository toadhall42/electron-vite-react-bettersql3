import { SeasonService } from "../services/season.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/season/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: SeasonService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[SEASON HANDLER] season/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/season/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: SeasonService.getAll() });
  } catch (err: unknown) {
    log.error("[SEASON HANDLER] season/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/season/delete", (_event, { id }): QueryResponse => {
  try {
    SeasonService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SEASON HANDLER] season/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/season/add", (_event, data): QueryResponse => {
  try {
    SeasonService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SEASON HANDLER] season/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/season/update", (_event, arg): QueryResponse => {
  try {
    SeasonService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SEASON HANDLER] season/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
