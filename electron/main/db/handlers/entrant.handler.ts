import { EntrantService } from "../services/entrant.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/entrant/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: EntrantService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[ENTRANT HANDLER] entrant/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/entrant/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: EntrantService.getAll() });
  } catch (err: unknown) {
    log.error("[ENTRANT HANDLER] entrant/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/entrant/delete", (_event, { id }): QueryResponse => {
  try {
    EntrantService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[ENTRANT HANDLER] entrant/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/entrant/add", (_event, data): QueryResponse => {
  try {
    EntrantService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[ENTRANT HANDLER] entrant/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/entrant/update", (_event, arg): QueryResponse => {
  try {
    EntrantService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[ENTRANT HANDLER] entrant/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
