export type Task = {
 id: string;
 title: string;
 category: string;
 dueAt: string; // ISO timestamp for one exact instant
 estimate: number; // minutes for the whole task
 worked: number; // minutes already completed
 importance: number; // 1 to 5
 difficulty: number; // 1 to 5
 done: boolean;
};
export type TimeWindow = {
 id: string;
 title: string;
 kind: "free" | "event";
 date: string; // YYYY-MM-DD; also the first recurrence date
 start: string; // HH:mm in this browser's timezone
 end: string; // HH:mm; later than start on the same day
 weekly: boolean;
 until: string; // inclusive end date, or empty for no end
};
export type Interval = { start: number; end: number };
export type Session = Interval & {
 id: string;
 taskId: string;
 minutes: number;
};
export type Warning = { // Interval *potential*
 taskId: string;
 minutes: number;
 reason: "overdue" | "capacity" | "horizon";
};
export type Settings = {
 session: number;
 gap: number;
 horizon: number; 
};
export type AppData = {
 version: 1;
 tasks: Task[];
 windows: TimeWindow[];
 blocked: Interval[]; // skipped session times
 settings: Settings;
};
export type Plan = {
 sessions: Session[];
 warnings: Warning[];
 generatedAt: number;
 horizonEnd: number;
};

export const emptyData = (): AppData => ({ 
 version: 1,
 tasks: [],
 windows: [],
 blocked: [],
 settings: { session: 45, gap: 5, horizon: 14 },
});
export const remaining = (task: Task) =>
 task.done ? 0 : Math.max(0, task.estimate - task.worked);
