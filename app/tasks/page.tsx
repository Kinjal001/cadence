"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Priority = "high" | "medium" | "low";
type FilterTab = "all" | "pending" | "done";

interface Task {
  id: string;
  title: string;
  category: string | null;
  deadline: string | null;
  done: boolean;
  priority: Priority;
  created_at: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDeadline(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDateStr(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function isOverdue(task: Task): boolean {
  return !task.done && !!task.deadline && task.deadline < localDate();
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   "oklch(0.55 0.20 25)",
  medium: "oklch(0.70 0.13 76)",
  low:    "oklch(0.68 0.01 264)",
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Palette of (bg, text) pairs — category pills pick one deterministically from the name
const PILL_PALETTES = [
  { bg: "oklch(0.95 0.05 283)", text: "oklch(0.40 0.22 283)" }, // violet
  { bg: "oklch(0.93 0.05 240)", text: "oklch(0.40 0.14 240)" }, // blue
  { bg: "oklch(0.93 0.04 165)", text: "oklch(0.36 0.12 165)" }, // emerald
  { bg: "oklch(0.96 0.05 76)",  text: "oklch(0.46 0.13 76)"  }, // amber
  { bg: "oklch(0.94 0.03 195)", text: "oklch(0.40 0.10 195)" }, // teal
];

function pillColor(cat: string) {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return PILL_PALETTES[h % PILL_PALETTES.length];
}

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return diff !== 0 ? diff : a.created_at.localeCompare(b.created_at);
  });
}

/* ─── Mobile bottom nav ─────────────────────────────────────────────────────── */

const BOTTOM_NAV = [
  {
    label: "Today", href: "/",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="3.5" width="13" height="11.5" rx="2.5" /><line x1="2.5" y1="7" x2="15.5" y2="7" /><line x1="6" y1="2" x2="6" y2="5" /><line x1="12" y1="2" x2="12" y2="5" /></svg>,
    active: false,
  },
  {
    label: "Dailies", href: "/dailies",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="9" r="6.5" /><circle cx="9" cy="9" r="2" /></svg>,
    active: false,
  },
  {
    label: "Tasks", href: "/tasks",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="2.5" width="13" height="13" rx="2.5" /><line x1="6" y1="7" x2="12" y2="7" /><line x1="6" y1="11" x2="12" y2="11" /></svg>,
    active: true,
  },
  {
    label: "Insights", href: "/insights",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="9" width="3" height="6" rx="1" /><rect x="7.5" y="5.5" width="3" height="9.5" rx="1" /><rect x="12" y="3" width="3" height="12" rx="1" /></svg>,
    active: false,
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sidebarDone, setSidebarDone] = useState(0);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const today = localDate();
      const [
        { data, error },
        { data: dailiesData },
        { data: logsData },
      ] = await Promise.all([
        db().from("tasks").select("*").order("created_at", { ascending: true }),
        db().from("dailies").select("id"),
        db().from("daily_logs").select("daily_id").eq("date", today),
      ]);
      if (error) throw new Error(error.message);
      setSidebarTotal((dailiesData ?? []).length);
      setSidebarDone((logsData ?? []).length);
      setTasks(
        (data ?? []).map((t) => ({
          id:         t.id as string,
          title:      t.title as string,
          category:   (t.category as string | null) ?? null,
          deadline:   (t.deadline as string | null) ?? null,
          done:       (t.done as boolean) ?? false,
          priority:   ((t.priority as Priority) ?? "medium"),
          created_at: t.created_at as string,
        }))
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    await db().from("tasks").update({ done: !task.done }).eq("id", id);
  };

  const deleteTask = async (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    await db().from("tasks").delete().eq("id", id);
  };

  const cancelAdd = () => {
    setAddingTask(false);
    setNewTitle("");
    setNewCategory("");
    setNewDeadline("");
    setNewPriority("medium");
  };

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const { data } = await db()
      .from("tasks")
      .insert({
        title,
        category: newCategory.trim() || null,
        deadline:  newDeadline || null,
        priority:  newPriority,
        done:      false,
      })
      .select()
      .single();
    if (data) {
      setTasks((ts) => [
        ...ts,
        {
          id:         data.id as string,
          title:      data.title as string,
          category:   (data.category as string | null) ?? null,
          deadline:   (data.deadline as string | null) ?? null,
          done:       false,
          priority:   newPriority,
          created_at: data.created_at as string,
        },
      ]);
    }
    cancelAdd();
  };

  /* ── Derived ── */

  const pending = sortByPriority(tasks.filter((t) => !t.done));
  const done    = tasks.filter((t) => t.done);

  /* ── Loading / Error screen ── */

