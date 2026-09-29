import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { getAllSeasons, addSeason, updateSeason, deleteSeason } from "@/lib/api/season";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Season, type InsertSeason, type UpdateSeason } from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, Season>();
const EMPTY: Season[] = [];
const EMPTY_NEW = { name: "", year: new Date().getFullYear() };
const GRID = "grid grid-cols-[50px_1fr_100px_170px] items-center px-4";

export function SeasonTablePage() {
  const [data, setData] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Ref instead of state so typing doesn't trigger re-renders through TanStack Table's
  // cell memoization, which would reset controlled inputs to their stale value.
  const editRef = useRef<Partial<Season>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const res = await getAllSeasons();
    setData((res?.data as Season[]) ?? EMPTY);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: Season) {
    editRef.current = { id: row.id, name: row.name, year: row.year };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateSeason(editingId, editRef.current as UpdateSeason);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function remove(id: number) {
    await deleteSeason(id);
    load();
  }

  async function create() {
    await addSeason(newRow as InsertSeason);
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
        col.accessor("name", {
          header: "Name",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`name-${editingId}`}
                defaultValue={editRef.current.name ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, name: e.target.value }; }}
              />
            ) : (
              <span className="text-gray-800 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("year", {
          header: "Year",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                key={`year-${editingId}`}
                defaultValue={String(editRef.current.year ?? "")}
                onChange={(e) => { editRef.current = { ...editRef.current, year: Number(e.target.value) }; }}
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
    [editingId]
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
            Seasons
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[500px] bg-white">
        {/* Header */}
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50`}>
            {hg.headers.map((header) => (
              <span
                key={header.id}
                className="text-[10px] uppercase tracking-widest text-gray-400"
              >
                <table.FlexRender header={header} />
              </span>
            ))}
          </div>
        ))}

        {loading && (
          <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
        )}
        {!loading && data.length === 0 && (
          <div className="py-10 text-center text-xs text-gray-400">No seasons</div>
        )}
        {!loading &&
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={`${GRID} py-3 border-b border-gray-200/70 last:border-0 hover:bg-gray-50 transition-colors`}
            >
              {row.getAllCells().map((cell) => (
                <div key={cell.id}>
                  <table.FlexRender cell={cell} />
                </div>
              ))}
            </div>
          ))}

        {/* Add new row */}
        {!loading && (
          <div className={`${GRID} py-3 border-t border-gray-300 bg-gray-50`}>
            <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>
            <Inp
              value={newRow.name}
              placeholder="name"
              onChange={(e) => setNewRow((v) => ({ ...v, name: e.target.value }))}
            />
            <Inp
              value={String(newRow.year)}
              placeholder="year"
              onChange={(e) => setNewRow((v) => ({ ...v, year: Number(e.target.value) }))}
            />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400">{data.length} seasons</p>
      )}
    </div>
  );
}
