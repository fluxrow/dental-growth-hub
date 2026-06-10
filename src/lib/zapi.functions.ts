/**
 * zapi.functions.ts — Server fns para Z-API (WhatsApp gateway)
 *
 * Funções:
 *  sendWhatsAppText   — Envia mensagem de texto via Z-API
 *  sendCobrancaWA     — Envia mensagem de cobrança com template dunning
 *  registerWebhooks   — Registra todos os webhooks necessários na Z-API
 *  getInstanceStatus  — Verifica status da instância
 *
 * Arquitetura multi-tenant:
 *  Cada clínica tem sua própria instância Z-API.
 *  credentials = { instance_id, token } em clinic_integrations.
 *
 * Requer env:
 *  ZAPI_BASE_URL      — ex: https://api.z-api.io
 *  ZAPI_CLIENT_TOKEN  — para validação de webhooks inbound
 *  APP_BASE_URL       — para construir URLs de webhook
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const ZAPI_BASE = process.env.ZAPI_BASE_URL ?? "https://api.z-api.io";
const APP_BASE  = process.env.APP_BASE_URL  ?? "https://app.drflux.com.br";

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface ZAPICredentials {
  instance_id: string;
  token: string;
}

async function getZAPICredentials(clinicId: string): Promise<ZAPICredentials> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("clinic_integrations")
    .select("credentials, status")
    .eq("clinic_id", clinicId)
    .eq("provider", "zapi")
    .maybeSingle();

  if (error || !data) throw new Error("Integração Z-API não encontrada para esta clínica");
  if (data.status !== "connected") throw new Error("WhatsApp não está conectado. Reconecte via configurações.");

  const creds = data.credentials as ZAPICredentials;
  if (!creds?.instance_id || !creds?.token) throw new Error("Credenciais Z-API incompletas");

  return creds;
}

async function zapiPost(creds: ZAPICredentials, path: string, body: unknown) {
  const url = `${ZAPI_BASE}/instances/${creds.instance_id}/token/${creds.token}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": process.env.ZAPI_CLIENT_TOKEN ?? "",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Z-API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<{ zaapId: string; messageId: string; id: string }>;
}

// ─── Dunning Templates ────────────────────────────────────────────────────────

interface DunningContext {
  patientName: string;
  value: number;
  dueDate: string;   // "DD/MM/YYYY"
  clinicName: string;
  stageDay: number;  // -3 | 0 | 3 | 7 | 10
  paymentLink?: string;
}

function buildDunningMessage(ctx: DunningContext): string {
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ctx.value);

  const linkLine = ctx.paymentLink
    ? `\n\n💳 Pague aqui: ${ctx.paymentLink}`
    : "";

  switch (ctx.stageDay) {
    case -3:
      return `Olá, ${ctx.patientName}! 😊\n\nPassando para lembrar que sua consulta na *${ctx.clinicName}* vence em 3 dias (${ctx.dueDate}).\n\nValor: *${valorFormatado}*${linkLine}\n\nQualquer dúvida estamos à disposição! 🦷`;

    case 0:
      return `Olá, ${ctx.patientName}!\n\nHoje é o vencimento do seu pagamento na *${ctx.clinicName}*.\n\nValor: *${valorFormatado}*${linkLine}\n\nEvite juros realizando o pagamento hoje! 😊`;

    case 3:
      return `Oi, ${ctx.patientName}! Tudo bem?\n\nIdentificamos que o pagamento de *${valorFormatado}* na *${ctx.clinicName}* ainda está em aberto (venceu em ${ctx.dueDate}).\n\nPode nos ajudar a resolver isso?${linkLine}`;

    case 7:
      return `Olá, ${ctx.patientName}.\n\nSeu pagamento de *${valorFormatado}* na *${ctx.clinicName}* está em atraso há 7 dias.\n\nPrecisamos regularizar para manter seu cadastro ativo.${linkLine}\n\nFale conosco se precisar de apoio! 🙏`;

    case 10:
      return `${ctx.patientName}, precisamos falar sobre o seu pagamento em aberto.\n\nValor: *${valorFormatado}* — vencido em ${ctx.dueDate}.\n\nPor favor entre em contato com a *${ctx.clinicName}* para evitar encaminhamento para cobrança.${linkLine}`;

    default:
      return `Olá, ${ctx.patientName}! Você tem um pagamento pendente de *${valorFormatado}* na *${ctx.clinicName}*. Vencimento: ${ctx.dueDate}.${linkLine}`;
  }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

/**
 * sendWhatsAppText — Envia mensagem de texto simples
 */
