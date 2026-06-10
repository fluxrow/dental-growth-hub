import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = "hoje" | "7d" | "30d" | "90d";

export const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

const LS_KEY = "df_period";
const EVENT = "df-period-change";

function load(): Period {
  if (typeof window === "undefined") return "30d"; // SSR guard
  try {
    return (localStorage.getItem(LS_KEY) as Period) ?? "30d";
  } catch {
    return "30d";
  }
}

export function setPeriod(p: Period) {
  localStorage.setItem(LS_KEY, p);
  window.dispatchEvent(new Event(EVENT));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePeriod(): Period {
  const [p, setP] = useState<Period>(load);
  useEffect(() => {
    const h = () => setP(load());
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return p;
}

// ─── Date range helper ────────────────────────────────────────────────────────

export function periodToRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  if (period === "hoje") {
    from.setHours(0, 0, 0, 0);
  } else {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

export function periodLabel(period: Period): string {
  return PERIOD_LABELS[period];
}
