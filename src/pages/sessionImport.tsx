import { useEffect, useMemo, useState, type DragEvent } from "react";
import { getAllDrivers, addDriver } from "@/lib/api/driver";
import { addEntrant, getAllEntrants } from "@/lib/api/entrant";
import { getAllEvents } from "@/lib/api/event";
import { getAllSeasons } from "@/lib/api/season";
import { getAllSessions, addSession, updateSession } from "@/lib/api/session";
import {
  type Driver,
  type EntrantWithDetails,
  type EventWithDetails,
  type InsertDriver,
  type InsertEntrant,
  type InsertSession,
  type Season,
  type SessionWithDetails,
} from "../../global.d";
import { Btn } from "@/components/common/btn";
import { Sel } from "@/components/common/select";
import { Inp } from "@/components/common/input";

const SESSION_TYPES = ["Practice", "Qualify", "Race"] as const;
type SessionType = (typeof SESSION_TYPES)[number];
type Action = "confirm" | "new" | "update" | "ignore";

interface ExtractedRow {
  action: Action;
  sessionRowId: number | null;
  driverId: number | null;
  driverName: string;
  carClass: string;
  carNumber: string;
  position: number;
  bestLap: string;
  message: string;
  // Present while action is "confirm": a close-but-not-exact Entrant awaiting user validation
  suggestion: FuzzySuggestion | null;
}

interface FuzzySuggestion {
  key: string;
  driverId: number;
  entrantName: string;
  score: number;
}

const IDLE_MSG = "Select Season, Event, Session Type, Date, and Name — then drag and drop a JSON results file here";

// Accepts { result: [...] } (Veryfi export), { results: [...] }, or a bare array.
function extractRows(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result as Record<string, unknown>[];
    if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
  }
  return [];
}

const norm = (s: string) => s.replace(/\./g, "").trim().replace(/\s+/g, " ").toLowerCase();
const normClass = (s: string) => s.trim().toUpperCase();
const entrantClass = (e: EntrantWithDetails) => e.vehicleClass ?? e.carclass ?? "";

// Minimum similarity (0–1) for an Entrant to be offered as a fuzzy match
const FUZZY_THRESHOLD = 0.75;

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const ratio = (a: string, b: string) => (a || b ? 1 - levenshtein(a, b) / Math.max(a.length, b.length) : 1);

// Best of a straight comparison and a word-order-insensitive one, so "Smith, John" ≈ "John Smith"
function nameSimilarity(a: string, b: string): number {
  const sorted = (s: string) => norm(s.replace(/,/g, " ")).split(" ").sort().join(" ");
  return Math.max(ratio(norm(a), norm(b)), ratio(sorted(a), sorted(b)));
}

// Key for a user's accept/reject of one fuzzy pairing: file name + class + candidate driver
const fuzzyKey = (name: string, carClass: string, driverId: number) =>
  `${norm(name)}|${normClass(carClass)}|${driverId}`;
type FuzzyDecisions = Record<string, "accept" | "reject">;

// Classes that get an Entrant (with no vehicle) when a new Driver is added from an import
const AUTO_ENTRANT_CLASSES = ["CF", "HF"];
const needsEntrant = (carClass: string) => AUTO_ENTRANT_CLASSES.includes(carClass.trim().toUpperCase());

interface NewDriverDraft {
  firstname: string;
  lastname: string;
  suffix: string;
}

const SUFFIX_RE = /^(jr|sr|ii|iii|iv|v)\.?$/i;

// "First Last", "First Middle Last Jr.", or "Last, First"
function parseDriverName(full: string): NewDriverDraft {
  const clean = full.trim().replace(/\s+/g, " ");
  if (clean.includes(",")) {
    const [last, rest = ""] = clean.split(",").map((p) => p.trim());
    const parts = rest.split(" ").filter(Boolean);
    const suffix = parts.length > 1 && SUFFIX_RE.test(parts[parts.length - 1]) ? parts.pop()! : "";
    return { firstname: parts.join(" "), lastname: last, suffix };
  }
  const parts = clean.split(" ").filter(Boolean);
  const suffix = parts.length > 2 && SUFFIX_RE.test(parts[parts.length - 1]) ? parts.pop()! : "";
  const firstname = parts.shift() ?? "";
  return { firstname, lastname: parts.join(" "), suffix };
}

