import { ResultService } from "../services/result.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/result/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: ResultService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[RESULT HANDLER] result/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/result/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: ResultService.getAll() });
  } catch (err: unknown) {
    log.error("[RESULT HANDLER] result/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/result/delete", (_event, { id }): QueryResponse => {
  try {
    ResultService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[RESULT HANDLER] result/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/result/add", (_event, data): QueryResponse => {
  try {
    ResultService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[RESULT HANDLER] result/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/result/update", (_event, arg): QueryResponse => {
  try {
    ResultService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[RESULT HANDLER] result/update failed", { arg, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/result/calculateForEvent", (_event, { eventId }): QueryResponse => {
  try {
    return response.ok({ data: ResultService.calculateForEvent(eventId) });
  } catch (err: unknown) {
    log.error("[RESULT HANDLER] result/calculateForEvent failed", { eventId, err });
    return toErrorResponse(err);
  }
});
