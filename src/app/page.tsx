"use client";
import { useState, useSyncExternalStore } from "react";
import type { Task } from "@/lib/types";
import { actions, subscribe, getSnapshot,
 getServerSnapshot } from "@/lib/store";
import TaskEditor from "@/components/TaskEditor";
export default function Home() {
 const snapshot = useSyncExternalStore(
   subscribe, getSnapshot, getServerSnapshot,
 );
 const [editing, setEditing] = useState<Task | "new" | null>(null);
 if (!snapshot) return <p>Loading...</p>;
 function run(action: () => void) {
   try { action(); } catch (e) { alert(String(e)); }
 }
 return <main>
   <h1>Task prototype</h1>
   <button onClick={() => setEditing("new")}>Add task</button>
   {snapshot.error && <p role="alert">{snapshot.error}</p>}
   {editing && <TaskEditor
     key={editing === "new" ? "new" : editing.id}
     task={editing === "new" ? undefined : editing}
     onClose={() => setEditing(null)} />}
   <ul>{snapshot.data.tasks.map(task => <li key={task.id}>
     {task.title} {task.done ? "(done)" : ""}
     <button onClick={() => setEditing(task)}>Edit</button>
     <button onClick={() => run(() => actions.toggleTask(task.id))}>
       Complete / reopen
     </button>
     <button onClick={() => {
       if (confirm("Delete this task?")) {
         run(() => actions.deleteTask(task.id));
       }
     }}>Delete</button>
   </li>)}</ul>
 </main>;
}
