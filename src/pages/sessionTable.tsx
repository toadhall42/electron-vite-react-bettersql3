import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllSessions, addSession, updateSession, deleteSession } from "@/lib/api/session";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllEntrants } from "@/lib/api/entrant";
import { getAllEvents } from "@/lib/api/event";
import { getAllSeasons } from "@/lib/api/season";
import { getAllWeather, addWeather } from "@/lib/api/weather";
import { fetchSessionWeather } from "@/lib/weather";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Driver,
  type EntrantWithDetails,
  type EventWithDetails,
  type Season,
  type Session,
  type SessionWithDetails,
  type InsertSession,
  type UpdateSession,
  type Weather,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { useDebug } from "@/lib/stores/settings";
import { Sel } from "@/components/common/select";
import { Cloud, CloudDrizzle, CloudRain, CloudSun, Droplets, Gauge, Sun, Wind, type LucideIcon } from "lucide-react";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, SessionWithDetails>();
const EMPTY: SessionWithDetails[] = [];
const EMPTY_NEW = {
  name: "",
  eventSequence: 0,
  seasonRaceNumber: 0,
  sessionType: "Race" as SessionType,
  sessionDate: "",
  sessionStartTime: "",
  driverId: 0,
  eventId: 0,
  carClass: "",
  carNumber: "",
  position: 0,
  disqualified: false,
  bestLap: "",
};

const SESSION_TYPES = ["Practice", "Qualify", "Race", "Bonus Race"] as const;
type SessionType = (typeof SESSION_TYPES)[number];

// id  driver  class  car#  pos  best  actions
const GRID = "grid grid-cols-[1fr_80px_60px_50px_100px_155px] items-center px-4";
const GRID_ID = "grid grid-cols-[44px_1fr_80px_60px_50px_100px_155px] items-center px-4";
// Bonus races only track driver + class: id  driver  class  session  actions
const BONUS_GRID = "grid grid-cols-[1fr_120px_240px_155px] items-center px-4";
const BONUS_GRID_ID = "grid grid-cols-[44px_1fr_120px_240px_155px] items-center px-4";
const BONUS = "Bonus Race";
const today = () => new Date().toISOString().slice(0, 10);
const entrantClass = (e: EntrantWithDetails) => e.vehicleClass ?? e.carclass ?? "";
// A driver with several cars appears once per Entrant
const entrantLabel = (e: EntrantWithDetails) => {
  const cls = entrantClass(e);
  return cls ? `${e.driverName ?? "—"} (${cls})` : e.driverName ?? "—";
};

// "DQ" disqualifies but keeps the recorded finishing position; a number reinstates the driver.
// Runs on every keystroke, so the position always comes from the row, never from partial input like "D".
const parsePosition = (v: string, finished: number): Partial<Session> =>
  v.trim().toUpperCase() === "DQ"
    ? { position: finished, disqualified: true }
    : { position: Number(v.replace(/\D/g, "")) || 0, disqualified: false };

type WeatherState = { status: "loading" } | { status: "none" } | { status: "ok"; weather: Weather };

// Condition from stored readings: precipitation wins, otherwise cloud cover
function weatherCondition(w: Weather): { Icon: LucideIcon; label: string } {
  const precip = w.weatherPrecipIn ?? 0;
  const cloud = w.weatherCloudCoverPct ?? 0;
  if (precip > 0.1) return { Icon: CloudRain, label: "Rain" };
  if (precip > 0) return { Icon: CloudDrizzle, label: "Drizzle" };
  if (cloud < 25) return { Icon: Sun, label: "Clear" };
  if (cloud < 70) return { Icon: CloudSun, label: "Partly cloudy" };
  return { Icon: Cloud, label: "Cloudy" };
}

function WeatherConditions({ w }: { w: Weather }) {
  const { Icon, label } = weatherCondition(w);
  const tempF = `${(w.weatherTempF ?? 0).toFixed(0)}°F`;
  const wind = `${(w.weatherWindMph ?? 0).toFixed(0)} mph`;
  const precip = `${(w.weatherPrecipIn ?? 0).toFixed(2)}"`;
  const pressure = `${(w.weatherPressureInHg ?? 0).toFixed(2)} inHg`;
  const cloud = `${(w.weatherCloudCoverPct ?? 0).toFixed(0)}% cloud`;
  const item = "flex items-center gap-1";
  return (
    <span className="flex items-center gap-4"
      title={`${label} · ${tempF} · ${wind} wind · ${precip} precip · ${pressure} · ${cloud}`}>
      <span className={`${item} text-gray-700`}><Icon size={16} />{tempF}</span>
      <span className={item}><Wind size={14} className="text-gray-400" />{wind}</span>
      <span className={item}><Droplets size={14} className="text-gray-400" />{precip}</span>
      <span className={item}><Gauge size={14} className="text-gray-400" />{pressure}</span>
    </span>
  );
}

