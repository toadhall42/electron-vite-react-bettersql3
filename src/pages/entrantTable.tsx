import { getAllEntrants, deleteEntrant } from "@/lib/api/entrant";
import { useEffect, useState } from "react";
import { type EntrantWithDetails } from "../../global.d";
import { Btn } from "@/components/common/btn";

function fmtActive(value: unknown): string {
  if (value === true || value === 1) return "Yes";
  if (value === false || value === 0) return "No";
  return "—";
}

export function EntrantTablePage() {
  const [entrants, setEntrants] = useState<EntrantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getAllEntrants();
    setEntrants((res?.data as EntrantWithDetails[]) ?? []);
    setLoading(false);
  }

  async function remove(id: number) {
    await deleteEntrant(id);
    load();
  }

  useEffect(() => {
    load();
  }, []);

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

      <div className="border border-neutral-800 rounded-lg overflow-hidden min-w-[900px]">
        <div className="grid grid-cols-[50px_140px_180px_70px_100px_60px_1fr_70px_80px] px-4 py-2 border-b border-neutral-800">
          {["ID", "Driver", "Vehicle", "Number", "Tire", "Active", "Notes", "Master", ""].map((h) => (
            <span key={h} className="text-[10px] uppercase tracking-widest text-neutral-600">
              {h}
            </span>
          ))}
        </div>

        {loading && (
          <div className="py-10 text-center text-xs text-neutral-600">Loading...</div>
        )}
        {!loading && entrants.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-600">No entrants entered</div>
        )}
        {!loading &&
          entrants.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[50px_140px_180px_70px_100px_60px_1fr_70px_80px] px-4 py-3 border-b border-neutral-800/40 last:border-0 hover:bg-neutral-900/40 transition-colors items-center"
            >
              <span className="text-neutral-600 text-xs">{e.id}</span>
              <span className="text-neutral-200 text-xs truncate">{e.driverName ?? "—"}</span>
              <span className="text-neutral-400 text-xs truncate">
                {e.vehicleMake && e.vehicleModel
                  ? `${e.vehicleMake} ${e.vehicleModel} (${e.vehicleYear})`
                  : "—"}
              </span>
              <span className="text-neutral-400 text-xs">{e.number}</span>
              <span className="text-neutral-400 text-xs">{e.defaulttire}</span>
              <span className="text-neutral-400 text-xs">{fmtActive(e.active)}</span>
              <span className="text-neutral-400 text-xs truncate">{e.notes ?? ""}</span>
              <span className="text-neutral-400 text-xs">{e.master}</span>
              <Btn danger onClick={() => remove(e.id)}>Delete</Btn>
            </div>
          ))}
      </div>

      {!loading && (
        <p className="text-[11px] text-neutral-700">{entrants.length} entrants</p>
      )}
    </div>
  );
}
