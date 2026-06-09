import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Shield, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import type { DiagnosticSnapshot } from "@/lib/types/migration";

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function RevenueLeakBanner() {
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;

  const { data: diag, isLoading } = useQuery({
    queryKey: ["clinic_diagnostics_banner", clinicId],
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_diagnostics")
        .select(
          "total_recoverable, health_score, inactive_recovery_est, pending_charges_value, stalled_opps_value, inactive_patients, stalled_opps_count, pending_charges_count",
        )
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as Pick<
        DiagnosticSnapshot,
        | "total_recoverable"
        | "health_score"
        | "inactive_recovery_est"
        | "pending_charges_value"
        | "stalled_opps_value"
        | "inactive_patients"
        | "stalled_opps_count"
        | "pending_charges_count"
      > | null;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-4 flex items-center gap-3 mb-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Carregando diagnóstico…</span>
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-[13px] font-semibold">Descubra quanto sua clínica pode recuperar</p>
            <p className="text-[11.5px] text-muted-foreground">
              Importe sua base de pacientes para gerar o diagnóstico
            </p>
          </div>
        </div>
        <Link
          to="/app/importar"
          className="text-[12px] text-primary font-medium inline-flex items-center gap-1 hover:underline shrink-0"
        >
          Importar agora <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const total = Number(diag.total_recoverable ?? 0);
  const inactive = Number(diag.inactive_recovery_est ?? 0);
  const charges = Number(diag.pending_charges_value ?? 0);
  const stalled = Number(diag.stalled_opps_value ?? 0);
  const recovered = 0; // será preenchido quando módulo de campanhas estiver ativo
  const protected_ = charges > 0 ? charges * 0.3 : 0; // estimativa de cobranças preventivas

  const healthColor =
    (diag.health_score ?? 50) >= 80
      ? "text-success"
      : (diag.health_score ?? 50) >= 60
        ? "text-amber-600"
        : "text-destructive";

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 mb-4">
      {/* Header */}
      <div className="px-5 py-3 border-b border-primary/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <span className="text-[13px] font-semibold">Revenue Leak Engine</span>
          <span className={cn("text-[11px] font-semibold", healthColor)}>
            · Score {diag.health_score ?? "—"}/100
          </span>
        </div>
        <Link
          to="/app/diagnostico"
          className="text-[12px] text-primary font-medium inline-flex items-center gap-1 hover:underline"
        >
          Ver diagnóstico completo <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary/10">
        <Metric
          icon={TrendingDown}
          iconCls="text-destructive bg-destructive/10"
          label="Receita perdida"
          value={fmt(total)}
          sub={`${(diag.inactive_patients ?? 0) + (diag.stalled_opps_count ?? 0) + (diag.pending_charges_count ?? 0)} oportunidades`}
        />
        <Metric
          icon={Sparkles}
          iconCls="text-primary bg-primary/10"
          label="Receita recuperável"
          value={fmt(inactive + stalled)}
          sub={`${diag.inactive_patients ?? 0} inativos · ${diag.stalled_opps_count ?? 0} ops`}
          highlight
        />
        <Metric
          icon={TrendingUp}
          iconCls="text-success bg-success/10"
          label="Receita recuperada"
          value={fmt(recovered)}
          sub="campanhas ativas"
        />
        <Metric
          icon={Shield}
          iconCls="text-amber-600 bg-amber-500/10"
          label="Receita protegida"
          value={fmt(charges)}
          sub={`${diag.pending_charges_count ?? 0} cobranças em aberto`}
        />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  iconCls,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof TrendingUp;
  iconCls: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("px-4 py-4", highlight && "bg-primary/5")}>
      <div className={cn("size-7 rounded-md flex items-center justify-center", iconCls)}>
        <Icon className="size-3.5" />
      </div>
      <div
        className={cn(
          "mt-2 text-[20px] font-bold tabular-nums leading-tight",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{label}</div>
      <div className="text-[10.5px] text-muted-foreground/70">{sub}</div>
    </div>
  );
}
