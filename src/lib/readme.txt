import { remaining } from "./types";
import type { AppData, Interval, Plan } from "./types";
import { addDays, expand, midnight, MINUTE } from "./time";
export function merge(items: Interval[]): Interval[] {
 const sorted = items.filter(x => x.start < x.end)
   .map(x => ({ ...x })).sort((a, b) => a.start - b.start);
 const result: Interval[] = [];
 for (const item of sorted) {
   const last = result[result.length - 1];
   if (last && item.start <= last.end) {
     last.end = Math.max(last.end, item.end);
   } else result.push(item);
 }
 return result;
}
export function subtract(free: Interval[], busy: Interval[]) {
 let result = merge(free);
 for (const block of merge(busy)) {
   result = result.flatMap(slot => {
     if (block.end <= slot.start || block.start >= slot.end) {
       return [slot];
     }
     const pieces: Interval[] = [];
     if (slot.start < block.start) {
       pieces.push({ start: slot.start, end: block.start });
     }
     if (block.end < slot.end) {
       pieces.push({ start: block.end, end: slot.end });
     }
     return pieces;
   });
 }
 return result;
}
export function freeSlots(data: AppData, now: number) {
 const end = addDays(midnight(now), data.settings.horizon);
 const start = Math.ceil(now / MINUTE) * MINUTE;
 const free = data.windows.filter(w => w.kind === "free")
   .flatMap(w => expand(w, start, end));
 const busy = data.windows.filter(w => w.kind === "event")
   .flatMap(w => expand(w, start, end));
 return { slots: subtract(free, [...busy, ...data.blocked]), end };
}
export function buildPlan(data: AppData, now: number): Plan {
 const { slots, end } = freeSlots(data, now);
 const tasks = data.tasks.filter(t => remaining(t) > 0)
   .slice().sort((a, b) =>
     Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
     b.importance - a.importance ||
     b.difficulty - a.difficulty ||
     remaining(a) - remaining(b) || a.id.localeCompare(b.id));
 const left = new Map(tasks.map(t => [t.id, remaining(t)]));
 const plan: Plan = {
   sessions: [], warnings: [], generatedAt: now, horizonEnd: end,
 };
 let nextAllowed = now;
 for (const slot of slots) {
   let cursor = Math.max(slot.start, nextAllowed);
   while (cursor < slot.end) {
     const task = tasks.find(t => (left.get(t.id) ?? 0) > 0 &&
       Math.floor((Math.min(slot.end, Date.parse(t.dueAt)) -
         cursor) / MINUTE) >= 1);
     if (!task) break;
     const available = Math.floor(
       (Math.min(slot.end, Date.parse(task.dueAt)) - cursor) / MINUTE,
     );
     const minutes = Math.min(
       left.get(task.id)!, data.settings.session, available,
     );
     const finish = cursor + minutes * MINUTE;
     plan.sessions.push({
       id: `${now}:${task.id}:${cursor}`,
       taskId: task.id, start: cursor, end: finish, minutes,
     });
     left.set(task.id, left.get(task.id)! - minutes);
     nextAllowed = finish + data.settings.gap * MINUTE;
     cursor = nextAllowed;
   }
 }
 for (const task of tasks) {
   const minutes = left.get(task.id)!;
   if (minutes === 0) continue;
   const due = Date.parse(task.dueAt);
   plan.warnings.push({ taskId: task.id, minutes,
     reason: due <= now ? "overdue" : due > end ? "horizon" : "capacity",
   });
 }
 return plan;
}
