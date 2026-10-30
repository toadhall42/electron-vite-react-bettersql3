import { Outlet, Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@assets/race-car.svg";
import { exportData, importData } from "@/lib/api/backup";

const links = [
  { to: "/driverTable", label: "Drivers" },
  { to: "/vehicleTable", label: "Vehicles" },
  { to: "/entrantTable", label: "Entrants" },
  { to: "/seasonTable", label: "Seasons" },
  { to: "/sessionTable", label: "Session Results" },
  { to: "/sessionImport", label: "Import Sessions" },
  { to: "/resultTable", label: "Points" },
  { to: "/weatherTable", label: "Weather" },
  { to: "/fs", label: "FS Test" },
  { to: "/about", label: "About" },
];

function DataBackup() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: typeof exportData | typeof importData, done: string) => {
    setBusy(true);
    setStatus(null);
    const res = await action();
    setBusy(false);
    if (res.code !== 200) setStatus(res.message);
    else if (res.message !== "canceled") setStatus(done);
  };

  const buttonClass =
    "text-left text-xs tracking-wide px-2 py-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-1 mb-4">
      <button className={buttonClass} disabled={busy} onClick={() => run(exportData, "Exported")}>
        Export Data
      </button>
      <button
        className={buttonClass}
        disabled={busy}
        onClick={() => run(importData, "Imported — restarting…")}
      >
        Import Data
      </button>
      {status && <div className="px-2 text-[10px] text-gray-400">{status}</div>}
    </div>
  );
}

export function RootLayout() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-700 font-mono overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 border-r border-gray-200 bg-white flex flex-col py-6 px-4 gap-1">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-6">
          <img src={logo} className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-900">
            Track Notes
          </span>
        </div>

        {/* Nav */}
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="text-xs tracking-wide px-2 py-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            activeProps={{
              className:
                "text-xs tracking-wide px-2 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-gray-100",
            }}
          >
            {label}
          </Link>
        ))}

        {/* Bottom */}
        <div className="mt-auto">
          <DataBackup />
          <div className="px-2 text-[10px] text-gray-400 uppercase tracking-widest">
            v0.0.1 · dev
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        <Outlet />
      </main>

    </div>
  );
}
