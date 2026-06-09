/**
 * POST /api/webhooks/meta-leads
 *
 * Recebe leads do Meta Lead Ads (formulário nativo do Facebook/Instagram).
 * Fluxo AF-07: Meta Ads → oportunidade → AF-01 (WhatsApp imediato via n8n).
 *
 * Segurança:
 *  - Valida assinatura HMAC-SHA256 do Meta (header x-hub-signature-256)
 *  - GET /api/webhooks/meta-leads?hub.challenge — responde ao desafio de verificação
 *
 * Idempotency:
 *  - Registra evento em webhook_events antes de qualquer processamento
 *  - Verifica duplicata por leadgen_id antes de criar oportunidade
 *
 * Requer env:
 *  META_WEBHOOK_VERIFY_TOKEN  — token de verificação configurado no Meta for Developers
 *  META_APP_SECRET            — App Secret para validação HMAC
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaLeadValue {
  field_name: string;
  values: string[];
}

interface MetaLeadChange {
  value: {
    leadgen_id: string;
    page_id: string;
    form_id: string;
    ad_id?: string;
    ad_name?: string;
    adset_id?: string;
    adset_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    created_time: number;
    field_data: MetaLeadValue[];
  };
  field: string;
}

interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: MetaLeadChange[];
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifyMetaSignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(`sha256=${expected}`, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

function extractField(fieldData: MetaLeadValue[], fieldName: string): string | null {
  const field = fieldData.find((f) => f.field_name.toLowerCase() === fieldName.toLowerCase());
  return field?.values?.[0] ?? null;
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  // Remove tudo exceto dígitos, preservando sinal de +
  const cleaned = raw.replace(/[^\d+]/g, "");
  // Adiciona +55 se não tem código de país e tem 10-11 dígitos
  if (!cleaned.startsWith("+") && cleaned.length >= 10) {
    return `+55${cleaned}`;
  }
  return cleaned || null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/api/webhooks/meta-leads")({
  server: {
    handlers: {
      // ── GET: desafio de verificação do Meta ──────────────────────────────
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
        if (!verifyToken) {
          return new Response("META_WEBHOOK_VERIFY_TOKEN not configured", { status: 500 });
        }

        if (mode === "subscribe" && token === verifyToken && challenge) {
          console.log("[meta-leads] webhook verification successful");
          return new Response(challenge, { status: 200 });
        }

        return new Response("Verification failed", { status: 403 });
      },

      // ── POST: recebe evento de novo lead ─────────────────────────────────
      POST: async ({ request }) => {
        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) {
          console.error("[meta-leads] META_APP_SECRET not configured");
          return new Response("Not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256") ?? "";

        // 1. Validar assinatura HMAC
        if (!verifyMetaSignature(rawBody, signature, appSecret)) {
          console.warn("[meta-leads] invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: MetaWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as MetaWebhookPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Meta espera 200 em < 5s — processar de forma assíncrona
        // Registrar eventos em webhook_events e retornar imediatamente
        const processEvents = async () => {
          for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
              if (change.field !== "leadgen") continue;
              const lead = change.value;

              // 2. Registrar evento bruto (idempotency + audit)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: evtErr } = await (supabaseAdmin as any).from("webhook_events").insert({
                clinic_id: null, // será preenchido após match page_id → clinic
                source: "meta_leads",
                event_type: "new_lead",
                payload: lead,
                entity_type: "oportunidade",
              });
              if (evtErr) console.error("[meta-leads] webhook_events insert error", evtErr);

              // 3. Verificar duplicata por leadgen_id via webhook_events
              // (meta_leadgen_id será adicionado a oportunidades em migration futura)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: existing } = await (supabaseAdmin as any)
                .from("webhook_events")
                .select("id")
                .eq("source", "meta_leads")
                .eq("payload->>leadgen_id", lead.leadgen_id)
                .maybeSingle();

              if (existing) {
                console.log(`[meta-leads] leadgen_id ${lead.leadgen_id} already processed`);
                continue;
              }

              // 4. Resolver clinic_id via page_id → clinicas.meta_page_id
              // TODO: adicionar campo meta_page_id em clinicas na próxima migration
              // Por ora: busca primeira clínica que tenha a integração Meta ativa
              const { data: integration } = await supabaseAdmin
                .from("clinic_integrations")
                .select("clinic_id")
                .eq("provider", "meta_ads")
                .eq("status", "connected")
                .maybeSingle();

              if (!integration) {
                console.warn(`[meta-leads] no clinic found for page_id ${lead.page_id}`);
                continue;
              }

              const clinicId = integration.clinic_id;

              // 5. Extrair campos do formulário
              const fieldData = lead.field_data ?? [];
              const name =
                extractField(fieldData, "full_name") ??
                extractField(fieldData, "first_name") ??
                "Lead Meta";
              const phone = normalizePhone(
                extractField(fieldData, "phone_number") ?? extractField(fieldData, "phone"),
              );
              const email = extractField(fieldData, "email");

              // 6. Criar oportunidade
              const { error: oppErr } = await supabaseAdmin.from("oportunidades").insert({
                clinic_id: clinicId,
                name: name.trim(),
                phone,
                source: lead.campaign_name ? `Meta · ${lead.campaign_name}` : "Meta Ads",
                stage: "novo",
                stage_changed_at: new Date().toISOString(),
                // meta_leadgen_id: lead.leadgen_id, — campo a adicionar na próxima migration
                // O campo meta_leadgen_id será indexado para idempotency
              });

              if (oppErr) {
                console.error("[meta-leads] oportunidade insert error", oppErr, { name, phone });
              } else {
                console.log(`[meta-leads] created oportunidade for lead ${lead.leadgen_id}`);
                // AF-01 é disparado automaticamente via Supabase webhook
                // (INSERT em oportunidades → n8n → WhatsApp)
              }
            }
          }
        };

        // Responder ao Meta imediatamente (< 5s)
        processEvents().catch((err) =>
          console.error("[meta-leads] background processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});
