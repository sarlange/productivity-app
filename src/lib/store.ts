import { emptyData, remaining } from "./types";
import type { AppData, Plan, Task, TimeWindow } from "./types";
import { buildPlan } from "./scheduler";
import { parseData, validTask, validWindow } from "./validation";
import { dayKey } from "./time";
const KEY = "productivity-app-v1";
type Snapshot = { data: AppData; plan: Plan; error: string };
let current: Snapshot | null = null;
let loaded = false;
let lastRaw: string | null = null;
let locked = false;
const listeners = new Set<() => void>();
function publish() { listeners.forEach(fn => fn()); }
export function getSnapshot() { return current; }
export function getServerSnapshot() { return null; }
function makeSnapshot(data: AppData, error = ""): Snapshot {
 const plan = buildPlan(data, Date.now());
 plan.sessions = plan.sessions.map(s =>
   ({ ...s, id: crypto.randomUUID() }));
 return { data, plan, error };
}
function load() {
 let data = emptyData();
 let error = "";
 try {
   lastRaw = localStorage.getItem(KEY);
   if (lastRaw !== null) data = parseData(lastRaw);
   locked = false;
 } catch {
   locked = true;
   error = "Saved data could not be read. Download the raw backup " +
     "before importing a repaired copy. Editing is paused.";
 }
 current = makeSnapshot(data, error);
 loaded = true;
}
export function subscribe(listener: () => void) {
 listeners.add(listener);
 if (!loaded) { load(); publish(); }
 return () => { listeners.delete(listener); };
}
function commit(change: (d: AppData) => void) {
 if (!current || locked) {
   throw new Error("Editing is paused until saved data is recovered.");
 }
 // Detect another tab's write before replacing its data.
 if (localStorage.getItem(KEY) !== lastRaw) {
   load(); publish();
   throw new Error("Another tab changed this plan. Review and retry.");
 }
 const data = structuredClone(current.data);
 change(data);
 data.blocked = data.blocked.filter(b => b.end > Date.now());
 const validated = parseData(JSON.stringify(data));
 const raw = JSON.stringify(validated);
 // Save first. A failed write must not appear as a saved change.
 localStorage.setItem(KEY, raw);
 lastRaw = raw;
 current = makeSnapshot(validated);
 publish();
}
export const actions = {
 saveTask(task: Task) {
   if (!validTask(task)) throw new Error("Check the task fields.");
   task = { ...task, done: task.done || task.worked >= task.estimate };
   commit(d => {
     const index = d.tasks.findIndex(t => t.id === task.id);
     if (index === -1) d.tasks.push(task);
     else d.tasks[index] = task;
   });
 },
 deleteTask(id: string) {
   commit(d => { d.tasks = d.tasks.filter(t => t.id !== id); });
 },
 toggleTask(id: string) {
   commit(d => {
     const task = d.tasks.find(t => t.id === id);
     if (!task) return;
     task.done = !task.done;
     if (!task.done && remaining(task) === 0) task.worked = 0;
   });
 },
 saveWindow(window: TimeWindow) {
   if (!validWindow(window)) throw new Error("Check the time fields.");
   commit(d => {
     const index = d.windows.findIndex(w => w.id === window.id);
     if (index === -1) d.windows.push(window);
     else d.windows[index] = window;
   });
 },
 deleteWindow(id: string) {
   commit(d => { d.windows = d.windows.filter(w => w.id !== id); });
 },
 logSession(id: string) {
   const session = current?.plan.sessions.find(s => s.id === id);
   if (!session) throw new Error("That plan changed. Use the new session.");
   if (session.start > Date.now()) {
     throw new Error("This session has not started yet.");
   }
   commit(d => {
     const task = d.tasks.find(t => t.id === session.taskId);
     if (!task) return;
     task.worked += Math.min(session.minutes, remaining(task));
     if (task.worked >= task.estimate) task.done = true;
   });
 },
 missSession(id: string) {
   const session = current?.plan.sessions.find(s => s.id === id);
   if (!session) throw new Error("That plan changed. Use the new session.");
   commit(d => {
     d.blocked.push({ start: session.start, end: session.end });
   });
 },
 settings(session: number, gap: number, horizon: number) {
   commit(d => { d.settings = { session, gap, horizon }; });
 },
 replan() { commit(() => {}); },
};
export function refreshIfNeeded() {
 if (!current || locked) return;
 const now = Date.now();
 const expired = current.plan.sessions.some(s => s.end <= now);
 const newDay = dayKey(now) !== dayKey(current.plan.generatedAt);
 const deadlinePassed = current.data.tasks.some(t =>
   remaining(t) > 0 && Date.parse(t.dueAt) > current!.plan.generatedAt &&
   Date.parse(t.dueAt) <= now);
 if (expired || newDay || deadlinePassed) actions.replan();
}
export function exportBackup(raw = false) {
 const value = raw ? localStorage.getItem(KEY)
   : JSON.stringify(current?.data ?? emptyData(), null, 2);
 const blob = new Blob([value ?? ""], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = raw ? "raw-backup.json" : "productivity-backup.json";
 link.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function importBackup(raw: string) {
 const data = parseData(raw);
 const saved = JSON.stringify(data);
 localStorage.setItem(KEY, saved);
 lastRaw = saved; locked = false; loaded = true;
 current = makeSnapshot(data);
 publish();
}
