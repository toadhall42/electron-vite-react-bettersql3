import type { InsertWeather, UpdateWeather, WeatherWithDetails } from "../../../global.d";

export const getWeather = async (id: number) => {
  return window.api.db<WeatherWithDetails>({
    path: "db/weather/getOne",
    params: { id },
  });
};

export const getAllWeather = async () => {
  return window.api.db<WeatherWithDetails[]>({
    path: "db/weather/getAll",
    params: {},
  });
};

export const deleteWeather = async (id: number) => {
  return window.api.db({
    path: "db/weather/delete",
    params: { id },
  });
};

export const addWeather = async (data: InsertWeather) => {
  return window.api.db({
    path: "db/weather/add",
    params: data,
  });
};

export const updateWeather = async (id: number, data: UpdateWeather) => {
  return window.api.db({
    path: "db/weather/update",
    params: { id, data },
  });
};
