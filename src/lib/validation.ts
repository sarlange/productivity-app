import type { AppData, Task, TimeWindow } from "./types";
import { dayKey, parseLocal } from "./time";
type RecordValue = Record<string, unknown>;
const obj = (v: unknown): v is RecordValue =>
 typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 120): v is string =>
 typeof v === "string" && v.trim().length > 0 && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number =>
 typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const iso = (v: unknown): v is string =>
 typeof v === "string" && /^\d{4}-.*Z$/.test(v) &&
 Number.isFinite(Date.parse(v));
function dateOnly(v: unknown): v is string {
 if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
   return false;
 }
 try { return dayKey(parseLocal(`${v}T12:00`)) === v; }
 catch { return false; }
}
export function validTask(v: unknown): v is Task {
 return obj(v) && text(v.id) && text(v.title) &&
   text(v.category, 40) && iso(v.dueAt) &&
   int(v.estimate, 1, 100_000) && int(v.worked, 0, 100_000) &&
   int(v.importance, 1, 5) && int(v.difficulty, 1, 5) &&
   typeof v.done === "boolean";
}
export function validWindow(v: unknown): v is TimeWindow {
 if (!obj(v) || !text(v.id) || !text(v.title) ||
   !["free", "event"].includes(String(v.kind)) ||
   !dateOnly(v.date) || typeof v.start !== "string" ||
   typeof v.end !== "string" || typeof v.weekly !== "boolean" ||
   !(v.until === "" || dateOnly(v.until))) return false;
 if (v.until && v.until < v.date) return false;
 try {
   return parseLocal(`${v.date}T${v.start}`) <
     parseLocal(`${v.date}T${v.end}`);
 } catch { return false; }
}
export function parseData(raw: string): AppData {
 const d: unknown = JSON.parse(raw);
 if (!obj(d) || d.version !== 1 || !Array.isArray(d.tasks) ||
   !d.tasks.every(validTask) || !Array.isArray(d.windows) ||
   !d.windows.every(validWindow) || !Array.isArray(d.blocked) ||
   !d.blocked.every(b => obj(b) &&
     typeof b.start === "number" && Number.isFinite(b.start) &&
     typeof b.end === "number" && Number.isFinite(b.end) &&
     b.start < b.end) || !obj(d.settings) ||
   !int(d.settings.session, 5, 180) ||
   !int(d.settings.gap, 0, 60) ||
   !int(d.settings.horizon, 1, 30)) {
   throw new Error("This file is not a valid version 1 app backup.");
 }
 const ids = [...d.tasks, ...d.windows].map(x => x.id);
 if (new Set(ids).size !== ids.length) {
   throw new Error("The backup contains duplicate IDs.");
 }
 return d as AppData;
}