import { PickListOptionService } from "../services/pickListOption.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/pickListOption/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: PickListOptionService.getAll() });
  } catch (err: unknown) {
    log.error("[PICK LIST HANDLER] pickListOption/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pickListOption/delete", (_event, { id }): QueryResponse => {
  try {
    PickListOptionService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[PICK LIST HANDLER] pickListOption/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pickListOption/add", (_event, data): QueryResponse => {
  try {
    PickListOptionService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[PICK LIST HANDLER] pickListOption/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pickListOption/update", (_event, arg): QueryResponse => {
  try {
    PickListOptionService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[PICK LIST HANDLER] pickListOption/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
