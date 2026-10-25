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
import { useEffect, useMemo, useRef, useState } from "react";
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
const EMPTY_NEW = { driverid: 0, vehicleid: 0, number: "", carclass: "", defaulttire: "", active: 1, notes: "", master: 0 };
const GRID = "grid grid-cols-[50px_150px_190px_80px_80px_100px_60px_1fr_60px_170px] items-center px-4";

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
  const [driverSort, setDriverSort] = useState<"asc" | "desc" | null>("asc");
  // Mirrors editRef.current.vehicleid so the Class cell re-renders when the vehicle changes
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null);
  const editRef = useRef<Partial<Entrant>>({});
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

  // Class comes from the selected vehicle; only entrants without a vehicle take a manual class
  const vehicleClass = (vehicleid: number | null | undefined) =>
    vehicles.find((v) => v.id === vehicleid)?.class ?? null;

  function startEdit(row: EntrantWithDetails) {
    editRef.current = {
      id: row.id,
      driverid: row.driverid,
      vehicleid: row.vehicleid,
      number: row.number,
      carclass: row.carclass,
      defaulttire: row.defaulttire,
      active: row.active,
      notes: row.notes,
      master: row.master,
    };
    setEditVehicleId(row.vehicleid || null);
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateEntrant(editingId, editRef.current as UpdateEntrant);
    editRef.current = {};
    setEditingId(null);
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
            <span className="text-gray-400 text-xs">{info.getValue()}</span>
          ),
        }),
        col.display({
          id: "driver",
          header: () => (
            <button type="button" className="uppercase tracking-widest hover:text-gray-700"
              onClick={() => setDriverSort((s) => (s === null ? "asc" : s === "asc" ? "desc" : null))}>
              Driver{driverSort === "asc" ? " ▲" : driverSort === "desc" ? " ▼" : ""}
            </button>
          ),
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel key={`driverid-${editingId}`} defaultValue={editRef.current.driverid ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, driverid: Number(e.target.value) }; }}>
                <option value="">— driver —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Sel>
            ) : (
              <span className="text-gray-800 text-xs truncate">
                {info.row.original.driverName ?? "—"}
              </span>
            ),
        }),
        col.display({
          id: "vehicle",
          header: "Vehicle",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Sel key={`vehicleid-${editingId}`} defaultValue={editRef.current.vehicleid ?? ""}
                onChange={(e) => {
                  const vehicleid = Number(e.target.value) || null;
                  const carclass = vehicleClass(vehicleid) ?? editRef.current.carclass;
                  editRef.current = { ...editRef.current, vehicleid, carclass };
                  setEditVehicleId(vehicleid);
                }}>
                <option value="">— vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.year})
                  </option>
                ))}
              </Sel>
            ) : (
              <span className="text-gray-500 text-xs truncate">
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
              <Inp key={`number-${editingId}`} defaultValue={editRef.current.number ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, number: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("carclass", {
          header: "Class",
          cell: (info) =>
            editingId === info.row.original.id ? (
              editVehicleId ? (
                <Inp key={`carclass-${editingId}-${editVehicleId}`} value={vehicleClass(editVehicleId) ?? ""} disabled readOnly />
              ) : (
                <Inp key={`carclass-${editingId}`} defaultValue={editRef.current.carclass ?? ""}
                  onChange={(e) => { editRef.current = { ...editRef.current, carclass: e.target.value }; }} />
              )
            ) : (
              <span className="text-gray-500 text-xs">{info.row.original.vehicleClass ?? info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("defaulttire", {
          header: "Tire",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`defaulttire-${editingId}`} defaultValue={editRef.current.defaulttire ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, defaulttire: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("active", {
          header: "Active",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input key={`active-${editingId}`} type="checkbox"
                defaultChecked={(editRef.current.active as unknown) === 1}
                onChange={(e) => { editRef.current = { ...editRef.current, active: e.target.checked ? 1 : 0 }; }}
                className="w-4 h-4 accent-gray-600 cursor-pointer"
              />
            ) : (
              <span className="text-gray-500 text-xs">{fmtActive(info.getValue())}</span>
            ),
        }),
        col.accessor("notes", {
          header: "Notes",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`notes-${editingId}`} defaultValue={editRef.current.notes ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, notes: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs truncate">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("master", {
          header: "Master",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input key={`master-${editingId}`} type="checkbox"
                defaultChecked={(editRef.current.master as unknown) === 1}
                onChange={(e) => { editRef.current = { ...editRef.current, master: e.target.checked ? 1 : 0 }; }}
                className="w-4 h-4 accent-gray-600 cursor-pointer"
              />
            ) : (
              <span className="text-gray-500 text-xs">{fmtActive(info.getValue())}</span>
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
    [editingId, editVehicleId, drivers, vehicles, driverSort]
  );

  // Click cycles Driver: last name A–Z, Z–A, then back to the original order
  const sortedData = useMemo(() => {
    if (!driverSort) return data;
    const name = (e: EntrantWithDetails) => `${e.driverLastName ?? ""} ${e.driverFirstName ?? ""}`;
    const dir = driverSort === "asc" ? 1 : -1;
    return [...data].sort((a, b) => dir * name(a).localeCompare(name(b), undefined, { sensitivity: "base" }));
  }, [data, driverSort]);

  const table = useTable({ features, columns, data: sortedData });

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Entrants
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="border border-gray-200 rounded-lg overflow-clip min-w-[1040px] bg-white">
          {/* Header */}
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10`}>
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
            <div className="py-10 text-center text-xs text-gray-400">No entrants</div>
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
            <div className={`${GRID} py-3 border-t border-gray-300 bg-gray-50 sticky bottom-0 z-10`}>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>
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
                onChange={(e) => {
                  const vehicleid = Number(e.target.value);
                  setNewRow((v) => ({ ...v, vehicleid, carclass: vehicleClass(vehicleid) ?? v.carclass }));
                }}
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
                value={newRow.carclass}
                placeholder="class"
                disabled={!!newRow.vehicleid}
                onChange={(e) => setNewRow((v) => ({ ...v, carclass: e.target.value }))}
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
                className="w-4 h-4 accent-gray-600 cursor-pointer"
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
                className="w-4 h-4 accent-gray-600 cursor-pointer"
              />
              <Btn onClick={create}>Add</Btn>
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400 flex-shrink-0">{data.length} entrants</p>
      )}
    </div>
  );
}
