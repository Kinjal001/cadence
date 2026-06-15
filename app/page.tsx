"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { DailyCard, type Accent } from "@/components/DailyCard";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Priority = "high" | "medium" | "low";

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   "oklch(0.55 0.20 25)",
  medium: "oklch(0.70 0.13 76)",
  low:    "oklch(0.68 0.01 264)",
};

interface DailyMeta {
  id: string;
  name: string;
  desc: string;
  accent: Accent;
}

interface Daily extends DailyMeta {
  streak: number;
  past: boolean[];
  doneOnDate: boolean;
}

interface Task {
  id: string;
  label: string;
  meta: string;
  done: boolean;
  deadline: string | null;
  completedDate: string | null;
}

const ACCENT_CYCLE: Accent[] = ["violet", "blue", "emerald", "amber"];

/* ─── Quotes ─────────────────────────────────────────────────────────────────── */

const QUOTES = [
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "We cannot choose our external circumstances, but we can always choose how we respond to them.", author: "Epictetus" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "In a growth mindset, challenges are exciting rather than threatening.", author: "Carol Dweck" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "It is not that we have little time; it is that we waste much of it.", author: "Seneca" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "Man conquers the world by conquering himself.", author: "Zeno of Citium" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "Enthusiasm is common. Endurance is rare.", author: "Angela Duckworth" },
  { text: "Do not indulge in dreams of what you have not, but count the blessings you actually possess.", author: "Marcus Aurelius" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "No man ever steps in the same river twice, for it is not the same river and he is not the same man.", author: "Heraclitus" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
];

