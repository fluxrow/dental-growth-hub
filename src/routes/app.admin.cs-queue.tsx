/**
 * /app/admin/cs-queue — Painel CS Régua (DrFlux interno)
 *
 * Permite ao time DrFlux supervisionar e acionar manualmente os touchpoints D+0/D+7/D+30/D+90
 * de todas as clínicas assinantes.
 *
 * Acesso: apenas usuários com role = 'admin' (guard em app.admin.tsx)
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Building2,
  TrendingUp,
  MessageCircle,
  HeartPulse,
  TriangleAlert,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── Server Fns ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdmin = any;
const db = () => supabaseAdmin as AnyAdmin;

/**
 * Autorização server-side: exige role 'admin' em user_roles.
 * O guard de app.admin.tsx é só UX — estas fns usam service role e
 * seriam acessíveis por qualquer um sem esta checagem.
 */
async function assertAdmin(userId: string): Promise<void> {
  const { data, error } = await db()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  if (error || !data?.length) throw new Error("Acesso negado: requer role admin");
}

export const adminListCsTouchpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await db()
      .from("cs_touchpoints")
      .select(
        `
        id, clinic_id, touchpoint, scheduled_at, status, sent_at, channel, error_msg,
        clinica:clinicas(id, name)
      `,
      )
      .in("status", ["pending", "failed"])
      .lte("scheduled_at", new Date(Date.now() + 7 * 86400000).toISOString()) // próximos 7 dias
      .order("scheduled_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    return data ?? [];
  });

export const adminGetCsStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await db()
      .from("cs_touchpoints")
      .select("status, touchpoint")
      .gte("scheduled_at", new Date(Date.now() - 90 * 86400000).toISOString());

    const rows = data ?? [];
    const total = rows.length;
    const sent = rows.filter((r: { status: string }) => r.status === "sent").length;
    const pending = rows.filter((r: { status: string }) => r.status === "pending").length;
    const failed = rows.filter((r: { status: string }) => r.status === "failed").length;
    const byTouchpoint: Record<string, number> = {};
    rows.forEach((r: { touchpoint: string }) => {
      byTouchpoint[r.touchpoint] = (byTouchpoint[r.touchpoint] ?? 0) + 1;
    });

    return { total, sent, pending, failed, byTouchpoint };
  });

// Health scores de todas as clínicas (Sprint 5)
export const adminGetHealthScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await db()
      .from("clinic_health_scores")
      .select("*")
      .order("score", { ascending: true }); // mais crítico primeiro

    if (error) throw error;
    return (data ?? []) as HealthScore[];
  });

