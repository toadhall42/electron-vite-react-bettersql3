import { EventService } from "../services/event.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/event/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: EventService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[EVENT HANDLER] event/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/event/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: EventService.getAll() });
  } catch (err: unknown) {
    log.error("[EVENT HANDLER] event/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/event/delete", (_event, { id }): QueryResponse => {
  try {
    EventService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[EVENT HANDLER] event/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/event/add", (_event, data): QueryResponse => {
  try {
    EventService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[EVENT HANDLER] event/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/event/update", (_event, arg): QueryResponse => {
  try {
    EventService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[EVENT HANDLER] event/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
