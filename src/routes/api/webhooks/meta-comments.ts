/**
 * GET|POST /api/webhooks/meta-comments
 *
 * Recebe comentários de Instagram e Facebook via Meta Webhooks.
 * Cria automaticamente uma oportunidade ("lead") quando alguém comenta.
 *
 * Permissões Meta App necessárias:
 *  - instagram_manage_comments
 *  - pages_read_engagement
 *  - pages_manage_engagement
 *
 * GET:  Verificação do hub (challenge)
 * POST: Processamento de comentários
 *
 * Campos subscritos: "comments"
 *
 * Fluxo:
 *  1. Validar assinatura HMAC-SHA256
 *  2. Resolver clinic_id pelo page_id
 *  3. Criar oportunidade com source="Instagram Comentário" / "Facebook Comentário"
 *  4. Registrar webhook_event para auditoria
 *  5. Opcional: resposta automática via Graph API
 *
 * Requer env:
 *  META_APP_SECRET
 *  META_VERIFY_TOKEN
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac }      from "crypto";
import { supabaseAdmin }   from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaCommentChange {
  field: "comments";
  value: {
    from: { id: string; name?: string };
    message: string;
    post_id?: string;
    comment_id?: string;
    created_time: number;
    item: "comment" | "reply";
    parent_id?: string;
    media?: { id: string; media_product_type?: string };
  };
}

interface MetaCommentEntry {
  id: string;  // page_id or ig_account_id
  time: number;
  changes: MetaCommentChange[];
}

interface MetaCommentWebhookBody {
  object: "instagram" | "page";
  entry:  MetaCommentEntry[];
}

// ─── HMAC Validation ──────────────────────────────────────────────────────────

function validateMetaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${expected}` === signature;
}

// ─── Clinic resolver ──────────────────────────────────────────────────────────

async function resolveClinicByPageId(pageId: string): Promise<{ clinicId: string; provider: string } | null> {
  for (const provider of ["meta_ig", "meta_fb"] as const) {
    const { data } = await db()
      .from("clinic_integrations")
      .select("clinic_id")
      .eq("provider", provider)
      .contains("credentials", { page_id: pageId })
      .eq("status", "connected")
      .maybeSingle();
    if (data?.clinic_id) return { clinicId: data.clinic_id, provider };
  }
  return null;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/webhooks/meta-comments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url       = new URL(request.url);
        const mode      = url.searchParams.get("hub.mode");
        const token     = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const rawBody   = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        if (!validateMetaSignature(rawBody, signature)) {
          console.warn("[meta-comments] invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let body: MetaCommentWebhookBody;
        try {
          body = JSON.parse(rawBody) as MetaCommentWebhookBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        processComments(body).catch((err) =>
          console.error("[meta-comments] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processComments(body: MetaCommentWebhookBody) {
  const channel = body.object === "instagram" ? "instagram" : "facebook";

  for (const entry of body.entry) {
    const resolved = await resolveClinicByPageId(entry.id);
    if (!resolved) {
      console.warn(`[meta-comments] unknown page_id: ${entry.id}`);
      continue;
    }

    const { clinicId } = resolved;

    for (const change of entry.changes) {
      if (change.field !== "comments") continue;
      const val = change.value;

      // Ignorar respostas a outros comentários para evitar spam de opps
      if (val.item === "reply" && val.parent_id) {
        console.log(`[meta-comments] skipping reply to parent_id=${val.parent_id}`);
        continue;
      }

      const commentId = val.comment_id ?? `${val.from.id}_${val.created_time}`;
      const sentAt    = new Date(val.created_time * 1000).toISOString();
      const senderId  = val.from.id;
      const senderName = val.from.name ?? `${channel === "instagram" ? "Instagram" : "Facebook"} ${senderId.slice(-6)}`;

      // Idempotência via webhook_events
      const { data: alreadyProcessed } = await db()
        .from("webhook_events")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("source", `meta_${channel}_comment`)
        .eq("external_id", commentId)
        .maybeSingle();

      if (alreadyProcessed) {
        console.log(`[meta-comments] already processed comment ${commentId}`);
        continue;
      }

      // Registrar evento
      await db().from("webhook_events").insert({
        clinic_id:   clinicId,
        source:      `meta_${channel}_comment`,
        event_type:  "comment_received",
        external_id: commentId,
        payload:     val,
        entity_type: "oportunidade",
      });

      // Verificar se já existe oportunidade para este sender
      const { data: existingOpp } = await db()
        .from("oportunidades")
        .select("id, name, stage")
        .eq("clinic_id", clinicId)
        .eq("phone", senderId)  // usando sender_id como identificador para redes sociais
        .not("stage", "eq", "perdida")
        .maybeSingle();

      if (existingOpp) {
        console.log(`[meta-comments] oportunidade já existe para senderId=${senderId} (stage=${existingOpp.stage})`);
        continue;
      }

      // Criar oportunidade
      const source = channel === "instagram"
        ? "Instagram Comentário"
        : "Facebook Comentário";

      const { data: newOpp } = await db()
        .from("oportunidades")
        .insert({
          clinic_id:        clinicId,
          name:             senderName,
          phone:            senderId,
          source,
          stage:            "novo",
          stage_changed_at: sentAt,
          notes:            val.message ? `Comentou: "${val.message.substring(0, 200)}"` : null,
        })
        .select("id")
        .single();

      console.log(
        `[meta-comments] created oportunidade ${newOpp?.id} from ${source}`,
        `sender=${senderName}`,
        `comment="${val.message?.substring(0, 50)}..."`,
      );
    }
  }
}
