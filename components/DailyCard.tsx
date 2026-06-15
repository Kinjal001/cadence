"use client";

export type Accent = "violet" | "blue" | "emerald" | "amber" | "pink" | "cyan";

export interface DailyCardProps {
  name: string;
  desc: string;
  accent: Accent;
  streak: number;
  past: boolean[];   // last 6 days
  doneToday: boolean;
  onToggle: () => void;
}

export function DailyCard({ name, desc, accent, streak, past, doneToday, onToggle }: DailyCardProps) {
  const dots = [...past, doneToday]; // 7 dots total

  return (
    <div className={`accent-${accent} bg-white border border-[var(--border)] rounded-[14px] p-[14px_16px] flex flex-col gap-3 card-lift`}>

      {/* Header row: dot + name + desc on left, check button on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
            <span className="font-heading font-semibold text-[15px] leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)] truncate">
              {name}
            </span>
          </div>
          <span className="text-[12.5px] leading-[1.35] text-[var(--text-muted)] pl-4">
            {desc}
          </span>
        </div>

        <button
          onClick={onToggle}
          className={`w-[34px] h-[34px] flex-shrink-0 rounded-[11px] flex items-center justify-center text-[16px] font-bold cursor-pointer transition-all duration-200 border-2 ${
            doneToday
              ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_2px_8px_-2px_var(--accent-shadow)]"
              : "bg-white border-[oklch(0.89_0.006_264)] text-transparent"
          }`}
        >
          ✓
        </button>
      </div>

      {/* Footer row: streak on left, 7-day dots on right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 font-mono text-[12px] text-[oklch(0.55_0.018_264)]">
          <span className="text-[11px]">🔥</span>
          <span>{streak}d</span>
        </div>
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

    </div>
  );
}
