import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, RefreshCw, Unplug, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { describeGoogleOAuthError } from "@/lib/googleCalendarErrors";

type Props = {
  clinicId: string | null;
  onEnsureClinic?: () => Promise<string | null>;
  /** Optional default login hint (e.g. user's Google email) — only used on the first connect. */
  loginHint?: string | null;
  /** Compact variant for cards inside settings tabs. */
  compact?: boolean;
  /** Optional callbacks for parent to track state. */
  onConnected?: (email: string | null) => void;
  onDisconnected?: () => void;
};

type Status = {
  connected: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
};

export function GoogleCalendarConnector({
  clinicId,
  onEnsureClinic,
  loginHint,
  compact,
  onConnected,
  onDisconnected,
}: Props) {
  const [status, setStatus] = useState<Status>({
    connected: false,
    accountEmail: null,
    connectedAt: null,
  });
  const [busy, setBusy] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [lastError, setLastError] = useState<ReturnType<typeof describeGoogleOAuthError> | null>(
    null,
  );

  const refreshStatus = async (id: string) => {
    setLoadingStatus(true);
    try {
      const { getGoogleCalendarStatus } = await import("@/lib/googleCalendar.functions");
      const s = await getGoogleCalendarStatus({ data: { clinicId: id } });
      setStatus({
        connected: s.connected,
        accountEmail: s.accountEmail,
        connectedAt: s.connectedAt,
      });
    } catch {
      // ignore — UI just stays in disconnected state
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (clinicId) refreshStatus(clinicId);
  }, [clinicId]);

  const runConnect = async (opts: { switchAccount?: boolean } = {}) => {
    setBusy(true);
    setLastError(null);
    try {
      const id = clinicId ?? (onEnsureClinic ? await onEnsureClinic() : null);
      if (!id) {
        toast.error("Salve os dados da clínica antes de conectar a agenda.");
        return;
      }
      const { startGoogleCalendarConnect } = await import("@/lib/googleCalendar.functions");
      // When switching accounts, don't pass loginHint so Google shows the picker.
      const hint = opts.switchAccount ? undefined : (loginHint ?? undefined);
      const { authorizationUrl } = await startGoogleCalendarConnect({
        data: { clinicId: id, loginHint: hint },
      });

      const w = 520;
      const h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        authorizationUrl,
        "google-oauth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) {
        const info = describeGoogleOAuthError("popup_blocked");
        setLastError(info);
        toast.error(info.title, { description: info.hint });
        return;
      }

      const result = await new Promise<{ ok: boolean; email?: string | null; error?: string }>(
        (resolve) => {
          const onMsg = (ev: MessageEvent) => {
            if (ev.origin !== window.location.origin) return;
            const d = ev.data as { type?: string; payload?: typeof result };
            if (d?.type === "google-oauth-result" && d.payload) {
              window.removeEventListener("message", onMsg);
              clearInterval(poll);
              resolve(d.payload);
            }
          };
          window.addEventListener("message", onMsg);
          const poll = setInterval(() => {
            if (popup.closed) {
              clearInterval(poll);
              window.removeEventListener("message", onMsg);
              resolve({ ok: false, error: "popup_closed" });
            }
          }, 500);
        },
      );

      if (!result.ok) {
        const info = describeGoogleOAuthError(result.error);
        setLastError(info);
        toast.error(info.title, { description: info.hint });
        return;
      }

      setStatus({
        connected: true,
        accountEmail: result.email ?? null,
        connectedAt: new Date().toISOString(),
      });
      onConnected?.(result.email ?? null);
      toast.success(`Google Calendar conectado${result.email ? ` (${result.email})` : ""}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao conectar";
      setLastError({ title: "Erro inesperado", hint: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!clinicId) return;
    setBusy(true);
    try {
      const { disconnectGoogleCalendar } = await import("@/lib/googleCalendar.functions");
      await disconnectGoogleCalendar({ data: { clinicId } });
      setStatus({ connected: false, accountEmail: null, connectedAt: null });
      setLastError(null);
      onDisconnected?.();
      toast.success("Conexão removida. Você pode reconectar quando quiser.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    } finally {
      setBusy(false);
    }
  };

  if (loadingStatus && !status.connected) {
    return (
      <div className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Verificando conexão…
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "text-[12.5px]")}>
      {status.connected ? (
        <>
          <div className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-success/10 text-success border border-success/30 text-[13px] font-medium">
            <Check className="size-4" />
            Conectado{status.accountEmail ? ` · ${status.accountEmail}` : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runConnect({ switchAccount: true })}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-[12.5px] font-medium hover:bg-muted disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Trocar conta Google
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              <Unplug className="size-3.5" />
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => runConnect()}
            disabled={busy}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Calendar className="size-4" />
            )}
            {lastError ? "Tentar conectar novamente" : "Conectar com Google"}
          </button>
          {lastError && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-[12px] flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-warning mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">{lastError.title}</div>
                <p className="mt-0.5 text-muted-foreground">{lastError.hint}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
