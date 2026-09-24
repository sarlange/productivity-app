"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import type { TimeWindow } from "@/lib/types";
import { dayKey } from "@/lib/time";
import { actions } from "@/lib/store";
type Props = { window?: TimeWindow; onClose: () => void };
export default function TimeEditor({ window: item, onClose }: Props) {
 const [error, setError] = useState("");
 const [firstDate] = useState(() => item?.date ?? dayKey(Date.now()));
 function submit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault();
   const form = new FormData(event.currentTarget);
   try {
     actions.saveWindow({
       id: item?.id ?? crypto.randomUUID(),
       title: String(form.get("title")).trim(),
       kind: form.get("kind") === "free" ? "free" : "event",
       date: String(form.get("date")),
       start: String(form.get("start")), end: String(form.get("end")),
       weekly: form.get("weekly") === "on",
       until: String(form.get("until") ?? ""),
     });
     onClose();
   } catch (e) {
     setError(e instanceof Error ? e.message : "Could not save.");
   }
 }
 return <section className="card">
   <h2>{item ? "Edit time block" : "Add time block"}</h2>
   <form onSubmit={submit} className="form-grid">
     <label>Title
       <input name="title" required maxLength={120}
         defaultValue={item?.title} autoFocus />
     </label>
     <label>Type
       <select name="kind" defaultValue={item?.kind ?? "free"}>
         <option value="free">Available for tasks</option>
         <option value="event">Busy event</option>
       </select>
     </label>
     <label>Date / first occurrence
       <input name="date" type="date" required
         defaultValue={firstDate} />
     </label>
     <label>Start time
       <input name="start" type="time" required
         defaultValue={item?.start ?? "16:00"} />
     </label>
     <label>End time
       <input name="end" type="time" required
         defaultValue={item?.end ?? "18:00"} />
     </label>
     <label>Last recurrence date (optional)
       <input name="until" type="date" defaultValue={item?.until} />
     </label>
     <label className="check full">
       <input name="weekly" type="checkbox"
         defaultChecked={item?.weekly ?? false} />
       Repeat weekly on this weekday
     </label>
     <p className="full">Use a separate entry for each weekday.
       Each block starts and ends on the same date.</p>
     {error && <p role="alert" className="warning full">{error}</p>}
     <div className="actions full">
       <button type="submit">Save time block</button>
       <button type="button" onClick={onClose}>Cancel</button>
     </div>
   </form>
 </section>;
}
