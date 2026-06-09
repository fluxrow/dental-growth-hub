import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

function verifyState(
  state: string,
  secret: string,
): {
  clinicId: string;
  userId: string;
  nonce: string;
  redirectOrigin?: string;
  exp: number;
  redirectOrigin?: string;
} | null {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret).update(data).digest();
  const got = Buffer.from(
    sig.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((sig.length + 3) % 4),
    "base64",
  );
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(data));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function htmlResponse(payload: { ok: boolean; email?: string | null; error?: string }) {
  const safe = JSON.stringify(payload).replace(/</g, "\\u003c");
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title></head>
<body style="font-family:system-ui;padding:24px;text-align:center;color:#333">
<p>${payload.ok ? "Conectado! Fechando..." : "Falha ao conectar: " + (payload.error ?? "erro desconhecido")}</p>
<script>
  (function(){
    var msg = { type: 'google-oauth-result', payload: ${safe} };
    try { if (window.opener) window.opener.postMessage(msg, '*'); } catch(e) {}
    setTimeout(function(){ window.close(); }, 400);
  })();
</script>
</body></html>`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Required: prevents Cloudflare/Lovable edge from injecting COOP: same-origin,
      // which severs window.opener inside the popup → postMessage fails silently.
      "cross-origin-opener-policy": "unsafe-none",
    },
  });
}

export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        if (errorParam) return htmlResponse({ ok: false, error: errorParam });
        if (!code || !state) return htmlResponse({ ok: false, error: "missing_params" });

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return htmlResponse({ ok: false, error: "oauth_not_configured" });
        }

        const stateData = verifyState(state, clientSecret);
        if (!stateData) return htmlResponse({ ok: false, error: "invalid_state" });

        // Use the exact origin stored in the signed state (set by startGoogleCalendarConnect).
        // This avoids redirect_uri_mismatch when Cloudflare/Lovable rewrites the request URL
        // and url.origin differs from the public-facing origin used to initiate the flow.
        const redirectUri = `${stateData.redirectOrigin ?? url.origin}/api/public/google/callback`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenRes.ok) {
          const txt = await tokenRes.text();
          console.error("[google oauth] token exchange failed", tokenRes.status, txt);
          return htmlResponse({ ok: false, error: `token_exchange_${tokenRes.status}` });
        }

        const tokens = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope?: string;
          id_token?: string;
        };

        // Get user email
        let email: string | null = null;
        try {
          const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { authorization: `Bearer ${tokens.access_token}` },
          });
          if (profRes.ok) {
            const prof = (await profRes.json()) as { email?: string };
            email = prof.email ?? null;
          }
        } catch (e) {
          console.warn("[google oauth] userinfo failed", e);
        }

        const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();

        const { error: dbErr } = await supabaseAdmin.from("clinic_integrations").upsert(
          {
            clinic_id: stateData.clinicId,
            provider: "google_calendar",
            status: "connected",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? null,
            expires_at: expiresAt,
            scope: tokens.scope ?? SCOPES.join(" "),
            calendar_id: email,
            connected_by_user_id: stateData.userId,
            connected_at: new Date().toISOString(),
            metadata: { account_email: email },
          },
          { onConflict: "clinic_id,provider" },
        );

        if (dbErr) {
          console.error("[google oauth] db upsert failed", dbErr);
          return htmlResponse({ ok: false, error: "db_save_failed" });
        }

        return htmlResponse({ ok: true, email });
      },
    },
  },
});
