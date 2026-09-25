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
const EMPTY_NEW = { name: "", firstname: "", lastname: "", active: true as boolean };
const GRID = "grid grid-cols-[60px_1fr_130px_130px_70px_180px] items-center px-4";

function fmtActive(value: unknown): string {
  if (value === true || value === 1) return "Yes";
  if (value === false || value === 0) return "No";
  return "—";
}

export function DriverTablePage() {
  const [data, setData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    await updateDriver(editingId, editValues as UpdateDriver);
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
    await addDriver(newRow as InsertDriver);
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
            <span className="text-neutral-600 text-xs">{info.getValue()}</span>
          ),
        }),
        col.accessor("name", {
          header: "Full Name",
          cell: (info) =>
            editingId === info.row.original.id ? (
              <Inp
                value={editValues.name ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, name: e.target.value }))
                }
              />
            ) : (
              <span className="text-neutral-200 text-xs">{info.getValue()}</span>
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
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
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
              <span className="text-neutral-400 text-xs">{info.getValue()}</span>
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
                className="w-4 h-4 accent-neutral-400 cursor-pointer"
              />
            ) : (
              <span className="text-neutral-400 text-xs">
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
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
            Drivers
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

        {/* Body */}
        {loading && (
          <div className="py-10 text-center text-xs text-neutral-600">
            Loading...
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-600">
            No drivers
          </div>
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
          <div
            className={`${GRID} py-3 border-t border-neutral-700 bg-neutral-900/30`}
          >
            <span className="text-neutral-600 text-[10px] uppercase tracking-widest">
              new
            </span>
            <Inp
              value={newRow.name}
              placeholder="full name"
              onChange={(e) => setNewRow((v) => ({ ...v, name: e.target.value }))}
            />
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
            <input
              type="checkbox"
              checked={newRow.active}
              onChange={(e) =>
                setNewRow((v) => ({ ...v, active: e.target.checked }))
              }
              className="w-4 h-4 accent-neutral-400 cursor-pointer"
            />
            <Btn onClick={create}>Add</Btn>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[11px] text-neutral-700">{data.length} drivers</p>
      )}
    </div>
  );
}
