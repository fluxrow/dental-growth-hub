import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Kpi } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function KpiCard({ k, large = false }: { k: Kpi; large?: boolean }) {
  const positive = k.delta >= 0;
  // For "Faltas" lower is better — flip color if tone=warning AND delta<0
  const tone = k.tone ?? "primary";
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    info: "text-info",
  }[tone];

  const strokeVar = {
    primary: "var(--chart-1)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--destructive)",
    info: "var(--info)",
  }[tone];

  const data = k.spark.map((v, i) => ({ i, v }));

  return (
    <div className={cn(
      "group relative rounded-xl border border-border bg-surface overflow-hidden",
      "shadow-[0_1px_0_oklch(0.92_0.008_260)] hover:shadow-[0_4px_16px_-4px_oklch(0.55_0.2_275/0.08)] transition-shadow",
      large ? "p-5" : "p-4",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium text-muted-foreground tracking-tight truncate">
            {k.label}
          </div>
          <div className={cn(
            "mt-1 font-display font-semibold tabular-nums tracking-tight",
            large ? "text-3xl" : "text-2xl",
            large && toneClass,
          )}>
            {k.value}
          </div>
        </div>
        <div className={cn(
          "shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
          positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
        )}>
          {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {positive ? "+" : ""}{k.delta.toFixed(1)}%
        </div>
      </div>
      <div className={cn("mt-2 -mx-1", large ? "h-14" : "h-10")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-${k.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={strokeVar} stopOpacity={0.25} />
                <stop offset="100%" stopColor={strokeVar} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeVar} strokeWidth={1.6} fill={`url(#g-${k.key})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
