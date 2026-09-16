"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Task } from "@/lib/types";
import { localInput, parseLocal } from "@/lib/time";
import { actions } from "@/lib/store";
type Props = { task?: Task; onClose: () => void };
export default function TaskEditor({ task, onClose }: Props) {
 const [error, setError] = useState("");
 function submit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault();
   const form = new FormData(event.currentTarget);
   const number = (key: string) => Number(form.get(key));
   try {
     actions.saveTask({
       id: task?.id ?? crypto.randomUUID(),
       title: String(form.get("title")).trim(),
       category: String(form.get("category")).trim(),
       dueAt: new Date(parseLocal(String(form.get("due"))))
         .toISOString(),
       estimate: number("estimate"), worked: number("worked"),
       importance: number("importance"),
       difficulty: number("difficulty"), done: task?.done ?? false,
     });
     onClose();
   } catch (e) {
     setError(e instanceof Error ? e.message : "Could not save.");
   }
 }
 return <section className="card">
   <h2>{task ? "Edit task" : "Add task"}</h2>
   <form onSubmit={submit} className="form-grid">
     <label>Task name
       <input name="title" required maxLength={120}
         defaultValue={task?.title} autoFocus />
     </label>
     <label>Category
       <input name="category" required maxLength={40}
         list="categories" defaultValue={task?.category ?? "Personal"} />
       <datalist id="categories">
         {["Personal", "School", "Work", "Clubs", "Home"].map(c =>
           <option key={c} value={c} />)}
       </datalist>
     </label>
     <label>Due date and time
       <input name="due" type="datetime-local" required
         defaultValue={task ? localInput(Date.parse(task.dueAt)) : ""} />
     </label>
     <label>Total estimated minutes
       <input name="estimate" type="number" required min={1}
         max={100000} step={1} defaultValue={task?.estimate ?? 30} />
     </label>
     <label>Minutes already worked
       <input name="worked" type="number" required min={0}
         max={100000} step={1} defaultValue={task?.worked ?? 0} />
     </label>
     <label>Importance (1 = low, 5 = high)
       <input name="importance" type="number" required min={1}
         max={5} step={1} defaultValue={task?.importance ?? 3} />
     </label>
     <label>Difficulty (1 = easy, 5 = hard)
       <input name="difficulty" type="number" required min={1}
         max={5} step={1} defaultValue={task?.difficulty ?? 3} />
     </label>
     <p className="full">Enter your whole-task estimate. Logged work
       is subtracted automatically. Times use this device&apos;s timezone.</p>
     {error && <p role="alert" className="warning full">{error}</p>}
     <div className="actions full">
       <button type="submit">Save task</button>
       <button type="button" onClick={onClose}>Cancel</button>
     </div>
   </form>
 </section>;
}
