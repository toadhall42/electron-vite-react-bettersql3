import { PointModelService } from "../services/pointModel.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/pointModel/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: PointModelService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[POINT MODEL HANDLER] pointModel/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pointModel/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: PointModelService.getAll() });
  } catch (err: unknown) {
    log.error("[POINT MODEL HANDLER] pointModel/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pointModel/delete", (_event, { id }): QueryResponse => {
  try {
    PointModelService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[POINT MODEL HANDLER] pointModel/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pointModel/add", (_event, data): QueryResponse => {
  try {
    PointModelService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[POINT MODEL HANDLER] pointModel/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pointModel/update", (_event, arg): QueryResponse => {
  try {
    PointModelService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[POINT MODEL HANDLER] pointModel/update failed", { arg, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/pointModel/duplicate", (_event, { id }): QueryResponse => {
  try {
    PointModelService.duplicate(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[POINT MODEL HANDLER] pointModel/duplicate failed", { id, err });
    return toErrorResponse(err);
  }
});
