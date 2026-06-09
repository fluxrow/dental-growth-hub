# Google Calendar Integration

Cada clínica conecta a própria agenda do Google via **Lovable App User Connector**.

## Como funciona (fluxo do usuário)

1. Admin da clínica abre `/onboarding` e chega na etapa "Agenda".
2. Clica em **Conectar com Google**.
3. Popup do Google abre → escolhe a conta → autoriza os escopos (`calendar.events`, `calendar.readonly`).
4. Popup fecha automaticamente. Onboarding mostra "Conectado · email@clinica.com".
5. Token (`lovack_*`) é persistido em `clinic_integrations` (`provider='google_calendar'`).

## Arquitetura

- **Sem Google Cloud Console próprio.** Lovable é a OAuth Client; nós só configuramos o connector.
- **Sem verificação Google.** O App User Connector usa o OAuth client do Lovable, que já é verificado.
- **Tokens gerenciados pelo Lovable.** Refresh automático; nós só guardamos o `connectionAPIKey`.

## Arquivos

- `src/integrations/lovable/appUserConnector.ts` — helpers server-only (`authorizeAppUserOAuth`, `callAsAppUser`).
- `src/integrations/lovable/appUserConnectorClient.ts` — helper de popup browser-safe (`connectAppUser`).
- `src/lib/googleCalendar.functions.ts` — server functions (start, save, disconnect, status).

## Secret necessário

- `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_ID` — vem das configurações do connector no projeto Lovable.

## Como chamar a API do Google Calendar (server-side)

```ts
import { callAsAppUser } from "@/integrations/lovable/appUserConnector";

const res = await callAsAppUser({
  gatewayBaseUrl: "https://connector-gateway.lovable.dev",
  connectorId: "google_calendar",
  connectionAPIKey, // do clinic_integrations.access_token
  path: "/calendar/v3/calendars/primary/events?maxResults=10",
});
const events = await res.json();
```

## Tabela `clinic_integrations`

| coluna | valor |
|---|---|
| `provider` | `'google_calendar'` |
| `status` | `'connected'` / `'disconnected'` |
| `access_token` | `lovack_*` (handle do connector) |
| `calendar_id` | email da conta Google |
| `scope` | escopos concedidos |
| `metadata.account_email` | email da conta Google |

`refresh_token` e `expires_at` ficam `NULL` — o Lovable gerencia internamente.