export const adminTriggerTouchpoint = createServerFn({ method: "POST" })
  .inputValidator((input: { touchpointId: string }) => {
    if (!input?.touchpointId) throw new Error("touchpointId obrigatório");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Forçar execução imediata marcando scheduled_at = agora - 1 min
    const { error } = await db()
      .from("cs_touchpoints")
      .update({
        scheduled_at: new Date(Date.now() - 60000).toISOString(),
        status: "pending",
        error_msg: null,
      })
      .eq("id", data.touchpointId);

    if (error) throw error;

    // Chamar o cron endpoint internamente para processar agora
    const cronSecret = process.env.CRON_SECRET ?? "";
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/cron/cs-touchpoints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Cron respondeu ${res.status}: ${txt}`);
    }

    return { ok: true };
  });

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthScore {
  clinic_id: string;
  clinic_name: string;
  login_score: number;
  feature_score: number;
  billing_score: number;
  engagement_score: number;
  score: number;
  status: "healthy" | "attention" | "at_risk" | "critical";
  calculated_at: string;
}

interface Touchpoint {
  id: string;
  clinic_id: string;
  touchpoint: string;
  scheduled_at: string;
  status: "pending" | "failed" | "sent" | "skipped";
  sent_at?: string | null;
  channel: string;
  error_msg?: string | null;
  clinica?: { id: string; name: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUCHPOINT_CONFIG: Record<
  string,
  { label: string; desc: string; badge: string; icon: string }
> = {
  d0_kickoff: {
    label: "D+0 Kick-off",
    desc: "Boas-vindas + próximos passos",
    badge: "bg-blue-100 text-blue-700",
    icon: "🚀",
  },
  d7_checkin: {
    label: "D+7 Check-in",
    desc: "Revenue Leak Engine rodando?",
    badge: "bg-purple-100 text-purple-700",
    icon: "📊",
  },
  d30_qbr: {
    label: "D+30 QBR Lite",
    desc: "Receita recuperada vs. custo DrFlux",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "📈",
  },
  d90_renewal: {
    label: "D+90 Renovação",
    desc: "Pitch anual com R$ recuperado",
    badge: "bg-orange-100 text-orange-700",
    icon: "🎯",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
    icon: Clock,
  },
  failed: {
    label: "Falhou",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: AlertTriangle,
  },
  sent: {
    label: "Enviado",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  skipped: {
    label: "Pulado",
    color: "text-zinc-500",
    bg: "bg-zinc-50 border-zinc-200",
    icon: ChevronRight,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/admin/cs-queue")({
  head: () => ({ meta: [{ title: "CS Queue · DrFlux Admin" }] }),
  component: CsQueueAdmin,
});

const HEALTH_STATUS_CONFIG = {
  healthy: {
    label: "Saudável",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  attention: {
    label: "Atenção",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    bar: "bg-yellow-400",
    icon: TriangleAlert,
  },
  at_risk: {
    label: "Em risco",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    bar: "bg-orange-500",
    icon: AlertTriangle,
  },
  critical: {
    label: "Crítico",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    bar: "bg-red-500",
    icon: Flame,
  },
};

function CsQueueAdmin() {
  const queryClient = useQueryClient();
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [showHealthScores, setShowHealthScores] = useState(false);

  const { data: touchpoints = [], isLoading: loadingTp } = useQuery({
    queryKey: ["admin-cs-touchpoints"],
    queryFn: () => adminListCsTouchpoints(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-cs-stats"],
    queryFn: () => adminGetCsStats(),
    staleTime: 60_000,
  });

  const { data: healthScores = [] } = useQuery({
    queryKey: ["admin-health-scores"],
    queryFn: () => adminGetHealthScores(),
    staleTime: 5 * 60_000, // 5 min
    enabled: showHealthScores,
  });

  const atRiskCount = (healthScores as HealthScore[]).filter(
    (h) => h.status === "at_risk" || h.status === "critical",
  ).length;

  const triggerMut = useMutation({
    mutationFn: (touchpointId: string) => adminTriggerTouchpoint({ data: { touchpointId } }),
    onSuccess: () => {
      setTriggerError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-cs-touchpoints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cs-stats"] });
    },
    onError: (err) => setTriggerError((err as Error).message),
  });

  // Agrupar por clínica
  const byClinic = (touchpoints as Touchpoint[]).reduce(
    (acc, tp) => {
      const key = tp.clinic_id;
      if (!acc[key]) acc[key] = { name: tp.clinica?.name ?? tp.clinic_id, items: [] };
      acc[key].items.push(tp);
      return acc;
    },
    {} as Record<string, { name: string; items: Touchpoint[] }>,
  );

  const clinicEntries = Object.entries(byClinic);
  const overdue = (touchpoints as Touchpoint[]).filter(
    (tp) => new Date(tp.scheduled_at) <= new Date(),
  ).length;

  return (
    <AppShell
      title="CS Queue"
      subtitle="Régua D+0 → D+90 · supervisão e disparo manual"
      actions={
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-cs-touchpoints"] });
            queryClient.invalidateQueries({ queryKey: ["admin-cs-stats"] });
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Atualizar
        </button>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total (90d)",
            value: stats?.total ?? 0,
            icon: MessageCircle,
            color: "text-zinc-700",
          },
          {
            label: "Enviados",
            value: stats?.sent ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-600",
          },
          {
            label: "Pendentes",
            value: stats?.pending ?? 0,
            icon: Clock,
            color: "text-yellow-600",
          },
          {
            label: "Vencidos agora",
            value: overdue,
            icon: AlertTriangle,
            color: "text-red-600",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3"
          >
            <k.icon className={cn("size-8 shrink-0", k.color)} />
            <div>
              <p className="text-2xl font-bold text-zinc-900">{k.value}</p>
              <p className="text-xs text-zinc-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Breakdown por touchpoint ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {Object.entries(TOUCHPOINT_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
              cfg.badge,
            )}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
            <span className="ml-1 opacity-70">({stats?.byTouchpoint?.[key] ?? 0})</span>
          </div>
        ))}
      </div>

      {/* ── Health Scores collapsible ── */}
      <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden">
        <button
          onClick={() => setShowHealthScores(!showHealthScores)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
        >
          <HeartPulse className="size-5 text-rose-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 text-sm">Health Scores — todas as clínicas</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Score composto: login (30%) + features (25%) + billing (25%) + engajamento (20%)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {atRiskCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle className="size-3" /> {atRiskCount} em risco
              </span>
            )}
            {showHealthScores ? (
              <ChevronDown className="size-4 text-zinc-400" />
            ) : (
              <ChevronRight className="size-4 text-zinc-400" />
            )}
          </div>
        </button>

        {showHealthScores && (
          <div className="border-t border-border divide-y divide-zinc-50 max-h-[480px] overflow-y-auto">
            {(healthScores as HealthScore[]).length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">
                Nenhum dado disponível — certifique-se de que a migration foi aplicada.
              </div>
            ) : (
              (healthScores as HealthScore[]).map((h) => {
                const hCfg = HEALTH_STATUS_CONFIG[h.status] ?? HEALTH_STATUS_CONFIG.attention;
                const HIcon = hCfg.icon;
                return (
                  <div key={h.clinic_id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-zinc-900 truncate">
                          {h.clinic_name}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                            hCfg.bg,
                            hCfg.color,
                          )}
                        >
                          <HIcon className="size-3" />
                          {hCfg.label}
                        </span>
                      </div>
                      {/* Score bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", hCfg.bar)}
                            style={{ width: `${h.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-zinc-700 w-8 text-right tabular-nums">
                          {h.score}
                        </span>
                      </div>
                      {/* Sub-scores */}
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {[
                          { label: "Login", value: h.login_score },
                          { label: "Features", value: h.feature_score },
                          { label: "Billing", value: h.billing_score },
                          { label: "Engaj.", value: h.engagement_score },
                        ].map((s) => (
                          <span key={s.label} className="text-3xs text-zinc-400">
                            {s.label}: <span className="font-medium text-zinc-600">{s.value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {triggerError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Erro ao acionar:</strong> {triggerError}
        </div>
      )}

      {/* ── Lista por clínica ── */}
      {loadingTp ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : clinicEntries.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-zinc-400">
          <CheckCircle2 className="size-12 mb-3 text-emerald-400" />
          <p className="font-medium">Nenhum touchpoint pendente nos próximos 7 dias</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clinicEntries.map(([clinicId, { name, items }]) => {
            const isOpen = expandedClinic === clinicId;
            const failedCount = items.filter((i) => i.status === "failed").length;
            const overdueCount = items.filter((i) => new Date(i.scheduled_at) <= new Date()).length;

            return (
              <div
                key={clinicId}
                className="rounded-xl border border-border bg-surface overflow-hidden"
              >
                {/* Clinic header */}
                <button
                  onClick={() => setExpandedClinic(isOpen ? null : clinicId)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
                >
                  <Building2 className="size-5 text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">{name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {items.length} touchpoint{items.length !== 1 ? "s" : ""}
                      {overdueCount > 0 && (
                        <span className="ml-2 text-red-500 font-medium">
                          · {overdueCount} vencido{overdueCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="ml-2 text-orange-500 font-medium">
                          · {failedCount} com falha
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {overdueCount > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="size-3" /> {overdueCount}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="size-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="size-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Touchpoint rows */}
                {isOpen && (
                  <div className="border-t border-border divide-y divide-zinc-50">
                    {items.map((tp) => {
                      const tpCfg = TOUCHPOINT_CONFIG[tp.touchpoint] ?? {
                        label: tp.touchpoint,
                        desc: "",
                        badge: "bg-zinc-100 text-zinc-600",
                        icon: "📬",
                      };
                      const sCfg = STATUS_CONFIG[tp.status] ?? STATUS_CONFIG.pending;
                      const StatusIcon = sCfg.icon;
                      const isOverdue = new Date(tp.scheduled_at) <= new Date();
                      const isTriggering = triggerMut.isPending && triggerMut.variables === tp.id;

                      return (
                        <div
                          key={tp.id}
                          className={cn(
                            "flex items-center gap-3 px-5 py-3",
                            isOverdue && tp.status === "pending" && "bg-red-50/30",
                          )}
                        >
                          <span className="text-xl leading-none shrink-0">{tpCfg.icon}</span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                                  tpCfg.badge,
                                )}
                              >
                                {tpCfg.label}
                              </span>
                              <span className="text-xs text-zinc-500">{tpCfg.desc}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={cn("flex items-center gap-1 text-xs", sCfg.color)}>
                                <StatusIcon className="size-3" /> {sCfg.label}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {isOverdue && tp.status === "pending" ? (
                                  <span className="text-red-500 font-medium">
                                    Venceu{" "}
                                    {new Date(tp.scheduled_at).toLocaleString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                ) : (
                                  <>
                                    Agendado{" "}
                                    {new Date(tp.scheduled_at).toLocaleString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </>
                                )}
                              </span>
                            </div>
                            {tp.error_msg && (
                              <p className="text-xs text-red-500 mt-1 truncate">{tp.error_msg}</p>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="shrink-0 flex items-center gap-2">
                            {tp.status !== "sent" && (
                              <button
                                onClick={() => triggerMut.mutate(tp.id)}
                                disabled={isTriggering}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                                  isTriggering
                                    ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
                                )}
                              >
                                {isTriggering ? (
                                  <RefreshCw className="size-3 animate-spin" />
                                ) : (
                                  <Send className="size-3" />
                                )}
                                {isTriggering ? "Enviando…" : "Acionar"}
                              </button>
                            )}
                            {tp.status === "sent" && tp.sent_at && (
                              <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <TrendingUp className="size-3" />
                                {new Date(tp.sent_at).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
