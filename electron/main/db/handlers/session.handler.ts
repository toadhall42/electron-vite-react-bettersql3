import { SessionService } from "../services/session.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/session/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: SessionService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[SESSION HANDLER] session/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/session/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: SessionService.getAll() });
  } catch (err: unknown) {
    log.error("[SESSION HANDLER] session/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/session/delete", (_event, { id }): QueryResponse => {
  try {
    SessionService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SESSION HANDLER] session/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/session/add", (_event, data): QueryResponse => {
  try {
    SessionService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SESSION HANDLER] session/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/session/update", (_event, arg): QueryResponse => {
  try {
    SessionService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[SESSION HANDLER] session/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