export const sendWhatsAppText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; message: string; clinicId?: string }) => {
    if (!input?.phone) throw new Error("phone obrigatório");
    if (!input?.message) throw new Error("message obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ messageId: string }> => {
    const supabase = context.supabase as AnySupabase;

    // Resolver clinic_id: ou da entrada ou do perfil do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = data.clinicId ?? profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    const creds = await getZAPICredentials(clinicId);

    const phone = data.phone.replace(/\D/g, "");

    const result = await zapiPost(creds, "/send-text", {
      phone,
      message: data.message,
    });

    return { messageId: result.messageId ?? result.zaapId };
  });

/**
 * sendCobrancaWA — Envia mensagem de cobrança com template dunning
 * Registra na tabela cobranca_tentativas
 */
export const sendCobrancaWA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    cobrancaId: string;
    phone: string;
    stageDay: number;
    patientName: string;
    value: number;
    dueDate: string;
    paymentLink?: string;
  }) => {
    if (!input?.cobrancaId) throw new Error("cobrancaId obrigatório");
    if (!input?.phone) throw new Error("phone obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ messageId: string; preview: string }> => {
    const supabase = context.supabase as AnySupabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, clinic:clinicas(name)")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    const clinicName = (profile?.clinic as { name?: string } | null)?.name ?? "Clínica";

    const creds = await getZAPICredentials(clinicId);

    const message = buildDunningMessage({
      patientName: data.patientName,
      value:       data.value,
      dueDate:     data.dueDate,
      clinicName,
      stageDay:    data.stageDay,
      paymentLink: data.paymentLink,
    });

    const phone = data.phone.replace(/\D/g, "");

    const result = await zapiPost(creds, "/send-text", {
      phone,
      message,
    });

    const messageId = result.messageId ?? result.zaapId;

    // Registrar tentativa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("cobranca_tentativas").insert({
      cobranca_id:     data.cobrancaId,
      clinic_id:       clinicId,
      channel:         "whatsapp",
      stage_day:       data.stageDay,
      status:          "enviado",
      message_preview: message.substring(0, 200),
      wa_message_id:   messageId,
    });

    return { messageId, preview: message };
  });

/**
 * registerWebhooks — Registra todos os webhooks Z-API para a instância da clínica
 * Deve ser chamado após conectar o WhatsApp pela primeira vez
 */
export const registerZAPIWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnySupabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    const creds = await getZAPICredentials(clinicId);

    const webhooks = [
      {
        path: "/update-webhook-received",
        url:  `${APP_BASE}/api/webhooks/zapi-receive`,
        name: "on-message-received",
      },
      {
        path: "/update-webhook-send",
        url:  `${APP_BASE}/api/webhooks/zapi-receive`,
        name: "on-message-send (outbound confirmations)",
      },
      {
        path: "/update-webhook-message-status",
        url:  `${APP_BASE}/api/webhooks/zapi-status`,
        name: "on-message-status-change",
      },
      {
        path: "/update-webhook-disconnected",
        url:  `${APP_BASE}/api/webhooks/zapi-disconnect`,
        name: "on-disconnected",
      },
      {
        path: "/update-webhook-connected",
        url:  `${APP_BASE}/api/webhooks/zapi-connect`,
        name: "on-connected",
      },
    ];

    const results: Array<{ name: string; ok: boolean; error?: string }> = [];

    for (const wh of webhooks) {
      try {
        const url = `${ZAPI_BASE}/instances/${creds.instance_id}/token/${creds.token}${wh.path}`;
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": process.env.ZAPI_CLIENT_TOKEN ?? "",
          },
          body: JSON.stringify({ value: wh.url }),
        });

        results.push({ name: wh.name, ok: res.ok });
        if (!res.ok) {
          const text = await res.text();
          console.error(`[zapi.functions] webhook ${wh.name} registration failed: ${text}`);
        }
      } catch (err) {
        results.push({ name: wh.name, ok: false, error: String(err) });
      }
    }

    const allOk = results.every((r) => r.ok);
    console.log(`[zapi.functions] webhook registration for clinic ${clinicId}: ${allOk ? "✅" : "⚠️"}`);

    return { results, allOk };
  });

/**
 * getZAPIInstanceStatus — Verifica se a instância está conectada
 */
export const getZAPIInstanceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnySupabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = profile?.clinic_id;
    if (!clinicId) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: integration } = await db
      .from("clinic_integrations")
      .select("status, connected_at, error_msg, metadata")
      .eq("clinic_id", clinicId)
      .eq("provider", "zapi")
      .maybeSingle();

    return integration ?? null;
  });
