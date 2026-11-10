import type { InsertPointModel, UpdatePointModel, PointModel, PointModelWithUsage } from "../../../global.d";

export const getPointModel = async (id: number) => {
  return window.api.db<PointModel>({
    path: "db/pointModel/getOne",
    params: { id },
  });
};

export const getAllPointModels = async () => {
  return window.api.db<PointModelWithUsage[]>({
    path: "db/pointModel/getAll",
    params: {},
  });
};

export const deletePointModel = async (id: number) => {
  return window.api.db({
    path: "db/pointModel/delete",
    params: { id },
  });
};

export const addPointModel = async (data: InsertPointModel) => {
  return window.api.db({
    path: "db/pointModel/add",
    params: data,
  });
};

export const updatePointModel = async (id: number, data: UpdatePointModel) => {
  return window.api.db({
    path: "db/pointModel/update",
    params: { id, data },
  });
};

export const duplicatePointModel = async (id: number) => {
  return window.api.db({
    path: "db/pointModel/duplicate",
    params: { id },
  });
};
