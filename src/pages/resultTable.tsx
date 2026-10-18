import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllResults, addResult, updateResult, deleteResult, calculateResultsForEvent } from "@/lib/api/result";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllEvents } from "@/lib/api/event";
import { getAllSeasons } from "@/lib/api/season";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Driver,
  type EventWithDetails,
  type Result,
  type ResultWithDetails,
  type Season,
  type InsertResult,
  type UpdateResult,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, ResultWithDetails>();
const EMPTY: ResultWithDetails[] = [];
const EMPTY_NEW = {
  driverId: 0,
  carClass: "",
  eventId: 0,
  sessionId: "",
  positionOverall: 0,
  positionInClass: 0,
  positionsGained: 0,
  startingPosition: 0,
  hardCharger: false,
  racePoints: 0,
  bonusPoints: 0,
  mastersPoints: 0,
  totalPoints: 0,
  bonusRacePoints: 0,
  tireBrand: "",
  classification: "",
  comments: "",
};

// col widths: id  driver  event (sized to fit)  sess  class  pos  clPos  start  +/-  hc  race  bon  mast  tot  bonR  tire  class'n  comments  actions
const GRID = "grid items-center px-2";
const gridCols = (eventWidth: number) =>
  `44px 140px ${eventWidth}px 80px 70px 50px 50px 50px 45px 40px 60px 60px 60px 55px 60px 70px 80px 1fr 155px`;

// Monospace glyphs are 0.6em wide: text-xs (12px) for display, text-sm (14px) inside selects
const MONO_XS = 7.2;
const MONO_SM = 8.4;
const SELECT_CHROME = 48; // select padding + arrow
const eventLabel = (e: EventWithDetails) => `#${e.number} ${e.track}`;

function numInp(
  key: string,
  val: number | undefined,
  field: string,
  ref: React.MutableRefObject<Partial<Result>>
) {
  return (
    <Inp
      key={key}
      defaultValue={String(val ?? 0)}
      onChange={(e) => { ref.current = { ...ref.current, [field]: Number(e.target.value) }; }}
      className="w-full"
    />
  );
}

function txtInp(
  key: string,
  val: string | null | undefined,
  field: string,
  ref: React.MutableRefObject<Partial<Result>>
) {
  return (
    <Inp
      key={key}
      defaultValue={val ?? ""}
      onChange={(e) => { ref.current = { ...ref.current, [field]: e.target.value }; }}
    />
  );
}

