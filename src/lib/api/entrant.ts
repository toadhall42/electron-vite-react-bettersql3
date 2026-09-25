import type {
  InsertEntrant,
  UpdateEntrant,
  EntrantWithDetails,
} from "../../../global.d";

export const getEntrant = async (id: number) => {
  return window.api.db<EntrantWithDetails>({
    path: "db/entrant/getOne",
    params: { id },
  });
};

export const getAllEntrants = async () => {
  return window.api.db<EntrantWithDetails[]>({
    path: "db/entrant/getAll",
    params: {},
  });
};

export const deleteEntrant = async (id: number) => {
  return window.api.db({
    path: "db/entrant/delete",
    params: { id },
  });
};

export const addEntrant = async (data: InsertEntrant) => {
  return window.api.db({
    path: "db/entrant/add",
    params: data,
  });
};

export const updateEntrant = async (id: number, data: UpdateEntrant) => {
  return window.api.db({
    path: "db/entrant/update",
    params: { id, data },
  });
};