const fullName = (d: NewDriverDraft) =>
  [d.firstname, d.lastname, d.suffix].map((p) => p.trim()).filter(Boolean).join(" ");

const ACTION_STYLE: Record<Action, string> = {
  confirm: "text-amber-600",
  new: "text-green-700",
  update: "text-blue-700",
  ignore: "text-red-500",
};

export function SessionImportPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entrants, setEntrants] = useState<EntrantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>("Qualify");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionName, setSessionName] = useState("Qualify");
  const [startTime, setStartTime] = useState("");

  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [rawJson, setRawJson] = useState<unknown>(null);
  // Keyed by the driver_name as it appears in the file
  const [drafts, setDrafts] = useState<Record<string, NewDriverDraft>>({});
  const [fuzzyDecisions, setFuzzyDecisions] = useState<FuzzyDecisions>({});
  const [adding, setAdding] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState(IDLE_MSG);

  async function load() {
    setLoading(true);
    const [seaRes, evtRes, sesRes, drvRes, entRes] = await Promise.all([
      getAllSeasons(),
      getAllEvents(),
      getAllSessions(),
      getAllDrivers(),
      getAllEntrants(),
    ]);
    const driverList = (drvRes?.data as Driver[]) ?? [];
    const entrantList = (entRes?.data as EntrantWithDetails[]) ?? [];
    const sessionList = (sesRes?.data as SessionWithDetails[]) ?? [];
    const seasonList = ((seaRes?.data as Season[]) ?? []).sort((a, b) => b.year - a.year);
    setSeasons(seasonList);
    setEvents((evtRes?.data as EventWithDetails[]) ?? []);
    setSessions(sessionList);
    setDrivers(driverList);
    setEntrants(entrantList);
    setSeasonId((cur) => cur ?? seasonList[0]?.id ?? null);
    setLoading(false);
    return { driverList, sessionList, entrantList };
  }

  useEffect(() => { load(); }, []);

  const seasonEvents = useMemo(
    () => events.filter((e) => e.seasonId === seasonId).sort((a, b) => a.number - b.number),
    [events, seasonId]
  );

  // Keep event selection valid for the chosen season
  useEffect(() => {
    if (!seasonEvents.some((e) => e.id === eventId)) setEventId(seasonEvents[0]?.id ?? null);
  }, [seasonEvents, eventId]);

  function reset(msg = IDLE_MSG) {
    setRows([]);
    setRawJson(null);
    setDrafts({});
    setFuzzyDecisions({});
    setIsImported(false);
    setStatus(msg);
  }

  function matchDriver(name: string, driverList: Driver[]): { driver: Driver | null; message: string } {
    const matches = driverList.filter((d) => norm(d.name) === norm(name));
    if (matches.length === 0) return { driver: null, message: "Cannot find Driver match" };
    const active = matches.filter((d) => d.active);
    if (active.length === 1) return { driver: active[0], message: "" };
    if (active.length > 1) return { driver: active[0], message: "WARNING: Multiple active Drivers with this name" };
    return { driver: matches[0], message: "WARNING: Driver is inactive" };
  }

  type EntrantMatch =
    | { kind: "exact"; driverId: number; name: string; message: string }
    | { kind: "fuzzy"; suggestion: FuzzySuggestion }
    | { kind: "none" };

  // Entrants in the same car class, matched on driver name: exact first, then the closest
  // fuzzy candidate the user hasn't rejected (an accepted one counts as exact)
  function matchEntrant(name: string, carClass: string, entrantList: EntrantWithDetails[], decisions: FuzzyDecisions): EntrantMatch {
    const inClass = entrantList.filter((e) => e.driverName && normClass(entrantClass(e)) === normClass(carClass));
    // One candidate per driver, preferring an active Entrant
    const byDriver = new Map<number, EntrantWithDetails>();
    for (const e of inClass) {
      const cur = byDriver.get(e.driverid);
      if (!cur || (!cur.active && e.active)) byDriver.set(e.driverid, e);
    }
    const candidates = [...byDriver.values()];

    const exact = candidates.filter((e) => norm(e.driverName!) === norm(name));
    if (exact.length > 0) {
      const pick = exact.find((e) => e.active) ?? exact[0];
      const message = exact.length > 1 ? "WARNING: Multiple Entrants with this name in class"
        : pick.active ? "" : "WARNING: Entrant is inactive";
      return { kind: "exact", driverId: pick.driverid, name: pick.driverName!, message };
    }

    const scored = candidates
      .map((e) => ({ e, score: nameSimilarity(name, e.driverName!), key: fuzzyKey(name, carClass, e.driverid) }))
      .filter((c) => c.score >= FUZZY_THRESHOLD && decisions[c.key] !== "reject")
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) return { kind: "none" };
    if (decisions[best.key] === "accept") {
      return { kind: "exact", driverId: best.e.driverid, name: best.e.driverName!, message: `Fuzzy match accepted for "${name}"` };
    }
    return { kind: "fuzzy", suggestion: { key: best.key, driverId: best.e.driverid, entrantName: best.e.driverName!, score: best.score } };
  }

  // Same event + type + date + name + start time + driver is the same session entry
  function matchSession(driverId: number, sessionList: SessionWithDetails[]): { sessionRowId: number | null; message: string } {
    const matches = sessionList.filter((s) =>
      s.eventId === eventId &&
      s.driverId === driverId &&
      s.sessionType === sessionType &&
      s.sessionDate === sessionDate &&
      s.name === sessionName.trim() &&
      (s.sessionStartTime ?? "") === startTime
    );
    if (matches.length === 0) return { sessionRowId: null, message: "" };
    return {
      sessionRowId: matches[0].id,
      message: matches.length > 1 ? "WARNING: Multiple Session entries found for Driver" : "",
    };
  }

  function processJson(
    json: unknown,
    driverList = drivers,
    sessionList = sessions,
    entrantList = entrants,
    decisions = fuzzyDecisions,
  ) {
    const raw = extractRows(json);
    if (raw.length === 0) {
      reset("No results found in JSON — expected { result: [...] } or an array");
      return;
    }

    const extracted: ExtractedRow[] = raw.map((r) => {
      const driverName = String(r.driver_name ?? r.driverName ?? "").trim();
      const carClass = String(r.car_class ?? r.carClass ?? "").trim();
      const position = Number(r.finish_position ?? r.position ?? 0) || 0;
      const bestLap = String(r.best_lap_time ?? r.bestLap ?? "");
      const carNumber = String(r.car_number ?? r.carNumber ?? r.number ?? "").trim();

      const base = { driverName, carClass, carNumber, position, bestLap, suggestion: null };

      const entrant = matchEntrant(driverName, carClass, entrantList, decisions);
      if (entrant.kind === "fuzzy") {
        const { entrantName, score } = entrant.suggestion;
        return { ...base, action: "confirm", sessionRowId: null, driverId: null, suggestion: entrant.suggestion,
          message: `Confirm match - "${entrantName}" (${Math.round(score * 100)}% similar)` };
      }

      // No Entrant in this class — fall back to an exact Driver name match
      let matched: { id: number; name: string; message: string } | null = null;
      if (entrant.kind === "exact") {
        matched = { id: entrant.driverId, name: entrant.name, message: entrant.message };
      } else {
        const { driver, message } = matchDriver(driverName, driverList);
        if (!driver) return { ...base, action: "ignore", sessionRowId: null, driverId: null, message: `Ignore Entry - ${message}` };
        matched = { id: driver.id, name: driver.name, message: [`No ${carClass || "class"} Entrant`, message].filter(Boolean).join("; ") };
      }

      const { sessionRowId, message: sessionMsg } = matchSession(matched.id, sessionList);
      const warning = [matched.message, sessionMsg].filter(Boolean).join("; ");
      const action: Action = sessionRowId != null ? "update" : "new";
      const label = action === "update" ? "Update existing Session entry" : "Add new Session entry";
      return {
        ...base, action, sessionRowId, driverId: matched.id, driverName: matched.name,
        message: warning ? `${label} - ${warning}` : label,
      };
    });

    const order: Record<Action, number> = { confirm: 0, ignore: 1, new: 2, update: 3 };
    extracted.sort((a, b) => order[a.action] - order[b.action] || a.position - b.position);

    setRows(extracted);
    setRawJson(json);
    setDrafts((prev) => {
      const next: Record<string, NewDriverDraft> = {};
      for (const r of extracted) {
        if (r.action === "ignore" && r.driverName) next[r.driverName] = prev[r.driverName] ?? parseDriverName(r.driverName);
      }
      return next;
    });
    setIsImported(true);
    setStatus("Review results to import");
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!eventId || !sessionDate || !sessionName.trim()) {
      setStatus("Select an Event, Date, and Session Name before dropping a file");
      return;
    }
    if (file.type !== "application/json" && !file.name.toLowerCase().endsWith(".json")) {
      setStatus(`Unsupported file type for ${file.name}`);
      return;
    }
    setStatus("Loading file...");
    try {
      processJson(JSON.parse(await file.text()));
    } catch (err) {
      console.error("Error reading JSON file:", err);
      setStatus(`Error parsing JSON in ${file.name}`);
    }
  }

  const missingDrivers = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (r.action !== "ignore" || !r.driverName || seen.has(r.driverName)) return false;
      seen.add(r.driverName);
      return true;
    });
  }, [rows]);

  // One prompt per distinct file name + class + suggested driver
  const pendingMatches = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (r.action !== "confirm" || !r.suggestion || seen.has(r.suggestion.key)) return false;
      seen.add(r.suggestion.key);
      return true;
    });
  }, [rows]);

  function decideMatches(targets: ExtractedRow[], decision: "accept" | "reject") {
    const next = { ...fuzzyDecisions };
    for (const r of targets) if (r.suggestion) next[r.suggestion.key] = decision;
    setFuzzyDecisions(next);
    processJson(rawJson, drivers, sessions, entrants, next);
  }

  function updateDraft(key: string, field: keyof NewDriverDraft, value: string) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  }

  // Creates the Driver (and an Entrant with no vehicle for CF/HF). Returns an error message or null.
  async function createDriver(row: ExtractedRow): Promise<string | null> {
    const draft = drafts[row.driverName];
    if (!draft?.firstname.trim() || !draft?.lastname.trim()) return `${row.driverName}: first and last name required`;

    const drvRes = await addDriver({
      name: fullName(draft),
      firstname: draft.firstname.trim(),
      lastname: draft.lastname.trim(),
      suffix: draft.suffix.trim() || null,
      active: true,
    } as InsertDriver);
    const driverId = drvRes?.code === 200 ? drvRes.data?.id : undefined;
    if (driverId == null) return `${row.driverName}: failed to add Driver (${drvRes?.message ?? "no response"})`;

    if (needsEntrant(row.carClass)) {
      const entRes = await addEntrant({
        driverid: driverId,
        vehicleid: null,
        number: row.carNumber,
        carclass: row.carClass,
        defaulttire: "",
        active: 1,
        master: 0,
      } as InsertEntrant);
      if (entRes?.code !== 200) return `${row.driverName}: Driver added but Entrant failed (${entRes?.message ?? "no response"})`;
    }
    return null;
  }

  async function handleAddDrivers(targets: ExtractedRow[]) {
    setAdding(true);
    const errors: string[] = [];
    for (const row of targets) {
      const err = await createDriver(row);
      if (err) errors.push(err);
    }
    const { driverList, sessionList, entrantList } = await load();
    processJson(rawJson, driverList, sessionList, entrantList);
    setAdding(false);
    if (errors.length) setStatus(errors.join(" · "));
  }

  async function handleProcessImport() {
    if (!eventId) return;
    if (pendingMatches.length > 0) {
      setStatus("Confirm or reject the suggested driver matches before loading");
      return;
    }
    const entry = (r: ExtractedRow) => ({
      carClass: r.carClass || null,
      carNumber: r.carNumber || null,
      position: r.position,
      bestLap: r.bestLap || null,
    });

    const ops = rows.flatMap((r) => {
      if (r.action === "new" && r.driverId != null) {
        return [addSession({
          name: sessionName.trim(),
          sessionType,
          sessionDate,
          sessionStartTime: startTime || null,
          driverId: r.driverId,
          eventId,
          ...entry(r),
        } as InsertSession)];
      }
      if (r.action === "update" && r.sessionRowId != null) {
        return [updateSession(r.sessionRowId, entry(r))];
      }
      return [];
    });

    setStatus("Importing...");
    const responses = await Promise.all(ops);
    const failed = responses.filter((res) => !res || res.code !== 200).length;
    await load();
    reset(failed
      ? `Imported ${ops.length - failed} of ${ops.length} entries — ${failed} failed (see log)`
      : `Imported ${ops.length} entries. ${IDLE_MSG}`);
  }

  const counts = useMemo(() => ({
    confirm: rows.filter((r) => r.action === "confirm").length,
    new: rows.filter((r) => r.action === "new").length,
    update: rows.filter((r) => r.action === "update").length,
    ignore: rows.filter((r) => r.action === "ignore").length,
  }), [rows]);

  const header = (
    <div className="flex items-center gap-3 flex-shrink-0">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
        dev
      </span>
      <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
        Import Sessions
      </h1>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 h-full">
        {header}
        <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isImported) {
    return (
      <div className="flex flex-col gap-6 h-full overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          {header}
          <div className="flex gap-1.5">
            <Btn onClick={handleProcessImport}>Load Imported Session</Btn>
            <Btn danger onClick={() => reset()}>Cancel</Btn>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex-shrink-0">
          {status} · <span className="text-green-700">{counts.new} new</span> ·{" "}
          <span className="text-blue-700">{counts.update} update</span> ·{" "}
          <span className="text-red-500">{counts.ignore} ignored</span>
          {counts.confirm > 0 && <> · <span className="text-amber-600">{counts.confirm} to confirm</span></>}
        </p>

        {pendingMatches.length > 0 && (
          <div className="flex-shrink-0 max-h-[40%] overflow-auto border border-amber-300 bg-amber-50 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800">
                {pendingMatches.length} name{pendingMatches.length > 1 ? "s" : ""} closely match an Entrant in the same class — is this the same driver?
              </span>
              {pendingMatches.length > 1 && (
                <Btn onClick={() => decideMatches(pendingMatches, "accept")}>Accept All</Btn>
              )}
            </div>
            <div className="grid grid-cols-[200px_70px_1fr_90px_150px] gap-2 items-center">
              {["From file", "Class", "Entrant", "Similarity", ""].map((h) => (
                <span key={h} className="text-[10px] uppercase tracking-widest text-amber-700">{h}</span>
              ))}
              {pendingMatches.map((r) => (
                <div key={r.suggestion!.key} className="contents">
                  <span className="text-xs text-gray-800 truncate">{r.driverName}</span>
                  <span className="text-xs text-gray-500">{r.carClass}</span>
                  <span className="text-xs text-gray-800 truncate">{r.suggestion!.entrantName}</span>
                  <span className="text-xs text-gray-500">{Math.round(r.suggestion!.score * 100)}%</span>
                  <div className="flex gap-1.5">
                    <Btn onClick={() => decideMatches([r], "accept")}>Accept</Btn>
                    <Btn danger onClick={() => decideMatches([r], "reject")}>Reject</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {missingDrivers.length > 0 && (
          <div className="flex-shrink-0 max-h-[40%] overflow-auto border border-amber-300 bg-amber-50 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800">
                {missingDrivers.length} driver{missingDrivers.length > 1 ? "s" : ""} not found — add them?
                <span className="text-amber-600"> ({AUTO_ENTRANT_CLASSES.join("/")} also get an Entrant with no vehicle)</span>
              </span>
              {missingDrivers.length > 1 && (
                <Btn onClick={() => !adding && handleAddDrivers(missingDrivers)}>Add All</Btn>
              )}
            </div>
            <div className="grid grid-cols-[200px_1fr_1fr_80px_150px_90px] gap-2 items-center">
              {["From file", "First name", "Last name", "Suffix", "Creates", ""].map((h) => (
                <span key={h} className="text-[10px] uppercase tracking-widest text-amber-700">{h}</span>
              ))}
              {missingDrivers.map((r) => {
                const d = drafts[r.driverName] ?? parseDriverName(r.driverName);
                return (
                  <div key={r.driverName} className="contents">
                    <span className="text-xs text-gray-800 truncate">{r.driverName}</span>
                    <Inp value={d.firstname} placeholder="first"
                      onChange={(e) => updateDraft(r.driverName, "firstname", e.target.value)} />
                    <Inp value={d.lastname} placeholder="last"
                      onChange={(e) => updateDraft(r.driverName, "lastname", e.target.value)} />
                    <Inp value={d.suffix} placeholder="suffix"
                      onChange={(e) => updateDraft(r.driverName, "suffix", e.target.value)} />
                    <span className="text-[11px] text-gray-500">
                      Driver{needsEntrant(r.carClass) ? ` + Entrant (${r.carClass.toUpperCase()})` : ""}
                    </span>
                    <Btn onClick={() => !adding && handleAddDrivers([r])}>Add</Btn>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto min-h-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-[70px_220px_90px_120px_1fr] items-center px-2 py-2 border-b border-gray-200 bg-gray-50">
              {["Position", "Driver", "Class", "Best Time", "Import Action"].map((h) => (
                <span key={h} className="text-[10px] uppercase tracking-widest text-gray-400">{h}</span>
              ))}
            </div>
            {rows.map((r, i) => (
              <div
                key={`${r.action}-${r.driverName}-${r.position}-${i}`}
                className="grid grid-cols-[70px_220px_90px_120px_1fr] items-center px-2 py-2 border-b border-gray-200/70 last:border-0 text-xs"
              >
                <span className="text-gray-500">{r.position}</span>
                <span className="text-gray-800 truncate">{r.driverName}</span>
                <span className="text-gray-500">{r.carClass}</span>
                <span className="text-gray-500">{r.bestLap}</span>
                <span className={ACTION_STYLE[r.action]}>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-auto">
      {header}

      <div className="grid grid-cols-3 gap-3 max-w-4xl">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Season</span>
          <Sel value={seasonId ?? ""} onChange={(e) => { setSeasonId(Number(e.target.value)); reset(); }}>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Sel>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Event</span>
          <Sel value={eventId ?? ""} onChange={(e) => { setEventId(Number(e.target.value)); reset(); }}>
            {seasonEvents.length === 0 && <option value="">— no events —</option>}
            {seasonEvents.map((e) => (
              <option key={e.id} value={e.id}>{e.number} - {e.sanction} - {e.track}</option>
            ))}
          </Sel>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Session Type</span>
          <Sel value={sessionType} onChange={(e) => {
            const next = e.target.value as SessionType;
            // Keep the name in step with the type unless the user customised it
            if (sessionName === sessionType) setSessionName(next);
            setSessionType(next);
          }}>
            {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Sel>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Date</span>
          <Inp type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Session Name</span>
          <Inp value={sessionName} placeholder="e.g. Race 1, Heat 2" onChange={(e) => setSessionName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Start Time</span>
          <Inp type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
      </div>

      <p className="text-xs text-gray-500">{status}</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        className={`max-w-4xl border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging ? "border-gray-500 bg-blue-50" : "border-gray-300 bg-white"
        }`}
      >
        <h2 className="text-sm font-semibold text-gray-800 tracking-wide">
          Drag &amp; Drop a JSON results file here
        </h2>
        <p className="text-[11px] text-gray-400 mt-2">
          Expected format: {"{ \"result\": [{ \"driver_name\", \"car_class\", \"finish_position\", \"best_lap_time\" }] }"}
        </p>
      </div>
    </div>
  );
}
