import { getAllDrivers, deleteDriver } from "@/lib/api/driver";
import { useEffect, useState } from "react";
import { type Driver } from "../../global.d";
import { Btn } from "@/components/common/btn";

export function DriverTablePage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getAllDrivers();
    setDrivers((res?.data as Driver[]) ?? []);
    setLoading(false);
  }
  async function remove(id: number) {
    await deleteDriver(id);
    load();
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
            dev
          </span>
          <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
            Table
          </h1>
        </div>
        <Btn onClick={load}>Refresh</Btn>
      </div>
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_120px_80px] px-4 py-2 border-b border-neutral-800">
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
            ID
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
            Full Name
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
            First Name
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
            Last Name
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
            Active
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">
          </span>
        </div>
        {loading && (
          <div className="py-10 text-center text-xs text-neutral-600">
            Loading...
          </div>
        )}
        {!loading && drivers.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-600">
            No drivers entered
          </div>
        )}
        {!loading &&
          drivers.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[60px_1fr_120px_80px] px-4 py-3 border-b border-neutral-800/40 last:border-0 hover:bg-neutral-900/40 transition-colors items-center"
            >
              <span className="text-neutral-600 text-xs">{d.id}</span>
              <span className="text-neutral-200 text-xs">{d.name}</span>
              <span className="text-neutral-400 text-xs">{d.firstname}</span>
              <span className="text-neutral-400 text-xs">{d.lastname}</span>
              <span className="text-neutral-400 text-xs">{d.active}</span>
              <Btn danger onClick={() => remove(d.id)}>
                Delete
              </Btn>
            </div>
          ))}
      </div>
      {!loading && (
        <p className="text-[11px] text-neutral-700">
          {drivers.length} drivers
        </p>
      )}
    </div>
  );
}
