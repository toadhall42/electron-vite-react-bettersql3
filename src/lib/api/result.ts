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

export type CalculateResultsSummary = { events: number; races: number; inserted: number; updated: number; removed: number };

export const calculateResultsForEvent = async (eventId: number) => {
  return window.api.db<CalculateResultsSummary>({
    path: "db/result/calculateForEvent",
    params: { eventId },
  });
};

// Scores one race session; sessionId is any session row of that race
export const calculateResultsForRace = async (sessionId: number) => {
  return window.api.db<CalculateResultsSummary>({
    path: "db/result/calculateForRace",
    params: { sessionId },
  });
};

export const calculateResultsForSeason = async (seasonId: number) => {
  return window.api.db<CalculateResultsSummary>({
    path: "db/result/calculateForSeason",
    params: { seasonId },
  });
};

export type SetTireDefaultsSummary = { updated: number; alreadySet: number; noDefault: number; ambiguous: number };

// Fills blank Tire on these results from each driver's Entrant default tire
export const setResultTireDefaults = async (ids: number[]) => {
  return window.api.db<SetTireDefaultsSummary>({
    path: "db/result/setTireDefaults",
    params: { ids },
  });
};
