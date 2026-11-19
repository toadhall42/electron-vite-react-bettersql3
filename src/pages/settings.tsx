import { useEffect, useState } from "react";
import {
  getAllPickListOptions,
  addPickListOption,
  updatePickListOption,
  deletePickListOption,
} from "@/lib/api/pickListOption";
import type { PickList, PickListOption } from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";

const LISTS: { list: PickList; label: string; hint: string }[] = [
  { list: "carClass", label: "Class", hint: "Choices for Class on the Points page" },
  { list: "tireBrand", label: "Tire", hint: "Choices for Tire on the Points page" },
];

function PickListEditor({
  list,
  label,
  hint,
  options,
  reload,
}: {
  list: PickList;
  label: string;
  hint: string;
  options: PickListOption[];
  reload: () => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");

  const isDuplicate = (value: string, exceptId?: number) =>
    options.some((o) => o.id !== exceptId && o.value.toLowerCase() === value.trim().toLowerCase());

  async function run(action: () => Promise<{ code: number; message: string } | undefined>) {
    setError("");
    const res = await action();
    if (res && res.code !== 200) setError(res.message);
    await reload();
  }

  async function add() {
    const value = newValue.trim();
    if (!value) return;
    if (isDuplicate(value)) return setError(`"${value}" is already in the list`);
    const sortOrder = Math.max(0, ...options.map((o) => o.sortOrder)) + 1;
    await run(() => addPickListOption({ list, value, sortOrder }));
    setNewValue("");
  }

  async function saveEdit(id: number) {
    const value = editValue.trim();
    if (!value) return setError("Value is required");
    if (isDuplicate(value, id)) return setError(`"${value}" is already in the list`);
    await run(() => updatePickListOption(id, { value }));
    setEditingId(null);
  }

  // Swaps sort positions with the neighbour; renumbers so ties never block a move
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= options.length) return;
    const ordered = [...options];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setError("");
    await Promise.all(
      ordered.map((o, i) => (o.sortOrder !== i + 1 ? updatePickListOption(o.id, { sortOrder: i + 1 }) : null)),
    );
    await reload();
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-widest">{label}</h3>
        <p className="text-[11px] text-gray-400">{hint}</p>
      </div>
      <div className="border border-gray-200 rounded-lg bg-white">
        {options.length === 0 && <div className="py-4 text-center text-xs text-gray-400">No values</div>}
        {options.map((o, i) => (
          <div
            key={o.id}
            className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 border-b border-gray-200/70 last:border-0"
          >
            {editingId === o.id ? (
              <Inp
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(o.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span className="text-xs text-gray-800">{o.value}</span>
            )}
            <div className="flex gap-1.5">
              {editingId === o.id ? (
                <>
                  <Btn onClick={() => saveEdit(o.id)}>Save</Btn>
                  <Btn onClick={() => setEditingId(null)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</Btn>
                  <Btn onClick={() => move(i, 1)} disabled={i === options.length - 1} title="Move down">↓</Btn>
                  <Btn onClick={() => { setEditingId(o.id); setEditValue(o.value); setError(""); }}>Edit</Btn>
                  <Btn danger onClick={() => run(() => deletePickListOption(o.id))}>Delete</Btn>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 border-t border-gray-300 bg-gray-50 rounded-b-lg">
          <Inp
            value={newValue}
            placeholder={`new ${label.toLowerCase()} value`}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <Btn onClick={add}>Add</Btn>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function SettingsPage() {
  const [options, setOptions] = useState<PickListOption[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await getAllPickListOptions();
    setOptions((res?.data as PickListOption[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl flex flex-col gap-6 overflow-auto">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
          dev
        </span>
        <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">Settings</h1>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] uppercase tracking-widest text-gray-400">Pick Lists</h2>
        <p className="text-[11px] text-gray-400">
          Values offered in drop-downs. Removing a value does not change rows that already use it.
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {LISTS.map((l) => (
            <PickListEditor key={l.list} {...l} options={options.filter((o) => o.list === l.list)} reload={load} />
          ))}
        </div>
      )}
    </div>
  );
}
