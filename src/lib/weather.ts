// Historical session weather from Open-Meteo, located by geocoding the track name
// (ported from Track-Notes weatherUtils)

export interface WeatherSnapshot {
  tempF: number;
  windMph: number;
  precipIn: number;
  pressureInHg: number;
  cloudCoverPct: number;
}

const HPA_TO_INHG = 0.02953;

async function geocodeTrack(trackName: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trackName)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

export async function fetchSessionWeather(
  trackName: string,
  date: string, // "YYYY-MM-DD"
  time: string | null // "HH:MM"; null uses midday
): Promise<WeatherSnapshot | null> {
  try {
    const geo = await geocodeTrack(trackName);
    if (!geo) return null;

    const params = new URLSearchParams({
      latitude: String(geo.lat),
      longitude: String(geo.lon),
      start_date: date,
      end_date: date,
      hourly: "temperature_2m,precipitation,windspeed_10m,cloudcover,pressure_msl",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      timezone: "auto",
    });
    const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    if (!res.ok) return null;
    const hourly = (await res.json()).hourly;
    if (!hourly?.time?.length) return null;

    // Times are track-local "YYYY-MM-DDTHH:MM"; pick the hour closest to the start time
    const targetHour = time ? parseInt(time.substring(0, 2), 10) : 12;
    const hours = (hourly.time as string[]).map((t) => parseInt(t.substring(11, 13), 10));
    const i = hours.reduce((best, h, idx) =>
      Math.abs(h - targetHour) < Math.abs(hours[best] - targetHour) ? idx : best, 0);

    // The archive lags a few days behind; recent dates come back as nulls
    const tempF: number | null = hourly.temperature_2m?.[i];
    if (tempF == null) return null;

    const hPa: number | null = hourly.pressure_msl?.[i];
    return {
      tempF,
      windMph: hourly.windspeed_10m?.[i] ?? 0,
      precipIn: hourly.precipitation?.[i] ?? 0,
      pressureInHg: hPa != null ? hPa * HPA_TO_INHG : 0,
      cloudCoverPct: hourly.cloudcover?.[i] ?? 0,
    };
  } catch {
    return null;
  }
}
