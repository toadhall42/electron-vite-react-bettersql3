import type { InsertResult, UpdateResult, ResultWithDetails } from "../../../global.d";

export const getResult = async (id: number) => {
  return window.api.db<ResultWithDetails>({
    path: "db/result/getOne",
    params: { id },
  });
};

export const getAllResults = async () => {
  return window.api.db<ResultWithDetails[]>({
    path: "db/result/getAll",
    params: {},
  });
};

export const deleteResult = async (id: number) => {
  return window.api.db({
    path: "db/result/delete",
    params: { id },
  });
};

export const addResult = async (data: InsertResult) => {
  return window.api.db({
    path: "db/result/add",
    params: data,
  });
};

export const updateResult = async (id: number, data: UpdateResult) => {
  return window.api.db({
    path: "db/result/update",
    params: { id, data },
  });
};

export const calculateResultsForEvent = async (eventId: number) => {
  return window.api.db<{ races: number; inserted: number; updated: number }>({
    path: "db/result/calculateForEvent",
    params: { eventId },
  });
};
