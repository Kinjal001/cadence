"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Priority = "high" | "medium" | "low";
type FilterTab = "all" | "pending" | "done";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  category: string | null;
  deadline: string | null;
  done: boolean;
  priority: Priority;
  created_at: string;
  completedDate: string | null;
  completedAt: string | null;
  tags: Tag[];
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDateFromTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDeadline(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateFull(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildCalendarCells(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startPad = (firstDow + 6) % 7;
  const cells: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   "oklch(0.55 0.20 25)",
  medium: "oklch(0.70 0.13 76)",
  low:    "oklch(0.68 0.01 264)",
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const PILL_PALETTES = [
  { bg: "#EDE9FE",               text: "oklch(0.44 0.22 293)" },
  { bg: "oklch(0.93 0.05 240)", text: "oklch(0.40 0.14 240)" },
  { bg: "oklch(0.93 0.04 165)", text: "oklch(0.36 0.12 165)" },
  { bg: "oklch(0.96 0.05 76)",  text: "oklch(0.46 0.13 76)"  },
  { bg: "oklch(0.94 0.03 195)", text: "oklch(0.40 0.10 195)" },
];

function pillColor(cat: string) {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return PILL_PALETTES[h % PILL_PALETTES.length];
}

const TAG_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: "oklch(0.92 0.05 293)", text: "oklch(0.44 0.22 293)" },
  blue:    { bg: "oklch(0.93 0.05 240)", text: "oklch(0.40 0.14 240)" },
  emerald: { bg: "oklch(0.93 0.04 165)", text: "oklch(0.36 0.12 165)" },
  amber:   { bg: "oklch(0.96 0.05 76)",  text: "oklch(0.46 0.13 76)"  },
  pink:    { bg: "oklch(0.94 0.04 350)", text: "oklch(0.44 0.16 350)" },
  cyan:    { bg: "oklch(0.93 0.04 200)", text: "oklch(0.40 0.10 200)" },
  red:     { bg: "oklch(0.96 0.04 25)",  text: "oklch(0.50 0.18 25)"  },
  slate:   { bg: "oklch(0.94 0.01 264)", text: "oklch(0.50 0.01 264)" },
};
const TAG_PALETTE = Object.keys(TAG_COLOR_MAP);

function tagAutoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function sortByDeadlineAsc(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
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
  const todayStr = localDate();

  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [sidebarDone,  setSidebarDone]  = useState(0);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [filter,       setFilter]       = useState<FilterTab>("all");
  const [viewDate,     setViewDate]     = useState(todayStr);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear,      setCalYear]      = useState(() => new Date().getFullYear());
  const [calMonth,     setCalMonth]     = useState(() => new Date().getMonth());
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [addingTask,   setAddingTask]   = useState(false);
  const [newTitle,     setNewTitle]     = useState("");
  const [newCategory,  setNewCategory]  = useState("");
  const [newDeadline,  setNewDeadline]  = useState("");
  const [newPriority,  setNewPriority]  = useState<Priority>("medium");
  const [allTags,       setAllTags]       = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [newTaskTags,   setNewTaskTags]   = useState<Tag[]>([]);
  const [tagInput,      setTagInput]      = useState("");
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (loading) return;
    requestAnimationFrame(() => {
      const el = stripRef.current?.querySelector("[data-today]") as HTMLElement | null;
      if (el && stripRef.current) {
        const cw = stripRef.current.clientWidth;
        stripRef.current.scrollLeft = el.offsetLeft - cw / 2 + el.offsetWidth / 2;
      }
    });
  }, [loading]);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const today = localDate();
      const [
        taskResult,
        { data: dailiesData },
        { data: logsData },
        { data: tagsData },
      ] = await Promise.all([
        db().from("tasks").select("*, task_tags(tags(id, name, color))").order("created_at", { ascending: true }),
        db().from("dailies").select("id"),
        db().from("daily_logs").select("daily_id").eq("date", today),
        db().from("tags").select("id, name, color").order("name", { ascending: true }),
      ]);

      // Fall back to plain query if tag tables don't exist yet (migration not run)
      const { data, error } = taskResult.error
        ? await db().from("tasks").select("*").order("created_at", { ascending: true })
        : taskResult;
      if (error) throw new Error(error.message);
      setSidebarTotal((dailiesData ?? []).length);
      setSidebarDone((logsData ?? []).length);
      setAllTags(
        (tagsData ?? []).map((t) => ({ id: t.id as string, name: t.name as string, color: t.color as string }))
      );
      setTasks(
        (data ?? []).map((t) => ({
          id:           t.id as string,
          title:        t.title as string,
          category:     (t.category as string | null) ?? null,
          deadline:     (t.deadline as string | null) ?? null,
          done:         (t.done as boolean) ?? false,
          priority:     ((t.priority as Priority) ?? "medium"),
          created_at:   t.created_at as string,
          completedDate: (t.completed_date as string | null) ?? null,
          completedAt: (t.completed_at as string | null) ?? null,
          tags: ((t.task_tags as { tags: { id: string; name: string; color: string } | null }[] | null) ?? [])
            .map((tt) => tt.tags)
            .filter((tag): tag is Tag => tag !== null),
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
    const nowDone = !task.done;
    const completedDate = nowDone ? todayStr : null;
    const completedAt = nowDone ? new Date().toISOString() : null;
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, done: nowDone, completedDate, completedAt } : t));
    await db().from("tasks").update({ done: nowDone, completed_date: completedDate, completed_at: completedAt }).eq("id", id);
  };

  const deleteTask = async (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    await db().from("tasks").delete().eq("id", id);
  };

  const openAddForm = () => {
    setNewDeadline(viewDate);
    setAddingTask(true);
  };

  const cancelAdd = () => {
    setAddingTask(false);
    setNewTitle("");
    setNewCategory("");
    setNewDeadline("");
    setNewPriority("medium");
    setNewTaskTags([]);
    setTagInput("");
  };

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const resolvedTags: Tag[] = [];
    for (const tag of newTaskTags) {
      if (tag.id.startsWith("_new_")) {
        const { data: tagData } = await db()
          .from("tags")
          .insert({ name: tag.name, color: tag.color })
          .select()
          .single();
        if (tagData) {
          const created: Tag = { id: tagData.id as string, name: tagData.name as string, color: tagData.color as string };
          resolvedTags.push(created);
          setAllTags((ts) => [...ts, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } else {
        resolvedTags.push(tag);
      }
    }

    const { data } = await db()
      .from("tasks")
      .insert({ title, category: newCategory.trim() || null, deadline: newDeadline || null, priority: newPriority, done: false })
      .select()
      .single();

    if (data) {
      const taskId = data.id as string;
      if (resolvedTags.length > 0) {
        await db().from("task_tags").insert(resolvedTags.map((t) => ({ task_id: taskId, tag_id: t.id })));
      }
      setTasks((ts) => [
        ...ts,
        {
          id:           taskId,
          title:        data.title as string,
          category:     (data.category as string | null) ?? null,
          deadline:     (data.deadline as string | null) ?? null,
          done:         false,
          priority:     newPriority,
          created_at:   data.created_at as string,
          completedDate: null,
          completedAt: null,
          tags: resolvedTags,
        },
      ]);
    }
    cancelAdd();
  };

  /* ── Tag input handlers ── */

  const addTagToForm = (tag: Tag) => {
    if (!newTaskTags.some((t) => t.id === tag.id)) setNewTaskTags((ts) => [...ts, tag]);
    setTagInput("");
  };

  const commitTagInput = () => {
    const name = tagInput.trim().replace(/,$/, "");
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addTagToForm(existing);
    } else {
      const tempTag: Tag = { id: `_new_${name}`, name, color: tagAutoColor(name) };
      if (!newTaskTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        setNewTaskTags((ts) => [...ts, tempTag]);
      }
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTagInput(); return; }
    if (e.key === "Backspace" && !tagInput && newTaskTags.length > 0) {
      setNewTaskTags((ts) => ts.slice(0, -1));
    }
  };

  /* ── Calendar handlers ── */

  const openCalendar = () => {
    const d = new Date(viewDate + "T00:00:00");
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setCalendarOpen((o) => !o);
  };
  const prevCalMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextCalMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  /* ── Derived ── */

  const isToday  = viewDate === todayStr;
  const isFuture = viewDate > todayStr;
  const isPast   = viewDate < todayStr;

  const dateRange      = Array.from({ length: 45 }, (_, i) => addDays(todayStr, i - 30));
  const viewMonthLabel = new Date(viewDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const calCells       = buildCalendarCells(calYear, calMonth);

  const allPending = tasks.filter((t) => !t.done);
  const allDone    = tasks.filter((t) => t.done);

  const overdueTasks   = sortByDeadlineAsc(allPending.filter((t) => t.deadline && t.deadline < todayStr));
  const dueOnDateTasks = sortByPriority(allPending.filter((t) => t.deadline === viewDate));
  const upcomingTasks  = sortByDeadlineAsc(
    allPending.filter((t) => t.deadline && t.deadline > viewDate)
  );
  const noDateTasks    = sortByPriority(allPending.filter((t) => !t.deadline));
  const pastViewTasks  = sortByPriority(allPending.filter((t) => t.deadline === viewDate));
  const completedSorted = [...allDone].sort((a, b) => {
    const aT = a.completedAt ?? a.completedDate ?? a.created_at;
    const bT = b.completedAt ?? b.completedDate ?? b.created_at;
    return bT.localeCompare(aT);
  });
  const pendingForTab = sortByDeadlineAsc(allPending);

  // Tag filter
  const tagsOnTasks = allTags.filter((tag) => tasks.some((t) => t.tags.some((tt) => tt.id === tag.id)));
  const applyTagFilter = (list: Task[]) =>
    !selectedTagId ? list : list.filter((t) => t.tags.some((tag) => tag.id === selectedTagId));

  const completedOnViewDate = completedSorted.filter(
    (t) => t.completedAt ? localDateFromTimestamp(t.completedAt) === viewDate : t.completedDate === viewDate
  );
  const fOverdue    = applyTagFilter(overdueTasks);
  const fDueOnDate  = applyTagFilter(dueOnDateTasks);
  const fUpcoming   = applyTagFilter(upcomingTasks);
  const fNoDate     = applyTagFilter(noDateTasks);
  const fCompleted  = applyTagFilter(completedOnViewDate);
  const fPastView   = applyTagFilter(pastViewTasks);
  const fPendingTab = applyTagFilter(pendingForTab);
  const fDoneTab    = applyTagFilter(completedSorted);

  // Tag autocomplete
  const tagSuggestions = allTags.filter(
    (t) =>
      tagInput.trim().length > 0 &&
      t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
      !newTaskTags.some((nt) => nt.id === t.id)
  );
  const showCreateTag =
    tagInput.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) &&
    !newTaskTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase());

  /* ── Loading / Error ── */

  if (loading || loadError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#F4F3FF]">
        <div className="hidden md:flex">
          <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="tasks" />
        </div>
        <main className="flex-1 flex items-center justify-center bg-[#F4F3FF]">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
              <span className="text-[22px]">⚠️</span>
              <span className="font-heading font-semibold text-[15px] text-[var(--text-primary)]">Couldn&apos;t load tasks</span>
              <span className="font-mono text-[11px] text-[var(--text-subtle)] break-all">{loadError}</span>
              <button onClick={loadData} className="mt-2 px-4 py-2 text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors">
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-[3px] border-[var(--border)] border-t-[var(--btn-primary)] animate-spin" />
              <span className="font-mono text-[12px] text-[var(--text-subtle)]">Loading…</span>
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ── Task card ── */

  const overdueFlag = (task: Task) => !task.done && !!task.deadline && task.deadline < todayStr;

  const renderCard = (task: Task) => (
    <div
      key={task.id}
      className={`flex items-start gap-3 px-[14px] py-[11px] bg-white border rounded-[12px] transition-colors card-lift ${
        overdueFlag(task) ? "border-[oklch(0.86_0.08_25)]" : "border-[var(--border)]"
      }`}
    >
      <div
        className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px]"
        style={{ background: PRIORITY_COLOR[task.priority] }}
        title={`${task.priority} priority`}
      />
      <div className="flex flex-col gap-[5px] min-w-0 flex-1">
        <span className={`text-[14px] font-medium leading-snug transition-colors ${task.done ? "text-[var(--text-subtle)] line-through" : "text-[var(--text-primary)]"}`}>
          {task.title}
        </span>
        {(task.category || task.deadline) && (
          <div className="flex items-center gap-[6px] flex-wrap">
            {task.category && (
              <span
                className="px-[8px] py-[2px] rounded-full text-[11px] font-medium"
                style={{ background: pillColor(task.category).bg, color: pillColor(task.category).text }}
              >
                {task.category}
              </span>
            )}
            {task.deadline && (
              <span className={`font-mono text-[10.5px] tracking-[0.02em] ${overdueFlag(task) ? "text-[oklch(0.52_0.18_25)]" : "text-[var(--text-subtle)]"}`}>
                {fmtDeadline(task.deadline)}
                {overdueFlag(task) && (
                  <span className="ml-[5px] px-[5px] py-[1px] rounded-full text-[9.5px] font-semibold" style={{ background: "oklch(0.96 0.05 25)", color: "oklch(0.50 0.18 25)" }}>
                    Overdue
                  </span>
                )}
              </span>
            )}
          </div>
        )}
        {task.tags.length > 0 && (
          <div className="flex items-center gap-[5px] flex-wrap">
            {task.tags.map((tag) => {
              const colors = TAG_COLOR_MAP[tag.color] ?? TAG_COLOR_MAP.violet;
              return (
                <span
                  key={tag.id}
                  onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                  className="px-[7px] py-[1.5px] rounded-full text-[10.5px] font-medium cursor-pointer transition-opacity hover:opacity-75"
                  style={{ background: colors.bg, color: colors.text }}
                  title={`Filter by #${tag.name}`}
                >
                  #{tag.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={() => toggleTask(task.id)}
        className={`w-[22px] h-[22px] flex-shrink-0 mt-[1px] rounded-[7px] flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all duration-150 border-2 ${
          task.done ? "bg-[var(--btn-primary)] border-[var(--btn-primary)] text-white" : "bg-white border-[oklch(0.89_0.006_264)] text-transparent hover:border-[var(--btn-primary)]"
        }`}
        title={task.done ? "Mark pending" : "Mark done"}
      >
        ✓
      </button>
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

  /* ── Section label ── */

  const renderSectionLabel = (
    label: string,
    count: number,
    opts?: { red?: boolean; collapsible?: boolean; chevron?: boolean; expanded?: boolean; onToggle?: () => void }
  ) => (
    <div className="flex items-center gap-3 mb-3">
      <button
        onClick={opts?.collapsible ? opts.onToggle : undefined}
        className={`flex items-center gap-[5px] font-mono text-[10px] tracking-[0.08em] uppercase whitespace-nowrap bg-transparent border-none p-0 transition-opacity ${opts?.collapsible ? "cursor-pointer hover:opacity-70" : "cursor-default"} ${opts?.red ? "text-[oklch(0.52_0.18_25)]" : "text-[var(--text-subtle)]"}`}
      >
        {label} · {count}
        {opts?.chevron && (
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"
            style={{ transform: opts.expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
          >
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
        )}
      </button>
      <div className={`flex-1 h-px ${opts?.red ? "bg-[oklch(0.90_0.05_25)]" : "bg-[var(--border)]"}`} />
    </div>
  );

  /* ── Smart "All" tab sections ── */

  const renderAllTab = () => {
    if (isPast) {
      return (
        <div className="flex flex-col gap-5">
          <p className="font-mono text-[12px] text-[var(--text-secondary)] mb-0">{fmtDateFull(viewDate)}</p>
          {fPastView.length > 0 && (
            <div>
              {renderSectionLabel(`Due ${fmtDeadline(viewDate)}`, fPastView.length)}
              <div className="flex flex-col gap-2">{fPastView.map(renderCard)}</div>
            </div>
          )}
          {fCompleted.length > 0 && (
            <div>
              {renderSectionLabel("Completed", fCompleted.length, {
                collapsible: true,
                chevron: true,
                expanded: completedExpanded,
                onToggle: () => setCompletedExpanded((v) => !v),
              })}
              {completedExpanded && (
                <div className="flex flex-col gap-2">{fCompleted.map(renderCard)}</div>
              )}
            </div>
          )}
          {fPastView.length === 0 && fCompleted.length === 0 && (
            <EmptyState message="No tasks on this date." />
          )}
        </div>
      );
    }

    if (isToday) {
      const empty = fOverdue.length + fDueOnDate.length + fNoDate.length + fUpcoming.length + fCompleted.length === 0;
      if (empty) return <EmptyState onAdd={openAddForm} />;
      return (
        <div className="flex flex-col gap-5">
          {fOverdue.length > 0 && (
            <div>
              {renderSectionLabel("Overdue", fOverdue.length, { red: true })}
              <div className="flex flex-col gap-2">{fOverdue.map(renderCard)}</div>
            </div>
          )}
          {fDueOnDate.length > 0 && (
            <div>
              {renderSectionLabel("Due Today", fDueOnDate.length)}
              <div className="flex flex-col gap-2">{fDueOnDate.map(renderCard)}</div>
            </div>
          )}
          {fNoDate.length > 0 && (
            <div>
              {renderSectionLabel("No Date", fNoDate.length)}
              <div className="flex flex-col gap-2">{fNoDate.map(renderCard)}</div>
            </div>
          )}
          {fUpcoming.length > 0 && (
            <div>
              {renderSectionLabel("Upcoming", fUpcoming.length, {
                collapsible: true,
                chevron: true,
                expanded: upcomingExpanded,
                onToggle: () => setUpcomingExpanded((v) => !v),
              })}
              {upcomingExpanded && (
                <div className="flex flex-col gap-2">{fUpcoming.map(renderCard)}</div>
              )}
            </div>
          )}
          {fCompleted.length > 0 && (
            <div>
              {renderSectionLabel("Completed", fCompleted.length, {
                collapsible: true,
                chevron: true,
                expanded: completedExpanded,
                onToggle: () => setCompletedExpanded((v) => !v),
              })}
              {completedExpanded && (
                <div className="flex flex-col gap-2">{fCompleted.map(renderCard)}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (isFuture) {
      const empty = fDueOnDate.length + fUpcoming.length + fNoDate.length === 0;
      if (empty) return <EmptyState message={`Nothing scheduled for ${fmtDeadline(viewDate)}.`} onAdd={openAddForm} />;
      return (
        <div className="flex flex-col gap-5">
          {fDueOnDate.length > 0 && (
            <div>
              {renderSectionLabel(`Due ${fmtDeadline(viewDate)}`, fDueOnDate.length)}
              <div className="flex flex-col gap-2">{fDueOnDate.map(renderCard)}</div>
            </div>
          )}
          {fUpcoming.length > 0 && (
            <div>
              {renderSectionLabel("Upcoming", fUpcoming.length, {
                collapsible: true,
                chevron: true,
                expanded: upcomingExpanded,
                onToggle: () => setUpcomingExpanded((v) => !v),
              })}
              {upcomingExpanded && (
                <div className="flex flex-col gap-2">{fUpcoming.map(renderCard)}</div>
              )}
            </div>
          )}
          {fNoDate.length > 0 && (
            <div>
              {renderSectionLabel("No Date", fNoDate.length)}
              <div className="flex flex-col gap-2">{fNoDate.map(renderCard)}</div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  /* ── Main render ── */

  return (
    <div className="flex h-full overflow-hidden bg-[#F4F3FF] text-[var(--text-primary)] antialiased">

      <div className="hidden md:flex">
        <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="tasks" />
      </div>

      <main className="flex-1 overflow-y-auto bg-[#F4F3FF] px-6 py-8 pb-24 md:px-[52px] md:py-[44px] md:pb-[64px]">
        <div className="max-w-[680px]">

          {/* Header */}
          <header className="mb-5 md:mb-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-heading font-bold text-[26px] md:text-[31px] leading-[1.15] tracking-[-0.035em] text-[oklch(0.28_0.04_264)] m-0">
                Tasks
              </h1>
              <button
                onClick={openAddForm}
                className="flex-shrink-0 flex items-center gap-[7px] px-[14px] py-[9px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors shadow-[0_4px_12px_-3px_oklch(0.70_0.19_293_/_0.35)]"
              >
                <span className="text-[16px] leading-none font-normal">+</span>
                Add task
              </button>
            </div>
          </header>

          {/* Date navigation */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-[10px]">
              <button
                onClick={openCalendar}
                className="flex items-center gap-[5px] font-mono text-[12px] font-semibold tracking-[0.01em] text-[var(--text-secondary)] hover:text-[var(--btn-primary)] bg-transparent border-none cursor-pointer transition-colors p-0"
              >
                {viewMonthLabel}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"
                  style={{ transform: calendarOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                >
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </button>
              {!isToday && (
                <button
                  onClick={() => { setViewDate(todayStr); setCalendarOpen(false); }}
                  className="font-mono text-[11px] font-medium text-[var(--btn-primary)] bg-[var(--violet-active)] px-[10px] py-[4px] rounded-full border-none cursor-pointer hover:bg-[oklch(0.88_0.07_293)] transition-colors"
                >
                  Today
                </button>
              )}
            </div>

            {calendarOpen && (
              <div className="bg-white border border-[var(--border)] rounded-[14px] p-4 mb-3 shadow-[0_4px_20px_-6px_oklch(0.70_0.19_293_/_0.15)]">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevCalMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-[var(--text-secondary)] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="8,2 4,6 8,10" /></svg>
                  </button>
                  <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button onClick={nextCalMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-[var(--text-secondary)] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4,2 8,6 4,10" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {["M","T","W","T","F","S","S"].map((l, i) => (
                    <div key={i} className="flex items-center justify-center font-mono text-[10px] text-[var(--text-subtle)] py-1">{l}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-[2px]">
                  {calCells.map((cell, i) =>
                    cell === null ? <div key={i} /> : (
                      <button
                        key={cell}
                        onClick={() => { setViewDate(cell); setCalendarOpen(false); }}
                        className={`flex items-center justify-center h-8 rounded-[8px] font-mono text-[12px] border-none cursor-pointer transition-colors ${
                          cell === viewDate
                            ? "bg-[var(--btn-primary)] text-white"
                            : cell === todayStr
                            ? "bg-[var(--violet-active)] text-[var(--btn-primary)] font-semibold"
                            : "bg-transparent text-[var(--text-primary)] hover:bg-[var(--violet-active)]"
                        }`}
                      >
                        {parseInt(cell.slice(-2))}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div ref={stripRef} className="flex gap-[5px] overflow-x-auto no-scrollbar pb-1 px-[2px]">
              {dateRange.map((dateStr) => {
                const isSelected  = dateStr === viewDate;
                const isThisToday = dateStr === todayStr;
                const dayLetter   = DAY_LETTERS[new Date(dateStr + "T00:00:00").getDay()];
                const dayNum      = parseInt(dateStr.slice(-2));
                return (
                  <button
                    key={dateStr}
                    data-today={isThisToday ? "true" : undefined}
                    onClick={() => { setViewDate(dateStr); setCalendarOpen(false); }}
                    className={`flex flex-col items-center gap-[4px] w-[44px] py-[10px] rounded-[10px] flex-shrink-0 cursor-pointer border-none transition-colors ${
                      isSelected
                        ? "bg-[var(--btn-primary)] text-white"
                        : isThisToday
                        ? "bg-[var(--violet-active)] text-[var(--btn-primary)]"
                        : "bg-transparent text-[var(--text-secondary)] hover:bg-white"
                    }`}
                  >
                    <span className="font-mono text-[9.5px] leading-none">{dayLetter}</span>
                    <span className="font-mono font-semibold text-[15px] leading-none">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mb-3">
            {(["all", "pending", "done"] as FilterTab[]).map((tab) => {
              const count = tab === "all" ? tasks.length : tab === "pending" ? allPending.length : allDone.length;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-[14px] py-[6px] rounded-full text-[13px] font-medium transition-all border cursor-pointer ${
                    filter === tab
                      ? "bg-[var(--btn-primary)] text-white border-[var(--btn-primary)] shadow-[0_2px_8px_-2px_oklch(0.70_0.19_293_/_0.30)]"
                      : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[oklch(0.82_0.07_293)] hover:text-[var(--btn-primary)]"
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

          {/* Tag filter */}
          {tagsOnTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">Tags</span>
              {tagsOnTasks.map((tag) => {
                const isSelected = selectedTagId === tag.id;
                const colors = TAG_COLOR_MAP[tag.color] ?? TAG_COLOR_MAP.violet;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                    className={`flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium border transition-all cursor-pointer ${
                      isSelected ? "border-transparent" : "bg-white border-[var(--border)] text-[var(--text-secondary)] hover:border-[oklch(0.82_0.07_293)]"
                    }`}
                    style={isSelected ? { background: colors.bg, color: colors.text } : {}}
                  >
                    <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: isSelected ? colors.text : "oklch(0.80 0.01 264)" }} />
                    #{tag.name}
                  </button>
                );
              })}
              {selectedTagId && (
                <button
                  onClick={() => setSelectedTagId(null)}
                  className="font-mono text-[10px] text-[var(--btn-primary)] bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Inline add form */}
          {addingTask && (
            <div className="bg-white border border-[var(--violet)] rounded-[14px] p-4 flex flex-col gap-3 mb-5 shadow-[0_4px_20px_-6px_oklch(0.70_0.19_293_/_0.18)]">
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") cancelAdd(); }}
                placeholder="Task title (required)"
                className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelAdd(); }}
                  placeholder="Category — e.g. Work, Personal"
                  className="flex-1 px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                />
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelAdd(); }}
                  className="w-[155px] flex-shrink-0 px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)]"
                />
              </div>

              {/* Tags input */}
              <div className="flex flex-col gap-[7px]">
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">Tags</span>
                {newTaskTags.length > 0 && (
                  <div className="flex gap-[6px] flex-wrap">
                    {newTaskTags.map((tag) => {
                      const colors = TAG_COLOR_MAP[tag.color] ?? TAG_COLOR_MAP.violet;
                      return (
                        <span
                          key={tag.id}
                          className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[11px] font-medium"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          #{tag.name}
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setNewTaskTags((ts) => ts.filter((t) => t.id !== tag.id))}
                            className="flex items-center justify-center w-[14px] h-[14px] rounded-full text-[12px] leading-none bg-transparent border-none cursor-pointer opacity-60 hover:opacity-100"
                            style={{ color: colors.text }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type a tag name — press Enter or , to add"
                    className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                  />
                  {(tagSuggestions.length > 0 || showCreateTag) && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[var(--border)] rounded-[9px] shadow-[0_4px_16px_-4px_oklch(0.70_0.19_293_/_0.15)] mt-[2px] overflow-hidden">
                      {tagSuggestions.map((tag) => {
                        const colors = TAG_COLOR_MAP[tag.color] ?? TAG_COLOR_MAP.violet;
                        return (
                          <button
                            key={tag.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addTagToForm(tag)}
                            className="w-full flex items-center gap-[8px] px-3 py-[8px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-left transition-colors"
                          >
                            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: colors.text }} />
                            #{tag.name}
                          </button>
                        );
                      })}
                      {showCreateTag && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={commitTagInput}
                          className={`w-full flex items-center gap-[8px] px-3 py-[8px] text-[13px] text-[var(--btn-primary)] hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-left transition-colors ${tagSuggestions.length > 0 ? "border-t border-[var(--border)]" : ""}`}
                        >
                          <span className="text-[15px] leading-none font-light">+</span>
                          Create &ldquo;{tagInput.trim()}&rdquo;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)] block mb-[7px]">Priority</span>
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
                        <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[p] }} />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-[2px]">
                <button onClick={cancelAdd} className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]">
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  disabled={!newTitle.trim()}
                  className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[9px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add task
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          {filter === "all" ? (
            renderAllTab()
          ) : filter === "pending" ? (
            fPendingTab.length === 0
              ? <EmptyState message="Nothing pending — you're all clear." onAdd={openAddForm} />
              : <div className="flex flex-col gap-2">{fPendingTab.map(renderCard)}</div>
          ) : (
            fDoneTab.length === 0
              ? <EmptyState message="No completed tasks yet." />
              : <div className="flex flex-col gap-2">{fDoneTab.map(renderCard)}</div>
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
              active ? "text-[var(--btn-primary)]" : "text-[var(--text-secondary)]"
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
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="var(--violet)" strokeWidth="1.7">
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
            className="px-4 py-[8px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
