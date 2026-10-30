import { getAllSeasons, addSeason, updateSeason, deleteSeason } from "@/lib/api/season";
import { getAllEvents, addEvent, updateEvent, deleteEvent } from "@/lib/api/event";
import { getAllSessions, updateSessionGroup, type SessionGroupKey } from "@/lib/api/session";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  type Season,
  type InsertSeason,
  type UpdateSeason,
  type Event,
  type EventWithDetails,
  type InsertEvent,
  type UpdateEvent,
  type Session,
  type SessionWithDetails,
  type UpdateSession,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const EMPTY_SEASON = { name: "", year: new Date().getFullYear() };
const EMPTY_EVENT: Omit<InsertEvent, "id"> = {
  track: "",
  sanction: "",
  dates: "",
  number: 1,
  seasonId: 0,
  pointModel: "",
};

// Each level indents further; header labels line up with their own level's grid.
// Season: id  name  year  events  actions
const SEASON_GRID = "grid grid-cols-[60px_1fr_100px_90px_250px] items-center gap-2 px-4";
// Event: id  track  sanction  dates  num  point model  actions
const EVENT_GRID =
  "grid grid-cols-[130px_1fr_100px_130px_60px_120px_170px] items-center gap-2 pl-10 pr-4";
// Session: indent  type  name  date  start  seq  race#  drivers  actions
const SESSION_GRID =
  "grid grid-cols-[50px_120px_1fr_120px_90px_60px_60px_70px_170px] items-center gap-2 pl-24 pr-4";
const LABEL = "text-[10px] uppercase tracking-widest text-gray-400";

const SESSION_TYPES = ["Practice", "Qualify", "Race", "Bonus Race"] as const;

// One session = the driver rows sharing event + type + name + date + start time
type SessionGroup = { key: string; first: SessionWithDetails; count: number };
const groupKey = (s: Session) =>
  [s.eventId, s.sessionType, s.name, s.sessionDate, s.sessionStartTime ?? ""].join("|");
const toGroupKey = (s: Session): SessionGroupKey => ({
  eventId: s.eventId,
  sessionType: s.sessionType,
  name: s.name,
  sessionDate: s.sessionDate,
  sessionStartTime: s.sessionStartTime,
});
const sessionSort = (s: Session) =>
  `${s.sessionDate} ${s.sessionStartTime ?? ""} ${s.eventSequence ?? ""}`;

// Events whose season is missing are listed under a pseudo-season so they never vanish
const UNASSIGNED = 0;
type SeasonGroup = { id: number; season: Season | null; events: EventWithDetails[] };

type Editing = { kind: "season" | "event" | "session"; key: string } | null;

// Blank numeric inputs clear the field rather than storing 0
const optNum = (v: string) => (v.trim() === "" ? null : Number(v));

function Toggle({ open, disabled, onClick, children }: {
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer disabled:cursor-default"
    >
      <span className="w-2.5 text-[10px]">{disabled ? "" : open ? "▾" : "▸"}</span>
      {children}
    </button>
  );
}

