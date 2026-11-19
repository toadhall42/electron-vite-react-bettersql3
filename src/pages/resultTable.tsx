import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  getAllResults,
  addResult,
  updateResult,
  deleteResult,
  calculateResultsForEvent,
  calculateResultsForRace,
  calculateResultsForSeason,
} from "@/lib/api/result";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllEvents } from "@/lib/api/event";
import { getAllSeasons } from "@/lib/api/season";
import { getAllPickListOptions } from "@/lib/api/pickListOption";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Driver,
  type EventWithDetails,
  type Result,
  type ResultWithDetails,
  type SeasonWithDetails,
  type InsertResult,
  type UpdateResult,
  type PickListOption,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";
import { useDebug } from "@/lib/stores/settings";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  totalPoints: 0,
  bonusRacePoints: 0,
  tireBrand: "",
  classification: "",
  comments: "",
};

// col widths: id  driver  event (sized to fit)  sess  class  pos  clPos  start  +/-  hc  race  bon  tot  bonR  tire  class'n  comments  actions
const GRID = "grid items-center px-2";
// Season totals: pos  driver  class  races  race  bonus  bonusRace  total, then optional per-race columns
const TOTALS_GRID = "grid items-center px-4";
const TOTALS_BASE_COLS = "50px minmax(160px,1fr) 90px 70px 80px 80px 100px 80px";
const TOTALS_BASE_COUNT = 8;
const RACE_COL = "96px";
const COLLAPSED_COL = "90px";

type DriverTotals = {
  key: string;
  driverId: number;
  rank: number;
  driverName: string;
  carClass: string;
  races: number;
  racePoints: number;
  bonusPoints: number;
  bonusRacePoints: number;
  totalPoints: number;
  // Total points per race key (Race and Bonus Race sessions)
  byRace: Record<string, number>;
};

type RaceGroup = "Race" | "Bonus Race";
const RACE_GROUPS: { type: RaceGroup; label: string }[] = [
  { type: "Race", label: "Races" },
  { type: "Bonus Race", label: "Bonus Races" },
];

// The ID and Session columns only show in debug mode; Bon Race only for a Bonus Race
const gridCols = (eventWidth: number, debug: boolean, bonusRace: boolean) =>
  [
    debug && "44px", "140px", `${eventWidth}px`, debug && "80px", "90px", "50px", "50px", "50px", "45px", "40px",
    "60px", "60px", "55px", bonusRace && "60px", "70px", "80px", "1fr", "155px",
  ].filter(Boolean).join(" ");

const headerTip = (label: string, tip: string) => () => <span title={tip} className="cursor-help">{label}</span>;

// Monospace glyphs are 0.6em wide: text-xs (12px) for display, text-sm (14px) inside selects
const MONO_XS = 7.2;
const MONO_SM = 8.4;
const SELECT_CHROME = 48; // select padding + arrow
const eventLabel = (e: EventWithDetails) => `#${e.number} ${e.track}`;
// A race is the set of Race session rows sharing event + date + start time + name
const raceKey = (r: ResultWithDetails) =>
  [r.eventId, r.sessionDate ?? "", r.sessionStartTime ?? "", r.sessionName ?? ""].join("|");
const normClass = (c: string | null | undefined) => (c ?? "").trim().toUpperCase();

// Masters is only a filter on the standings. "noPodium" also hides drivers in their class's top 3.
type MasterFilter = "" | "yes" | "noPodium";
const PODIUM = 3;

const HEADER_SELECT =
  "bg-white border border-gray-300 rounded-md px-1 py-0.5 text-[10px] uppercase tracking-widest text-gray-500 font-mono outline-none focus:border-gray-500 w-full";

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

// Drop-down of Settings-managed values; a stored value no longer in the list stays selectable
function pickOptions(values: string[], current: string | null | undefined) {
  const all = current && !values.includes(current) ? [current, ...values] : values;
  return (
    <>
      <option value="">—</option>
      {all.map((v) => <option key={v} value={v}>{v}</option>)}
    </>
  );
}

