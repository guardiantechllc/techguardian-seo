"use client";

import { useState, useEffect } from "react";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [mounted, setMounted] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("guardian-tasks");
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("guardian-tasks", JSON.stringify(tasks));
    }
  }, [tasks, mounted]);

  const addTask = () => {
    if (!newTask.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.trim(),
      priority,
      completed: false,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
    };

    setTasks([task, ...tasks]);
    setNewTask("");
    setDueDate("");
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks go to bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Then sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    high: tasks.filter(t => !t.completed && t.priority === "high").length,
  };

  const priorityColors = {
    high: "border-red-500 bg-red-500/10",
    medium: "border-yellow-500 bg-yellow-500/10",
    low: "border-green-500 bg-green-500/10",
  };

  const priorityDots = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-[#a8d4ff]">Guardian</span> Command
          </h1>
          <p className="text-[#888] text-sm mt-1">Your personal command center</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-[#888] text-sm">Total Tasks</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
            <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-[#888] text-sm">Completed</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
            <div className="text-3xl font-bold text-red-500">{stats.high}</div>
            <div className="text-[#888] text-sm">High Priority</div>
          </div>
        </div>

        {/* Add Task Form */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#a8d4ff] transition-colors"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      priority === p
                        ? priorityColors[p] + " border-current"
                        : "border-[#222] bg-[#111] text-[#888] hover:border-[#444]"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#a8d4ff] transition-colors [color-scheme:dark]"
              />
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                className="ml-auto px-6 py-2 bg-[#a8d4ff] text-black font-semibold rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-[#a8d4ff] text-black"
                  : "bg-[#111] text-[#888] hover:text-white border border-[#222]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "all" && ` (${tasks.length})`}
              {f === "active" && ` (${tasks.filter(t => !t.completed).length})`}
              {f === "completed" && ` (${tasks.filter(t => t.completed).length})`}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12 text-[#555]">
              {filter === "all"
                ? "No tasks yet. Add one above!"
                : `No ${filter} tasks.`}
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`group bg-[#0a0a0a] border border-[#222] rounded-xl p-4 flex items-center gap-4 transition-all hover:border-[#333] ${
                  task.completed ? "opacity-50" : ""
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.completed
                      ? "bg-green-500 border-green-500"
                      : "border-[#444] hover:border-[#a8d4ff]"
                  }`}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Priority dot */}
                <div className={`w-2 h-2 rounded-full ${priorityDots[task.priority]}`} />

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${task.completed ? "line-through text-[#666]" : ""}`}>
                    {task.title}
                  </div>
                  {task.dueDate && (
                    <div className="text-xs text-[#666] mt-1">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-[#666] hover:text-red-500 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear completed */}
        {stats.completed > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setTasks(tasks.filter(t => !t.completed))}
              className="text-[#666] hover:text-red-500 text-sm transition-colors"
            >
              Clear {stats.completed} completed task{stats.completed > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-[#555] text-sm">
          Guardian Command v1.0 · Built for productivity
        </div>
      </footer>
    </div>
  );
}