  if (loading || loadError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#F8F8FC]">
        <div className="hidden md:flex">
          <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="tasks" />
        </div>
        <main className="flex-1 flex items-center justify-center bg-[#F8F8FC]">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
              <span className="text-[22px]">⚠️</span>
              <span className="font-heading font-semibold text-[15px] text-[var(--text-primary)]">Couldn&apos;t load tasks</span>
              <span className="font-mono text-[11px] text-[var(--text-subtle)] break-all">{loadError}</span>
              <button onClick={loadData} className="mt-2 px-4 py-2 text-[13px] font-semibold text-white bg-[var(--violet)] rounded-[10px] border-none cursor-pointer">
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-[3px] border-[var(--border)] border-t-[var(--violet)] animate-spin" />
              <span className="font-mono text-[12px] text-[var(--text-subtle)]">Loading…</span>
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ── Task card renderer ── */

  const renderCard = (task: Task) => (
    <div
      key={task.id}
      className={`flex items-start gap-3 px-[14px] py-[11px] bg-white border rounded-[12px] transition-colors ${
        isOverdue(task) ? "border-[oklch(0.86_0.08_25)]" : "border-[var(--border)]"
      }`}
    >
      {/* Priority dot */}
      <div
        className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px]"
        style={{ background: PRIORITY_COLOR[task.priority] }}
        title={`${task.priority} priority`}
      />

      {/* Content */}
      <div className="flex flex-col gap-[5px] min-w-0 flex-1">
        <span
          className={`text-[14px] font-medium leading-snug transition-colors ${
            task.done
              ? "text-[var(--text-subtle)] line-through"
              : "text-[var(--text-primary)]"
          }`}
        >
          {task.title}
        </span>

        {(task.category || task.deadline) && (
          <div className="flex items-center gap-[6px] flex-wrap">
            {task.category && (
              <span
                className="px-[8px] py-[2px] rounded-full text-[11px] font-medium"
                style={{
                  background: pillColor(task.category).bg,
                  color:      pillColor(task.category).text,
                }}
              >
                {task.category}
              </span>
            )}
            {task.deadline && (
              <span className={`font-mono text-[10.5px] tracking-[0.02em] ${isOverdue(task) ? "text-[oklch(0.52_0.18_25)]" : "text-[var(--text-subtle)]"}`}>
                {fmtDeadline(task.deadline)}
                {isOverdue(task) && (
                  <span
                    className="ml-[5px] px-[5px] py-[1px] rounded-full text-[9.5px] font-semibold"
                    style={{ background: "oklch(0.96 0.05 25)", color: "oklch(0.50 0.18 25)" }}
                  >
                    Overdue
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => toggleTask(task.id)}
        className={`w-[22px] h-[22px] flex-shrink-0 mt-[1px] rounded-[7px] flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all duration-150 border-2 ${
          task.done
            ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-white"
            : "bg-white border-[oklch(0.89_0.006_264)] text-transparent hover:border-[var(--violet)]"
        }`}
        title={task.done ? "Mark pending" : "Mark done"}
      >
        ✓
      </button>

      {/* Delete */}
      <button
        onClick={() => deleteTask(task.id)}
        className="w-[22px] h-[22px] flex-shrink-0 mt-[1px] flex items-center justify-center text-[var(--text-subtle)] hover:text-[oklch(0.52_0.18_25)] cursor-pointer bg-transparent border-none transition-colors rounded"
        title="Delete task"
      >
        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="4,6 14,6" />
          <path d="M6 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6" />
          <rect x="3.5" y="6" width="11" height="9" rx="1.5" />
        </svg>
      </button>
    </div>
  );

  /* ── Main render ── */

  const listToShow = filter === "pending" ? pending : done;

  return (
    <div className="flex h-full overflow-hidden bg-[#F8F8FC] text-[var(--text-primary)] antialiased">

      {/* Sidebar */}
      <div className="hidden md:flex">
        <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="tasks" />
      </div>

      <main className="flex-1 overflow-y-auto bg-[#F8F8FC] px-6 py-8 pb-24 md:px-[52px] md:py-[44px] md:pb-[64px]">
        <div className="max-w-[680px]">

          {/* Header */}
          <header className="mb-6 md:mb-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-bold text-[26px] md:text-[31px] leading-[1.15] tracking-[-0.035em] text-[oklch(0.28_0.04_264)] m-0">
                  Tasks
                </h1>
                <p className="font-mono text-[12px] md:text-[13.5px] tracking-[0.01em] text-[var(--text-muted)] mt-2 md:mt-[10px]">
                  {getDateStr()}
                </p>
              </div>
              <button
                onClick={() => setAddingTask(true)}
                className="flex-shrink-0 flex items-center gap-[7px] px-[14px] py-[9px] text-[13px] font-semibold text-white bg-[var(--violet)] rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity shadow-[0_4px_12px_-3px_oklch(0.50_0.27_283_/_0.45)]"
              >
                <span className="text-[16px] leading-none font-normal">+</span>
                Add task
              </button>
            </div>
          </header>

          {/* Filter chips */}
          <div className="flex gap-2 mb-5">
            {(["all", "pending", "done"] as FilterTab[]).map((tab) => {
              const count = tab === "all" ? tasks.length : tab === "pending" ? pending.length : done.length;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-[14px] py-[6px] rounded-full text-[13px] font-medium transition-all border cursor-pointer ${
                    filter === tab
                      ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-[0_2px_8px_-2px_oklch(0.50_0.27_283_/_0.4)]"
                      : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[oklch(0.80_0.09_283)] hover:text-[var(--violet)]"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}&nbsp;
                  <span className={`font-mono text-[12px] ${filter === tab ? "opacity-80" : "text-[var(--text-subtle)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inline add form */}
          {addingTask && (
            <div className="bg-white border border-[var(--violet)] rounded-[14px] p-4 flex flex-col gap-3 mb-5 shadow-[0_4px_20px_-6px_oklch(0.50_0.27_283_/_0.22)]">
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") cancelAdd(); }}
                placeholder="Task title (required)"
                className="w-full px-3 py-[9px] text-[14px] bg-[#F8F8FC] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelAdd(); }}
                  placeholder="Category — e.g. Work, Personal"
                  className="flex-1 px-3 py-[9px] text-[14px] bg-[#F8F8FC] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                />
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelAdd(); }}
                  className="w-[155px] flex-shrink-0 px-3 py-[9px] text-[14px] bg-[#F8F8FC] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)]"
                />
              </div>

              {/* Priority selector */}
              <div>
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)] block mb-[7px]">
                  Priority
                </span>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as Priority[]).map((p) => {
                    const selected = newPriority === p;
                    const selectedStyles: Record<Priority, React.CSSProperties> = {
                      high:   { background: "oklch(0.96 0.04 25)",  color: "oklch(0.50 0.18 25)",  borderColor: "oklch(0.82 0.10 25)"  },
                      medium: { background: "oklch(0.97 0.04 76)",  color: "oklch(0.50 0.13 76)",  borderColor: "oklch(0.84 0.09 76)"  },
                      low:    { background: "#F4F4F8",               color: "var(--text-secondary)", borderColor: "var(--border-soft)"   },
                    };
                    return (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`flex-1 py-[7px] text-[12px] font-medium rounded-[9px] cursor-pointer border transition-all flex items-center justify-center gap-[6px] ${
                          selected ? "font-semibold" : "bg-transparent border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--border-soft)]"
                        }`}
                        style={selected ? selectedStyles[p] : {}}
                      >
                        <span
                          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                          style={{ background: PRIORITY_COLOR[p] }}
                        />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-[2px]">
                <button
                  onClick={cancelAdd}
                  className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  disabled={!newTitle.trim()}
                  className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--violet)] rounded-[9px] border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add task
                </button>
              </div>
            </div>
          )}

          {/* Task list — "All" view splits into Active + Completed sections */}
          {filter === "all" ? (
            tasks.length === 0 ? (
              <EmptyState onAdd={() => setAddingTask(true)} />
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="flex flex-col gap-2 mb-5">
                    {pending.map(renderCard)}
                  </div>
                )}
                {done.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)] whitespace-nowrap">
                        Completed · {done.length}
                      </span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <div className="flex flex-col gap-2">
                      {done.map(renderCard)}
                    </div>
                  </>
                )}
                {pending.length === 0 && done.length > 0 && (
                  <p className="font-mono text-[12px] text-[var(--text-subtle)] text-center mt-4 mb-2">
                    All done — great work!
                  </p>
                )}
              </>
            )
          ) : (
            listToShow.length === 0 ? (
              filter === "pending"
                ? <EmptyState message="Nothing pending — you're all clear." onAdd={() => setAddingTask(true)} />
                : <EmptyState message="No completed tasks yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {listToShow.map(renderCard)}
              </div>
            )
          )}

        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] flex items-stretch z-30">
        {BOTTOM_NAV.map(({ label, href, icon, active }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-4 text-[10px] font-medium tracking-wide no-underline transition-colors ${
              active ? "text-[var(--violet)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {icon}
            {label}
          </Link>
        ))}
      </nav>

    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────────── */

function EmptyState({ message, onAdd }: { message?: string; onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="w-12 h-12 rounded-[14px] bg-[var(--violet-active)] flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="oklch(0.50 0.27 283)" strokeWidth="1.7">
          <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" />
          <line x1="6" y1="7" x2="12" y2="7" />
          <line x1="6" y1="11" x2="12" y2="11" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-[15px] font-medium text-[var(--text-primary)] m-0">
          {message ?? "Nothing here yet — add your first task"}
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-[8px] text-[13px] font-semibold text-white bg-[var(--violet)] rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
