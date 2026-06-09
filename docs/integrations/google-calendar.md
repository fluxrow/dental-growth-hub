# Google Calendar — Integração por clínica (per-user OAuth)

> Status: **Marco A entregue** (UI + tabela `clinic_integrations` + docs). **Marco B pendente** (OAuth real).

Cada clínica conecta a **própria agenda do Google** para que o DentalFlux opere em cima dela. Não usamos o connector nativo do Lovable porque ele autenticaria o dono do workspace (nós), e o que precisamos é a agenda **de cada cliente**.

## O que essa integração destrava
- Lembretes automáticos de consulta (24h e 2h antes) via WhatsApp.
- Confirmação de presença com resposta caindo no CRM.
- Detecção de no-show e reagendamento sugerido.
- Identificação de pacientes inativos cruzando histórico de agenda.
- Sugestão de horários livres ao recepcionista durante o atendimento.
- Sincronização bidirecional (consulta no DentalFlux ↔ evento no Google Calendar da clínica).

## Checklist Google Cloud Console (fazer antes do Marco B)

1. **Criar projeto** "DentalFlux" no [console.cloud.google.com](https://console.cloud.google.com/).
2. **Ativar API** → APIs & Services → Library → **Google Calendar API** → Enable.
3. **Tela de consentimento** (OAuth consent screen):
   - User type: **External**
   - App name: `DentalFlux`
   - Support email: contato@dentalflux.com.br (definir)
   - Authorized domains: `dentalflux.com.br`, `lovable.app`
   - Scopes (não-sensíveis): `openid`, `userinfo.email`, `userinfo.profile`
   - Scopes (sensíveis — exigem verificação Google):
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
4. **Credentials** → Create credentials → **OAuth Client ID**:
   - Type: **Web application**
   - Name: `DentalFlux Web`
   - Authorized JavaScript origins:
     - `https://app.dentalflux.com.br` (produção)
     - `https://<preview>.lovable.app` (preview atual)
   - Authorized redirect URIs:
     - `https://app.dentalflux.com.br/api/auth/google/callback`
     - `https://<preview>.lovable.app/api/auth/google/callback`
5. Anotar **Client ID** e **Client Secret**.

## Secrets necessários (Marco B)
Adicionar via Lovable Cloud (não commitar):
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## Tabela `clinic_integrations` (já criada no Marco A)
| coluna | tipo | uso |
|---|---|---|
| `clinic_id` | uuid | dono dos tokens |
| `provider` | text | `'google_calendar'` |
| `status` | text | `pending` / `connected` / `error` |
| `access_token` | text | curto prazo |
| `refresh_token` | text | usado para renovar |
| `expires_at` | timestamptz | controle de renovação |
| `scope` | text | scopes concedidos |
| `calendar_id` | text | id da agenda principal da clínica |
| `connected_by_user_id` | uuid | quem autorizou |
| `connected_at`, `last_sync_at` | timestamptz | telemetria |
| `metadata` | jsonb | dados auxiliares |

RLS: membros da clínica leem o status; **tokens nunca trafegam pelo front** — apenas server functions (service role) leem `access_token`/`refresh_token`.

## Rotas a implementar (Marco B)
- `src/routes/api/auth/google/start.ts` — server route, monta URL OAuth e redireciona.
- `src/routes/api/auth/google/callback.ts` — server route, troca `code` por tokens, grava em `clinic_integrations`, redireciona para `/onboarding?step=pronto&calendar=connected`.
- `src/lib/google-calendar.functions.ts` — server functions:
  - `disconnectCalendar()`
  - `listCalendarEvents({ from, to })` — usa refresh token, renova quando necessário.

## Verificação Google (importante)
Os scopes `calendar.events` e `calendar.readonly` são **sensíveis**. Em produção exigirão verificação do app pelo Google (pode levar 4–6 semanas). Em desenvolvimento, podemos rodar em modo "Testing" com até 100 e-mails de testadores.
