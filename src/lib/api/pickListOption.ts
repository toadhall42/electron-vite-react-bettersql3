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

export type PickLists = { carClass: string[]; tireBrand: string[] };

export const EMPTY_PICK_LISTS: PickLists = { carClass: [], tireBrand: [] };

// Pick-list values grouped by list, in their Settings order
export const getPickLists = async (): Promise<PickLists> => {
  const res = await getAllPickListOptions();
  const picks = (res?.data as PickListOption[]) ?? [];
  return {
    carClass: picks.filter((o) => o.list === "carClass").map((o) => o.value),
    tireBrand: picks.filter((o) => o.list === "tireBrand").map((o) => o.value),
  };
};
