"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import type { Accent } from "@/components/DailyCard";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Daily {
  id: string;
  name: string;
  desc: string;
  accent: Accent;
  streak: number;
  longestStreak: number;
  past: boolean[];
  doneToday: boolean;
  tags: Tag[];
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

/* ─── Color picker ───────────────────────────────────────────────────────────── */

function ColorPicker({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
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

/* ─── Tag chips + input ──────────────────────────────────────────────────────── */

function TagChipsInput({
  selectedTags,
  tagInput,
  allTags,
  onRemoveTag,
  onAddTag,
  onInputChange,
  onInputKeyDown,
  onCommit,
}: {
  selectedTags: Tag[];
  tagInput: string;
  allTags: Tag[];
  onRemoveTag: (id: string) => void;
  onAddTag: (tag: Tag) => void;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCommit: () => void;
}) {
  const suggestions = allTags.filter(
    (t) =>
      tagInput.trim().length > 0 &&
      t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
      !selectedTags.some((st) => st.id === t.id)
  );
  const showCreate =
    tagInput.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) &&
    !selectedTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-[7px]">
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">Tags</span>
      {selectedTags.length > 0 && (
        <div className="flex gap-[6px] flex-wrap">
          {selectedTags.map((tag) => {
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
                  onClick={() => onRemoveTag(tag.id)}
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
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Type a tag name — press Enter or , to add"
          className="w-full px-3 py-[9px] text-[14px] bg-[#F4F3FF] border border-[var(--border)] rounded-[9px] outline-none focus:border-[var(--violet)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
        />
        {(suggestions.length > 0 || showCreate) && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[var(--border)] rounded-[9px] shadow-[0_4px_16px_-4px_oklch(0.70_0.19_293_/_0.15)] mt-[2px] overflow-hidden">
            {suggestions.map((tag) => {
              const colors = TAG_COLOR_MAP[tag.color] ?? TAG_COLOR_MAP.violet;
              return (
                <button
                  key={tag.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onAddTag(tag)}
                  className="w-full flex items-center gap-[8px] px-3 py-[8px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-left transition-colors"
                >
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: colors.text }} />
                  #{tag.name}
                </button>
              );
            })}
            {showCreate && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={onCommit}
                className={`w-full flex items-center gap-[8px] px-3 py-[8px] text-[13px] text-[var(--btn-primary)] hover:bg-[var(--violet-active)] bg-transparent border-none cursor-pointer text-left transition-colors ${suggestions.length > 0 ? "border-t border-[var(--border)]" : ""}`}
              >
                <span className="text-[15px] leading-none font-light">+</span>
                Create &ldquo;{tagInput.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
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
  const [dailies,      setDailies]      = useState<Daily[]>([]);
  const [sidebarDone,  setSidebarDone]  = useState(0);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [allTags,       setAllTags]       = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const [addingDaily, setAddingDaily] = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newDesc,     setNewDesc]     = useState("");
  const [newAccent,   setNewAccent]   = useState<Accent>("violet");
  const [newTags,     setNewTags]     = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editName,    setEditName]    = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [editAccent,  setEditAccent]  = useState<Accent>("violet");
  const [editTags,    setEditTags]    = useState<Tag[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const today = localDate();
      const [
        dailiesResult,
        { data: logsData, error: e2 },
        { data: tagsData },
      ] = await Promise.all([
        db().from("dailies").select("*, daily_tags(tags(id, name, color))").order("created_at", { ascending: true }),
        db().from("daily_logs").select("daily_id, date"),
        db().from("tags").select("id, name, color").order("name", { ascending: true }),
      ]);

      // Fall back to plain query if tag tables don't exist yet (migration not run)
      const { data: dailiesData, error: e1 } = dailiesResult.error
        ? await db().from("dailies").select("*").order("created_at", { ascending: true })
        : dailiesResult;
      if (e1 ?? e2) throw new Error(((e1 ?? e2)!).message);

      setAllTags(
        (tagsData ?? []).map((t) => ({ id: t.id as string, name: t.name as string, color: t.color as string }))
      );

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
          tags: ((d.daily_tags as { tags: { id: string; name: string; color: string } | null }[] | null) ?? [])
            .map((dt) => dt.tags)
            .filter((tag): tag is Tag => tag !== null),
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

  /* ── Tag helpers ── */

  async function resolveTagsForSave(tags: Tag[], setAll: typeof setAllTags): Promise<Tag[]> {
    const resolved: Tag[] = [];
    for (const tag of tags) {
      if (tag.id.startsWith("_new_")) {
        const { data } = await db().from("tags").insert({ name: tag.name, color: tag.color }).select().single();
        if (data) {
          const created: Tag = { id: data.id as string, name: data.name as string, color: data.color as string };
          resolved.push(created);
          setAll((ts) => [...ts, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } else {
        resolved.push(tag);
      }
    }
    return resolved;
  }

  function makeTagHandlers(
    tags: Tag[],
    setTags: React.Dispatch<React.SetStateAction<Tag[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    const addTag = (tag: Tag) => {
      if (!tags.some((t) => t.id === tag.id)) setTags((ts) => [...ts, tag]);
      setInput("");
    };
    const commit = () => {
      const name = input.trim().replace(/,$/, "");
      if (!name) return;
      const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) { addTag(existing); return; }
      const tempTag: Tag = { id: `_new_${name}`, name, color: tagAutoColor(name) };
      if (!tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) setTags((ts) => [...ts, tempTag]);
      setInput("");
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); return; }
      if (e.key === "Backspace" && !input && tags.length > 0) setTags((ts) => ts.slice(0, -1));
    };
    return { addTag, commit, handleKeyDown };
  }

  const newTagHandlers = makeTagHandlers(newTags, setNewTags, newTagInput, setNewTagInput);
  const editTagHandlers = makeTagHandlers(editTags, setEditTags, editTagInput, setEditTagInput);

  /* ── Add ── */

  const cancelAdd = () => {
    setAddingDaily(false);
    setNewName("");
    setNewDesc("");
    setNewAccent("violet");
    setNewTags([]);
    setNewTagInput("");
  };

  const addDaily = async () => {
    const name = newName.trim();
    if (!name) return;

    const resolvedTags = await resolveTagsForSave(newTags, setAllTags);

    const { data } = await db()
      .from("dailies")
      .insert({ name, description: newDesc.trim() || null, color: newAccent })
      .select()
      .single();

    if (data) {
      const dailyId = data.id as string;
      if (resolvedTags.length > 0) {
        await db().from("daily_tags").insert(resolvedTags.map((t) => ({ daily_id: dailyId, tag_id: t.id })));
      }
      setDailies((ds) => [
        ...ds,
        {
          id:           dailyId,
          name,
          desc:         newDesc.trim(),
          accent:       newAccent,
          streak:       0,
          longestStreak: 0,
          past:         [false, false, false, false, false, false],
          doneToday:    false,
          tags:         resolvedTags,
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
    setEditTags(daily.tags);
    setEditTagInput("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
    setEditAccent("violet");
    setEditTags([]);
    setEditTagInput("");
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;

    const resolvedTags = await resolveTagsForSave(editTags, setAllTags);

    await db().from("dailies").update({ name, description: editDesc.trim() || null, color: editAccent }).eq("id", id);
    await db().from("daily_tags").delete().eq("daily_id", id);
    if (resolvedTags.length > 0) {
      await db().from("daily_tags").insert(resolvedTags.map((t) => ({ daily_id: id, tag_id: t.id })));
    }

    setDailies((ds) =>
      ds.map((d) =>
        d.id === id ? { ...d, name, desc: editDesc.trim(), accent: editAccent, tags: resolvedTags } : d
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

  /* ── Derived ── */

  const tagsOnDailies = allTags.filter((tag) => dailies.some((d) => d.tags.some((dt) => dt.id === tag.id)));
  const filteredDailies = selectedTagId
    ? dailies.filter((d) => d.tags.some((tag) => tag.id === selectedTagId))
    : dailies;

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
              <TagChipsInput
                selectedTags={newTags}
                tagInput={newTagInput}
                allTags={allTags}
                onRemoveTag={(id) => setNewTags((ts) => ts.filter((t) => t.id !== id))}
                onAddTag={newTagHandlers.addTag}
                onInputChange={setNewTagInput}
                onInputKeyDown={newTagHandlers.handleKeyDown}
                onCommit={newTagHandlers.commit}
              />
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

          {/* Tag filter */}
          {tagsOnDailies.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">Tags</span>
              {tagsOnDailies.map((tag) => {
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

          {/* Cards grid */}
          {filteredDailies.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDailies.map((daily) => {
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
                      <TagChipsInput
                        selectedTags={editTags}
                        tagInput={editTagInput}
                        allTags={allTags}
                        onRemoveTag={(id) => setEditTags((ts) => ts.filter((t) => t.id !== id))}
                        onAddTag={editTagHandlers.addTag}
                        onInputChange={setEditTagInput}
                        onInputKeyDown={editTagHandlers.handleKeyDown}
                        onCommit={editTagHandlers.commit}
                      />
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

                    {/* Tag chips */}
                    {daily.tags.length > 0 && (
                      <div className="flex items-center gap-[5px] flex-wrap">
                        {daily.tags.map((tag) => {
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
                );
              })}
            </div>
          )}

          {/* Empty filtered state */}
          {filteredDailies.length === 0 && dailies.length > 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-[14px] text-[var(--text-secondary)] m-0">No dailies with this tag.</p>
              <button onClick={() => setSelectedTagId(null)} className="font-mono text-[11px] text-[var(--btn-primary)] bg-transparent border-none cursor-pointer hover:opacity-70">
                Clear filter
              </button>
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
