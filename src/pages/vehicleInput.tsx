import {
  addVehicle,
  deleteVehicle,
  updateVehicle,
  getVehicle,
} from "@/lib/api/vehicle";
import { useState } from "react";
import { Inp } from "@/components/common/input";
import { Btn } from "@/components/common/btn";
import { useRun } from "@/lib/hooks/useRun";
import { RunOutput } from "@/components/common/output";

export function VehicleInputPage() {
  const [id, setId] = useState("1");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [cls, setCls] = useState("");
  const [transponder, setTransponder] = useState("");
  const [chassisid, setChassisid] = useState("");
  const { run, result, status, error } = useRun();

  const fields = [
    { label: "ID", value: id, set: setId },
    { label: "Make", value: make, set: setMake },
    { label: "Model", value: model, set: setModel },
    { label: "Year", value: year, set: setYear },
    { label: "Class", value: cls, set: setCls },
    { label: "Transponder", value: transponder, set: setTransponder },
    { label: "Chassis ID", value: chassisid, set: setChassisid },
  ];

  const vehicleData = { make, model, year, class: cls, transponder, chassisid };

  return (
    <div className="max-w-md grid gap-5">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
          dev
        </span>
        <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
          Vehicle Input
        </h1>
      </div>
      <div className="grid gap-3">
        {fields.map(({ label, value, set }) => (
          <label key={label} className="grid gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
              {label}
            </span>
            <Inp value={value} onChange={(e) => set(e.target.value)} />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Btn onClick={() => run(() => getVehicle(Number(id)))}>Get</Btn>
        <Btn onClick={() => run(() => addVehicle(vehicleData))}>Add</Btn>
        <Btn onClick={() => run(() => updateVehicle(Number(id), vehicleData))}>
          Update
        </Btn>
        <Btn danger onClick={() => run(() => deleteVehicle(Number(id)))}>
          Delete
        </Btn>
      </div>
      <RunOutput result={result} error={error} status={status} />
    </div>
  );
}
