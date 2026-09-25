import { VehicleService } from "../services/vehicle.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";

ipcMain.handle("db/vehicle/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: VehicleService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[VEHICLE HANDLER] vehicle/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/vehicle/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: VehicleService.getAll() });
  } catch (err: unknown) {
    log.error("[VEHICLE HANDLER] vehicle/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/vehicle/delete", (_event, { id }): QueryResponse => {
  try {
    VehicleService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[VEHICLE HANDLER] vehicle/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/vehicle/add", (_event, data): QueryResponse => {
  try {
    VehicleService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[VEHICLE HANDLER] vehicle/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/vehicle/update", (_event, arg): QueryResponse => {
  try {
    VehicleService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[VEHICLE HANDLER] vehicle/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