export function SeasonTablePage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set());
  const [openEvents, setOpenEvents] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Editing>(null);
  // Refs instead of state so typing doesn't re-render the whole tree
  const seasonEditRef = useRef<Partial<Season>>({});
  const eventEditRef = useRef<Partial<Event>>({});
  const sessionEditRef = useRef<Partial<Session>>({});
  const [newSeason, setNewSeason] = useState({ ...EMPTY_SEASON });
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({ ...EMPTY_EVENT });
  const firstLoad = useRef(true);

  async function load() {
    setLoading(true);
    const [snRes, evRes, sesRes] = await Promise.all([
      getAllSeasons(),
      getAllEvents(),
      getAllSessions(),
    ]);
    const sn = (snRes?.data as Season[]) ?? [];
    setSeasons(sn);
    setEvents((evRes?.data as EventWithDetails[]) ?? []);
    setSessions((sesRes?.data as SessionWithDetails[]) ?? []);
    // Open the newest season on first visit
    if (firstLoad.current && sn.length) {
      firstLoad.current = false;
      const newest = [...sn].sort((a, b) => b.year - a.year || b.id - a.id)[0];
      setOpenSeasons(new Set([newest.id]));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const seasonGroups = useMemo(() => {
    const byId = new Map<number, SeasonGroup>(
      [...seasons]
        .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))
        .map((s) => [s.id, { id: s.id, season: s, events: [] }])
    );
    const unassigned: SeasonGroup = { id: UNASSIGNED, season: null, events: [] };
    for (const e of events) (byId.get(e.seasonId) ?? unassigned).events.push(e);
    const groups = [...byId.values()];
    if (unassigned.events.length) groups.push(unassigned);
    for (const g of groups) g.events.sort((a, b) => a.number - b.number);
    return groups;
  }, [seasons, events]);

  const sessionsByEvent = useMemo(() => {
    const groups = new Map<string, SessionGroup>();
    for (const s of sessions) {
      const k = groupKey(s);
      const g = groups.get(k);
      if (g) g.count++;
      else groups.set(k, { key: k, first: s, count: 1 });
    }
    const byEvent = new Map<number, SessionGroup[]>();
    for (const g of groups.values()) {
      byEvent.set(g.first.eventId, [...(byEvent.get(g.first.eventId) ?? []), g]);
    }
    for (const list of byEvent.values()) {
      list.sort((a, b) => sessionSort(a.first).localeCompare(sessionSort(b.first)));
    }
    return byEvent;
  }, [sessions]);

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function expandAll() {
    setOpenSeasons(new Set(seasonGroups.map((g) => g.id)));
    setOpenEvents(new Set(events.map((e) => e.id)));
  }

  function collapseAll() {
    setOpenSeasons(new Set());
    setOpenEvents(new Set());
  }

  function cancelEdit() {
    seasonEditRef.current = {};
    eventEditRef.current = {};
    sessionEditRef.current = {};
    setEditing(null);
  }

  const isEditing = (kind: NonNullable<Editing>["kind"], key: string | number) =>
    editing?.kind === kind && editing.key === String(key);

  // Runs a write, surfacing a failed response instead of silently reloading
  async function run(action: () => Promise<{ code: number; message: string } | undefined>) {
    setError(null);
    const res = await action();
    const ok = !res || res.code === 200;
    if (ok) cancelEdit();
    else setError(res.message);
    await load();
    return ok;
  }

  // --- seasons ---
  function startSeasonEdit(s: Season) {
    cancelEdit();
    seasonEditRef.current = { name: s.name, year: s.year };
    setEditing({ kind: "season", key: String(s.id) });
  }

  async function createSeason() {
    if (await run(() => addSeason(newSeason as InsertSeason))) setNewSeason({ ...EMPTY_SEASON });
  }

  // --- events ---
  function startEventEdit(e: EventWithDetails) {
    cancelEdit();
    eventEditRef.current = {
      track: e.track,
      sanction: e.sanction,
      dates: e.dates,
      number: e.number,
      seasonId: e.seasonId,
      pointModel: e.pointModel,
    };
    setEditing({ kind: "event", key: String(e.id) });
  }

  function startAddEvent(g: SeasonGroup) {
    const last = g.events.at(-1);
    setNewEvent({
      ...EMPTY_EVENT,
      seasonId: g.id,
      number: (last?.number ?? 0) + 1,
      sanction: last?.sanction ?? "",
      pointModel: last?.pointModel ?? "",
    });
    setAddingTo(g.id);
    setOpenSeasons((prev) => new Set(prev).add(g.id));
  }

  async function createEvent() {
    if (!(await run(() => addEvent(newEvent as InsertEvent)))) return;
    setAddingTo(null);
    setNewEvent({ ...EMPTY_EVENT });
  }

  async function removeEvent(e: EventWithDetails) {
    const n = sessionsByEvent.get(e.id)?.length ?? 0;
    const warn = n ? `\n\nIts ${n} session${n === 1 ? "" : "s"} will be left without an event.` : "";
    if (!window.confirm(`Delete event ${e.track}?${warn}`)) return;
    await run(() => deleteEvent(e.id));
  }

  // --- sessions ---
  function startSessionEdit(g: SessionGroup) {
    cancelEdit();
    sessionEditRef.current = {
      name: g.first.name,
      sessionType: g.first.sessionType,
      sessionDate: g.first.sessionDate,
      sessionStartTime: g.first.sessionStartTime,
      eventSequence: g.first.eventSequence,
      seasonRaceNumber: g.first.seasonRaceNumber,
    };
    setEditing({ kind: "session", key: g.key });
  }

  function renderSeason(g: SeasonGroup) {
    const s = g.season;
    const open = openSeasons.has(g.id);
    const editingThis = s != null && isEditing("season", s.id);
    const ref = seasonEditRef;
    return (
      <div className={`${SEASON_GRID} py-3 border-b border-gray-200/70 bg-white hover:bg-gray-50 transition-colors`}>
        <Toggle open={open} onClick={() => toggle(setOpenSeasons, g.id)}>
          {s?.id ?? "—"}
        </Toggle>
        {editingThis ? (
          <>
            <Inp
              key={`sname-${s.id}`}
              defaultValue={ref.current.name ?? ""}
              onChange={(e) => { ref.current = { ...ref.current, name: e.target.value }; }}
            />
            <Inp
              key={`syear-${s.id}`}
              defaultValue={String(ref.current.year ?? "")}
              onChange={(e) => { ref.current = { ...ref.current, year: Number(e.target.value) }; }}
            />
          </>
        ) : (
          <>
            <span className="text-gray-900 text-xs font-semibold truncate">
              {s?.name ?? "Unassigned"}
            </span>
            <span className="text-gray-500 text-xs">{s?.year ?? ""}</span>
          </>
        )}
        <span className="text-gray-400 text-xs">{g.events.length} events</span>
        {s == null ? (
          <span />
        ) : editingThis ? (
          <div className="flex gap-1.5">
            <Btn onClick={() => run(() => updateSeason(s.id, ref.current as UpdateSeason))}>Save</Btn>
            <Btn onClick={cancelEdit}>Cancel</Btn>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Btn onClick={() => startAddEvent(g)}>+ Event</Btn>
            <Btn onClick={() => startSeasonEdit(s)}>Edit</Btn>
            <Btn danger onClick={() => run(() => deleteSeason(s.id))}>Delete</Btn>
          </div>
        )}
      </div>
    );
  }

  function renderEvent(e: EventWithDetails) {
    const eventSessions = sessionsByEvent.get(e.id) ?? [];
    const open = eventSessions.length > 0 && openEvents.has(e.id);
    const editingThis = isEditing("event", e.id);
    const ref = eventEditRef;
    return (
      <Fragment key={e.id}>
        <div className={`${EVENT_GRID} py-2.5 border-b border-gray-200/70 hover:bg-gray-50 transition-colors`}>
          {editingThis ? (
            // Moving an event to another season
            <Sel
              key={`eseason-${e.id}`}
              defaultValue={ref.current.seasonId ?? ""}
              onChange={(ev) => { ref.current = { ...ref.current, seasonId: Number(ev.target.value) }; }}
            >
              <option value={UNASSIGNED}>— season —</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.year})
                </option>
              ))}
            </Sel>
          ) : (
            <Toggle
              open={open}
              disabled={eventSessions.length === 0}
              onClick={() => toggle(setOpenEvents, e.id)}
            >
              {e.id}
            </Toggle>
          )}
          {editingThis ? (
            <>
              <Inp
                key={`track-${e.id}`}
                defaultValue={ref.current.track ?? ""}
                onChange={(ev) => { ref.current = { ...ref.current, track: ev.target.value }; }}
              />
              <Inp
                key={`sanction-${e.id}`}
                defaultValue={ref.current.sanction ?? ""}
                onChange={(ev) => { ref.current = { ...ref.current, sanction: ev.target.value }; }}
              />
              <Inp
                key={`dates-${e.id}`}
                defaultValue={ref.current.dates ?? ""}
                onChange={(ev) => { ref.current = { ...ref.current, dates: ev.target.value }; }}
              />
              <Inp
                key={`number-${e.id}`}
                defaultValue={String(ref.current.number ?? "")}
                onChange={(ev) => { ref.current = { ...ref.current, number: Number(ev.target.value) }; }}
              />
              <Inp
                key={`pointModel-${e.id}`}
                defaultValue={ref.current.pointModel ?? ""}
                onChange={(ev) => { ref.current = { ...ref.current, pointModel: ev.target.value }; }}
              />
              <div className="flex gap-1.5">
                <Btn onClick={() => run(() => updateEvent(e.id, ref.current as UpdateEvent))}>Save</Btn>
                <Btn onClick={cancelEdit}>Cancel</Btn>
              </div>
            </>
          ) : (
            <>
              <span className="text-gray-800 text-xs truncate">{e.track}</span>
              <span className="text-gray-500 text-xs truncate">{e.sanction}</span>
              <span className="text-gray-500 text-xs truncate">{e.dates}</span>
              <span className="text-gray-500 text-xs">{e.number}</span>
              <span className="text-gray-500 text-xs truncate">{e.pointModel}</span>
              <div className="flex gap-1.5">
                <Btn onClick={() => startEventEdit(e)}>Edit</Btn>
                <Btn danger onClick={() => removeEvent(e)}>Delete</Btn>
              </div>
            </>
          )}
        </div>
        {open && (
          <div className={`${SESSION_GRID} py-1 border-b border-gray-200/70 bg-gray-50/60`}>
            {["", "Type", "Session", "Date", "Start", "Seq", "Race #", "Drivers", ""].map((h, i) => (
              <span key={i} className={LABEL}>{h}</span>
            ))}
          </div>
        )}
        {open && eventSessions.map(renderSession)}
      </Fragment>
    );
  }

  function renderNewEvent() {
    return (
      <div className={`${EVENT_GRID} py-2.5 border-b border-gray-200/70 bg-gray-50`}>
        <span className={LABEL}>new event</span>
        <Inp
          value={newEvent.track}
          placeholder="track"
          onChange={(e) => setNewEvent((v) => ({ ...v, track: e.target.value }))}
        />
        <Inp
          value={newEvent.sanction}
          placeholder="sanction"
          onChange={(e) => setNewEvent((v) => ({ ...v, sanction: e.target.value }))}
        />
        <Inp
          value={newEvent.dates}
          placeholder="dates"
          onChange={(e) => setNewEvent((v) => ({ ...v, dates: e.target.value }))}
        />
        <Inp
          value={String(newEvent.number)}
          placeholder="num"
          onChange={(e) => setNewEvent((v) => ({ ...v, number: Number(e.target.value) }))}
        />
        <Inp
          value={newEvent.pointModel}
          placeholder="point model"
          onChange={(e) => setNewEvent((v) => ({ ...v, pointModel: e.target.value }))}
        />
        <div className="flex gap-1.5">
          <Btn onClick={createEvent}>Add</Btn>
          <Btn onClick={() => setAddingTo(null)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  function renderSession(g: SessionGroup) {
    const s = g.first;
    const editingThis = isEditing("session", g.key);
    const ref = sessionEditRef;
    return (
      <div
        key={g.key}
        className={`${SESSION_GRID} py-2 border-b border-gray-200/70 bg-gray-50/60 hover:bg-gray-100/60 transition-colors`}
      >
        <span className="text-gray-300 text-xs text-right pr-2">└</span>
        {editingThis ? (
          <>
            <Sel
              key={`type-${g.key}`}
              defaultValue={ref.current.sessionType ?? ""}
              onChange={(e) => { ref.current = { ...ref.current, sessionType: e.target.value as Session["sessionType"] }; }}
            >
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Sel>
            <Inp
              key={`name-${g.key}`}
              defaultValue={ref.current.name ?? ""}
              onChange={(e) => { ref.current = { ...ref.current, name: e.target.value }; }}
            />
            <Inp
              key={`date-${g.key}`}
              defaultValue={ref.current.sessionDate ?? ""}
              placeholder="yyyy-mm-dd"
              onChange={(e) => { ref.current = { ...ref.current, sessionDate: e.target.value }; }}
            />
            <Inp
              key={`start-${g.key}`}
              defaultValue={ref.current.sessionStartTime ?? ""}
              placeholder="start"
              onChange={(e) => { ref.current = { ...ref.current, sessionStartTime: e.target.value || null }; }}
            />
            <Inp
              key={`seq-${g.key}`}
              defaultValue={ref.current.eventSequence == null ? "" : String(ref.current.eventSequence)}
              placeholder="seq"
              onChange={(e) => { ref.current = { ...ref.current, eventSequence: optNum(e.target.value) }; }}
            />
            <Inp
              key={`race-${g.key}`}
              defaultValue={ref.current.seasonRaceNumber == null ? "" : String(ref.current.seasonRaceNumber)}
              placeholder="race #"
              onChange={(e) => { ref.current = { ...ref.current, seasonRaceNumber: optNum(e.target.value) }; }}
            />
          </>
        ) : (
          <>
            <span className="text-gray-600 text-xs">{s.sessionType}</span>
            <span className="text-gray-800 text-xs truncate">{s.name}</span>
            <span className="text-gray-500 text-xs">{s.sessionDate}</span>
            <span className="text-gray-500 text-xs">{s.sessionStartTime ?? "—"}</span>
            <span className="text-gray-500 text-xs">{s.eventSequence ?? "—"}</span>
            <span className="text-gray-500 text-xs">{s.seasonRaceNumber ?? "—"}</span>
          </>
        )}
        <span className="text-gray-400 text-xs">{g.count} drv</span>
        {editingThis ? (
          <div className="flex gap-1.5">
            <Btn onClick={() => run(() => updateSessionGroup(toGroupKey(s), ref.current as UpdateSession))}>
              Save
            </Btn>
            <Btn onClick={cancelEdit}>Cancel</Btn>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Btn onClick={() => startSessionEdit(g)}>Edit</Btn>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Seasons
          </h1>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
        <div className="flex gap-1.5">
          <Btn onClick={expandAll}>Expand all</Btn>
          <Btn onClick={collapseAll}>Collapse all</Btn>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white min-h-0">
        {/* Header */}
        <div className={`${SEASON_GRID} py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0`}>
          {["ID", "Season", "Year", "Events", ""].map((h, i) => (
            <span key={i} className={LABEL}>{h}</span>
          ))}
        </div>

        {/* Scrollable rows */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
          )}
          {!loading && seasonGroups.length === 0 && (
            <div className="py-10 text-center text-xs text-gray-400">No seasons</div>
          )}
          {!loading &&
            seasonGroups.map((g) => {
              const open = openSeasons.has(g.id);
              return (
                <Fragment key={g.id}>
                  {renderSeason(g)}
                  {open && (g.events.length > 0 || addingTo === g.id) && (
                    <div className={`${EVENT_GRID} py-1 border-b border-gray-200/70 bg-gray-50/60`}>
                      {["ID", "Track", "Sanction", "Dates", "Num", "Point Model", ""].map((h, i) => (
                        <span key={i} className={LABEL}>{h}</span>
                      ))}
                    </div>
                  )}
                  {open && g.events.map(renderEvent)}
                  {open && addingTo === g.id && renderNewEvent()}
                </Fragment>
              );
            })}
        </div>

        {/* Add new season */}
        {!loading && (
          <div className={`${SEASON_GRID} py-3 border-t border-gray-300 bg-gray-50 flex-shrink-0`}>
            <span className={LABEL}>new</span>
            <Inp
              value={newSeason.name}
              placeholder="season name"
              onChange={(e) => setNewSeason((v) => ({ ...v, name: e.target.value }))}
            />
            <Inp
              value={String(newSeason.year)}
              placeholder="year"
              onChange={(e) => setNewSeason((v) => ({ ...v, year: Number(e.target.value) }))}
            />
            <span />
            <div>
              <Btn onClick={createSeason}>Add</Btn>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400 flex-shrink-0">
          {seasons.length} seasons · {events.length} events
        </p>
      )}
    </div>
  );
}