function getDailyQuote(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function localDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtNavDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getGreeting(name: string) {
  const hr = new Date().getHours();
  const part = hr < 12 ? "morning" : hr < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${name}`;
}

function getTodayFullStr() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtDeadline(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const MILESTONES = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function getInsight(dailies: Daily[]) {
  if (dailies.length === 0) {
    return {
      top: { id: "", name: "–", desc: "", accent: "violet" as Accent, streak: 0, past: [], doneOnDate: false },
      nextMilestone: 7,
      daysToGo: 7,
      barPct: 0,
    };
  }
  const top = dailies.reduce((m, d) => (d.streak > m.streak ? d : m), dailies[0]);
  const nextMilestone = MILESTONES.find((m) => m > top.streak) ?? Math.ceil((top.streak + 1) / 50) * 50;
  const daysToGo = nextMilestone - top.streak;
  const barPct = Math.round((top.streak / nextMilestone) * 100);
  return { top, nextMilestone, daysToGo, barPct };
}

/* ─── Date strip helpers ─────────────────────────────────────────────────────── */

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // index = getDay() (0=Sun)

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildCalendarCells(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startPad = (firstDow + 6) % 7; // shift to Monday-first grid
  const cells: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const BottomNavItems = [
  {
    label: "Today", href: "/", active: true,
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="3.5" width="13" height="11.5" rx="2.5" /><line x1="2.5" y1="7" x2="15.5" y2="7" /><line x1="6" y1="2" x2="6" y2="5" /><line x1="12" y1="2" x2="12" y2="5" /></svg>,
  },
  {
    label: "Dailies", href: "/dailies", active: false,
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="9" r="6.5" /><circle cx="9" cy="9" r="2" /></svg>,
  },
  {
    label: "Tasks", href: "/tasks", active: false,
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="2.5" width="13" height="13" rx="2.5" /><line x1="6" y1="7" x2="12" y2="7" /><line x1="6" y1="11" x2="12" y2="11" /></svg>,
  },
  {
    label: "Insights", href: "/insights", active: false,
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="9" width="3" height="6" rx="1" /><rect x="7.5" y="5.5" width="3" height="9.5" rx="1" /><rect x="12" y="3" width="3" height="12" rx="1" /></svg>,
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function TodayPage() {
  const [dailiesMeta, setDailiesMeta]    = useState<DailyMeta[]>([]);
  const [logsByDaily, setLogsByDaily]    = useState<Record<string, Set<string>>>({});
  const [tasks,       setTasks]          = useState<Task[]>([]);
  const [loading,     setLoading]        = useState(true);
  const [loadError,   setLoadError]      = useState<string | null>(null);
  const [viewDate,    setViewDate]       = useState<string>(() => localDate(0));
  const [addingDaily,     setAddingDaily]     = useState(false);
  const [newDailyName,    setNewDailyName]    = useState("");
  const [newDailyDesc,    setNewDailyDesc]    = useState("");
  const [addingTask,      setAddingTask]      = useState(false);
  const [newTaskLabel,    setNewTaskLabel]    = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [calendarOpen,    setCalendarOpen]    = useState(false);
  const [calYear,         setCalYear]         = useState(() => new Date().getFullYear());
  const [calMonth,        setCalMonth]        = useState(() => new Date().getMonth());

  const stripRef = useRef<HTMLDivElement>(null);

  const todayStr = localDate(0);
  const isToday  = viewDate === todayStr;

  useEffect(() => { loadData(); }, []);

  // After data loads, scroll the date strip so today is centered
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
      const [
        { data: dailiesData, error: e1 },
        { data: logsData,    error: e2 },
        { data: tasksData,   error: e3 },
      ] = await Promise.all([
        db().from("dailies").select("*").order("created_at", { ascending: true }),
        db().from("daily_logs").select("daily_id, date"),
        db().from("tasks").select("*").order("created_at", { ascending: true }),
      ]);

      const firstError = e1 ?? e2 ?? e3;
      if (firstError) throw new Error(firstError.message);

      const logsMap: Record<string, Set<string>> = {};
      for (const log of logsData ?? []) {
        if (!logsMap[log.daily_id]) logsMap[log.daily_id] = new Set();
        logsMap[log.daily_id].add(log.date);
      }

      const meta: DailyMeta[] = (dailiesData ?? []).map((d) => ({
        id:     d.id as string,
        name:   d.name as string,
        desc:   (d.description as string) ?? "",
        accent: ((d.color as Accent) ?? "violet") as Accent,
      }));

      const mappedTasks: Task[] = (tasksData ?? []).map((t) => {
        const parts: string[] = [];
        if (t.category) parts.push(t.category as string);
        if (t.deadline)  parts.push(fmtDeadline(t.deadline as string));
        return {
          id:            t.id as string,
          label:         t.title as string,
          meta:          parts.join(" · "),
          done:          (t.done as boolean) ?? false,
          deadline:      (t.deadline as string) ?? null,
          completedDate: (t.completed_date as string) ?? null,
        };
      });

      setDailiesMeta(meta);
      setLogsByDaily(logsMap);
      setTasks(mappedTasks);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  /* ── Derived dailies — recomputed from cached logs + viewDate, no refetch ── */

  const dailies: Daily[] = dailiesMeta.map((m) => {
    const dates      = logsByDaily[m.id] ?? new Set<string>();
    const doneOnDate = dates.has(viewDate);
    const past       = Array.from({ length: 6 }, (_, i) => dates.has(localDate(6 - i)));
    let streak = 0, daysAgo = dates.has(todayStr) ? 0 : 1;
    while (dates.has(localDate(daysAgo))) { streak++; daysAgo++; }
    return { ...m, streak, past, doneOnDate };
  });

  /* ── Handlers ── */

  const toggleDaily = async (id: string) => {
    const daily = dailies.find((d) => d.id === id);
    if (!daily) return;
    const nowDone = !daily.doneOnDate;
    setLogsByDaily((prev) => {
      const set = new Set(prev[id] ?? []);
      nowDone ? set.add(viewDate) : set.delete(viewDate);
      return { ...prev, [id]: set };
    });
    if (nowDone) await db().from("daily_logs").insert({ daily_id: id, date: viewDate });
    else         await db().from("daily_logs").delete().eq("daily_id", id).eq("date", viewDate);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    const completedDate = nowDone ? todayStr : null;
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, done: nowDone, completedDate } : t));
    await db().from("tasks").update({ done: nowDone, completed_date: completedDate }).eq("id", id);
  };

  const cancelDaily = () => { setAddingDaily(false); setNewDailyName(""); setNewDailyDesc(""); };

  const addDaily = async () => {
    const name = newDailyName.trim();
    if (!name) return;
    const accent = ACCENT_CYCLE[dailiesMeta.length % ACCENT_CYCLE.length];
    const { data } = await db()
      .from("dailies")
      .insert({ name, description: newDailyDesc.trim() || null, color: accent })
      .select().single();
    if (data) {
      setDailiesMeta((ds) => [...ds, {
        id: data.id as string, name: data.name as string,
        desc: (data.description as string) ?? "", accent,
      }]);
    }
    cancelDaily();
  };

  const cancelTask = () => {
    setAddingTask(false); setNewTaskLabel(""); setNewTaskCategory("");
    setNewTaskDeadline(""); setNewTaskPriority("medium");
  };

  const addTask = async () => {
    const label = newTaskLabel.trim();
    if (!label) return;
    const parts: string[] = [];
    if (newTaskCategory.trim()) parts.push(newTaskCategory.trim());
    if (newTaskDeadline) parts.push(fmtDeadline(newTaskDeadline));
    const { data } = await db()
      .from("tasks")
      .insert({ title: label, category: newTaskCategory.trim() || null, deadline: newTaskDeadline || null, priority: newTaskPriority })
      .select().single();
    if (data) {
      setTasks((ts) => [...ts, {
        id: data.id as string, label: data.title as string,
        meta: parts.join(" · "), done: false,
        deadline: (data.deadline as string) ?? null,
        completedDate: null,
      }]);
    }
    cancelTask();
  };

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

  /* ── Derived values ── */

  const doneCount     = dailies.filter((d) => d.doneOnDate).length;
  const totalDailies  = dailies.length;
  const tasksLeft     = tasks.filter((t) => !t.done).length;
  const { top, nextMilestone, daysToGo, barPct } = getInsight(dailies);
  const greeting      = getGreeting("Kinjal");
  const todayFullStr  = getTodayFullStr();
  const topStreak     = dailies.length > 0 ? Math.max(...dailies.map((d) => d.streak)) : 0;
  const sortedDailies = [...dailies].sort((a, b) => Number(a.doneOnDate) - Number(b.doneOnDate));
  // Pending: incomplete, sorted by deadline ascending (no deadline → last)
  const pendingTasks  = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  // Completed today: done tasks whose completion date matches the viewed date
  const completedTodayTasks = tasks.filter((t) => t.done && t.completedDate === viewDate);
  const pastDateTasks = tasks.filter((t) => t.deadline === viewDate);
  const quote         = getDailyQuote(todayStr);

  // 45-cell strip: 30 past + today + 14 future
  const dateRange     = Array.from({ length: 45 }, (_, i) => addDays(todayStr, i - 30));
  const viewMonthLabel = new Date(viewDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const calCells      = buildCalendarCells(calYear, calMonth);

  /* ── Loading / Error ── */

  if (loading || loadError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#F4F3FF]">
        <div className="hidden md:flex">
          <Sidebar doneCount={0} totalDailies={0} activeNav="today" />
        </div>
        <main className="flex-1 flex items-center justify-center bg-[#F4F3FF]">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
              <span className="text-[22px]">⚠️</span>
              <span className="font-heading font-semibold text-[15px] text-[var(--text-primary)]">Couldn&apos;t connect to database</span>
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

  /* ── Main render ── */

  return (
    <div className="flex h-full overflow-hidden bg-[#F4F3FF] text-[var(--text-primary)] antialiased">

      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar doneCount={doneCount} totalDailies={totalDailies} activeNav="today" />
      </div>

      <main className="flex-1 overflow-y-auto bg-[#F4F3FF] px-6 py-8 pb-28 md:px-[52px] md:py-[44px] md:pb-[64px]">

        {/* ── Greeting header ── */}
        <header className="mb-5 md:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-[28px] md:text-[34px] leading-[1.12] tracking-[-0.04em] text-[oklch(0.28_0.04_264)] m-0">
                {greeting}
              </h1>
              <p className="font-mono text-[12px] md:text-[13px] tracking-[0.02em] text-[var(--text-subtle)] mt-[10px]">
                {todayFullStr}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              {/* Avatar — mobile only */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className="w-9 h-9 rounded-[10px] bg-[var(--violet-active)] flex items-center justify-center font-heading font-bold text-[14px] text-[var(--violet-text)] border-none cursor-pointer"
                  title="Account"
                >
                  K
                </button>
                {mobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute top-[calc(100%+6px)] right-0 z-50 bg-white border border-[#E8E8F2] rounded-[14px] shadow-[0_16px_40px_-12px_rgba(28,28,46,0.18)] p-[6px] flex flex-col min-w-[160px]">
                      <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-[var(--text-subtle)] px-[10px] pt-2 pb-[6px]">Account</span>
                      <button onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-[9px] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[#F4F4F8] cursor-pointer border-none bg-transparent text-left w-full">
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="oklch(0.5 0.02 264)" strokeWidth="1.7">
                          <line x1="3" y1="5.5" x2="15" y2="5.5" /><line x1="3" y1="12.5" x2="15" y2="12.5" />
                          <circle cx="7" cy="5.5" r="2.2" fill="white" /><circle cx="11" cy="12.5" r="2.2" fill="white" />
                        </svg>
                        Settings
                      </button>
                      <button onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-[9px] text-[13px] font-medium text-[oklch(0.55_0.16_25)] hover:bg-[oklch(0.96_0.02_25)] cursor-pointer border-none bg-transparent text-left w-full">
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="oklch(0.58 0.16 25)" strokeWidth="1.7">
                          <path d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5v8a1.5 1.5 0 0 0 1.5 1.5H7" />
                          <line x1="8" y1="9" x2="15" y2="9" /><polyline points="12 6 15 9 12 12" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Streak badge */}
              <div className="flex items-center gap-[7px] px-[11px] py-[7px] bg-[var(--badge-bg)] border border-[var(--badge-border)] rounded-[10px]">
                <span className="text-[14px]">⭐</span>
                <span className="font-mono font-semibold text-[11px] md:text-[12px] tracking-[0.01em] text-[var(--badge-text)] whitespace-nowrap">
                  {topStreak}d best
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Daily quote card — above date strip, today only ── */}
        {isToday && (
          <div
            className="relative rounded-[16px] px-6 py-5 mb-5 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)", border: "1px solid #DDD6FE" }}
          >
            {/* Decorative large quotation mark — watermark in top-left */}
            <span
              aria-hidden="true"
              className="absolute top-[-2px] left-4 font-heading font-bold leading-none select-none pointer-events-none"
              style={{ fontSize: "72px", color: "#A78BFA", opacity: 0.28 }}
            >
              &ldquo;
            </span>
            <div className="relative">
              <p className="text-[16px] leading-[1.75] italic text-[#1E1B3A] m-0 pt-7">
                {quote.text}
              </p>
              <p className="font-mono text-[11px] text-[var(--text-subtle)] text-right mt-[10px] mb-0">
                — {quote.author}
              </p>
            </div>
          </div>
        )}

        {/* ── Date strip ── */}
        <div className="mb-7">
          {/* Row: month/year label (opens calendar) + "Today" jump button */}
          <div className="flex items-center justify-between mb-[10px] px-[2px]">
            <div className="relative">
              <button
                onClick={openCalendar}
                className="flex items-center gap-[5px] font-mono font-semibold text-[12px] text-[var(--text-primary)] hover:text-[var(--btn-primary)] transition-colors bg-transparent border-none cursor-pointer p-0"
              >
                {viewMonthLabel}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <polyline points="2 4 6 8 10 4" />
                </svg>
              </button>

              {/* Calendar picker dropdown */}
              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white border border-[var(--border)] rounded-[16px] shadow-[0_16px_40px_-12px_rgba(28,28,46,0.18)] p-4 w-[256px]">

                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={prevCalMonth}
                        className="w-7 h-7 flex items-center justify-center rounded-[8px] hover:bg-[#F4F4F8] text-[var(--text-secondary)] border-none bg-transparent cursor-pointer transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="8.5 2 4.5 6.5 8.5 11" />
                        </svg>
                      </button>
                      <span className="font-mono font-semibold text-[12px] text-[var(--text-primary)]">
                        {MONTH_NAMES[calMonth]} {calYear}
                      </span>
                      <button
                        onClick={nextCalMonth}
                        className="w-7 h-7 flex items-center justify-center rounded-[8px] hover:bg-[#F4F4F8] text-[var(--text-secondary)] border-none bg-transparent cursor-pointer transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="4.5 2 8.5 6.5 4.5 11" />
                        </svg>
                      </button>
                    </div>

                    {/* Day-of-week headers: M T W T F S S */}
                    <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
                      {["M","T","W","T","F","S","S"].map((l, i) => (
                        <div key={i} className="text-center font-mono text-[9.5px] text-[var(--text-subtle)] py-[3px]">{l}</div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-[3px]">
                      {calCells.map((dateStr, i) =>
                        dateStr ? (
                          <button
                            key={i}
                            onClick={() => { setViewDate(dateStr); setCalendarOpen(false); }}
                            className={`h-8 w-full rounded-[8px] font-mono text-[11.5px] cursor-pointer border-none transition-colors ${
                              dateStr === viewDate
                                ? "bg-[var(--btn-primary)] text-white font-semibold"
                                : dateStr === todayStr
                                ? "bg-[var(--violet-active)] text-[var(--btn-primary)] font-semibold"
                                : "text-[var(--text-primary)] hover:bg-[#F4F4F8] bg-transparent"
                            }`}
                          >
                            {parseInt(dateStr.slice(-2))}
                          </button>
                        ) : (
                          <div key={i} />
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* "Today" jump button — only shown when not on today */}
            {!isToday && (
              <button
                onClick={() => setViewDate(todayStr)}
                className="font-mono text-[11.5px] font-medium text-[var(--btn-primary)] hover:text-[var(--violet-dark)] bg-transparent border-none cursor-pointer transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* Horizontal scrollable date strip */}
          <div
            ref={stripRef}
            className="flex gap-[5px] overflow-x-auto no-scrollbar pb-1 px-[2px]"
          >
            {dateRange.map((dateStr) => {
              const isSelected  = dateStr === viewDate;
              const isThisToday = dateStr === todayStr;
              const dayLetter   = DAY_LETTERS[new Date(dateStr + "T00:00:00").getDay()];
              const dayNum      = parseInt(dateStr.slice(-2));
              return (
                <button
                  key={dateStr}
                  data-today={isThisToday ? "true" : undefined}
                  onClick={() => setViewDate(dateStr)}
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

        {/* ── Two-column body — equal 50/50 split ── */}
        <div className="flex flex-col md:flex-row gap-7 md:gap-[28px] items-start">

          {/* LEFT — Dailies */}
          <section className="flex-1 min-w-0 w-full">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-heading font-semibold text-[16px] tracking-[-0.015em] text-[oklch(0.36_0.04_264)] m-0">
                Dailies
                {!isToday && (
                  <span className="ml-2 font-mono font-normal text-[11px] text-[var(--text-subtle)] tracking-[0.01em]">
                    · {fmtNavDate(viewDate)}
                  </span>
                )}
              </h2>
              <span className="font-mono text-[11.5px] text-[var(--text-subtle)]">
                {doneCount}/{totalDailies}
              </span>
            </div>

            {dailies.length === 0 && !addingDaily && (
              <p className="text-[13px] text-[var(--text-subtle)] mb-5">
                No dailies yet — add your first one below.
              </p>
            )}

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 232px), 1fr))" }}>
              {sortedDailies.map((d) => (
                <DailyCard
                  key={d.id}
                  name={d.name}
                  desc={d.desc}
                  accent={d.accent}
                  streak={d.streak}
                  past={d.past}
                  doneToday={d.doneOnDate}
                  onToggle={() => toggleDaily(d.id)}
                />
              ))}
            </div>

            {/* Add daily */}
            <div className="mt-4">
              {addingDaily ? (
                <div className="bg-white border border-[var(--border)] rounded-[14px] p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus type="text" value={newDailyName}
                      onChange={(e) => setNewDailyName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addDaily(); if (e.key === "Escape") cancelDaily(); }}
                      placeholder="Name (required)"
                      className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                    />
                    <input
                      type="text" value={newDailyDesc}
                      onChange={(e) => setNewDailyDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addDaily(); if (e.key === "Escape") cancelDaily(); }}
                      placeholder="Description — optional"
                      className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelDaily} className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]">Cancel</button>
                    <button onClick={addDaily} disabled={!newDailyName.trim()} className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[9px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add daily</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingDaily(true)}
                  className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-subtle)] hover:text-[var(--violet)] transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className="text-[18px] leading-none">+</span> Add daily
                </button>
              )}
            </div>
          </section>

          {/* RIGHT — Tasks + Streak insight */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          <section className="w-full">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-heading font-semibold text-[16px] tracking-[-0.015em] text-[oklch(0.36_0.04_264)] m-0">
                Tasks
                {!isToday && (
                  <span className="ml-2 font-mono font-normal text-[11px] text-[var(--text-subtle)] tracking-[0.01em]">
                    · {fmtNavDate(viewDate)}
                  </span>
                )}
              </h2>
              <span className="font-mono text-[11.5px] text-[var(--text-subtle)]">
                {isToday ? `${tasksLeft} pending` : `${pastDateTasks.length} tasks`}
              </span>
            </div>

            {isToday ? (
              /* Today — pending tasks + completed-today section + add form */
              <div className="flex flex-col gap-2">
                {pendingTasks.length === 0 && completedTodayTasks.length === 0 && !addingTask && (
                  <p className="text-[13px] text-[var(--text-subtle)] mb-2">No tasks yet — add one below.</p>
                )}

                {/* Pending tasks — sorted by deadline ASC, overdue first */}
                {pendingTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-[13px] py-[11px] bg-white border border-[var(--border)] rounded-[12px] card-lift">
                    <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                      <span className="text-[13.5px] font-medium text-[oklch(0.32_0.03_264)]">
                        {t.label}
                      </span>
                      {t.meta && (
                        <span className="font-mono text-[10px] tracking-[0.02em] text-[oklch(0.66_0.014_264)]">{t.meta}</span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="w-[22px] h-[22px] flex-shrink-0 rounded-[7px] flex items-center justify-center text-[12px] font-bold cursor-pointer transition-all duration-150 border-2 bg-white border-[oklch(0.89_0.006_264)] text-transparent"
                    >
                      ✓
                    </button>
                  </div>
                ))}

                {/* Completed today — only tasks marked done on the viewed date */}
                {completedTodayTasks.length > 0 && (
                  <>
                    <div className="font-mono text-[9.5px] tracking-[0.09em] uppercase text-[var(--text-subtle)] pt-2 pb-[2px]">
                      Completed today
                    </div>
                    {completedTodayTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-[13px] py-[11px] bg-white border border-[var(--border)] rounded-[12px] card-lift">
                        <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                          <span className="text-[13.5px] font-medium text-[oklch(0.72_0.012_264)] line-through">
                            {t.label}
                          </span>
                          {t.meta && (
                            <span className="font-mono text-[10px] tracking-[0.02em] text-[oklch(0.66_0.014_264)]">{t.meta}</span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleTask(t.id)}
                          className="w-[22px] h-[22px] flex-shrink-0 rounded-[7px] flex items-center justify-center text-[12px] font-bold cursor-pointer transition-all duration-150 border-2 bg-[var(--btn-primary)] border-[var(--btn-primary)] text-white"
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {/* Add task */}
                {addingTask ? (
                  <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <input
                        autoFocus type="text" value={newTaskLabel}
                        onChange={(e) => setNewTaskLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") cancelTask(); }}
                        placeholder="Task name (required)"
                        className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                      />
                      <input
                        type="text" value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") cancelTask(); }}
                        placeholder="Category — optional"
                        className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                      />
                      <input
                        type="date" value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") cancelTask(); }}
                        className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)]"
                      />
                      <div className="flex gap-[6px] pt-[2px]">
                        {(["high", "medium", "low"] as Priority[]).map((p) => {
                          const sel = newTaskPriority === p;
                          const selStyle: Record<Priority, React.CSSProperties> = {
                            high:   { background: "oklch(0.96 0.04 25)",  color: "oklch(0.50 0.18 25)",  borderColor: "oklch(0.82 0.10 25)"  },
                            medium: { background: "oklch(0.97 0.04 76)",  color: "oklch(0.50 0.13 76)",  borderColor: "oklch(0.84 0.09 76)"  },
                            low:    { background: "#F4F4F8",               color: "var(--text-secondary)", borderColor: "var(--border-soft)"   },
                          };
                          return (
                            <button
                              key={p}
                              onClick={() => setNewTaskPriority(p)}
                              className={`flex-1 py-[6px] text-[12px] rounded-[8px] cursor-pointer border transition-all flex items-center justify-center gap-[5px] ${sel ? "font-semibold" : "font-medium bg-transparent border-[var(--border)] text-[var(--text-subtle)]"}`}
                              style={sel ? selStyle[p] : {}}
                            >
                              <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[p] }} />
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelTask} className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]">Cancel</button>
                      <button onClick={addTask} disabled={!newTaskLabel.trim()} className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[9px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add task</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTask(true)}
                    className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-subtle)] hover:text-[var(--violet)] transition-colors bg-transparent border-none cursor-pointer mt-1"
                  >
                    <span className="text-[18px] leading-none">+</span> Add task
                  </button>
                )}
              </div>
            ) : (
              /* Past/future date — tasks due on this date, read-only */
              pastDateTasks.length === 0 ? (
                <p className="text-[13px] text-[var(--text-subtle)] leading-[1.6]">
                  No tasks due on this date.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pastDateTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-[13px] py-[11px] bg-white border border-[var(--border)] rounded-[12px] card-lift">
                      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                        <span className={`text-[13.5px] font-medium ${t.done ? "text-[oklch(0.72_0.012_264)] line-through" : "text-[oklch(0.32_0.03_264)]"}`}>
                          {t.label}
                        </span>
                        {t.meta && (
                          <span className="font-mono text-[10px] tracking-[0.02em] text-[oklch(0.66_0.014_264)]">{t.meta}</span>
                        )}
                      </div>
                      <div className={`w-[22px] h-[22px] flex-shrink-0 rounded-[7px] flex items-center justify-center text-[12px] font-bold border-2 ${t.done ? "bg-[var(--btn-primary)] border-[var(--btn-primary)] text-white" : "bg-white border-[oklch(0.89_0.006_264)] text-transparent"}`}>
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>

          {/* Streak insight — below tasks on both desktop and mobile */}
          <div className="insight-card rounded-[16px] p-5 text-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-75">Streak insight</span>
              <span className="flex items-center gap-[5px] font-mono font-semibold text-[13px]">
                {top.streak}
                <span className="text-[15px]">🔥</span>
              </span>
            </div>
            <div>
              <div className="font-heading font-bold text-[20px] tracking-[-0.02em] leading-[1.2]">
                {daysToGo === 1 ? "1 day" : `${daysToGo} days`} to a {nextMilestone}-day streak
              </div>
              <div className="text-[13px] leading-[1.55] opacity-85 mt-[8px]">
                Keep <span className="font-bold">{top.name}</span> going for your longest run yet.
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[10.5px] opacity-80 mb-[7px]">
                <span>{top.streak} days</span>
                <span>{nextMilestone} days</span>
              </div>
              <div className="h-[5px] rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-[width] duration-500 ease-out" style={{ width: `${barPct}%` }} />
              </div>
            </div>
          </div>

          </div>{/* end right column wrapper */}

        </div>

      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] flex items-stretch z-30">
        {BottomNavItems.map(({ label, href, icon, active }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-4 text-[10px] font-medium tracking-wide no-underline transition-colors ${active ? "text-[var(--btn-primary)]" : "text-[var(--text-secondary)]"}`}
          >
            {icon}
            {label}
          </Link>
        ))}
      </nav>

    </div>
  );
}
