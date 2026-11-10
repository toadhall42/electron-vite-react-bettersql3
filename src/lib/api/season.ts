import type { InsertSeason, UpdateSeason, SeasonWithDetails } from "../../../global.d";

export const getSeason = async (id: number) => {
  return window.api.db<SeasonWithDetails>({
    path: "db/season/getOne",
    params: { id },
  });
};

export const getAllSeasons = async () => {
  return window.api.db<SeasonWithDetails[]>({
    path: "db/season/getAll",
    params: {},
  });
};

export const deleteSeason = async (id: number) => {
  return window.api.db({
    path: "db/season/delete",
    params: { id },
  });
};

export const addSeason = async (data: InsertSeason) => {
  return window.api.db({
    path: "db/season/add",
    params: data,
  });
};

export const updateSeason = async (id: number, data: UpdateSeason) => {
  return window.api.db({
    path: "db/season/update",
    params: { id, data },
  });
};
