import { FUNNEL } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function FunnelChart() {
  const max = FUNNEL[0].count;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight">Funil DentalFlux</h3>
          <p className="text-[12px] text-muted-foreground">Jornada do paciente — últimos 30 dias</p>
        </div>
        <div className="text-[12px] text-muted-foreground">
          Conversão geral{" "}
          <span className="text-success font-semibold tabular-nums">
            {((FUNNEL[FUNNEL.length - 1].count / max) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {FUNNEL.map((row, i) => {
          const widthPct = (row.count / max) * 100;
          const prev = i === 0 ? null : FUNNEL[i - 1];
          const stepConv = prev ? (row.count / prev.count) * 100 : 100;
          return (
            <div key={row.stage} className="flex items-center gap-3">
              <div className="w-36 shrink-0 text-[12px] text-foreground/80 font-medium">
                {row.stage}
              </div>
              <div className="flex-1 h-9 bg-muted/60 rounded-md relative overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-md flex items-center px-3 text-[12px] font-semibold text-primary-foreground transition-all",
                    "bg-gradient-to-r from-primary to-chart-2",
                  )}
                  style={{ width: `${widthPct}%`, minWidth: 60 }}
                >
                  <span className="tabular-nums">{row.count}</span>
                </div>
              </div>
              <div className="w-16 shrink-0 text-right text-[11.5px] tabular-nums text-muted-foreground">
                {i === 0 ? "—" : `${stepConv.toFixed(0)}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
