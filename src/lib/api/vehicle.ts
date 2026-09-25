import type { InsertVehicle, Vehicle, UpdateVehicle } from "../../../global.d";

export const getVehicle = async (id: number) => {
  return window.api.db<Vehicle>({
    path: "db/vehicle/getOne",
    params: { id },
  });
};

export const getAllVehicles = async () => {
  return window.api.db<Vehicle[]>({
    path: "db/vehicle/getAll",
    params: {},
  });
};

export const deleteVehicle = async (id: number) => {
  return window.api.db({
    path: "db/vehicle/delete",
    params: { id },
  });
};

export const addVehicle = async (data: InsertVehicle) => {
  return window.api.db({
    path: "db/vehicle/add",
    params: data,
  });
};

export const updateVehicle = async (id: number, data: UpdateVehicle) => {
  return window.api.db({
    path: "db/vehicle/update",
    params: { id, data },
  });
};
