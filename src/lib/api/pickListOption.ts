import type { InsertPickListOption, UpdatePickListOption, PickListOption } from "../../../global.d";

export const getAllPickListOptions = async () => {
  return window.api.db<PickListOption[]>({
    path: "db/pickListOption/getAll",
    params: {},
  });
};

export const deletePickListOption = async (id: number) => {
  return window.api.db({
    path: "db/pickListOption/delete",
    params: { id },
  });
};

export const addPickListOption = async (data: InsertPickListOption) => {
  return window.api.db({
    path: "db/pickListOption/add",
    params: data,
  });
};

export const updatePickListOption = async (id: number, data: UpdatePickListOption) => {
  return window.api.db({
    path: "db/pickListOption/update",
    params: { id, data },
  });
};
