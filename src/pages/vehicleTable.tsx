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
import { getAllDrivers } from "@/lib/api/driver";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Vehicle, type InsertVehicle, type UpdateVehicle, type Driver } from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, Vehicle>();
const EMPTY: Vehicle[] = [];
const EMPTY_NEW = { make: "", model: "", year: "", class: "", transponder: "", chassisid: "", currentDriver: "" };
const GRID = "grid grid-cols-[60px_1fr_1fr_70px_100px_120px_120px_160px_180px] items-center px-4";

// "First Last Suffix", skipping empty parts
const driverFullName = (d: Driver) =>
  [d.firstname, d.lastname, d.suffix].filter(Boolean).join(" ");

export function VehicleTablePage() {
  const [data, setData] = useState<Vehicle[]>([]);
  const [driverNames, setDriverNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editRef = useRef<Partial<Vehicle>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const [res, drvRes] = await Promise.all([getAllVehicles(), getAllDrivers()]);
    setData((res?.data as Vehicle[]) ?? EMPTY);
    setDriverNames(((drvRes?.data as Driver[]) ?? []).map(driverFullName));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: Vehicle) {
    editRef.current = { ...row };
    setEditingId(row.id);
  }

  function cancelEdit() {
    editRef.current = {};
    setEditingId(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await updateVehicle(editingId, editRef.current as UpdateVehicle);
    editRef.current = {};
    setEditingId(null);
    await load();
  }

  async function remove(id: number) {
    await deleteVehicle(id);
    load();
  }

  async function create() {
    await addVehicle({ ...newRow, currentDriver: newRow.currentDriver || null } as InsertVehicle);
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
        col.accessor("make", {
          header: "Make",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`make-${editingId}`} defaultValue={editRef.current.make ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, make: e.target.value }; }} />
            ) : (
              <span className="text-gray-800 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("model", {
          header: "Model",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`model-${editingId}`} defaultValue={editRef.current.model ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, model: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("year", {
          header: "Year",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`year-${editingId}`} defaultValue={editRef.current.year ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, year: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("class", {
          header: "Class",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`class-${editingId}`} defaultValue={editRef.current.class ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, class: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("transponder", {
          header: "Transponder",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`transponder-${editingId}`} defaultValue={editRef.current.transponder ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, transponder: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("chassisid", {
          header: "Chassis ID",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp key={`chassisid-${editingId}`} defaultValue={editRef.current.chassisid ?? ""}
                onChange={(e) => { editRef.current = { ...editRef.current, chassisid: e.target.value }; }} />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("currentDriver", {
          header: "Current Driver",
          cell: (info) => {
            if (editingId !== info.row.original.id)
              return <span className="text-gray-500 text-xs truncate block">{info.getValue() ?? ""}</span>;
            const current = editRef.current.currentDriver ?? "";
            // keep a stored name selectable even if no driver matches it anymore
            const options = current && !driverNames.includes(current) ? [current, ...driverNames] : driverNames;
            return (
              <Sel key={`currentDriver-${editingId}`} defaultValue={current}
                onChange={(e) => { editRef.current = { ...editRef.current, currentDriver: e.target.value || null }; }}>
                <option value="">— driver —</option>
                {options.map((n) => <option key={n} value={n}>{n}</option>)}
              </Sel>
            );
          },
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
    [editingId, driverNames]
  );

  const table = useTable({ features, columns, data });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Title — pinned top */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Vehicles
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      {/* Table — fills remaining space; scrolls sideways when narrow */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="h-full min-w-[1100px] flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Column headers — pinned */}
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} className={`${GRID} py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0`}>
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

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
            )}
            {!loading && data.length === 0 && (
              <div className="py-10 text-center text-xs text-gray-400">No vehicles</div>
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
          </div>

          {/* Add new row — pinned at bottom of table */}
          <div className={`${GRID} py-3 border-t border-gray-300 bg-gray-50 flex-shrink-0`}>
            <span className="text-gray-400 text-[10px] uppercase tracking-widest">new</span>
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
            <Sel
              value={newRow.currentDriver}
              onChange={(e) => setNewRow((v) => ({ ...v, currentDriver: e.target.value }))}
            >
              <option value="">— driver —</option>
              {driverNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </Sel>
            <Btn onClick={create}>Add</Btn>
          </div>
        </div>
      </div>

      {!loading && (
        <p className="text-[11px] text-gray-400 flex-shrink-0">{data.length} vehicles</p>
      )}
    </div>
  );
}
