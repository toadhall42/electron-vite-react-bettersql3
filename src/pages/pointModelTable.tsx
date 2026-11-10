import {
  getAllPointModels,
  addPointModel,
  updatePointModel,
  deletePointModel,
  duplicatePointModel,
} from "@/lib/api/pointModel";
import { getAllSeasons } from "@/lib/api/season";
import { getAllEvents } from "@/lib/api/event";
import { useEffect, useMemo, useState } from "react";
import {
  type EventWithDetails,
  type InsertPointModel,
  type PointModelWithUsage,
  type PositionBasis,
  type SeasonWithDetails,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";

const LABEL = "text-[10px] uppercase tracking-widest text-gray-400";

// Points tables are edited as comma/space separated text, e.g. "15, 12, 10"
type Draft = Omit<InsertPointModel, "positionPoints" | "description"> & {
  description: string;
  positionPoints: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  positionBasis: "class",
  positionPoints: "",
  bonusRacePoints: 0,
  greenFlagPoints: 0,
  polePositionPoints: 0,
  hardChargerPoints: 0,
};

const BONUSES = [
  { field: "greenFlagPoints", label: "Green Flag", hint: "every starter who takes the green flag" },
  { field: "polePositionPoints", label: "Pole Position", hint: "starts the race from P1" },
  { field: "hardChargerPoints", label: "Hard Charger", hint: "most positions gained in the race" },
  { field: "bonusRacePoints", label: "Bonus Race", hint: "every driver in a Bonus Race session" },
] as const;

const toDraft = (m: PointModelWithUsage): Draft => ({
  name: m.name,
  description: m.description ?? "",
  positionBasis: m.positionBasis,
  positionPoints: m.positionPoints.join(", "),
  bonusRacePoints: m.bonusRacePoints,
  greenFlagPoints: m.greenFlagPoints,
  polePositionPoints: m.polePositionPoints,
  hardChargerPoints: m.hardChargerPoints,
});

function parseTable(text: string): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  const bad = parts.find((_, i) => !Number.isInteger(nums[i]) || nums[i] < 0);
  return bad === undefined ? nums : `"${bad}" is not a whole number`;
}

function fromDraft(d: Draft): InsertPointModel | string {
  if (!d.name.trim()) return "Name is required";
  const positionPoints = parseTable(d.positionPoints);
  if (typeof positionPoints === "string") return `Position points: ${positionPoints}`;
  return { ...d, name: d.name.trim(), description: d.description.trim() || null, positionPoints };
}

function PointsTable({ points }: { points: number[] }) {
  if (points.length === 0) return <span className="text-xs text-gray-400">none</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {points.map((p, i) => (
        <span key={i} className="flex flex-col items-center border border-gray-200 rounded px-1.5 py-0.5 min-w-9">
          <span className="text-[9px] text-gray-400">P{i + 1}</span>
          <span className="text-xs text-gray-800">{p}</span>
        </span>
      ))}
    </div>
  );
}

