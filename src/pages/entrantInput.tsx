import {
  addEntrant,
  deleteEntrant,
  updateEntrant,
  getEntrant,
} from "@/lib/api/entrant";
import { getAllDrivers } from "@/lib/api/driver";
import { getAllVehicles } from "@/lib/api/vehicle";
import { useEffect, useState } from "react";
import { type Driver, type Vehicle } from "../../global.d";
import { Inp } from "@/components/common/input";
import { Sel } from "@/components/common/select";
import { Btn } from "@/components/common/btn";
import { useRun } from "@/lib/hooks/useRun";
import { RunOutput } from "@/components/common/output";

export function EntrantInputPage() {
  const [id, setId] = useState("1");
  const [driverid, setDriverid] = useState("");
  const [vehicleid, setVehicleid] = useState("");
  const [number, setNumber] = useState("");
  const [defaulttire, setDefaulttire] = useState("");
  const [active, setActive] = useState("1");
  const [notes, setNotes] = useState("");
  const [master, setMaster] = useState("0");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const { run, result, status, error } = useRun();

  useEffect(() => {
    getAllDrivers().then((r) => setDrivers((r?.data as Driver[]) ?? []));
    getAllVehicles().then((r) => setVehicles((r?.data as Vehicle[]) ?? []));
  }, []);

  const entrantData = {
    driverid: Number(driverid),
    vehicleid: Number(vehicleid),
    number,
    defaulttire,
    active: Number(active),
    notes,
    master: Number(master),
  };

  return (
    <div className="max-w-md grid gap-5">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
          dev
        </span>
        <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
          Entrant Input
        </h1>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">ID</span>
          <Inp value={id} onChange={(e) => setId(e.target.value)} />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Driver</span>
          <Sel value={driverid} onChange={(e) => setDriverid(e.target.value)}>
            <option value="">— select driver —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Sel>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Vehicle</span>
          <Sel value={vehicleid} onChange={(e) => setVehicleid(e.target.value)}>
            <option value="">— select vehicle —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} ({v.year})
              </option>
            ))}
          </Sel>
        </label>

        {[
          { label: "Number", value: number, set: setNumber },
          { label: "Default Tire", value: defaulttire, set: setDefaulttire },
          { label: "Active", value: active, set: setActive },
          { label: "Notes", value: notes, set: setNotes },
          { label: "Master", value: master, set: setMaster },
        ].map(({ label, value, set }) => (
          <label key={label} className="grid gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</span>
            <Inp value={value} onChange={(e) => set(e.target.value)} />
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Btn onClick={() => run(() => getEntrant(Number(id)))}>Get</Btn>
        <Btn onClick={() => run(() => addEntrant(entrantData))}>Add</Btn>
        <Btn onClick={() => run(() => updateEntrant(Number(id), entrantData))}>Update</Btn>
        <Btn danger onClick={() => run(() => deleteEntrant(Number(id)))}>Delete</Btn>
      </div>

      <RunOutput result={result} error={error} status={status} />
    </div>
  );
}
