"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import type { Accent } from "@/components/DailyCard";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface DailyInsight {
  id: string;
  name: string;
  accent: Accent;
  streak: number;
  longestStreak: number;
  pct30: number;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEATMAP_WEEKS = 26;

const ACCENT_BG: Record<Accent, string> = {
  violet:  "#A78BFA",
  blue:    "oklch(0.57 0.15 240)",
  emerald: "oklch(0.60 0.12 165)",
  amber:   "oklch(0.72 0.13 76)",
  pink:    "oklch(0.68 0.16 350)",
  cyan:    "oklch(0.62 0.14 200)",
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function localDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeCurrentStreak(dates: Set<string>): number {
  const today = localDate();
  const doneToday = dates.has(today);
  let streak = 0;
  let daysAgo = doneToday ? 0 : 1;
  while (dates.has(localDate(daysAgo))) { streak++; daysAgo++; }
  return streak;
}

function computeLongestStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0;
  const sorted = Array.from(dates).sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    if (curr.getTime() - prev.getTime() === 86400000) {
      if (++current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function getWeekDates(): string[] {
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => localDate(dayOfWeek - i)).reverse();
}

function buildHeatmapGrid(
  totalDailies: number,
  logsByDate: Record<string, number>
): { date: string; pct: number; isFuture: boolean }[][] {
  const todayStr = localDate();
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  const gridStartDaysAgo = dayOfWeek + (HEATMAP_WEEKS - 1) * 7;

  return Array.from({ length: HEATMAP_WEEKS }, (_, col) =>
    Array.from({ length: 7 }, (_, row) => {
      const daysAgo = gridStartDaysAgo - (col * 7 + row);
      const date = localDate(daysAgo);
      const isFuture = date > todayStr;
      const pct = totalDailies > 0
        ? Math.min((logsByDate[date] ?? 0) / totalDailies, 1)
        : 0;
      return { date, pct, isFuture };
    })
  );
}

function cellColor(pct: number, isFuture: boolean): string {
  if (isFuture) return "#F0EFF8";
  if (pct === 0) return "#E8E7F3";
  if (pct < 0.5) return "#C4B5FD";
  if (pct < 1)   return "#A78BFA";
  return "#815BEB";
}

function monthLabel(week: { date: string }[]): string {
  for (const { date } of week) {
    if (date.slice(-2) === "01") {
      return MONTH_ABBR[parseInt(date.slice(5, 7), 10) - 1];
    }
  }
  return "";
}

/* ─── Mobile bottom nav ─────────────────────────────────────────────────────── */

const BOTTOM_NAV = [
  {
    label: "Today", href: "/", active: false,
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
    label: "Insights", href: "/insights", active: true,
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="9" width="3" height="6" rx="1" /><rect x="7.5" y="5.5" width="3" height="9.5" rx="1" /><rect x="12" y="3" width="3" height="12" rx="1" /></svg>,
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function InsightsPage() {
  const [dailies,      setDailies]      = useState<DailyInsight[]>([]);
  const [logsByDate,   setLogsByDate]   = useState<Record<string, number>>({});
  const [totalLogs,    setTotalLogs]    = useState(0);
  const [perfectDays,  setPerfectDays]  = useState(0);
  const [bestStreak,   setBestStreak]   = useState(0);
  const [sidebarDone,  setSidebarDone]  = useState(0);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const today = localDate();
      const [
        { data: dailiesData, error: e1 },
        { data: logsData,    error: e2 },
      ] = await Promise.all([
        db().from("dailies").select("*").order("created_at", { ascending: true }),
        db().from("daily_logs").select("daily_id, date"),
      ]);
      if (e1 ?? e2) throw new Error(((e1 ?? e2)!).message);

      const totalDailiesCount = (dailiesData ?? []).length;

      const logsByDailyId: Record<string, Set<string>> = {};
      const byDate: Record<string, number> = {};
      for (const log of logsData ?? []) {
        if (!logsByDailyId[log.daily_id]) logsByDailyId[log.daily_id] = new Set();
        logsByDailyId[log.daily_id].add(log.date);
        byDate[log.date] = (byDate[log.date] ?? 0) + 1;
      }

      const mapped: DailyInsight[] = (dailiesData ?? []).map((d) => {
        const dates = logsByDailyId[d.id as string] ?? new Set<string>();
        const done30 = Array.from({ length: 30 }, (_, i) => localDate(i))
          .filter((dt) => dates.has(dt)).length;
        return {
          id:            d.id as string,
          name:          d.name as string,
          accent:        ((d.color as Accent) ?? "violet"),
          streak:        computeCurrentStreak(dates),
          longestStreak: computeLongestStreak(dates),
          pct30:         done30 / 30,
        };
      });

      let perfect = 0;
      for (let i = 0; i < 30; i++) {
        const dt = localDate(i);
        if (totalDailiesCount > 0 && (byDate[dt] ?? 0) >= totalDailiesCount) perfect++;
      }

      const todayDone = (dailiesData ?? []).filter(
        (d) => logsByDailyId[d.id as string]?.has(today)
      ).length;

      const best = mapped.length > 0 ? Math.max(...mapped.map((d) => d.longestStreak)) : 0;

      setDailies(mapped);
      setLogsByDate(byDate);
      setTotalLogs((logsData ?? []).length);
      setPerfectDays(perfect);
      setBestStreak(best);
      setSidebarDone(todayDone);
      setSidebarTotal(totalDailiesCount);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  /* ── Derived ── */

  const totalDailies = dailies.length;
  const today        = localDate();
  const weekDates    = getWeekDates();
  const heatmapGrid  = buildHeatmapGrid(totalDailies, logsByDate);
  const consistency  = [...dailies].sort((a, b) => b.pct30 - a.pct30);

  /* ── Loading / Error ── */

  if (loading || loadError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#F4F3FF]">
        <div className="hidden md:flex">
          <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="insights" />
        </div>
        <main className="flex-1 flex items-center justify-center bg-[#F4F3FF]">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
              <span className="text-[22px]">⚠️</span>
              <span className="font-heading font-semibold text-[15px] text-[var(--text-primary)]">
                Couldn&apos;t load insights
              </span>
              <span className="font-mono text-[11px] text-[var(--text-subtle)] break-all">{loadError}</span>
              <button
                onClick={loadData}
                className="mt-2 px-4 py-2 text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors"
              >
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

  /* ── Main render ── */

  return (
    <div className="flex h-full overflow-hidden bg-[#F4F3FF] text-[var(--text-primary)] antialiased">
      <div className="hidden md:flex">
        <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="insights" />
      </div>

      <main className="flex-1 overflow-y-auto bg-[#F4F3FF] px-6 py-8 pb-24 md:px-[52px] md:py-[44px] md:pb-[64px]">
        <div className="max-w-[820px] flex flex-col gap-5">

          {/* ── Header ── */}
          <header>
            <h1 className="font-heading font-bold text-[26px] md:text-[31px] leading-[1.15] tracking-[-0.035em] text-[oklch(0.28_0.04_264)] m-0">
              Insights
            </h1>
            <p className="font-mono text-[12px] md:text-[13.5px] tracking-[0.01em] text-[var(--text-muted)] mt-2 md:mt-[10px]">
              {totalLogs} total check-ins · {totalDailies} daily habit{totalDailies !== 1 ? "s" : ""}
            </p>
          </header>

          {/* ── 1. Stats row ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: totalLogs,    label: "Total check-ins", color: "#A78BFA" },
              { value: bestStreak,   label: "Best streak",     color: "oklch(0.62 0.16 76)" },
              { value: perfectDays,  label: "Perfect days",    color: "oklch(0.55 0.16 165)" },
              { value: totalDailies, label: "Active dailies",  color: "oklch(0.48 0.03 264)" },
            ].map(({ value, label, color }) => (
              <div
                key={label}
                className="bg-white border border-[var(--border)] rounded-[12px] px-4 py-[14px]"
              >
                <div
                  className="font-mono font-bold text-[26px] md:text-[30px] leading-none"
                  style={{ color }}
                >
                  {value}
                </div>
                <div className="text-[11px] md:text-[12px] font-medium text-[var(--text-secondary)] mt-[8px] leading-[1.35]">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── 2. Two-column: bar chart + consistency ── */}
          <div className="flex flex-col md:flex-row gap-4 items-start">

            {/* Left — This week */}
            <div className="flex-1 w-full bg-white border border-[var(--border)] rounded-[16px] p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-heading font-bold text-[14px] tracking-[-0.01em] text-[oklch(0.28_0.04_264)] m-0">
                  This week
                </h2>
                <span className="font-mono text-[10px] text-[var(--text-subtle)]">% done</span>
              </div>

              {/* % labels row */}
              <div className="flex gap-[5px] mb-[5px]">
                {weekDates.map((date, i) => {
                  const isToday = date === today;
                  const isFuture = date > today;
                  const count = logsByDate[date] ?? 0;
                  const pct = totalDailies > 0 && !isFuture
                    ? Math.min(count / totalDailies, 1)
                    : 0;
                  const pctInt = Math.round(pct * 100);
                  return (
                    <div key={i} className="flex-1 flex justify-center">
                      {!isFuture && (
                        <span
                          className="font-mono text-[9.5px] leading-none"
                          style={{
                            color: pctInt === 0
                              ? "var(--text-subtle)"
                              : isToday ? "#815BEB" : "#9B86E8",
                          }}
                        >
                          {pctInt}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bars row */}
              <div className="flex gap-[5px]" style={{ height: "84px" }}>
                {weekDates.map((date, i) => {
                  const isToday = date === today;
                  const isFuture = date > today;
                  const count = logsByDate[date] ?? 0;
                  const pct = totalDailies > 0 && !isFuture
                    ? Math.min(count / totalDailies, 1)
                    : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[5px] overflow-hidden flex items-end"
                      style={{ background: "#EDE9FE" }}
                    >
                      {!isFuture && pct > 0 && (
                        <div
                          className="w-full rounded-[5px]"
                          style={{
                            height: `${Math.max(pct * 100, 5)}%`,
                            background: isToday ? "#815BEB" : "#C4B5FD",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day label row */}
              <div className="flex gap-[5px] mt-[6px]">
                {weekDates.map((date, i) => {
                  const isToday = date === today;
                  return (
                    <div key={i} className="flex-1 flex justify-center">
                      <span
                        className="font-mono text-[9px]"
                        style={{
                          color: isToday ? "#815BEB" : "var(--text-subtle)",
                          fontWeight: isToday ? 700 : 400,
                        }}
                      >
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — Consistency */}
            <div className="flex-1 w-full bg-white border border-[var(--border)] rounded-[16px] p-5">
              <div className="flex items-baseline gap-[5px] mb-4">
                <h2 className="font-heading font-bold text-[14px] tracking-[-0.01em] text-[oklch(0.28_0.04_264)] m-0">
                  Consistency
                </h2>
                <span className="font-mono text-[10px] text-[var(--text-subtle)]">· 30 days</span>
              </div>

              {dailies.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-subtle)]">
                  No dailies yet. Add some to track consistency.
                </p>
              ) : (
                <div className="flex flex-col gap-[13px]">
                  {consistency.map((daily) => {
                    const pctInt = Math.round(daily.pct30 * 100);
                    const barColor = ACCENT_BG[daily.accent];
                    return (
                      <div key={daily.id} className="flex items-center gap-[9px]">
                        <span
                          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                          style={{ background: barColor }}
                        />
                        <span className="font-medium text-[12.5px] text-[var(--text-primary)] truncate min-w-0 flex-1">
                          {daily.name}
                        </span>
                        <div className="w-[80px] flex-shrink-0 h-[5px] rounded-full bg-[#EDE9FE] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pctInt}%`, background: barColor }}
                          />
                        </div>
                        <span className="font-mono text-[11px] w-[26px] text-right flex-shrink-0"
                          style={{ color: pctInt >= 70 ? barColor : "var(--text-subtle)" }}
                        >
                          {pctInt}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Heatmap — 26 weeks ── */}
          <div className="bg-white border border-[var(--border)] rounded-[16px] p-5 overflow-x-auto">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-heading font-bold text-[14px] tracking-[-0.01em] text-[oklch(0.28_0.04_264)] m-0">
                Check-in history
              </h2>
              <span className="font-mono text-[10px] text-[var(--text-subtle)]">last 6 months</span>
            </div>

            <div className="flex gap-[4px]">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-[4px] mr-[3px] flex-shrink-0">
                <div style={{ height: "16px" }} />
                {["M", "", "W", "", "F", "", ""].map((label, i) => (
                  <div
                    key={i}
                    className="flex items-center font-mono text-[10px] text-[var(--text-subtle)]"
                    style={{ width: "10px", height: "14px" }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              {heatmapGrid.map((week, colIdx) => {
                const mLabel = monthLabel(week);
                return (
                  <div key={colIdx} className="flex flex-col gap-[4px] flex-shrink-0">
                    <div
                      className="flex items-end font-mono text-[9px] text-[var(--text-subtle)] leading-none"
                      style={{ height: "16px" }}
                    >
                      {mLabel}
                    </div>
                    {week.map(({ date, pct, isFuture }, rowIdx) => (
                      <div
                        key={rowIdx}
                        title={isFuture ? "" : `${date}: ${Math.round(pct * 100)}% done`}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "3px",
                          background: cellColor(pct, isFuture),
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-[6px] mt-4 pt-3 border-t border-[var(--border)]">
              <span className="font-mono text-[10px] text-[var(--text-subtle)]">Less</span>
              {["#E8E7F3", "#C4B5FD", "#A78BFA", "#815BEB"].map((c) => (
                <div
                  key={c}
                  style={{ width: "14px", height: "14px", borderRadius: "3px", background: c }}
                />
              ))}
              <span className="font-mono text-[10px] text-[var(--text-subtle)]">More</span>
            </div>
          </div>

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
