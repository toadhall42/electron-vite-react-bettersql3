import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  getAllVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/lib/api/vehicle";
import { useEffect, useMemo, useState } from "react";
import { type Vehicle, type InsertVehicle, type UpdateVehicle } from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, Vehicle>();
const EMPTY: Vehicle[] = [];
const EMPTY_NEW = { make: "", model: "", year: "", class: "", transponder: "", chassisid: "" };
const GRID = "grid grid-cols-[60px_1fr_1fr_70px_100px_120px_120px_180px] items-center px-4";

export function VehicleTablePage() {
  const [data, setData] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Vehicle>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const res = await getAllVehicles();
    setData((res?.data as Vehicle[]) ?? EMPTY);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: Vehicle) {
    setEditingId(row.id);
    setEditValues({ ...row });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateVehicle(editingId, editValues as UpdateVehicle);
    setEditingId(null);
    setEditValues({});
    await load();
  }

  async function remove(id: number) {
    await deleteVehicle(id);
    load();
  }

  async function create() {
    await addVehicle(newRow as InsertVehicle);
    setNewRow({ ...EMPTY_NEW });
    await load();
  }

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: "ID",
          cell: (info) => (
            <span className="text-neutral-600 text-xs">{info.getValue()}</span>
          ),
        }),
        col.accessor("make", {
          header: "Make",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.make ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, make: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-200 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("model", {
          header: "Model",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.model ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, model: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("year", {
          header: "Year",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.year ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, year: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("class", {
          header: "Class",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.class ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, class: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("transponder", {
          header: "Transponder",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.transponder ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, transponder: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("chassisid", {
          header: "Chassis ID",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.chassisid ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, chassisid: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue() ?? ""}</span>
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
    [editingId, editValues]
  );

  const table = useTable({ features, columns, data });

  return (
    <div className="max-w-5xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
            Vehicles
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        {/* Header */}
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} className={`${GRID} py-2 border-b border-neutral-800`}>
            {hg.headers.map((header) => (
              <span
                key={header.id}
                className="text-[10px] uppercase tracking-widest text-neutral-600"
              >
                <table.FlexRender header={header} />
              </span>
            ))}
          </div>
        ))}

        {loading && (
          <div className="py-10 text-center text-xs text-neutral-600">Loading...</div>
        )}
        {!loading && data.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-600">No vehicles</div>
        )}
        {!loading &&
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={`${GRID} py-3 border-b border-neutral-800/40 last:border-0 hover:bg-neutral-900/40 transition-colors`}
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
          <div className={`${GRID} py-3 border-t border-neutral-700 bg-neutral-900/30`}>
            <span className="text-neutral-600 text-[10px] uppercase tracking-widest">new</span>
            <Inp
              value={newRow.make}
              placeholder="make"
              onChange={(e) => setNewRow((v) => ({ ...v, make: e.target.value }))}
            />
            <Inp
              value={newRow.model}
              placeholder="model"
              onChange={(e) => setNewRow((v) => ({ ...v, model: e.target.value }))}
            />
            <Inp
              value={newRow.year}
              placeholder="year"
              onChange={(e) => setNewRow((v) => ({ ...v, year: e.target.value }))}
            />
            <Inp
              value={newRow.class}
              placeholder="class"
              onChange={(e) => setNewRow((v) => ({ ...v, class: e.target.value }))}
            />
            <Inp
              value={newRow.transponder}
              placeholder="transponder"
              onChange={(e) => setNewRow((v) => ({ ...v, transponder: e.target.value }))}
            />
            <Inp
              value={newRow.chassisid}
              placeholder="chassis id"
              onChange={(e) => setNewRow((v) => ({ ...v, chassisid: e.target.value }))}
            />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-neutral-700">{data.length} vehicles</p>
      )}
    </div>
  );
}
