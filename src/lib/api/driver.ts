import type { InsertDriver, Driver, UpdateDriver } from "../../../global.d";

export const getDriver = async (id: number) => {
  return window.api.db<Driver>({
    path: "db/driver/getOne",
    params: { id },
  });
};
export const getAllDrivers = async () => {
  return window.api.db<Driver[]>({
    path: "db/driver/getAll",
    params: {},
  });
};

export const deleteDriver = async (id: number) => {
  return window.api.db({
    path: "db/driver/delete",
    params: { id },
  });
};

export const addDriver = async (data: InsertDriver) => {
  return window.api.db({
    path: "db/driver/add",
    params: data,
  });
};

export const updateDriver = async (id: number, data: UpdateDriver) => {
  return window.api.db({
    path: "db/driver/update",
    params: { id, data },
  });
};
