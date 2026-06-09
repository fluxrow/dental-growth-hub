import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
} from "@/integrations/lovable/appUserConnector";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function requireClientId(): string {
  const v = process.env.GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_ID não configurado");
  return v;
}

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((targetOrigin: string) => {
    if (typeof targetOrigin !== "string" || !targetOrigin.startsWith("http")) {
      throw new Error("targetOrigin inválido");
    }
    return targetOrigin;
  })
  .handler(async ({ data: targetOrigin, context }) => {
    const host = getRequestHost();
    const proto = host?.includes("localhost") ? "http" : "https";
    const returnUrl = `${proto}://${host}/onboarding`;
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      connectorClientId: requireClientId(),
      returnUrl,
      responseMode: "web_message",
      webMessageTargetOrigin: targetOrigin,
      credentialsConfiguration: { scopes: SCOPES },
    });
    return { authorizationUrl };
  });

export const saveGoogleCalendarConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string; connectionAPIKey: string }) => {
    if (!input?.clinicId || !input?.connectionAPIKey?.startsWith("lovack_")) {
      throw new Error("Parâmetros inválidos");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch user profile/email from Google to display
    let email: string | null = null;
    try {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: data.connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: "/calendar/v3/users/me/calendarList?maxResults=1",
      });
      if (res.ok) {
        const body = (await res.json()) as { items?: Array<{ id?: string }> };
        email = body.items?.[0]?.id ?? null;
      }
    } catch {
      // non-fatal
    }

    const { error } = await supabase
      .from("clinic_integrations")
      .upsert(
        {
          clinic_id: data.clinicId,
          provider: "google_calendar",
          status: "connected",
          access_token: data.connectionAPIKey,
          scope: SCOPES.join(" "),
          calendar_id: email,
          connected_by_user_id: userId,
          connected_at: new Date().toISOString(),
          metadata: { account_email: email },
        },
        { onConflict: "clinic_id,provider" },
      );
    if (error) throw new Error(error.message);

    return { success: true, accountEmail: email };
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
      .update({ status: "disconnected", access_token: null })
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
      .select("status, calendar_id, connected_at, metadata")
      .eq("clinic_id", data.clinicId)
      .eq("provider", "google_calendar")
      .maybeSingle();
    return {
      connected: row?.status === "connected",
      accountEmail: row?.calendar_id ?? null,
      connectedAt: row?.connected_at ?? null,
    };
  });
