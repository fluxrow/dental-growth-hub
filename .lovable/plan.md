# Integração Google Calendar via App User Connector

## O que vai ser feito

1. **Helpers do connector**
   - `src/integrations/lovable/appUserConnector.ts` (server-only): `authorizeAppUserOAuth` + `callAsAppUser`.
   - `src/integrations/lovable/appUserConnectorClient.ts` (browser-safe): `connectAppUser` (popup + postMessage).

2. **Server functions** (`src/lib/googleCalendar.functions.ts`, protegidas por `requireSupabaseAuth`)
   - `startGoogleConnect(targetOrigin)` → chama `authorizeAppUserOAuth` com connector `google_calendar`, escopos `calendar.events` e `calendar.readonly`, modo `web_message`.
   - `saveGoogleConnection({ connectionAPIKey })` → upsert em `clinic_integrations` (`provider='google_calendar'`, `status='connected'`, `access_token=connectionAPIKey`, `connected_at=now()`) e atualiza `clinicas.provisioning_status.calendar = 'connected'`.
   - `disconnectGoogleCalendar()` → marca a linha como `disconnected`.

3. **Connector ID env var**
   - Adicionar `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_ID` como secret (vou pedir após confirmar). Esse é o único valor necessário — sem GCP próprio, sem client secret.

4. **Onboarding (`src/routes/onboarding.tsx`)**
   - Substituir o botão "Em breve" pelo botão funcional "Conectar Google Calendar" usando `connectAppUser`.
   - Após sucesso: persiste via `saveGoogleConnection`, mostra "Conectado ✅" com email/nome da conta, libera "Continuar".
   - Botão "Desconectar" disponível enquanto já está conectado.

5. **Docs**
   - Reescrever `docs/integrations/google-calendar.md` removendo todo o passo-a-passo de Google Cloud Console; explicar o fluxo App User Connector (popup, sem verificação Google, sem GCP).
   - Remover/atualizar referências em `docs/integrations/webhooks.md` se houver.

## Pré-requisitos do usuário

Antes de eu poder rodar de ponta a ponta, vou precisar de **uma** coisa: o `connector_client_id` do conector `google_calendar` (vem das configurações do projeto Lovable → Connectors → Google Calendar → App User mode). Vou pedir via `add_secret` no momento certo. **Nada de Google Cloud Console.**

## Fora do escopo desta sprint

- Widget "Próximas consultas" no Dashboard (fica para a próxima — quer que eu já faça junto? me avisa).
- Renomear / deletar o projeto GCP antigo "DentalFlow Pro" (instrução manual no final, 1 clique).

## Resultado

Clínica abre onboarding → clica "Conectar Google Calendar" → popup do Google → consent → popup fecha → onboarding mostra ✅ e libera "Continuar". Token (`lovack_*`) salvo em `clinic_integrations`, pronto para o sistema ler/escrever eventos via `callAsAppUser`.