import type { InsertSession, Session, UpdateSession, SessionWithDetails } from "../../../global.d";

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

// Returns the new row's id
export const addSession = async (data: InsertSession) => {
  return window.api.db<number>({
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

// Moves a driver to a finishing position; the rest of the session shifts and is renumbered 1..N
export const setSessionPosition = async (id: number, position: number) => {
  return window.api.db({
    path: "db/session/setPosition",
    params: { id, position },
  });
};

export type SessionGroupKey = Pick<
  Session,
  "eventId" | "sessionType" | "name" | "sessionDate" | "sessionStartTime"
>;

// Updates the shared fields on every driver row of one session
export const updateSessionGroup = async (key: SessionGroupKey, data: UpdateSession) => {
  return window.api.db({
    path: "db/session/updateGroup",
    params: { key, data },
  });
};
