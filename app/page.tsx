"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DailyCard, type Accent } from "@/components/DailyCard";

/* ─── Static seed data ─────────────────────────────────────────────────────── */

interface Daily {
  id: number;
  name: string;
  desc: string;
  accent: Accent;
  streak: number;
  past: boolean[];
  doneToday: boolean;
}

interface Task {
  id: number;
  label: string;
  meta: string;
  done: boolean;
}

const SEED_DAILIES: Daily[] = [
  { id: 1, name: "Morning meditation", desc: "10 minutes of breath work",      accent: "violet",  streak: 12, past: [true, true, true, true, true, true],   doneToday: true  },
  { id: 2, name: "Read 20 pages",      desc: "Currently: Four Thousand Weeks", accent: "blue",    streak: 5,  past: [true, false, true, true, true, true],  doneToday: false },
  { id: 3, name: "Morning workout",    desc: "Strength or a short run",         accent: "emerald", streak: 23, past: [true, true, true, true, true, true],   doneToday: true  },
  { id: 4, name: "Evening journal",    desc: "Three lines before bed",          accent: "amber",   streak: 8,  past: [true, true, false, true, true, true],  doneToday: false },
  { id: 5, name: "Drink 8 glasses",   desc: "Stay ahead of the thirst",        accent: "blue",    streak: 3,  past: [false, false, true, true, true, true], doneToday: false },
  { id: 6, name: "Stretch & mobility",desc: "Hips, hamstrings, shoulders",     accent: "emerald", streak: 16, past: [true, true, true, false, true, true],  doneToday: true  },
];