function pickSel(
  key: string,
  val: string | null | undefined,
  field: string,
  values: string[],
  ref: React.MutableRefObject<Partial<Result>>
) {
  return (
    <Sel
      key={key}
      defaultValue={val ?? ""}
      onChange={(e) => { ref.current = { ...ref.current, [field]: e.target.value || null }; }}
    >
      {pickOptions(values, val)}
    </Sel>
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
  const debug = useDebug();
  const [data, setData] = useState<ResultWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);
  const [pickLists, setPickLists] = useState<{ carClass: string[]; tireBrand: string[] }>({ carClass: [], tireBrand: [] });
  const [seasonFilter, setSeasonFilter] = useState<number | "">("");
  const [eventFilter, setEventFilter] = useState<number | "">("");
  const [raceFilter, setRaceFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [masterFilter, setMasterFilter] = useState<MasterFilter>("");
  const [collapsed, setCollapsed] = useState<Record<RaceGroup, boolean>>({ "Race": false, "Bonus Race": false });
  const [loading, setLoading] = useState(true);
  const [calcStatus, setCalcStatus] = useState("");
  // Blocking calculation error (missing starting positions); shown until dismissed
  const [calcError, setCalcError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Result>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [resRes, drvRes, evtRes, seaRes, pickRes] = await Promise.all([
      getAllResults(),
      getAllDrivers(),
      getAllEvents(),
      getAllSeasons(),
      getAllPickListOptions(),
    ]);
    const picks = (pickRes?.data as PickListOption[]) ?? [];
    setPickLists({
      carClass: picks.filter((o) => o.list === "carClass").map((o) => o.value),
      tireBrand: picks.filter((o) => o.list === "tireBrand").map((o) => o.value),
    });
    setData((resRes?.data as ResultWithDetails[]) ?? EMPTY);
    setDrivers((drvRes?.data as Driver[]) ?? []);
    setEvents((evtRes?.data as EventWithDetails[]) ?? []);
    setSeasons(((seaRes?.data as SeasonWithDetails[]) ?? []).sort((a, b) => b.year - a.year));
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

  // Scores the selected event, or every event in the selected season
  // Scores the selected race, else the selected event, else every event in the selected season
  async function calculate() {
    if (seasonFilter === "") return;
    if (raceFilter !== "" && selectedRace?.sessionId == null) {
      setCalcStatus("Calculate failed: the selected race has no linked session rows; use Calculate Event");
      return;
    }
    setCalcStatus("Calculating...");
    const res = selectedRace?.sessionId != null
      ? await calculateResultsForRace(selectedRace.sessionId)
      : eventFilter !== "" ? await calculateResultsForEvent(eventFilter) : await calculateResultsForSeason(seasonFilter);
    if (res?.code === 422) {
      setCalcStatus("Calculate stopped: fix the starting positions and run it again");
      setCalcError(res.message);
      return;
    }
    const scope = res?.data && res.data.events > 1 ? ` across ${res.data.events} events` : "";
    setCalcStatus(res?.code === 200 && res.data
      ? `Calculated ${res.data.races} race session(s)${scope}: ${res.data.inserted} added, ${res.data.updated} updated` +
        (res.data.removed ? `, ${res.data.removed} removed (session no longer exists)` : "")
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

  const classOptions = useMemo(
    () => [...new Set(data.map((r) => normClass(r.carClass)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [data]
  );

  // Masters for the selected season's year: eligible from First Master Season onward
  const masterDriverIds = useMemo(() => {
    const year = seasons.find((s) => s.id === seasonFilter)?.year;
    if (year == null) return new Set<number>();
    return new Set(drivers.filter((d) => d.firstMasterSeason != null && d.firstMasterSeason <= year).map((d) => d.id));
  }, [drivers, seasons, seasonFilter]);

  // The selected race: its event, its type (shows the Bon Race column) and a session row to calculate it by
  const selectedRace = useMemo(() => {
    if (raceFilter === "") return null;
    const rows = data.filter((r) => raceKey(r) === raceFilter);
    const linked = rows.map((r) => Number(r.sessionId)).find((id) => Number.isInteger(id) && id > 0);
    return rows.length ? { eventId: rows[0].eventId, sessionType: rows[0].sessionType, sessionId: linked } : null;
  }, [data, raceFilter]);
  const isBonusRace = selectedRace?.sessionType === "Bonus Race";

  const classHeader = () => (
    <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={HEADER_SELECT}>
      <option value="">Class</option>
      {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  const columns = useMemo(
    () =>
      col.columns([
        ...(debug ? [col.accessor("id", {
            header: "ID",
            cell: (info) => <span className="text-gray-400 text-xs">{info.getValue()}</span>,
          })] : []),

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

        ...(debug ? [col.accessor("sessionId", {
          header: "Session",
          cell: (info) =>
            editingId === info.row.original.id
              ? txtInp(`sessionId-${editingId}`, editRef.current.sessionId, "sessionId", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>,
        })] : []),
        col.accessor("carClass", {
          header: () => <div className="pr-3">{classHeader()}</div>,
          cell: (info) =>
            editingId === info.row.original.id
              ? <div className="pr-3">{pickSel(`carClass-${editingId}`, editRef.current.carClass, "carClass", pickLists.carClass, editRef)}</div>
              : <span className="text-gray-500 text-xs block text-center pr-3">{info.getValue() ?? ""}</span>,
        }),
        col.accessor("positionOverall", {
          header: headerTip("POA", "Position Over All"),
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`positionOverall-${editingId}`, editRef.current.positionOverall, "positionOverall", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        }),
        col.accessor("positionInClass", {
          header: headerTip("PIC", "Position In Class"),
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
          header: "Race",
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
        col.accessor("totalPoints", {
          header: "Total",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`totalPoints-${editingId}`, editRef.current.totalPoints, "totalPoints", editRef)
              : <span className="text-gray-500 text-xs font-medium">{info.getValue()}</span>,
        }),
        ...(isBonusRace ? [col.accessor("bonusRacePoints", {
          header: "Bon Race",
          cell: (info) =>
            editingId === info.row.original.id
              ? numInp(`bonusRacePoints-${editingId}`, editRef.current.bonusRacePoints, "bonusRacePoints", editRef)
              : <span className="text-gray-500 text-xs">{info.getValue()}</span>,
        })] : []),
        col.accessor("tireBrand", {
          header: "Tire",
          cell: (info) =>
            editingId === info.row.original.id
              ? pickSel(`tireBrand-${editingId}`, editRef.current.tireBrand, "tireBrand", pickLists.tireBrand, editRef)
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
    [debug, isBonusRace, editingId, drivers, events, classFilter, classOptions, pickLists]
  );

  const seasonEvents = useMemo(
    () => events
      .filter((e) => seasonFilter === "" || e.seasonId === seasonFilter)
      .sort((a, b) => a.number - b.number),
    [events, seasonFilter]
  );

  // Which point model the Calculate button will apply
  const seasonModelLabel = useMemo(() => {
    const seasonModel = seasons.find((s) => s.id === seasonFilter)?.pointModelName;
    const event = events.find((e) => e.id === (selectedRace?.eventId ?? eventFilter));
    if (event?.pointModelName) return `the ${event.pointModelName} point model (event override)`;
    const overrides = eventFilter === "" && !selectedRace ? seasonEvents.filter((e) => e.pointModelName).length : 0;
    const base = seasonModel ? `the ${seasonModel} point model` : "no point model — assign one on the Seasons page";
    return overrides ? `${base}; ${overrides} event(s) override it` : base;
  }, [seasons, events, seasonEvents, seasonFilter, eventFilter, selectedRace]);

  const scopedData = useMemo(() => {
    const seasonEventIds = new Set(seasonEvents.map((e) => e.id));
    return data.filter((r) =>
      (eventFilter === "" || r.eventId === eventFilter) &&
      (seasonFilter === "" || seasonEventIds.has(r.eventId))
    );
  }, [data, seasonEvents, seasonFilter, eventFilter]);

  // Points only come from Race and Bonus Race sessions, so only those are offered
  const races = useMemo(() => {
    const byKey = new Map<string, ResultWithDetails>();
    for (const r of scopedData) {
      const scored = r.sessionType === "Race" || r.sessionType === "Bonus Race";
      if (scored && !byKey.has(raceKey(r))) byKey.set(raceKey(r), r);
    }
    return [...byKey.entries()]
      .sort(([, a], [, b]) =>
        `${a.sessionDate} ${a.sessionStartTime ?? ""}`.localeCompare(`${b.sessionDate} ${b.sessionStartTime ?? ""}`))
      .map(([key, r]) => ({
        key,
        type: r.sessionType as RaceGroup,
        eventTrack: r.eventTrack ?? "",
        sessionName: r.sessionName ?? "",
        sessionDate: r.sessionDate ?? "",
        label: [eventFilter === "" ? r.eventTrack : null, r.sessionName, r.sessionDate].filter(Boolean).join(" · "),
      }));
  }, [scopedData, eventFilter]);


  // One row per driver + class, ranked by total points within each class
  const totals = useMemo(() => {
    const byDriver = new Map<string, DriverTotals & { raceKeys: Set<string> }>();
    for (const r of scopedData) {
      const carClass = (r.carClass ?? "").trim().toUpperCase();
      const key = `${r.driverId}|${carClass}`;
      const t = byDriver.get(key) ?? {
        key, driverId: r.driverId, rank: 0, driverName: r.driverName ?? "—", carClass, races: 0, raceKeys: new Set<string>(),
        racePoints: 0, bonusPoints: 0, bonusRacePoints: 0, totalPoints: 0, byRace: {} as Record<string, number>,
      };
      t.raceKeys.add(r.sessionId ? raceKey(r) : `row-${r.id}`);
      if (r.sessionType === "Race" || r.sessionType === "Bonus Race") {
        const k = raceKey(r);
        t.byRace[k] = (t.byRace[k] ?? 0) + r.totalPoints;
      }
      t.racePoints += r.racePoints;
      t.bonusPoints += r.bonusPoints;
      t.bonusRacePoints += r.bonusRacePoints;
      t.totalPoints += r.totalPoints;
      byDriver.set(key, t);
    }
    const rows = [...byDriver.values()]
      .map(({ raceKeys, ...t }) => ({ ...t, races: raceKeys.size }))
      .sort((a, b) => a.carClass.localeCompare(b.carClass) || b.totalPoints - a.totalPoints || a.driverName.localeCompare(b.driverName));
    // Ties share a rank (1, 2, 2, 4)
    let classStart = 0;
    rows.forEach((t, i) => {
      const prev = rows[i - 1];
      if (!prev || prev.carClass !== t.carClass) classStart = i;
      t.rank = prev && prev.carClass === t.carClass && prev.totalPoints === t.totalPoints ? prev.rank : i - classStart + 1;
    });
    return rows;
  }, [scopedData]);

  // Drivers in the top 3 of any class for the selected season (or event)
  const classPodiumDriverIds = useMemo(
    () => new Set(totals.filter((t) => t.carClass && t.rank <= PODIUM).map((t) => t.driverId)),
    [totals]
  );

  const matchesColumnFilters = (driverId: number, carClass: string | null | undefined) =>
    (classFilter === "" || normClass(carClass) === classFilter) &&
    (masterFilter === "" || masterDriverIds.has(driverId)) &&
    (masterFilter !== "noPodium" || !classPodiumDriverIds.has(driverId));

  // Ordered by race (date + start time), then finishing position overall; unplaced (0) rows last.
  // Results keep their original row order when a recalculation updates them, so sort explicitly.
  const filteredData = useMemo(
    () => scopedData
      .filter((r) =>
        (raceFilter === "" || raceKey(r) === raceFilter) && matchesColumnFilters(r.driverId, r.carClass))
      .sort((a, b) =>
        `${a.sessionDate ?? ""} ${a.sessionStartTime ?? ""}`.localeCompare(`${b.sessionDate ?? ""} ${b.sessionStartTime ?? ""}`) ||
        raceKey(a).localeCompare(raceKey(b)) ||
        (a.positionOverall || Infinity) - (b.positionOverall || Infinity) ||
        a.id - b.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopedData, raceFilter, classFilter, masterFilter, masterDriverIds, classPodiumDriverIds]
  );

  // Applied after ranking, so a driver keeps their place in class.
  // The Masters views rank the remaining drivers by total points across classes.
  const visibleTotals = useMemo(() => {
    const rows = totals.filter((t) => matchesColumnFilters(t.driverId, t.carClass));
    if (masterFilter === "") return rows;
    const ranked = rows
      .map((t) => ({ ...t }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.driverName.localeCompare(b.driverName));
    ranked.forEach((t, i) => {
      const prev = ranked[i - 1];
      t.rank = prev && prev.totalPoints === t.totalPoints ? prev.rank : i + 1;
    });
    return ranked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals, classFilter, masterFilter, masterDriverIds, classPodiumDriverIds]);

  // Drop a race selection that no longer exists under the season/event filters
  useEffect(() => {
    if (raceFilter !== "" && !races.some((r) => r.key === raceFilter)) setRaceFilter("");
  }, [races, raceFilter]);

  // Wide enough for the longest track name and for the "#n track" select in edit/add rows
  const eventWidth = useMemo(() => {
    const viewChars = Math.max(1, ...events.map((e) => e.track.length));
    const selectChars = Math.max("— event —".length, ...events.map((e) => eventLabel(e).length));
    return Math.ceil(Math.max(viewChars * MONO_XS, selectChars * MONO_SM + SELECT_CHROME));
  }, [events]);
  const gridStyle = { gridTemplateColumns: gridCols(eventWidth, debug, isBonusRace) };
  // Fixed columns + event column + room for comments, less the hidden Session / Bon Race columns
  const tableMinWidth = 1580 + eventWidth - (debug ? 0 : 80) - (isBonusRace ? 0 : 60);

  const table = useTable({ features, columns, data: filteredData });

  // Per-race columns only for a whole season (All events + All races)
  const showRaceCols = seasonFilter !== "" && eventFilter === "" && raceFilter === "";
  const raceGroups = useMemo(
    () => showRaceCols
      ? RACE_GROUPS
          .map((g) => ({ ...g, races: races.filter((r) => r.type === g.type) }))
          .filter((g) => g.races.length > 0)
      : [],
    [showRaceCols, races]
  );
  const totalsGridStyle = {
    gridTemplateColumns: [
      TOTALS_BASE_COLS,
      ...raceGroups.map((g) => collapsed[g.type] ? COLLAPSED_COL : g.races.map(() => RACE_COL).join(" ")),
    ].join(" "),
  };
  const totalsMinWidth = 800 + raceGroups.reduce(
    (w, g) => w + (collapsed[g.type] ? parseInt(COLLAPSED_COL) : g.races.length * parseInt(RACE_COL)), 0);
  const groupSum = (t: DriverTotals, keys: string[]) =>
    keys.reduce((sum, k) => sum + (t.byRace[k] ?? 0), 0);
  const toggleGroup = (type: RaceGroup) => setCollapsed((c) => ({ ...c, [type]: !c[type] }));

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {calcError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="alertdialog" aria-modal="true">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-[560px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900 tracking-widest uppercase">
              Missing starting position
            </div>
            <pre className="px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-auto">{calcError}</pre>
            <p className="px-4 pb-3 text-[11px] text-gray-500">
              Add the entrant to the Qualify session, or set Start on their result, then run Calculate again.
            </p>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <Btn onClick={() => setCalcError("")}>Dismiss</Btn>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Points
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
          <div className="w-64">
            <Sel value={raceFilter} disabled={seasonFilter === ""} onChange={(e) => setRaceFilter(e.target.value)}>
              <option value="">All races</option>
              {races.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Sel>
          </div>
          <div className="w-56">
            <Sel value={masterFilter} disabled={seasonFilter === ""}
              onChange={(e) => setMasterFilter(e.target.value as MasterFilter)}>
              <option value="">All drivers</option>
              <option value="yes">Masters only</option>
              <option value="noPodium">Masters, not class top {PODIUM}</option>
            </Sel>
          </div>
          <Btn onClick={calculate}>{raceFilter !== "" ? "Calculate Race" : eventFilter === "" ? "Calculate Season" : "Calculate Event"}</Btn>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      </div>

      {calcStatus && <p className="text-xs text-gray-500 flex-shrink-0">{calcStatus}</p>}
      {!calcStatus && (
        <p className="text-xs text-gray-400 flex-shrink-0">
          {seasonFilter === ""
            ? "Select a season or event to calculate its Results from Sessions"
            : `Points use ${seasonModelLabel}`}
        </p>
      )}

      {!loading && seasonFilter === "" && (
        <div className="py-10 text-center text-xs text-gray-400 border border-gray-200 rounded-lg bg-white">
          Select a season to view points
        </div>
      )}

      {/* Season (or event) totals until a single race is chosen */}
      {seasonFilter !== "" && raceFilter === "" && (
        <div className="flex-1 overflow-auto min-h-0">
          <div className="border border-gray-200 rounded-lg overflow-clip bg-white" style={{ minWidth: totalsMinWidth }}>
            <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              {/* Collapsible group headers over the per-race columns */}
              {raceGroups.length > 0 && (
                <div style={totalsGridStyle} className={`${TOTALS_GRID} pt-2`}>
                  <span style={{ gridColumn: `span ${TOTALS_BASE_COUNT}` }} />
                  {raceGroups.map((g) => (
                    <button key={g.type} type="button" onClick={() => toggleGroup(g.type)}
                      title={collapsed[g.type] ? `Show ${g.label}` : `Hide ${g.label}`}
                      style={{ gridColumn: `span ${collapsed[g.type] ? 1 : g.races.length}` }}
                      className="flex items-center gap-1 border-b border-gray-300 pb-1 mx-1 text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-800 cursor-pointer whitespace-nowrap overflow-hidden">
                      {collapsed[g.type] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      {g.label} ({g.races.length})
                    </button>
                  ))}
                </div>
              )}
              <div style={totalsGridStyle} className={`${TOTALS_GRID} py-2`}>
                {["Pos", "Driver", "Class", "Races", "Race", "Bonus", "Bonus Race", "Total"].map((h) => (
                  <span key={h} className="text-[10px] uppercase tracking-widest text-gray-400">
                    {h === "Class" ? classHeader() : h === "Pos" && masterFilter !== "" ? "M Pos" : h}
                  </span>
                ))}
                {raceGroups.map((g) => collapsed[g.type] ? (
                  <span key={g.type} className="text-[10px] uppercase tracking-widest text-gray-400 px-1">Sum</span>
                ) : g.races.map((r) => (
                  <span key={r.key} title={r.label} className="text-[10px] leading-tight text-gray-400 px-1 min-w-0">
                    <span className="block truncate uppercase tracking-wider">{r.eventTrack}</span>
                    <span className="block truncate">{r.sessionName}</span>
                  </span>
                )))}
              </div>
            </div>
            {loading && <div className="py-10 text-center text-xs text-gray-400">Loading...</div>}
            {!loading && visibleTotals.length === 0 && (
              <div className="py-10 text-center text-xs text-gray-400">No points for the selected filters</div>
            )}
            {!loading && visibleTotals.map((t) => (
              <div key={t.key} style={totalsGridStyle} className={`${TOTALS_GRID} py-2 border-b border-gray-200/70 last:border-0 hover:bg-gray-50 transition-colors text-xs`}>
                <span className="text-gray-400">{t.rank}</span>
                <span className="text-gray-800 truncate">{t.driverName}</span>
                <span className="text-gray-500">{t.carClass}</span>
                <span className="text-gray-500">{t.races}</span>
                <span className="text-gray-500">{t.racePoints}</span>
                <span className="text-gray-500">{t.bonusPoints}</span>
                <span className="text-gray-500">{t.bonusRacePoints}</span>
                <span className="text-gray-900 font-semibold">{t.totalPoints}</span>
                {raceGroups.map((g) => collapsed[g.type] ? (
                  <span key={g.type} className="text-gray-700 px-1">{groupSum(t, g.races.map((r) => r.key))}</span>
                ) : g.races.map((r) => (
                  <span key={r.key} className="text-gray-500 px-1">{t.byRace[r.key] ?? "—"}</span>
                )))}
              </div>
            ))}
          </div>
        </div>
      )}

      {seasonFilter !== "" && raceFilter !== "" && (
      <div className="flex-1 overflow-auto min-h-0">
        <div className="border border-gray-200 rounded-lg overflow-clip bg-white" style={{ minWidth: tableMinWidth }}>
          {/* Header */}
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} style={gridStyle} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10`}>
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
            <div style={gridStyle} className={`${GRID} py-2 border-t border-gray-300 bg-gray-50 sticky bottom-0 z-10`}>
              {debug && <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>}
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
              {debug && <Inp value={newRow.sessionId} placeholder="session"
                onChange={(e) => setNewRow((v) => ({ ...v, sessionId: e.target.value }))} />}
              <div className="pr-3">
                <Sel value={newRow.carClass}
                  onChange={(e) => setNewRow((v) => ({ ...v, carClass: e.target.value }))}>
                  {pickOptions(pickLists.carClass, newRow.carClass)}
                </Sel>
              </div>
              <Inp value={String(newRow.positionOverall)} placeholder="poa"
                onChange={(e) => setNewRow((v) => ({ ...v, positionOverall: Number(e.target.value) }))} />
              <Inp value={String(newRow.positionInClass)} placeholder="pic"
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
              <Inp value={String(newRow.totalPoints)} placeholder="tot"
                onChange={(e) => setNewRow((v) => ({ ...v, totalPoints: Number(e.target.value) }))} />
              {isBonusRace && <Inp value={String(newRow.bonusRacePoints)} placeholder="br"
                onChange={(e) => setNewRow((v) => ({ ...v, bonusRacePoints: Number(e.target.value) }))} />}
              <Sel value={newRow.tireBrand}
                onChange={(e) => setNewRow((v) => ({ ...v, tireBrand: e.target.value }))}>
                {pickOptions(pickLists.tireBrand, newRow.tireBrand)}
              </Sel>
              <Inp value={newRow.classification} placeholder="class'n"
                onChange={(e) => setNewRow((v) => ({ ...v, classification: e.target.value }))} />
              <Inp value={newRow.comments} placeholder="comments"
                onChange={(e) => setNewRow((v) => ({ ...v, comments: e.target.value }))} />
              <Btn onClick={create}>Add</Btn>
            </div>
          )}
        </div>
      </div>
      )}

      {!loading && seasonFilter !== "" && raceFilter !== "" && (
        <p className="text-[11px] text-gray-400 flex-shrink-0">{filteredData.length} results</p>
      )}
    </div>
  );
}
