import type { InsertEvent, UpdateEvent, EventWithDetails } from "../../../global.d";

export const getEvent = async (id: number) => {
  return window.api.db<EventWithDetails>({
    path: "db/event/getOne",
    params: { id },
  });
};

export const getAllEvents = async () => {
  return window.api.db<EventWithDetails[]>({
    path: "db/event/getAll",
    params: {},
  });
};

export const deleteEvent = async (id: number) => {
  return window.api.db({
    path: "db/event/delete",
    params: { id },
  });
};

export const addEvent = async (data: InsertEvent) => {
  return window.api.db({
    path: "db/event/add",
    params: data,
  });
};

export const updateEvent = async (id: number, data: UpdateEvent) => {
  return window.api.db({
    path: "db/event/update",
    params: { id, data },
  });
};
