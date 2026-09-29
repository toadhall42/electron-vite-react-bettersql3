import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllWeather, addWeather, updateWeather, deleteWeather } from "@/lib/api/weather";
import { getAllSessions } from "@/lib/api/session";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Session,
  type Weather,
  type WeatherWithDetails,
  type InsertWeather,
  type UpdateWeather,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, WeatherWithDetails>();
const EMPTY: WeatherWithDetails[] = [];
const EMPTY_NEW = {
  sessionId: 0,
  weatherTempF: 0,
  weatherWindMph: 0,
  weatherPrecipIn: 0,
  weatherPressureInHg: 0,
  weatherCloudCoverPct: 0,
};

// id  session  tempF  windMph  precipIn  pressureInHg  cloudCoverPct  actions
const GRID = "grid grid-cols-[44px_160px_70px_75px_75px_105px_95px_155px] items-center px-4";

function numInp(
  editingId: number | null,
  rowId: number,
  field: keyof Weather,
  editRef: React.MutableRefObject<Partial<Weather>>,
  displayVal: number | null | undefined,
  placeholder: string
) {
  return editingId === rowId ? (
    <Inp
      key={`${field}-${editingId}`}
      defaultValue={editRef.current[field] != null ? String(editRef.current[field]) : ""}
      placeholder={placeholder}
      onChange={(e) => {
        editRef.current = { ...editRef.current, [field]: e.target.value === "" ? null : Number(e.target.value) };
      }}
    />
  ) : (
    <span className="text-gray-500 text-xs">{displayVal ?? ""}</span>
  );
}

export function WeatherTablePage() {
  const [data, setData] = useState<WeatherWithDetails[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Weather>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [wxRes, sesRes] = await Promise.all([getAllWeather(), getAllSessions()]);
    setData((wxRes?.data as WeatherWithDetails[]) ?? EMPTY);
    setSessions((sesRes?.data as Session[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: WeatherWithDetails) {
    editRef.current = {
      id: row.id,
      sessionId: row.sessionId,
      weatherTempF: row.weatherTempF,
      weatherWindMph: row.weatherWindMph,
      weatherPrecipIn: row.weatherPrecipIn,
      weatherPressureInHg: row.weatherPressureInHg,
      weatherCloudCoverPct: row.weatherCloudCoverPct,
    };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateWeather(editingId, editRef.current as UpdateWeather);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function remove(id: number) {
    await deleteWeather(id);
    load();
  }

  async function create() {
    await addWeather(newRow as InsertWeather);
    setNewRow({ ...EMPTY_NEW });
    await load();
  }

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: "ID",
          cell: (info) => <span className="text-gray-400 text-xs">{info.getValue()}</span>,
        }),
        col.display({
          id: "session",
          header: "Session",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel
                key={`sessionId-${editingId}`}
                defaultValue={editRef.current.sessionId ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, sessionId: Number(e.target.value) }; }}
              >
                <option value="">— session —</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs truncate block">{info.row.original.sessionName ?? "—"}</span>
            ),
        }),
        col.accessor("weatherTempF", {
          header: "Temp °F",
          cell: (info) => numInp(editingId, info.row.original.id, "weatherTempF", editRef, info.getValue(), "°F"),
        }),
        col.accessor("weatherWindMph", {
          header: "Wind mph",
          cell: (info) => numInp(editingId, info.row.original.id, "weatherWindMph", editRef, info.getValue(), "mph"),
        }),
        col.accessor("weatherPrecipIn", {
          header: "Precip in",
          cell: (info) => numInp(editingId, info.row.original.id, "weatherPrecipIn", editRef, info.getValue(), "in"),
        }),
        col.accessor("weatherPressureInHg", {
          header: "Pressure inHg",
          cell: (info) => numInp(editingId, info.row.original.id, "weatherPressureInHg", editRef, info.getValue(), "inHg"),
        }),
        col.accessor("weatherCloudCoverPct", {
          header: "Cloud Cover %",
          cell: (info) => numInp(editingId, info.row.original.id, "weatherCloudCoverPct", editRef, info.getValue(), "%"),
        }),
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
    [editingId, sessions]
  );

  const table = useTable({ features, columns, data });

  return (
    <div className="flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Weather
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Header */}
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50`}>
            {hg.headers.map((header) => (
              <span key={header.id} className="text-[10px] uppercase tracking-widest text-gray-400">
                <table.FlexRender header={header} />
              </span>
            ))}
          </div>
        ))}

        {loading && <div className="py-10 text-center text-xs text-gray-400">Loading...</div>}
        {!loading && data.length === 0 && (
          <div className="py-10 text-center text-xs text-gray-400">No weather records</div>
        )}
        {!loading &&
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={`${GRID} py-3 border-b border-gray-200/70 last:border-0 hover:bg-gray-50 transition-colors`}
            >
              {row.getAllCells().map((cell) => (
                <div key={cell.id} className="min-w-0 overflow-hidden">
                  <table.FlexRender cell={cell} />
                </div>
              ))}
            </div>
          ))}

        {/* Add new row */}
        {!loading && (
          <div className={`${GRID} py-3 border-t border-gray-300 bg-gray-50`}>
            <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>
            <Sel
              value={newRow.sessionId || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, sessionId: Number(e.target.value) }))}
            >
              <option value="">— session —</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
            <Inp value={String(newRow.weatherTempF)} placeholder="°F"
              onChange={(e) => setNewRow((v) => ({ ...v, weatherTempF: Number(e.target.value) }))} />
            <Inp value={String(newRow.weatherWindMph)} placeholder="mph"
              onChange={(e) => setNewRow((v) => ({ ...v, weatherWindMph: Number(e.target.value) }))} />
            <Inp value={String(newRow.weatherPrecipIn)} placeholder="in"
              onChange={(e) => setNewRow((v) => ({ ...v, weatherPrecipIn: Number(e.target.value) }))} />
            <Inp value={String(newRow.weatherPressureInHg)} placeholder="inHg"
              onChange={(e) => setNewRow((v) => ({ ...v, weatherPressureInHg: Number(e.target.value) }))} />
            <Inp value={String(newRow.weatherCloudCoverPct)} placeholder="%"
              onChange={(e) => setNewRow((v) => ({ ...v, weatherCloudCoverPct: Number(e.target.value) }))} />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400">{data.length} weather records</p>
      )}
    </div>
  );
}
