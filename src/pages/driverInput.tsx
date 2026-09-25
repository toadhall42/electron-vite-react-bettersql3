import {
  addDriver,
  deleteDriver,
  updateDriver,
  getDriver,
} from "@/lib/api/driver";
import { useState } from "react";
import { Inp } from "@/components/common/input";
import { Btn } from "@/components/common/btn";
import { useRun } from "@/lib/hooks/useRun";
import { RunOutput } from "@/components/common/output";

export function DriverInputPage() {
  const [id, setId] = useState("1");
  const [name, setName] = useState("");
  const [firstname, setfirstname] = useState("");
  const [lastname, setlastname] = useState("");
  const [active, setactive] = useState("");
  const { run, result, status, error } = useRun();
  const fields = [
    { label: "ID", value: id, set: setId },
    { label: "Full Name", value: name, set: setName },
    { label: "First Name", value: firstname, set: setfirstname },
    { label: "Last Name", value: lastname, set: setlastname },
    { label: "Active", value: active, set: setactive },
  ];
  return (
    <div className="max-w-md grid gap-5">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
          dev
        </span>
        <h1 className="text-white text-sm font-semibold tracking-widest uppercase">
          Form
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
        <Btn onClick={() => run(() => getDriver(Number(id)))}>Get</Btn>
        <Btn
          onClick={() => run(() => addDriver({ name, firstname, lastname }))}
        >
          Add
        </Btn>
        <Btn
          onClick={() =>
            run(() => updateDriver(Number(id), { name, firstname, lastname }))
          }
        >
          Update
        </Btn>
        <Btn danger onClick={() => run(() => deleteDriver(Number(id)))}>
          Delete
        </Btn>
      </div>
      <RunOutput result={result} error={error} status={status} />
    </div>
  );
}
