import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllSessions, addSession, updateSession, deleteSession } from "@/lib/api/session";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllEvents } from "@/lib/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Driver,
  type EventWithDetails,
  type Session,
  type SessionWithDetails,
  type InsertSession,
  type UpdateSession,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, SessionWithDetails>();
const EMPTY: SessionWithDetails[] = [];
const EMPTY_NEW = {
  name: "",
  eventSequence: 0,
  seasonRaceNumber: 0,
  sessionType: "",
  sessionDate: "",
  sessionStartTime: "",
  driverId: 0,
  eventId: 0,
};

// id  name  evtSeq  snRace  type  date  time  driver  event  actions
const GRID = "grid grid-cols-[44px_1fr_70px_80px_100px_110px_100px_140px_140px_155px] items-center px-4";

export function SessionTablePage() {
  const [data, setData] = useState<SessionWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Session>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [sesRes, drvRes, evtRes] = await Promise.all([
      getAllSessions(),
      getAllDrivers(),
      getAllEvents(),
    ]);
    setData((sesRes?.data as SessionWithDetails[]) ?? EMPTY);
    setDrivers((drvRes?.data as Driver[]) ?? []);
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

  async function create() {
    await addSession(newRow as InsertSession);
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
        col.accessor("name", {
          header: "Name",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`name-${editingId}`} defaultValue={editRef.current.name ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, name: e.target.value }; }} />
            ) : (
              <span className="text-gray-800 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("eventSequence", {
          header: "Evt Seq",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`eventSequence-${editingId}`} defaultValue={String(editRef.current.eventSequence ?? "")}
                onChange={(e) => { editRef.current = { ...editRef.current, eventSequence: Number(e.target.value) }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("seasonRaceNumber", {
          header: "Sn Race #",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`seasonRaceNumber-${editingId}`} defaultValue={String(editRef.current.seasonRaceNumber ?? "")}
                onChange={(e) => { editRef.current = { ...editRef.current, seasonRaceNumber: Number(e.target.value) }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("sessionType", {
          header: "Type",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`sessionType-${editingId}`} defaultValue={editRef.current.sessionType ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, sessionType: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("sessionDate", {
          header: "Date",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input key={`sessionDate-${editingId}`} type="date"
                defaultValue={editRef.current.sessionDate ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, sessionDate: e.target.value }; }}
                className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-800 font-mono outline-none focus:border-gray-500 w-full"
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("sessionStartTime", {
          header: "Start Time",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input key={`sessionStartTime-${editingId}`} type="time"
                defaultValue={editRef.current.sessionStartTime ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, sessionStartTime: e.target.value }; }}
                className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-800 font-mono outline-none focus:border-gray-500 w-full"
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
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
        col.display({
          id: "event",
          header: "Event",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel key={`eventId-${editingId}`} defaultValue={editRef.current.eventId ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, eventId: Number(e.target.value) }; }}>
                <option value="">— event —</option>
                {events.map((e) => <option key={e.id} value={e.id}>#{e.number} {e.track}</option>)}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs truncate block">{info.row.original.eventTrack ?? "—"}</span>
            ),
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

  const table = useTable({ features, columns, data });

  return (
    <div className="flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Sessions
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white min-w-[1100px]">
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
          <div className="py-10 text-center text-xs text-gray-400">No sessions</div>
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
            <Inp value={newRow.name} placeholder="name"
              onChange={(e) => setNewRow((v) => ({ ...v, name: e.target.value }))} />
            <Inp value={String(newRow.eventSequence)} placeholder="seq"
              onChange={(e) => setNewRow((v) => ({ ...v, eventSequence: Number(e.target.value) }))} />
            <Inp value={String(newRow.seasonRaceNumber)} placeholder="sn#"
              onChange={(e) => setNewRow((v) => ({ ...v, seasonRaceNumber: Number(e.target.value) }))} />
            <Inp value={newRow.sessionType} placeholder="type"
              onChange={(e) => setNewRow((v) => ({ ...v, sessionType: e.target.value }))} />
            <input type="date" value={newRow.sessionDate}
              onChange={(e) => setNewRow((v) => ({ ...v, sessionDate: e.target.value }))}
              className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-800 font-mono outline-none focus:border-gray-500 w-full"
            />
            <input type="time" value={newRow.sessionStartTime}
              onChange={(e) => setNewRow((v) => ({ ...v, sessionStartTime: e.target.value }))}
              className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-800 font-mono outline-none focus:border-gray-500 w-full"
            />
            <Sel value={newRow.driverId || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, driverId: Number(e.target.value) }))}>
              <option value="">— driver —</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Sel>
            <Sel value={newRow.eventId || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, eventId: Number(e.target.value) }))}>
              <option value="">— event —</option>
              {events.map((e) => <option key={e.id} value={e.id}>#{e.number} {e.track}</option>)}
            </Sel>
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400">{data.length} sessions</p>
      )}
    </div>
  );
}