export function SessionTablePage() {
  const debug = useDebug();
  const [data, setData] = useState<SessionWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entrants, setEntrants] = useState<EntrantWithDetails[]>([]);
  const [newEntrantId, setNewEntrantId] = useState(0);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<number | "">("");
  const [eventFilter, setEventFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<SessionType | "">("");
  const [nameFilter, setNameFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Session>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });
  const [weather, setWeather] = useState<WeatherState | null>(null);

  async function load() {
    setLoading(true);
    const [sesRes, drvRes, entRes, evtRes, seaRes] = await Promise.all([
      getAllSessions(),
      getAllDrivers(),
      getAllEntrants(),
      getAllEvents(),
      getAllSeasons(),
    ]);
    setSeasons(((seaRes?.data as Season[]) ?? []).sort((a, b) => b.year - a.year));
    setData((sesRes?.data as SessionWithDetails[]) ?? EMPTY);
    setDrivers((drvRes?.data as Driver[]) ?? []);
    setEntrants((entRes?.data as EntrantWithDetails[]) ?? []);
    setEvents((evtRes?.data as EventWithDetails[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: SessionWithDetails) {
    editRef.current = {
      id: row.id,
      name: row.name,
      eventSequence: row.eventSequence,
      seasonRaceNumber: row.seasonRaceNumber,
      sessionType: row.sessionType,
      sessionDate: row.sessionDate,
      sessionStartTime: row.sessionStartTime,
      driverId: row.driverId,
      eventId: row.eventId,
      carClass: row.carClass,
      carNumber: row.carNumber,
      position: row.position,
      disqualified: row.disqualified,
      bestLap: row.bestLap,
    };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateSession(editingId, editRef.current as UpdateSession);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function remove(id: number) {
    await deleteSession(id);
    load();
  }

  // Choosing an Entrant fills the row's driver, class and car number
  function pickEntrant(id: number) {
    const en = entrants.find((e) => e.id === id);
    setNewEntrantId(en?.id ?? 0);
    setNewRow((v) => ({
      ...v,
      driverId: en?.driverid ?? 0,
      carClass: en ? entrantClass(en) : "",
      carNumber: en?.number ?? "",
    }));
  }

  const entrantOptions = useMemo(
    () => [...entrants].sort((a, b) =>
      (a.driverLastName ?? "").localeCompare(b.driverLastName ?? "") ||
      (a.driverFirstName ?? "").localeCompare(b.driverFirstName ?? "") ||
      entrantClass(a).localeCompare(entrantClass(b))),
    [entrants]
  );

  async function create() {
    if (!isBonus) {
      await addSession(newRow as InsertSession);
      setNewRow({ ...EMPTY_NEW });
      setNewEntrantId(0);
      await load();
      return;
    }
    const name = newRow.name.trim();
    if (bonusEventId == null || !newRow.driverId || !name) return;
    // A bonus race has no start/finish/lap data; date comes from the event's existing sessions
    const eventDates = data.filter((s) => s.eventId === bonusEventId).map((s) => s.sessionDate).sort();
    await addSession({
      ...EMPTY_NEW,
      name,
      sessionType: BONUS,
      eventId: bonusEventId,
      sessionDate: sessionTemplate?.sessionDate ?? eventDates.at(-1) ?? today(),
      driverId: newRow.driverId,
      carClass: newRow.carClass,
    } as InsertSession);
    setNewRow({ ...EMPTY_NEW, name });
    setNewEntrantId(0);
    await load();
    // Keep the (possibly new) bonus session selected so more drivers can be added
    setNameFilter(name);
  }

  const seasonEvents = useMemo(
    () => events
      .filter((e) => seasonFilter === "" || e.seasonId === seasonFilter)
      .sort((a, b) => a.number - b.number),
    [events, seasonFilter]
  );

  // Rows matching season/event/type — the name filter narrows these further
  const scopedData = useMemo(() => {
    const seasonEventIds = new Set(seasonEvents.map((e) => e.id));
    return data.filter((s) =>
      (eventFilter === "" || s.eventId === eventFilter) &&
      (seasonFilter === "" || seasonEventIds.has(s.eventId)) &&
      (typeFilter === "" || s.sessionType === typeFilter)
    );
  }, [data, seasonEvents, seasonFilter, eventFilter, typeFilter]);

  const sessionNames = useMemo(
    () => [...new Set(scopedData.map((s) => s.name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [scopedData]
  );

  // Sorted by finish position (a DQ stays where they finished); position 0/null means did not start and sorts last
  const filteredData = useMemo(
    () => scopedData
      .filter((s) => nameFilter === "" || s.name === nameFilter)
      .sort((a, b) => (a.position || Infinity) - (b.position || Infinity)),
    [scopedData, nameFilter]
  );

  // Shown positions skip DQ'd drivers: everyone who finished behind a DQ moves up one place
  const shownPosition = useMemo(() => {
    const dqPositions = filteredData.filter((s) => s.disqualified && s.position > 0).map((s) => s.position);
    return new Map(filteredData.map((s) => [
      s.id,
      s.position > 0 ? s.position - dqPositions.filter((p) => p < s.position).length : 0,
    ]));
  }, [filteredData]);

  // Drop a name selection that no longer exists under the other filters
  useEffect(() => {
    if (nameFilter !== "" && !sessionNames.includes(nameFilter)) setNameFilter("");
  }, [sessionNames, nameFilter]);

  // Rows are only shown once the filters narrow to exactly one session
  const isSingleSession = useMemo(
    () => new Set(filteredData.map((s) => `${s.eventId}|${s.sessionType}|${s.name}`)).size === 1,
    [filteredData]
  );
  const sessionTemplate = isSingleSession ? filteredData[0] : null;

  // Bonus race entry is open once an event is chosen, even before the session exists
  const isBonus = typeFilter === BONUS;
  const bonusEventId = eventFilter !== "" ? eventFilter : sessionTemplate?.eventId;
  const canAddBonus = isBonus && bonusEventId != null;
  const grid = isBonus ? (debug ? BONUS_GRID_ID : BONUS_GRID) : debug ? GRID_ID : GRID;

  // Weather belongs to the selected session's day + start time; bonus races have none.
  // Stored weather rows point at one of the session's driver rows.
  const weatherSession = !isBonus && sessionTemplate ? sessionTemplate : null;
  const weatherKey = weatherSession
    ? [weatherSession.eventId, weatherSession.sessionType, weatherSession.name,
       weatherSession.sessionDate, weatherSession.sessionStartTime ?? ""].join("|")
    : null;
  useEffect(() => {
    if (!weatherSession) { setWeather(null); return; }
    let stale = false;
    const rowIds = filteredData.map((s) => s.id);
    (async () => {
      setWeather({ status: "loading" });
      const stored = ((await getAllWeather())?.data ?? []).find(
        (w) => w.sessionId != null && rowIds.includes(w.sessionId));
      if (stale) return;
      if (stored) { setWeather({ status: "ok", weather: stored }); return; }

      // Not stored yet: look it up and persist so it's only fetched once
      const track = weatherSession.eventTrack ?? events.find((e) => e.id === weatherSession.eventId)?.track;
      const w = track
        ? await fetchSessionWeather(track, weatherSession.sessionDate, weatherSession.sessionStartTime ?? null)
        : null;
      if (stale) return;
      if (!w) { setWeather({ status: "none" }); return; }
      const row = {
        sessionId: Math.min(...rowIds),
        weatherTempF: w.tempF,
        weatherWindMph: w.windMph,
        weatherPrecipIn: w.precipIn,
        weatherPressureInHg: w.pressureInHg,
        weatherCloudCoverPct: w.cloudCoverPct,
      };
      await addWeather(row);
      if (!stale) setWeather({ status: "ok", weather: { id: 0, ...row } });
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);

  // Default a new bonus row's name to the selected session
  useEffect(() => {
    if (isBonus) setNewRow((v) => ({ ...v, name: nameFilter }));
  }, [isBonus, nameFilter]);

  // Class filter applies within the selected session, after the single-session check
  const classOptions = useMemo(
    () => [...new Set(filteredData.map((s) => s.carClass).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [filteredData]
  );
  const displayData = useMemo(
    () => filteredData.filter((s) => classFilter === "" || s.carClass === classFilter),
    [filteredData, classFilter]
  );

  useEffect(() => {
    if (classFilter !== "" && !classOptions.includes(classFilter)) setClassFilter("");
  }, [classOptions, classFilter]);

  // New rows inherit the selected session's shared fields (no longer editable in the grid)
  useEffect(() => {
    if (!sessionTemplate) return;
    setNewRow((v) => ({
      ...v,
      name: sessionTemplate.name,
      eventSequence: sessionTemplate.eventSequence ?? 0,
      seasonRaceNumber: sessionTemplate.seasonRaceNumber ?? 0,
      sessionType: sessionTemplate.sessionType as SessionType,
      sessionDate: sessionTemplate.sessionDate ?? "",
      sessionStartTime: sessionTemplate.sessionStartTime ?? "",
      eventId: sessionTemplate.eventId,
    }));
  }, [sessionTemplate]);

  const columns = useMemo(
    () =>
      col.columns([
        ...(debug ? [col.accessor("id", {
            header: "ID",
            cell: (info) => <span className="text-gray-400 text-xs">{info.getValue()}</span>,
          })] : []),
        col.display({
          id: "driver",
          header: "Driver",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel key={`driverId-${editingId}`} defaultValue={editRef.current.driverId ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, driverId: Number(e.target.value) }; }}>
                <option value="">— driver —</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs truncate block">{info.row.original.driverName ?? "—"}</span>
            ),
        }),
        col.accessor("carClass", {
          header: () => (
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-1 py-0.5 text-[10px] uppercase tracking-widest text-gray-500 font-mono outline-none focus:border-gray-500 w-full">
              <option value="">Class</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ),
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`carClass-${editingId}`} defaultValue={editRef.current.carClass ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, carClass: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        ...(isBonus ? [col.accessor("name", {
          header: "Session",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`name-${editingId}`} defaultValue={editRef.current.name ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, name: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs truncate block">{info.getValue()}</span>
            ),
        })] : [
        col.accessor("carNumber", {
          header: "Car #",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`carNumber-${editingId}`} defaultValue={editRef.current.carNumber ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, carNumber: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("position", {
          header: "Pos",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`position-${editingId}`} placeholder="pos or DQ"
                defaultValue={editRef.current.disqualified ? "DQ" : String(editRef.current.position ?? 0)}
                onChange={(e) => { editRef.current = { ...editRef.current, ...parsePosition(e.target.value, info.row.original.position) }; }} />
            ) : info.row.original.disqualified ? (
              <span className="text-red-600 text-xs font-semibold"
                title={info.getValue() ? `Finished P${info.getValue()}` : undefined}>DQ</span>
            ) : (
              <span className="text-gray-500 text-xs">{shownPosition.get(info.row.original.id) || "DNS"}</span>
            ),
        }),
        col.accessor("bestLap", {
          header: "Best Lap",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`bestLap-${editingId}`} defaultValue={editRef.current.bestLap ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, bestLap: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        ]),
        col.display({
          id: "actions",
          cell: (info) => {
            const id = info.row.original.id;
            return editingId === id ? (
              <div className="flex gap-1.5">
                <Btn onClick={saveEdit}>Save</Btn>
                <Btn onClick={cancelEdit}>Cancel</Btn>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Btn onClick={() => startEdit(info.row.original)}>Edit</Btn>
                <Btn danger onClick={() => remove(id)}>Delete</Btn>
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debug, editingId, drivers, classFilter, classOptions, isBonus, shownPosition]
  );

  const table = useTable({ features, columns, data: displayData });

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Session Results
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Sel value={seasonFilter}
              onChange={(e) => { setSeasonFilter(e.target.value === "" ? "" : Number(e.target.value)); setEventFilter(""); }}>
              <option value="">All seasons</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
          </div>
          <div className="w-64">
            <Sel value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">All events</option>
              {seasonEvents.map((e) => <option key={e.id} value={e.id}>#{e.number} {e.track}</option>)}
            </Sel>
          </div>
          <div className="w-40">
            <Sel value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as SessionType | "")}>
              <option value="">All types</option>
              {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </div>
          <div className="w-56">
            <Sel value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}>
              <option value="">All names</option>
              {sessionNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </Sel>
          </div>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="border border-gray-200 rounded-lg overflow-clip bg-white min-w-[900px]">
          {/* Header */}
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} className={`${grid} py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10`}>
              {hg.headers.map((header) => (
                <span key={header.id} className="text-[10px] uppercase tracking-widest text-gray-400">
                  <table.FlexRender header={header} />
                </span>
              ))}
            </div>
          ))}

          {loading && <div className="py-10 text-center text-xs text-gray-400">Loading...</div>}
          {!loading && isBonus && !canAddBonus && (
            <div className="py-10 text-center text-xs text-gray-400">
              Select an event to add Bonus Race entries
            </div>
          )}
          {!loading && canAddBonus && !isSingleSession && (
            <div className="py-10 text-center text-xs text-gray-400">
              {filteredData.length === 0
                ? "No Bonus Race entries yet — enter a name and add drivers below"
                : "Select a Bonus Race by name, or enter a new name below"}
            </div>
          )}
          {!loading && !isBonus && filteredData.length === 0 && (
            <div className="py-10 text-center text-xs text-gray-400">
              {data.length === 0 ? "No sessions" : "No sessions match the selected filters"}
            </div>
          )}
          {!loading && !isBonus && filteredData.length > 0 && !isSingleSession && (
            <div className="py-10 text-center text-xs text-gray-400">
              Select filters down to a single session
            </div>
          )}
          {!loading && isSingleSession &&
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className={`${grid} py-3 border-b border-gray-200/70 last:border-0 hover:bg-gray-50 transition-colors`}
              >
                {row.getAllCells().map((cell) => (
                  <div key={cell.id} className="min-w-0 overflow-hidden">
                    <table.FlexRender cell={cell} />
                  </div>
                ))}
              </div>
            ))}

          {/* Add new row */}
          {!loading && canAddBonus && (
            <div className={`${grid} py-3 border-t border-gray-300 bg-gray-50 sticky bottom-0 z-10`}>
              {debug && <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>}
              <Sel value={newEntrantId || ""} onChange={(e) => pickEntrant(Number(e.target.value))}>
                <option value="">— entrant —</option>
                {entrantOptions.map((en) => <option key={en.id} value={en.id}>{entrantLabel(en)}</option>)}
              </Sel>
              <Inp value={newRow.carClass} placeholder="class"
                onChange={(e) => setNewRow((v) => ({ ...v, carClass: e.target.value }))} />
              {/* Pick an existing bonus race name or type a new one */}
              <Inp value={newRow.name} placeholder="bonus race name" list="bonus-race-names"
                onChange={(e) => setNewRow((v) => ({ ...v, name: e.target.value }))} />
              <datalist id="bonus-race-names">
                {sessionNames.map((n) => <option key={n} value={n} />)}
              </datalist>
              <Btn onClick={create}>Add</Btn>
            </div>
          )}
          {!loading && !isBonus && isSingleSession && (
            <div className="sticky bottom-0 z-10">
              <div className={`${grid} py-3 border-t border-gray-300 bg-gray-50`}>
                {debug && <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>}
                <Sel value={newEntrantId || ""} onChange={(e) => pickEntrant(Number(e.target.value))}>
                  <option value="">— entrant —</option>
                  {entrantOptions.map((en) => <option key={en.id} value={en.id}>{entrantLabel(en)}</option>)}
                </Sel>
                <Inp value={newRow.carClass} placeholder="class"
                  onChange={(e) => setNewRow((v) => ({ ...v, carClass: e.target.value }))} />
                <Inp value={newRow.carNumber} placeholder="#"
                  onChange={(e) => setNewRow((v) => ({ ...v, carNumber: e.target.value }))} />
                <Inp value={String(newRow.position)} placeholder="pos"
                  onChange={(e) => setNewRow((v) => ({ ...v, position: Number(e.target.value) }))} />
                <Inp value={newRow.bestLap} placeholder="best"
                  onChange={(e) => setNewRow((v) => ({ ...v, bestLap: e.target.value }))} />
                <Btn onClick={create}>Add</Btn>
              </div>

              {/* Weather for the session's day + start time */}
              {weatherSession && weather && (
                <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs">
                  <span className="text-gray-700 font-medium">
                    {weatherSession.eventTrack ?? events.find((e) => e.id === weatherSession.eventId)?.track ?? "—"}
                  </span>
                  <span className="text-gray-400">
                    {weatherSession.sessionDate}{weatherSession.sessionStartTime ? ` ${weatherSession.sessionStartTime}` : ""}
                  </span>
                  <span className="text-gray-600">
                    {weather.status === "loading"
                      ? "Loading weather…"
                      : weather.status === "ok"
                        ? <WeatherConditions w={weather.weather} />
                        : "Weather unavailable"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
