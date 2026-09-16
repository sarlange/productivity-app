import type { Interval, TimeWindow } from "./types";
export const MINUTE = 60_000;
const pad = (value: number) => String(value).padStart(2, "0");
export function dayKey(value: number | Date): string {
 const d = new Date(value);
 return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` +
   `-${pad(d.getDate())}`;
}
export function localInput(value: number | Date): string {
 const d = new Date(value);
 return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseLocal(value: string): number {
 const date = new Date(value);
 const ms = date.getTime();
 if (!Number.isFinite(ms) || localInput(date) !== value) {
   throw new Error("Choose a valid local date and time.");
 }
 return ms;
}
export function midnight(value: number): number {
 const d = new Date(value);
 d.setHours(0, 0, 0, 0);
 return d.getTime();
}
export function addDays(value: number, count: number): number {
 const d = new Date(value);
 d.setDate(d.getDate() + count);
 return d.getTime();
}
export function monday(value: number): number {
 const day = midnight(value);
 return addDays(day, -((new Date(day).getDay() + 6) % 7));
}
export function timeLabel(value: number): string {
 return new Date(value).toLocaleTimeString([], {
   hour: "numeric", minute: "2-digit",
 });
}
export function expand(
 window: TimeWindow, from: number, to: number,
): Interval[] {
 const result: Interval[] = [];
 const weekday = new Date(`${window.date}T12:00`).getDay();
 for (let day = midnight(from); day < to; day = addDays(day, 1)) {
   const key = dayKey(day);
   if (key < window.date || (window.until && key > window.until)) {
     continue;
   }
   const matches = window.weekly
     ? new Date(day).getDay() === weekday
     : key === window.date;
   if (!matches) continue;
   try {
     const start = parseLocal(`${key}T${window.start}`);
     const end = parseLocal(`${key}T${window.end}`);
     if (start < end && start < to && end > from) {
       result.push({ start: Math.max(start, from),
         end: Math.min(end, to) });
     }
   } catch {
     // A nonexistent DST clock time is skipped, not shifted.
   }
 }
 return result;
}
