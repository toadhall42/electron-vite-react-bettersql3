import { query } from "./modules/db";
import { update } from "./modules/update";
import { logger } from "./modules/logger";
import { contextBridge } from "electron";
import { createWindow } from "./modules/window-pool";
contextBridge.exposeInMainWorld("api", {
  db: query,
  update,
  logger,
  createWindow,
});
