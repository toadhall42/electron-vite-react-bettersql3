import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  getAllDrivers,
  addDriver,
  updateDriver,
  deleteDriver,
} from "@/lib/api/driver";
import { useEffect, useMemo, useState } from "react";
import { type Driver, type InsertDriver, type UpdateDriver } from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";

const features = tableFeatures({});
const col = createColumnHelper<typeof features, Driver>();
const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_NEW = { firstname: "", lastname: "", suffix: "", active: true as boolean };
const GRID = "grid grid-cols-[60px_1fr_1fr_100px_70px_180px] items-center px-4";

function fmtActive(value: unknown): string {
  if (value === true || value === 1) return "Yes";
  if (value === false || value === 0) return "No";
  return "—";
}

export function DriverTablePage() {
  const [data, setData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Driver>>({});
  const [newRow, setNewRow] = useState({ ...EMPTY_NEW });

  async function load() {
    setLoading(true);
    const res = await getAllDrivers();
    setData((res?.data as Driver[]) ?? EMPTY_DRIVERS);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: Driver) {
    setEditingId(row.id);
    setEditValues({ ...row });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function saveEdit() {
    if (editingId == null) return;
    setSaving(true);
    const name = [editValues.firstname, editValues.lastname, editValues.suffix]
      .filter(Boolean).join(" ").trim();
    await updateDriver(editingId, { ...editValues, name } as UpdateDriver);
    setEditingId(null);
    setEditValues({});
    await load();
    setSaving(false);
  }

  async function remove(id: number) {
    await deleteDriver(id);
    load();
  }

  async function create() {
    setSaving(true);
    const name = [newRow.firstname, newRow.lastname, newRow.suffix]
      .filter(Boolean).join(" ").trim();
    await addDriver({ ...newRow, name } as InsertDriver);
    setNewRow({ ...EMPTY_NEW });
    await load();
    setSaving(false);
  }

  const editActive =
    editValues.active === true || (editValues.active as unknown) === 1;

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: "ID",
          cell: (info) => (
            <span className="text-gray-400 text-xs">{info.getValue()}</span>
          ),
        }),
        col.accessor("firstname", {
          header: "First Name",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.firstname ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, firstname: e.target.value }))
                }
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("lastname", {
          header: "Last Name",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.lastname ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, lastname: e.target.value }))
                }
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue()}</span>
            ),
        }),
        col.accessor("suffix", {
          header: "Suffix",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.suffix ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, suffix: e.target.value }))
                }
              />
            ) : (
              <span className="text-gray-500 text-xs">{info.getValue() ?? ""}</span>
            ),
        }),
        col.accessor("active", {
          header: "Active",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, active: e.target.checked }))
                }
                className="w-4 h-4 accent-gray-600 cursor-pointer"
              />
            ) : (
              <span className="text-gray-500 text-xs">
                {fmtActive(info.getValue())}
              </span>
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
                <Btn danger onClick={() => remove(id)}>
                  Delete
                </Btn>
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId, editValues, editActive]
  );

  const table = useTable({ features, columns, data });

  return (
    <div className="max-w-4xl h-full flex flex-col gap-4">
      {/* Title — pinned top */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Drivers
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>

      {/* Table — fills remaining space */}
      <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white min-h-0">
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
            <div className="py-10 text-center text-xs text-gray-400">
              Loading...
            </div>
          )}
          {!loading && data.length === 0 && (
            <div className="py-10 text-center text-xs text-gray-400">
              No drivers
            </div>
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
          <span className="text-gray-400 text-[10px] uppercase tracking-widest">
            new
          </span>
          <Inp
            value={newRow.firstname}
            placeholder="first"
            onChange={(e) =>
              setNewRow((v) => ({ ...v, firstname: e.target.value }))
            }
          />
          <Inp
            value={newRow.lastname}
            placeholder="last"
            onChange={(e) =>
              setNewRow((v) => ({ ...v, lastname: e.target.value }))
            }
          />
          <Inp
            value={newRow.suffix}
            placeholder="suffix"
            onChange={(e) =>
              setNewRow((v) => ({ ...v, suffix: e.target.value }))
            }
          />
          <input
            type="checkbox"
            checked={newRow.active}
            onChange={(e) =>
              setNewRow((v) => ({ ...v, active: e.target.checked }))
            }
            className="w-4 h-4 accent-gray-600 cursor-pointer"
          />
          <Btn onClick={create}>Add</Btn>
        </div>
      </div>

      {/* Count — pinned bottom */}
      <p className="text-[11px] text-gray-400 flex-shrink-0">{data.length} drivers</p>
    </div>
  );
}