function ModelForm({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  return (
    <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 items-center">
      <span className={LABEL}>Name</span>
      <Inp value={draft.name} placeholder="e.g. 2027 15-12-10" onChange={(e) => set("name", e.target.value)} />
      <span className={LABEL}>Description</span>
      <Inp value={draft.description} placeholder="optional" onChange={(e) => set("description", e.target.value)} />
      <span className={LABEL}>Finishing position</span>
      <div className="w-48">
        <Sel value={draft.positionBasis} onChange={(e) => set("positionBasis", e.target.value as PositionBasis)}>
          <option value="class">In class</option>
          <option value="overall">Overall</option>
        </Sel>
      </div>
      <span className={LABEL}>Position points</span>
      <Inp value={draft.positionPoints} placeholder="points for P1, P2, P3… e.g. 15, 12, 10, 9"
        onChange={(e) => set("positionPoints", e.target.value)} />
      {BONUSES.map(({ field, label, hint }) => (
        <div key={field} className="contents">
          <span className={LABEL}>{label}</span>
          <div className="flex items-center gap-3">
            <div className="w-24">
              <Inp value={String(draft[field])} inputMode="numeric"
                onChange={(e) => set(field, Number(e.target.value.replace(/\D/g, "")) || 0)} />
            </div>
            <span className="text-[11px] text-gray-400">{hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PointModelTablePage() {
  const [models, setModels] = useState<PointModelWithUsage[]>([]);
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT });
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>({ ...EMPTY_DRAFT });

  async function load() {
    setLoading(true);
    const [pmRes, snRes, evRes] = await Promise.all([getAllPointModels(), getAllSeasons(), getAllEvents()]);
    setModels(((pmRes?.data as PointModelWithUsage[]) ?? []).sort((a, b) => a.name.localeCompare(b.name)));
    setSeasons(((snRes?.data as SeasonWithDetails[]) ?? []).sort((a, b) => b.year - a.year));
    setEvents((evRes?.data as EventWithDetails[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const usage = useMemo(() => {
    const byModel = new Map<number, { seasons: string[]; events: string[] }>();
    const get = (id: number) => byModel.get(id) ?? byModel.set(id, { seasons: [], events: [] }).get(id)!;
    for (const s of seasons) if (s.pointModelId != null) get(s.pointModelId).seasons.push(s.name);
    for (const e of events) if (e.pointModelId != null) get(e.pointModelId).events.push(`#${e.number} ${e.track}`);
    return byModel;
  }, [seasons, events]);

  // Runs a write, surfacing a failed response instead of silently reloading
  async function run(action: () => Promise<{ code: number; message: string } | undefined>) {
    setError(null);
    const res = await action();
    const ok = !res || res.code === 200;
    if (!ok) setError(res.message);
    await load();
    return ok;
  }

  function startEdit(m: PointModelWithUsage) {
    setDraft(toDraft(m));
    setEditingId(m.id);
  }

  async function save() {
    if (editingId == null) return;
    const data = fromDraft(draft);
    if (typeof data === "string") return setError(data);
    if (await run(() => updatePointModel(editingId, data))) setEditingId(null);
  }

  async function create() {
    const data = fromDraft(newDraft);
    if (typeof data === "string") return setError(data);
    if (await run(() => addPointModel(data))) {
      setAdding(false);
      setNewDraft({ ...EMPTY_DRAFT });
    }
  }

  async function remove(m: PointModelWithUsage) {
    if (!window.confirm(`Delete point model ${m.name}?`)) return;
    await run(() => deletePointModel(m.id));
  }

  function renderModel(m: PointModelWithUsage) {
    const used = usage.get(m.id);
    if (editingId === m.id) {
      return (
        <div key={m.id} className="border border-gray-300 rounded-lg bg-white p-4 flex flex-col gap-4">
          <ModelForm draft={draft} setDraft={setDraft} />
          <div className="flex gap-1.5 justify-end">
            <Btn onClick={save}>Save</Btn>
            <Btn onClick={() => { setEditingId(null); setError(null); }}>Cancel</Btn>
          </div>
        </div>
      );
    }
    return (
      <div key={m.id} className="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-gray-900 text-xs font-semibold">{m.name}</span>
            {m.description && <span className="text-gray-500 text-xs">{m.description}</span>}
            <span className="text-[11px] text-gray-400">
              {used?.seasons.length ? `Seasons: ${used.seasons.join(", ")}` : "Not assigned to a season"}
              {used?.events.length ? ` · Event overrides: ${used.events.join(", ")}` : ""}
            </span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Btn onClick={() => startEdit(m)}>Edit</Btn>
            <Btn onClick={() => run(() => duplicatePointModel(m.id))}>Duplicate</Btn>
            <Btn danger onClick={() => remove(m)}>Delete</Btn>
          </div>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 items-center">
          <span className={LABEL}>Position ({m.positionBasis === "class" ? "in class" : "overall"})</span>
          <PointsTable points={m.positionPoints} />
          <span className={LABEL}>Bonuses</span>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {BONUSES.map(({ field, label }) => (
              <span key={field}>
                {label} <span className={m[field] > 0 ? "text-gray-900 font-semibold" : "text-gray-400"}>{m[field]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
            Point Models
          </h1>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
        <div className="flex gap-1.5">
          {!adding && <Btn onClick={() => setAdding(true)}>+ Point Model</Btn>}
          <Btn onClick={load}>Refresh</Btn>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 flex-shrink-0 -mt-3">
        Assign a model to a season on the Seasons page; an event can override its season's model.
        Recalculate points on the Points page after changing a model.
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
        {adding && (
          <div className="border border-gray-300 rounded-lg bg-gray-50 p-4 flex flex-col gap-4">
            <span className={LABEL}>new point model</span>
            <ModelForm draft={newDraft} setDraft={setNewDraft} />
            <div className="flex gap-1.5 justify-end">
              <Btn onClick={create}>Add</Btn>
              <Btn onClick={() => { setAdding(false); setError(null); }}>Cancel</Btn>
            </div>
          </div>
        )}
        {loading && <div className="py-10 text-center text-xs text-gray-400">Loading...</div>}
        {!loading && models.length === 0 && !adding && (
          <div className="py-10 text-center text-xs text-gray-400 border border-gray-200 rounded-lg bg-white">
            No point models
          </div>
        )}
        {!loading && models.map(renderModel)}
      </div>
    </div>
  );
}
