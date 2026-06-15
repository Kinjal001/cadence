"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import type { Accent } from "@/components/DailyCard";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Daily {
  id: string;
  name: string;
  desc: string;
  accent: Accent;
  streak: number;
  longestStreak: number;
  past: boolean[];   // last 6 days
  doneToday: boolean;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const ACCENT_OPTIONS: { value: Accent; label: string; bg: string }[] = [
  { value: "violet",  label: "Violet",  bg: "#A78BFA" },
  { value: "blue",    label: "Blue",    bg: "oklch(0.57 0.15 240)" },
  { value: "emerald", label: "Emerald", bg: "oklch(0.60 0.12 165)" },
  { value: "amber",   label: "Amber",   bg: "oklch(0.72 0.13 76)" },
  { value: "pink",    label: "Pink",    bg: "oklch(0.68 0.16 350)" },
  { value: "cyan",    label: "Cyan",    bg: "oklch(0.62 0.14 200)" },
];

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
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    if (curr.getTime() - prev.getTime() === 86400000) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

/* ─── Color picker swatch ───────────────────────────────────────────────────── */

function ColorPicker({
  value,
  onChange,
}: {
  value: Accent;
  onChange: (a: Accent) => void;
}) {
  return (
    <div>
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)] block mb-[8px]">
        Color
      </span>
      <div className="flex gap-[10px] flex-wrap">
        {ACCENT_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.label}
              style={{ background: opt.bg }}
              className={`w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center border-none transition-all hover:scale-110 ${
                selected ? "ring-2 ring-offset-2 ring-[var(--text-primary)]" : "ring-2 ring-offset-2 ring-transparent"
              }`}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,7 5.5,10.5 12,3.5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
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
    active: true,
  },
  {
    label: "Tasks", href: "/tasks",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="2.5" width="13" height="13" rx="2.5" /><line x1="6" y1="7" x2="12" y2="7" /><line x1="6" y1="11" x2="12" y2="11" /></svg>,
    active: false,
  },
  {
    label: "Insights", href: "/insights",
    icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="9" width="3" height="6" rx="1" /><rect x="7.5" y="5.5" width="3" height="9.5" rx="1" /><rect x="12" y="3" width="3" height="12" rx="1" /></svg>,
    active: false,
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function DailiesPage() {
  const [dailies, setDailies] = useState<Daily[]>([]);
  const [sidebarDone, setSidebarDone] = useState(0);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addingDaily, setAddingDaily] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAccent, setNewAccent] = useState<Accent>("violet");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAccent, setEditAccent] = useState<Accent>("violet");

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

      const logsByDaily: Record<string, Set<string>> = {};
      for (const log of logsData ?? []) {
        if (!logsByDaily[log.daily_id]) logsByDaily[log.daily_id] = new Set();
        logsByDaily[log.daily_id].add(log.date);
      }

      const mapped: Daily[] = (dailiesData ?? []).map((d) => {
        const dates = logsByDaily[d.id as string] ?? new Set<string>();
        const doneToday = dates.has(today);
        const past = Array.from({ length: 6 }, (_, i) => dates.has(localDate(6 - i)));
        return {
          id:           d.id as string,
          name:         d.name as string,
          desc:         (d.description as string) ?? "",
          accent:       ((d.color as Accent) ?? "violet"),
          streak:       computeCurrentStreak(dates),
          longestStreak: computeLongestStreak(dates),
          past,
          doneToday,
        };
      });

      setSidebarTotal(mapped.length);
      setSidebarDone(mapped.filter((d) => d.doneToday).length);
      setDailies(mapped);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load dailies");
    } finally {
      setLoading(false);
    }
  }

  /* ── Add ── */

  const cancelAdd = () => {
    setAddingDaily(false);
    setNewName("");
    setNewDesc("");
    setNewAccent("violet");
  };

  const addDaily = async () => {
    const name = newName.trim();
    if (!name) return;
    const { data } = await db()
      .from("dailies")
      .insert({ name, description: newDesc.trim() || null, color: newAccent })
      .select()
      .single();
    if (data) {
      setDailies((ds) => [
        ...ds,
        {
          id: data.id as string,
          name,
          desc: newDesc.trim(),
          accent: newAccent,
          streak: 0,
          longestStreak: 0,
          past: [false, false, false, false, false, false],
          doneToday: false,
        },
      ]);
      setSidebarTotal((n) => n + 1);
    }
    cancelAdd();
  };

  /* ── Edit ── */

  const startEdit = (daily: Daily) => {
    setEditingId(daily.id);
    setEditName(daily.name);
    setEditDesc(daily.desc);
    setEditAccent(daily.accent);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
    setEditAccent("violet");
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await db()
      .from("dailies")
      .update({ name, description: editDesc.trim() || null, color: editAccent })
      .eq("id", id);
    setDailies((ds) =>
      ds.map((d) =>
        d.id === id ? { ...d, name, desc: editDesc.trim(), accent: editAccent } : d
      )
    );
    cancelEdit();
  };

  /* ── Delete ── */

  const deleteDaily = async (id: string) => {
    setDailies((ds) => ds.filter((d) => d.id !== id));
    setSidebarTotal((n) => Math.max(0, n - 1));
    await db().from("dailies").delete().eq("id", id);
  };

  /* ── Loading / Error ── */

  if (loading || loadError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#F4F3FF]">
        <div className="hidden md:flex">
          <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="dailies" />
        </div>
        <main className="flex-1 flex items-center justify-center bg-[#F4F3FF]">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
              <span className="text-[22px]">⚠️</span>
              <span className="font-heading font-semibold text-[15px] text-[var(--text-primary)]">
                Couldn&apos;t load dailies
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

      <div className="hidden md:flex">
        <Sidebar doneCount={sidebarDone} totalDailies={sidebarTotal} activeNav="dailies" />
      </div>

      <main className="flex-1 overflow-y-auto bg-[#F4F3FF] px-6 py-8 pb-24 md:px-[52px] md:py-[44px] md:pb-[64px]">
        <div className="max-w-[760px]">

          {/* Header */}
          <header className="mb-6 md:mb-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-bold text-[26px] md:text-[31px] leading-[1.15] tracking-[-0.035em] text-[oklch(0.28_0.04_264)] m-0">
                  Dailies
                </h1>
                <p className="font-mono text-[12px] md:text-[13.5px] tracking-[0.01em] text-[var(--text-muted)] mt-2 md:mt-[10px]">
                  {dailies.length === 0
                    ? "No dailies yet"
                    : `${dailies.length} daily habit${dailies.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                onClick={() => { cancelEdit(); setAddingDaily(true); }}
                className="flex-shrink-0 flex items-center gap-[7px] px-[14px] py-[9px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors shadow-[0_4px_12px_-3px_oklch(0.70_0.19_293_/_0.35)]"
              >
                <span className="text-[16px] leading-none font-normal">+</span>
                Add daily
              </button>
            </div>
          </header>

          {/* Add form */}
          {addingDaily && (
            <div className="bg-white border border-[var(--violet)] rounded-[14px] p-4 flex flex-col gap-3 mb-5 shadow-[0_4px_20px_-6px_oklch(0.70_0.19_293_/_0.18)]">
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addDaily(); if (e.key === "Escape") cancelAdd(); }}
                  placeholder="Name (required)"
                  className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelAdd(); }}
                  placeholder="Description — optional"
                  className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                />
              </div>
              <ColorPicker value={newAccent} onChange={setNewAccent} />
              <div className="flex justify-end gap-2 pt-[2px]">
                <button
                  onClick={cancelAdd}
                  className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]"
                >
                  Cancel
                </button>
                <button
                  onClick={addDaily}
                  disabled={!newName.trim()}
                  className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[9px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add daily
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {dailies.length === 0 && !addingDaily && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--violet-active)] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="var(--violet)" strokeWidth="1.7">
                  <circle cx="9" cy="9" r="6.5" />
                  <circle cx="9" cy="9" r="2" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[15px] font-medium text-[var(--text-primary)] m-0">
                  No dailies yet — add your first habit
                </p>
                <button
                  onClick={() => setAddingDaily(true)}
                  className="px-4 py-[8px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[10px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors"
                >
                  + Add daily
                </button>
              </div>
            </div>
          )}

          {/* Cards grid */}
          {dailies.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dailies.map((daily) => {
                const dots = [...daily.past, daily.doneToday];

                if (editingId === daily.id) {
                  return (
                    <div
                      key={daily.id}
                      className={`accent-${editAccent} bg-white border border-[var(--violet)] rounded-[14px] p-4 flex flex-col gap-3 card-lift`}
                    >
                      <div className="flex flex-col gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(daily.id); if (e.key === "Escape") cancelEdit(); }}
                          placeholder="Name (required)"
                          className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                          placeholder="Description — optional"
                          className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                        />
                      </div>
                      <ColorPicker value={editAccent} onChange={setEditAccent} />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-[7px] text-[13px] font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[9px] cursor-pointer hover:bg-[#F4F4F8]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(daily.id)}
                          disabled={!editName.trim()}
                          className="px-3 py-[7px] text-[13px] font-semibold text-white bg-[var(--btn-primary)] rounded-[9px] border-none cursor-pointer hover:bg-[var(--violet-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={daily.id}
                    className={`accent-${daily.accent} bg-white border border-[var(--border)] rounded-[14px] p-[14px_16px] flex flex-col gap-3 card-lift`}
                  >
                    {/* Name row + action buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                          <span className="font-heading font-semibold text-[15px] leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)] truncate">
                            {daily.name}
                          </span>
                        </div>
                        {daily.desc && (
                          <span className="text-[12.5px] leading-[1.35] text-[var(--text-muted)] pl-4">
                            {daily.desc}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-[2px] flex-shrink-0">
                        <button
                          onClick={() => startEdit(daily)}
                          title="Edit"
                          className="w-[28px] h-[28px] flex items-center justify-center rounded-[8px] text-[var(--text-subtle)] hover:text-[var(--violet)] hover:bg-[var(--violet-active)] cursor-pointer bg-transparent border-none transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M13 2.5l2.5 2.5L5 15.5H2.5V13L13 2.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteDaily(daily.id)}
                          title="Delete"
                          className="w-[28px] h-[28px] flex items-center justify-center rounded-[8px] text-[var(--text-subtle)] hover:text-[oklch(0.52_0.18_25)] hover:bg-[oklch(0.96_0.02_25)] cursor-pointer bg-transparent border-none transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <polyline points="4,6 14,6" />
                            <path d="M6 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6" />
                            <rect x="3.5" y="6" width="11" height="9" rx="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Streak stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 font-mono text-[12px] text-[oklch(0.55_0.018_264)]">
                        <span className="text-[11px]">🔥</span>
                        <span>{daily.streak}d streak</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11.5px] text-[var(--text-subtle)]">
                        <span>⚡</span>
                        <span>{daily.longestStreak}d best</span>
                      </div>
                    </div>

                    {/* 7-day dot row */}
                    <div className="flex gap-[5px]">
                      {dots.map((filled, i) => (
                        <span
                          key={i}
                          className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
                            filled ? "bg-[var(--accent)]" : "bg-[var(--accent-empty)]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