const SEED_TASKS: Task[] = [
  { id: 1, label: "Review Q3 planning doc",          meta: "Work · 9:00 AM",    done: false },
  { id: 2, label: "Reply to Dana about the offsite", meta: "Email",             done: false },
  { id: 3, label: "Finish Cadence onboarding copy",  meta: "Design · 2:00 PM", done: false },
  { id: 4, label: "Book dentist appointment",        meta: "Personal",          done: false },
  { id: 5, label: "30-min deep work block",          meta: "Focus · 4:30 PM",  done: false },
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function getGreeting(name: string) {
  const hr = new Date().getHours();
  const part = hr < 12 ? "morning" : hr < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${name}`;
}

function getDateStr() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ─── Bottom nav icons (mobile) ─────────────────────────────────────────────── */

const BottomNavItems = [
  {
    label: "Today",
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2.5" y="3.5" width="13" height="11.5" rx="2.5" />
        <line x1="2.5" y1="7" x2="15.5" y2="7" />
        <line x1="6" y1="2" x2="6" y2="5" />
        <line x1="12" y1="2" x2="12" y2="5" />
      </svg>
    ),
    active: true,
  },
  {
    label: "Dailies",
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="9" r="6.5" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
    active: false,
  },
  {
    label: "Tasks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" />
        <line x1="6" y1="7" x2="12" y2="7" />
        <line x1="6" y1="11" x2="12" y2="11" />
      </svg>
    ),
    active: false,
  },
  {
    label: "Insights",
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="9" width="3" height="6" rx="1" />
        <rect x="7.5" y="5.5" width="3" height="9.5" rx="1" />
        <rect x="12" y="3" width="3" height="12" rx="1" />
      </svg>
    ),
    active: false,
  },
];

/* ─── Insight card data ─────────────────────────────────────────────────────── */

const MILESTONES = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function getInsight(dailies: Daily[]) {
  const top = dailies.reduce((m, d) => (d.streak > m.streak ? d : m), dailies[0]);
  const nextMilestone =
    MILESTONES.find((m) => m > top.streak) ??
    Math.ceil((top.streak + 1) / 50) * 50;
  const daysToGo = nextMilestone - top.streak;
  const barPct = Math.round((top.streak / nextMilestone) * 100);
  return { top, nextMilestone, daysToGo, barPct };
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function TodayPage() {
  const [dailies, setDailies] = useState<Daily[]>(SEED_DAILIES);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);

  const toggleDaily = (id: number) =>
    setDailies((ds) =>
      ds.map((d) =>
        d.id === id
          ? {
              ...d,
              doneToday: !d.doneToday,
              streak: d.doneToday ? Math.max(0, d.streak - 1) : d.streak + 1,
            }
          : d
      )
    );

  const toggleTask = (id: number) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const doneCount = dailies.filter((d) => d.doneToday).length;
  const totalDailies = dailies.length;
  const tasksLeft = tasks.filter((t) => !t.done).length;
  const { top, nextMilestone, daysToGo, barPct } = getInsight(dailies);

  const greeting = getGreeting("Kinjal");
  const dateStr = getDateStr();
  const topStreak = Math.max(...dailies.map((d) => d.streak));

  return (
    <div className="flex h-full overflow-hidden text-[var(--text-primary)] antialiased">

      {/* Sidebar — hidden on mobile, shown from md up */}
      <div className="hidden md:flex">
        <Sidebar doneCount={doneCount} totalDailies={totalDailies} activeNav="today" />
      </div>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto px-6 py-8 pb-24 md:px-[52px] md:py-[44px] md:pb-[64px]">

        {/* Header */}
        <header className="mb-7 md:mb-[30px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-[26px] md:text-[31px] leading-[1.15] tracking-[-0.035em] text-[oklch(0.28_0.04_264)] m-0">
                {greeting}
              </h1>
              <p className="font-mono text-[12px] md:text-[13.5px] tracking-[0.01em] text-[var(--text-muted)] mt-2 md:mt-[10px]">
                {dateStr}
              </p>
            </div>
            {/* Top streak badge */}
            <div className="flex items-center gap-2 px-[13px] py-2 bg-[var(--badge-bg)] border border-[var(--badge-border)] rounded-[11px] flex-shrink-0">
              <span className="text-[15px]">⭐</span>
              <span className="font-mono font-semibold text-[12px] md:text-[13px] tracking-[0.01em] text-[var(--badge-text)] whitespace-nowrap">
                {topStreak} day best run
              </span>
            </div>
          </div>
        </header>

        {/* Two-column body */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-[26px] items-start">

          {/* LEFT: Dailies */}
          <section className="flex-1 min-w-0 w-full">
            <div className="flex items-baseline justify-between mb-[18px]">
              <h2 className="font-heading font-bold text-[17px] tracking-[-0.02em] text-[oklch(0.32_0.035_264)] m-0">
                Dailies
              </h2>
              <span className="font-mono text-[12px] text-[var(--text-subtle)]">
                {doneCount}/{totalDailies} done
              </span>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 232px), 1fr))" }}>
              {dailies.map((d) => (
                <DailyCard
                  key={d.id}
                  name={d.name}
                  desc={d.desc}
                  accent={d.accent}
                  streak={d.streak}
                  past={d.past}
                  doneToday={d.doneToday}
                  onToggle={() => toggleDaily(d.id)}
                />
              ))}
            </div>
          </section>

          {/* RIGHT: Insight card + Up next */}
          <div className="w-full md:w-[320px] md:flex-shrink-0 flex flex-col gap-[22px]">

            {/* Streak insight card */}
            <div className="insight-card rounded-[16px] p-5 text-white flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
                  Streak insight
                </span>
                <span className="flex items-center gap-[5px] font-mono font-semibold text-[13px]">
                  {top.streak}
                  <span className="text-[15px]">🔥</span>
                </span>
              </div>
              <div>
                <div className="font-heading font-bold text-[21px] tracking-[-0.02em] leading-[1.2]">
                  {daysToGo === 1 ? "1 day" : `${daysToGo} days`} to a {nextMilestone}-day streak
                </div>
                <div className="text-[13px] leading-[1.5] opacity-90 mt-[7px]">
                  Keep <span className="font-bold">{top.name}</span> going for your longest run yet.
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono text-[11px] opacity-90 mb-[7px]">
                  <span>{top.streak} days</span>
                  <span>{nextMilestone} days</span>
                </div>
                <div className="h-[6px] rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Up next */}
            <section>
              <div className="flex items-baseline justify-between mb-[18px]">
                <h2 className="font-heading font-bold text-[17px] tracking-[-0.02em] text-[oklch(0.32_0.035_264)] m-0">
                  Up next
                </h2>
                <span className="font-mono text-[12px] text-[var(--text-subtle)]">
                  {tasksLeft} pending
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-[14px] py-3 bg-white border border-[var(--border)] rounded-[12px]"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span
                        className={`text-[14px] font-medium transition-colors ${
                          t.done
                            ? "text-[oklch(0.72_0.012_264)] line-through"
                            : "text-[oklch(0.32_0.03_264)]"
                        }`}
                      >
                        {t.label}
                      </span>
                      <span className="font-mono text-[10.5px] tracking-[0.02em] text-[oklch(0.66_0.014_264)]">
                        {t.meta}
                      </span>
                    </div>
                    {/* Checkbox on the right */}
                    <button
                      onClick={() => toggleTask(t.id)}
                      className={`w-[22px] h-[22px] flex-shrink-0 rounded-[7px] flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all duration-150 border-2 ${
                        t.done
                          ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-white"
                          : "bg-white border-[oklch(0.89_0.006_264)] text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Mobile bottom nav — visible only below md */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] flex items-stretch z-30">
        {BottomNavItems.map(({ label, icon, active }) => (
          <button
            key={label}
            className={`flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-4 text-[10px] font-medium tracking-wide border-none bg-transparent cursor-pointer transition-colors ${
              active ? "text-[var(--violet)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

    </div>
  );
}
