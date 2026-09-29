import type { InsertSession, UpdateSession, SessionWithDetails } from "../../../global.d";

export const getSession = async (id: number) => {
  return window.api.db<SessionWithDetails>({
    path: "db/session/getOne",
    params: { id },
  });
};

export const getAllSessions = async () => {
  return window.api.db<SessionWithDetails[]>({
    path: "db/session/getAll",
    params: {},
  });
};

export const deleteSession = async (id: number) => {
  return window.api.db({
    path: "db/session/delete",
    params: { id },
  });
};

export const addSession = async (data: InsertSession) => {
  return window.api.db({
    path: "db/session/add",
    params: data,
  });
};

export const updateSession = async (id: number, data: UpdateSession) => {
  return window.api.db({
    path: "db/session/update",
    params: { id, data },
  });
};
