import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllEvents, addEvent, updateEvent, deleteEvent } from "@/lib/api/event";
import { getAllSeasons } from "@/lib/api/season";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Season,
  type Event,
  type EventWithDetails,
  type InsertEvent,
  type UpdateEvent,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, EventWithDetails>();
const EMPTY: EventWithDetails[] = [];
const EMPTY_NEW: Omit<InsertEvent, "id"> = {
  track: "",
  sanction: "",
  dates: "",
  number: 1,
  seasonId: 0,
  pointModel: "",
};
const GRID =
  "grid grid-cols-[50px_160px_1fr_100px_130px_70px_120px_170px] items-center px-4";

export function EventTablePage() {
  const [data, setData] = useState<EventWithDetails[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Event>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [evRes, snRes] = await Promise.all([getAllEvents(), getAllSeasons()]);
    setData((evRes?.data as EventWithDetails[]) ?? EMPTY);
    setSeasons((snRes?.data as Season[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: EventWithDetails) {
    editRef.current = {
      id: row.id,
      track: row.track,
      sanction: row.sanction,
      dates: row.dates,
      number: row.number,
      seasonId: row.seasonId,
      pointModel: row.pointModel,
    };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateEvent(editingId, editRef.current as UpdateEvent);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function remove(id: number) {
    await deleteEvent(id);
    load();
  }

  async function create() {
    await addEvent(newRow as InsertEvent);
    setNewRow({ ...EMPTY_NEW });
    await load();
  }

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: "ID",
          cell: (info) => (
            <span className="text-gray-400 text-xs">{info.getValue()}</span>
          ),
        }),
        col.display({
          id: "season",
          header: "Season",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel
                key={`seasonId-${editingId}`}
                defaultValue={editRef.current.seasonId ?? ""}
                onChange={(e) => {
                  editRef.current = { ...editRef.current, seasonId: Number(e.target.value) };
                }}
              >
                <option value="">— season —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.year})
                  </option>
                ))}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs truncate">
                {info.row.original.seasonName ?? "—"}
              </span>
            ),
        }),
        col.accessor("track", {
          header: "Track",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`track-${editingId}`}
                defaultValue={editRef.current.track ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, track: e.target.value }; }}
              />
            ) : (
              <span className="text-gray-800 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("sanction", {
          header: "Sanction",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`sanction-${editingId}`}
                defaultValue={editRef.current.sanction ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, sanction: e.target.value }; }}
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("dates", {
          header: "Dates",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`dates-${editingId}`}
                defaultValue={editRef.current.dates ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, dates: e.target.value }; }}
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("number", {
          header: "Num",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`number-${editingId}`}
                defaultValue={String(editRef.current.number ?? "")}
                onChange={(e) => { editRef.current = { ...editRef.current, number: Number(e.target.value) }; }}
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("pointModel", {
          header: "Point Model",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`pointModel-${editingId}`}
                defaultValue={editRef.current.pointModel ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, pointModel: e.target.value }; }}
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
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
    [editingId, seasons]
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
            Events
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

        {loading && (
          <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
        )}
        {!loading && data.length === 0 && (
          <div className="py-10 text-center text-xs text-gray-400">No events</div>
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
              value={newRow.seasonId || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, seasonId: Number(e.target.value) }))}
            >
              <option value="">— season —</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.year})
                </option>
              ))}
            </Sel>
            <Inp
              value={newRow.track}
              placeholder="track"
              onChange={(e) => setNewRow((v) => ({ ...v, track: e.target.value }))}
            />
            <Inp
              value={newRow.sanction}
              placeholder="sanction"
              onChange={(e) => setNewRow((v) => ({ ...v, sanction: e.target.value }))}
            />
            <Inp
              value={newRow.dates}
              placeholder="dates"
              onChange={(e) => setNewRow((v) => ({ ...v, dates: e.target.value }))}
            />
            <Inp
              value={String(newRow.number)}
              placeholder="num"
              onChange={(e) => setNewRow((v) => ({ ...v, number: Number(e.target.value) }))}
            />
            <Inp
              value={newRow.pointModel}
              placeholder="point model"
              onChange={(e) => setNewRow((v) => ({ ...v, pointModel: e.target.value }))}
            />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400">{data.length} events</p>
      )}
    </div>
  );
}
