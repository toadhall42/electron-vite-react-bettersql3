import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  getAllEntrants,
  addEntrant,
  updateEntrant,
  deleteEntrant,
} from "@/lib/api/entrant";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllVehicles } from "@/lib/api/vehicle";
import { useEffect, useMemo, useState } from "react";
import {
  type Driver,
  type Vehicle,
  type Entrant,
  type EntrantWithDetails,
  type InsertEntrant,
  type UpdateEntrant,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, EntrantWithDetails>();
const EMPTY: EntrantWithDetails[] = [];
const EMPTY_NEW = { driverid: 0, vehicleid: 0, number: "", defaulttire: "", active: 1, notes: "", master: 0 };
const GRID = "grid grid-cols-[50px_150px_190px_80px_100px_60px_1fr_60px_170px] items-center px-4";

function fmtActive(value: unknown): string {
  if (value === true || value === 1) return "Yes";
  if (value === false || value === 0) return "No";
  return "—";
}

export function EntrantTablePage() {
  const [data, setData] = useState<EntrantWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Entrant>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [entRes, drvRes, vehRes] = await Promise.all([
      getAllEntrants(),
      getAllDrivers(),
      getAllVehicles(),
    ]);
    setData((entRes?.data as EntrantWithDetails[]) ?? EMPTY);
    setDrivers((drvRes?.data as Driver[]) ?? []);
    setVehicles((vehRes?.data as Vehicle[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: EntrantWithDetails) {
    setEditingId(row.id);
    setEditValues({
      id: row.id,
      driverid: row.driverid,
      vehicleid: row.vehicleid,
      number: row.number,
      defaulttire: row.defaulttire,
      active: row.active,
      notes: row.notes,
      master: row.master,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateEntrant(editingId, editValues as UpdateEntrant);
    setEditingId(null);
    setEditValues({});
    await load();
  }

  async function remove(id: number) {
    await deleteEntrant(id);
    load();
  }

  async function create() {
    await addEntrant(newRow as InsertEntrant);
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
        col.display({
          id: "driver",
          header: "Driver",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel
                value={editValues.driverid ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, driverid: Number(e.target.value) }))
                }
              >
                <option value="">— driver —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Sel>
            ) : (
              <span className="text-neutral-200 text-xs truncate">
                {info.row.original.driverName ?? "—"}
              </span>
            ),
        }),
        col.display({
          id: "vehicle",
          header: "Vehicle",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel
                value={editValues.vehicleid ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, vehicleid: Number(e.target.value) }))
                }
              >
                <option value="">— vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.year})
                  </option>
                ))}
              </Sel>
            ) : (
              <span className="text-neutral-400 text-xs truncate">
                {info.row.original.vehicleMake
                  ? `${info.row.original.vehicleMake} ${info.row.original.vehicleModel} (${info.row.original.vehicleYear})`
                  : "—"}
              </span>
            ),
        }),
        col.accessor("number", {
          header: "Number",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.number ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, number: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("defaulttire", {
          header: "Tire",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.defaulttire ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, defaulttire: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("active", {
          header: "Active",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input
                type="checkbox"
                checked={(editValues.active as unknown) === 1}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, active: e.target.checked ? 1 : 0 }))
                }
                className="w-4 h-4 accent-neutral-400 cursor-pointer"
              />
            ) : (
              <span className="text-neutral-400 text-xs">{fmtActive(info.getValue())}</span>
            ),
        }),
        col.accessor("notes", {
          header: "Notes",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.notes ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
              />
            ) : (
              <span className="text-neutral-400 text-xs truncate">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("master", {
          header: "Master",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input
                type="checkbox"
                checked={(editValues.master as unknown) === 1}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, master: e.target.checked ? 1 : 0 }))
                }
                className="w-4 h-4 accent-neutral-400 cursor-pointer"
              />
            ) : (
              <span className="text-neutral-400 text-xs">{fmtActive(info.getValue())}</span>
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
    [editingId, editValues, drivers, vehicles]
  );

  const table = useTable({ features, columns, data });

  return (
    <div className="flex flex-col gap-6 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
            Entrants
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="border border-neutral-800 rounded-lg overflow-hidden min-w-[960px]">
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
          <div className="py-10 text-center text-xs text-neutral-600">No entrants</div>
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
            <Sel
              value={newRow.driverid || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, driverid: Number(e.target.value) }))}
            >
              <option value="">— driver —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Sel>
            <Sel
              value={newRow.vehicleid || ""}
              onChange={(e) => setNewRow((v) => ({ ...v, vehicleid: Number(e.target.value) }))}
            >
              <option value="">— vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.year})
                </option>
              ))}
            </Sel>
            <Inp
              value={newRow.number}
              placeholder="number"
              onChange={(e) => setNewRow((v) => ({ ...v, number: e.target.value }))}
            />
            <Inp
              value={newRow.defaulttire}
              placeholder="tire"
              onChange={(e) => setNewRow((v) => ({ ...v, defaulttire: e.target.value }))}
            />
            <input
              type="checkbox"
              checked={newRow.active === 1}
              onChange={(e) => setNewRow((v) => ({ ...v, active: e.target.checked ? 1 : 0 }))}
              className="w-4 h-4 accent-neutral-400 cursor-pointer"
            />
            <Inp
              value={newRow.notes}
              placeholder="notes"
              onChange={(e) => setNewRow((v) => ({ ...v, notes: e.target.value }))}
            />
            <input
              type="checkbox"
              checked={newRow.master === 1}
              onChange={(e) => setNewRow((v) => ({ ...v, master: e.target.checked ? 1 : 0 }))}
              className="w-4 h-4 accent-neutral-400 cursor-pointer"
            />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-neutral-700">{data.length} entrants</p>
      )}
    </div>
  );
}
