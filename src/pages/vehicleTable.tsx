import { getAllVehicles, deleteVehicle } from "@/lib/api/vehicle";
import { useEffect, useState } from "react";
import { type Vehicle } from "../../global.d";
import { Btn } from "@/components/common/btn";

export function VehicleTablePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getAllVehicles();
    setVehicles((res?.data as Vehicle[]) ?? []);
    setLoading(false);
  }

  async function remove(id: number) {
    await deleteVehicle(id);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
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
        <div className="grid grid-cols-[50px_1fr_1fr_70px_100px_120px_120px_80px] px-4 py-2 border-b border-neutral-800">
          {["ID", "Make", "Model", "Year", "Class", "Transponder", "Chassis ID", ""].map((h) => (
            <span key={h} className="text-[10px] uppercase tracking-widest text-neutral-600">
              {h}
            </span>
          ))}
        </div>
        {loading && (
          <div className="py-10 text-center text-xs text-neutral-600">
            Loading...
          </div>
        )}
        {!loading && vehicles.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-600">
            No vehicles entered
          </div>
        )}
        {!loading &&
          vehicles.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[50px_1fr_1fr_70px_100px_120px_120px_80px] px-4 py-3 border-b border-neutral-800/40 last:border-0 hover:bg-neutral-900/40 transition-colors items-center"
            >
              <span className="text-neutral-600 text-xs">{v.id}</span>
              <span className="text-neutral-200 text-xs">{v.make}</span>
              <span className="text-neutral-400 text-xs">{v.model}</span>
              <span className="text-neutral-400 text-xs">{v.year}</span>
              <span className="text-neutral-400 text-xs">{v.class}</span>
              <span className="text-neutral-400 text-xs">{v.transponder}</span>
              <span className="text-neutral-400 text-xs">{v.chassisid}</span>
              <Btn danger onClick={() => remove(v.id)}>
                Delete
              </Btn>
            </div>
          ))}
      </div>
      {!loading && (
        <p className="text-[11px] text-neutral-700">{vehicles.length} vehicles</p>
      )}
    </div>
  );
}
