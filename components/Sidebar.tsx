"use client";

import { useState } from "react";
import Link from "next/link";

type NavKey = "today" | "dailies" | "tasks" | "insights";

const NAV_ITEMS: { key: NavKey; label: string; href: string; icon: React.ReactNode }[] = [
  {
    key: "today",
    label: "Today",
    href: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeWidth="1.7">
        <rect x="2.5" y="3.5" width="13" height="11.5" rx="2.5" stroke="currentColor" />
        <line x1="2.5" y1="7" x2="15.5" y2="7" stroke="currentColor" />
        <line x1="6" y1="2" x2="6" y2="5" stroke="currentColor" />
        <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" />
      </svg>
    ),
  },
  {
    key: "dailies",
    label: "Dailies",
    href: "/dailies",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="9" r="6.5" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
  },
  {
    key: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" />
        <line x1="6" y1="7" x2="12" y2="7" />
        <line x1="6" y1="11" x2="12" y2="11" />
      </svg>
    ),
  },
  {
    key: "insights",
    label: "Insights",
    href: "/insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="9" width="3" height="6" rx="1" />
        <rect x="7.5" y="5.5" width="3" height="9.5" rx="1" />
        <rect x="12" y="3" width="3" height="12" rx="1" />
      </svg>
    ),
  },
];

interface Props {
  doneCount: number;
  totalDailies: number;
  activeNav?: NavKey;
}

const CIRC = 2 * Math.PI * 34;

export function Sidebar({ doneCount, totalDailies, activeNav = "today" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const completionPct = totalDailies > 0 ? Math.round((doneCount / totalDailies) * 100) : 0;
  const dashOffset = totalDailies > 0 ? CIRC * (1 - doneCount / totalDailies) : CIRC;

  return (
    <aside className="w-[264px] flex-shrink-0 bg-white border-r border-[var(--border)] flex flex-col pt-[26px] pb-[18px] px-[18px]">

      {/* Logo */}
      <div className="flex items-center gap-[11px] px-[10px] pb-[22px]">
        <div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[var(--violet)] flex items-center justify-center gap-[2.5px] shadow-[0_4px_12px_-3px_oklch(0.58_0.16_255_/_0.55)]">
          <span className="w-[3px] h-[9px] rounded-sm bg-white opacity-95" />
          <span className="w-[3px] h-[16px] rounded-sm bg-white" />
          <span className="w-[3px] h-[12px] rounded-sm bg-white opacity-85" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-extrabold text-[22px] leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            Cadence
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.02em] text-[var(--text-subtle)] mt-1">
            keep the rhythm
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-[3px]">
        {NAV_ITEMS.map(({ key, label, href, icon }) => {
          const active = key === activeNav;
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-sm font-medium no-underline transition-colors ${
                active
                  ? "bg-[var(--violet-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[#F0F0F8]"
              }`}
            >
              <span className={active ? "text-[var(--violet)]" : "text-current"}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Bottom section */}
      <div className="relative">

        {/* Account menu popup */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 bg-white border border-[#E8E8F2] rounded-[14px] shadow-[0_16px_40px_-12px_rgba(28,28,46,0.18)] p-[6px] flex flex-col">
              <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-[var(--text-subtle)] px-[10px] pt-2 pb-[6px]">
                Account
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-[11px] px-[10px] py-[9px] rounded-[9px] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[#F4F4F8] cursor-pointer border-none bg-transparent text-left w-full"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="oklch(0.5 0.02 264)" strokeWidth="1.7">
                  <line x1="3" y1="5.5" x2="15" y2="5.5" />
                  <line x1="3" y1="12.5" x2="15" y2="12.5" />
                  <circle cx="7" cy="5.5" r="2.2" fill="white" />
                  <circle cx="11" cy="12.5" r="2.2" fill="white" />
                </svg>
                Settings
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-[11px] px-[10px] py-[9px] rounded-[9px] text-[13px] font-medium text-[oklch(0.55_0.16_25)] hover:bg-[oklch(0.96_0.02_25)] cursor-pointer border-none bg-transparent text-left w-full"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="oklch(0.58 0.16 25)" strokeWidth="1.7">
                  <path d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5v8a1.5 1.5 0 0 0 1.5 1.5H7" />
                  <line x1="8" y1="9" x2="15" y2="9" />
                  <polyline points="12 6 15 9 12 12" />
                </svg>
                Log out
              </button>
            </div>
          </>
        )}

        {/* Avatar + rhythm row */}
        <div className="flex gap-[10px] items-center">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-10 h-10 flex-shrink-0 rounded-[11px] border-none cursor-pointer flex items-center justify-center font-heading font-bold text-[14px] bg-[var(--violet-active)] text-[var(--violet-text)]"
            title="Account"
          >
            K
          </button>

          <div className="flex items-center gap-[11px] flex-1 min-w-0 bg-[#F4F4F8] border border-[var(--border)] rounded-[14px] px-3 py-[9px]">
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg width="40" height="40" viewBox="0 0 80 80" className="-rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#E4E4EE" strokeWidth="10" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke="oklch(0.58 0.16 255)" strokeWidth="10" strokeLinecap="round"
                  style={{
                    strokeDasharray: CIRC,
                    strokeDashoffset: dashOffset,
                    transition: "stroke-dashoffset 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-[var(--text-primary)]">
                {completionPct}%
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
                Today&apos;s rhythm
              </span>
              <span className="font-mono text-[10px] text-[var(--text-subtle)] whitespace-nowrap">
                {doneCount}/{totalDailies} dailies done
              </span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
