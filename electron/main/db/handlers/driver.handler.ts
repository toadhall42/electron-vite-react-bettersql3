import { DriverService } from "../services/driver.service";
import { ipcMain } from "electron";
import log from "../../logger";
import type { QueryResponse } from "../../../../global.d";
import { response, toErrorResponse } from "../../utils/response";
ipcMain.handle("db/driver/getOne", (_event, { id }): QueryResponse => {
  try {
    return response.ok({ data: DriverService.getOne(id) });
  } catch (err: unknown) {
    log.warn("[DRIVER HANDLER] driver/getOne failed", { id, err });
    return toErrorResponse(err);
  }
});
ipcMain.handle("db/driver/getAll", (_event, _arg): QueryResponse => {
  try {
    return response.ok({ data: DriverService.getAll() });
  } catch (err: unknown) {
    log.error("[DRIVER HANDLER] driver/getAll failed", err);
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/driver/delete", (_event, { id }): QueryResponse => {
  try {
    DriverService.delete(id);
    return response.ok();
  } catch (err: unknown) {
    log.error("[DRIVER HANDLER] driver/delete failed", { id, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/driver/add", (_event, data): QueryResponse => {
  try {
    DriverService.insert(data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[DRIVER HANDLER] driver/insert failed", { data, err });
    return toErrorResponse(err);
  }
});

ipcMain.handle("db/driver/update", (_event, arg): QueryResponse => {
  try {
    DriverService.update(arg.id, arg.data);
    return response.ok();
  } catch (err: unknown) {
    log.error("[DRIVER HANDLER] driver/update failed", { arg, err });
    return toErrorResponse(err);
  }
});
