import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurado`);
  return v;
}

function originFromHost(): string {
  const host = getRequestHost();
  const proto = host?.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signState(payload: { clinicId: string; userId: string; nonce: string; exp: number }): string {
  const secret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const data = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string }) => {
    if (!input?.clinicId) throw new Error("clinicId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
    const redirectUri = `${originFromHost()}/api/public/google/callback`;
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const state = signState({
      clinicId: data.clinicId,
      userId: context.userId,
      nonce,
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: SCOPES.join(" "),
      state,
    });
    return {
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string }) => {
    if (!input?.clinicId) throw new Error("clinicId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("clinic_integrations")
      .update({ status: "disconnected", access_token: null, refresh_token: null })
      .eq("clinic_id", data.clinicId)
      .eq("provider", "google_calendar");
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getGoogleCalendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string }) => {
    if (!input?.clinicId) throw new Error("clinicId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("clinic_integrations")
      .select("status, calendar_id, connected_at")
      .eq("clinic_id", data.clinicId)
      .eq("provider", "google_calendar")
      .maybeSingle();
    return {
      connected: row?.status === "connected",
      accountEmail: row?.calendar_id ?? null,
      connectedAt: row?.connected_at ?? null,
    };
  });