export function ResultTablePage() {
  const [data, setData] = useState<ResultWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<number | "">("");
  const [eventFilter, setEventFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [calcStatus, setCalcStatus] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Result>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [resRes, drvRes, evtRes, seaRes] = await Promise.all([
      getAllResults(),
      getAllDrivers(),
      getAllEvents(),
      getAllSeasons(),
    ]);
    setData((resRes?.data as ResultWithDetails[]) ?? EMPTY);
    setDrivers((drvRes?.data as Driver[]) ?? []);
    setEvents((evtRes?.data as EventWithDetails[]) ?? []);
    setSeasons(((seaRes?.data as Season[]) ?? []).sort((a, b) => b.year - a.year));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: ResultWithDetails) {
    editRef.current = {
      id: row.id,
      driverId: row.driverId,
      carClass: row.carClass,
      eventId: row.eventId,
      sessionId: row.sessionId,
      positionOverall: row.positionOverall,
      positionInClass: row.positionInClass,
      positionsGained: row.positionsGained,
      startingPosition: row.startingPosition,
      hardCharger: row.hardCharger,
      racePoints: row.racePoints,
      bonusPoints: row.bonusPoints,
      mastersPoints: row.mastersPoints,
      totalPoints: row.totalPoints,
      bonusRacePoints: row.bonusRacePoints,
      tireBrand: row.tireBrand,
      classification: row.classification,
      comments: row.comments,
    };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateResult(editingId, editRef.current as UpdateResult);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function calculate() {
    if (eventFilter === "") return;
    setCalcStatus("Calculating...");
    const res = await calculateResultsForEvent(eventFilter);
    setCalcStatus(res?.code === 200 && res.data
      ? `Calculated ${res.data.races} race session(s): ${res.data.inserted} added, ${res.data.updated} updated`
      : `Calculate failed: ${res?.message ?? "no response"}`);
    await load();
  }

  async function remove(id: number) {
    await deleteResult(id);
    load();
  }

  async function create() {
    await addResult(newRow as InsertResult);
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

        // Driver select
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

        // Event select
        col.display({
          id: "event",
          header: "Event",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel key={`eventId-${editingId}`} defaultValue={editRef.current.eventId ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, eventId: Number(e.target.value) }; }}>
                <option value="">— event —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs whitespace-nowrap block">{info.row.original.eventTrack ?? "—"}</span>
            ),
        }),

        col.accessor("sessionId", {
          header: "Session",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`sessionId-${editingId}`, editRef.current.sessionId, "sessionId", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>,
        }),
        col.accessor("carClass", {
          header: "Class",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`carClass-${editingId}`, editRef.current.carClass, "carClass", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>,
        }),
        col.accessor("positionOverall", {
          header: "Pos",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`positionOverall-${editingId}`, editRef.current.positionOverall, "positionOverall", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("positionInClass", {
          header: "Cl Pos",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`positionInClass-${editingId}`, editRef.current.positionInClass, "positionInClass", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("startingPosition", {
          header: "Start",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`startingPosition-${editingId}`, editRef.current.startingPosition, "startingPosition", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("positionsGained", {
          header: "+/-",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`positionsGained-${editingId}`, editRef.current.positionsGained, "positionsGained", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("hardCharger", {
          header: "HC",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input key={`hardCharger-${editingId}`} type="checkbox"
                defaultChecked={!!editRef.current.hardCharger}
                onChange={(e) => { editRef.current = { ...editRef.current, hardCharger: e.target.checked }; }}
                className="w-4 h-4 accent-gray-600 cursor-pointer"
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ? "Yes" : ""}</span>
            ),
        }),
        col.accessor("racePoints", {
          header: "Race Pts",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`racePoints-${editingId}`, editRef.current.racePoints, "racePoints", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("bonusPoints", {
          header: "Bonus",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`bonusPoints-${editingId}`, editRef.current.bonusPoints, "bonusPoints", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("mastersPoints", {
          header: "Masters",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`mastersPoints-${editingId}`, editRef.current.mastersPoints, "mastersPoints", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("totalPoints", {
          header: "Total",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`totalPoints-${editingId}`, editRef.current.totalPoints, "totalPoints", editRef)
              : <span className="text-gray-500 text-xs font-medium">{info.getValue()}</span>,
        }),
        col.accessor("bonusRacePoints", {
          header: "Bon Race",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`bonusRacePoints-${editingId}`, editRef.current.bonusRacePoints, "bonusRacePoints", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("tireBrand", {
          header: "Tire",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`tireBrand-${editingId}`, editRef.current.tireBrand, "tireBrand", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>,
        }),
        col.accessor("classification", {
          header: "Class'n",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`classification-${editingId}`, editRef.current.classification, "classification", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>,
        }),
        col.accessor("comments", {
          header: "Comments",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`comments-${editingId}`, editRef.current.comments, "comments", editRef)
              : <span className="text-gray-500 text-xs truncate block">{info.getValue() ?? ""}</span>,
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
    [editingId, drivers, events]
  );

  const seasonEvents = useMemo(
    () => events
      .filter((e) => seasonFilter === "" || e.seasonId === seasonFilter)
      .sort((a, b) => a.number - b.number),
    [events, seasonFilter]
  );

  const filteredData = useMemo(() => {
    const seasonEventIds = new Set(seasonEvents.map((e) => e.id));
    return data.filter((r) =>
      (eventFilter === "" || r.eventId === eventFilter) &&
      (seasonFilter === "" || seasonEventIds.has(r.eventId))
    );
  }, [data, seasonEvents, seasonFilter, eventFilter]);

  // Wide enough for the longest track name and for the "#n track" select in edit/add rows
  const eventWidth = useMemo(() => {
    const viewChars = Math.max(1, ...events.map((e) => e.track.length));
    const selectChars = Math.max("— event —".length, ...events.map((e) => eventLabel(e).length));
    return Math.ceil(Math.max(viewChars * MONO_XS, selectChars * MONO_SM + SELECT_CHROME));
  }, [events]);
  const gridStyle = { gridTemplateColumns: gridCols(eventWidth) };
  // Fixed columns + event column + room for comments (was a flat 1760px with a 140px event column)
  const tableMinWidth = 1620 + eventWidth;

  const table = useTable({ features, columns, data: filteredData });

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Results
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
              {seasonEvents.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
            </Sel>
          </div>
          <Btn onClick={() => eventFilter !== "" && calculate()}>Calculate from Sessions</Btn>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      </div>

      {calcStatus && <p className="text-xs text-gray-500 flex-shrink-0">{calcStatus}</p>}
      {!calcStatus && eventFilter === "" && (
        <p className="text-xs text-gray-400 flex-shrink-0">Select an event to calculate its Results from Sessions</p>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ minWidth: tableMinWidth }}>
          {/* Header */}
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} style={gridStyle} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50`}>
              {hg.headers.map((header) => (
                <span key={header.id} className="text-[10px] uppercase tracking-widest text-gray-400">
                  <table.FlexRender header={header} />
                </span>
              ))}
            </div>
          ))}

          {loading && <div className="py-10 text-center text-xs text-gray-400">Loading...</div>}
          {!loading && filteredData.length === 0 && (
            <div className="py-10 text-center text-xs text-gray-400">
              {data.length === 0 ? "No results" : "No results match the selected filters"}
            </div>
          )}
          {!loading &&
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                style={gridStyle}
                className={`${GRID} py-2 border-b border-gray-200/70 last:border-0 hover:bg-gray-50 transition-colors`}
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
            <div style={gridStyle} className={`${GRID} py-2 border-t border-gray-300 bg-gray-50`}>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>
              <Sel value={newRow.driverId || ""}
                onChange={(e) => setNewRow((v) => ({ ...v, driverId: Number(e.target.value) }))}>
                <option value="">— driver —</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Sel>
              <Sel value={newRow.eventId || ""}
                onChange={(e) => setNewRow((v) => ({ ...v, eventId: Number(e.target.value) }))}>
                <option value="">— event —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
              </Sel>
              <Inp value={newRow.sessionId} placeholder="session"
                onChange={(e) => setNewRow((v) => ({ ...v, sessionId: e.target.value }))} />
              <Inp value={newRow.carClass} placeholder="class"
                onChange={(e) => setNewRow((v) => ({ ...v, carClass: e.target.value }))} />
              <Inp value={String(newRow.positionOverall)} placeholder="pos"
                onChange={(e) => setNewRow((v) => ({ ...v, positionOverall: Number(e.target.value) }))} />
              <Inp value={String(newRow.positionInClass)} placeholder="cl"
                onChange={(e) => setNewRow((v) => ({ ...v, positionInClass: Number(e.target.value) }))} />
              <Inp value={String(newRow.startingPosition)} placeholder="st"
                onChange={(e) => setNewRow((v) => ({ ...v, startingPosition: Number(e.target.value) }))} />
              <Inp value={String(newRow.positionsGained)} placeholder="+/-"
                onChange={(e) => setNewRow((v) => ({ ...v, positionsGained: Number(e.target.value) }))} />
              <input type="checkbox" checked={newRow.hardCharger}
                onChange={(e) => setNewRow((v) => ({ ...v, hardCharger: e.target.checked }))}
                className="w-4 h-4 accent-gray-600 cursor-pointer" />
              <Inp value={String(newRow.racePoints)} placeholder="race"
                onChange={(e) => setNewRow((v) => ({ ...v, racePoints: Number(e.target.value) }))} />
              <Inp value={String(newRow.bonusPoints)} placeholder="bon"
                onChange={(e) => setNewRow((v) => ({ ...v, bonusPoints: Number(e.target.value) }))} />
              <Inp value={String(newRow.mastersPoints)} placeholder="mast"
                onChange={(e) => setNewRow((v) => ({ ...v, mastersPoints: Number(e.target.value) }))} />
              <Inp value={String(newRow.totalPoints)} placeholder="tot"
                onChange={(e) => setNewRow((v) => ({ ...v, totalPoints: Number(e.target.value) }))} />
              <Inp value={String(newRow.bonusRacePoints)} placeholder="br"
                onChange={(e) => setNewRow((v) => ({ ...v, bonusRacePoints: Number(e.target.value) }))} />
              <Inp value={newRow.tireBrand} placeholder="tire"
                onChange={(e) => setNewRow((v) => ({ ...v, tireBrand: e.target.value }))} />
              <Inp value={newRow.classification} placeholder="class'n"
                onChange={(e) => setNewRow((v) => ({ ...v, classification: e.target.value }))} />
              <Inp value={newRow.comments} placeholder="comments"
                onChange={(e) => setNewRow((v) => ({ ...v, comments: e.target.value }))} />
              <Btn onClick={create}>Add</Btn>
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400 flex-shrink-0">
          {filteredData.length === data.length ? `${data.length} results` : `${filteredData.length} of ${data.length} results`}
        </p>
      )}
    </div>
  );
}
