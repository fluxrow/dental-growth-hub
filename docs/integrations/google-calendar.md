# Google Calendar Integration

Cada clínica conecta a própria agenda do Google via OAuth 2.0 direto (Google Cloud Console).

## Login com Google + reuso para a Agenda

Usuários podem entrar no DrFlux com **Sign in with Google** (botão na `/auth`,
via `lovable.auth.signInWithOAuth("google")`). Esse login usa o broker
gerenciado pelo Lovable Cloud — não pede escopos de Calendar.

No onboarding, etapa **Agenda**, se detectarmos `provider === "google"` no
`app_metadata`, mostramos um card "Usar a mesma conta (`email@x.com`) como
agenda?". Ao clicar **Usar esta conta**, passamos `login_hint=<email>` no
fluxo OAuth do Calendar — o Google pula a seleção de conta e o usuário só
precisa autorizar os escopos. Se o email retornado pelo Calendar diferir do
email de login, avisamos via toast.

## Fluxo do usuário

1. Admin abre `/onboarding` → etapa "Agenda" → clica **Conectar com Google**.
2. Popup do Google abre → escolhe conta → autoriza escopos.

3. Popup redireciona para `/api/public/google/callback`, que troca o `code` por tokens, salva em `clinic_integrations` e envia `postMessage` para fechar.
4. Onboarding mostra "Conectado · email@clinica.com".

## Arquitetura

- OAuth 2.0 padrão com credenciais próprias no Google Cloud Console (projeto `Fluxrow` / `DrFlux`).
- Redirect URIs cadastradas:
  - `https://id-preview--54896e72-eecb-466a-b250-ba3d782c7dbb.lovable.app/api/public/google/callback`
  - `http://localhost:8080/api/public/google/callback`
  - (adicionar a URL de produção quando publicar)
- State assinado via HMAC-SHA256 (chave = `GOOGLE_OAUTH_CLIENT_SECRET`), TTL 10 min.
- Tokens salvos em `clinic_integrations` (access + refresh + expires_at).

## Arquivos

- `src/lib/googleCalendar.functions.ts` — server fns: `startGoogleCalendarConnect`, `disconnectGoogleCalendar`, `getGoogleCalendarStatus`.
- `src/routes/api/public/google/callback.ts` — rota pública que recebe o redirect do Google.

## Secrets

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## Refresh de access token (próxima sprint)

Helper a implementar quando formos chamar a API: ler `expires_at`; se expirado, `POST oauth2.googleapis.com/token` com `grant_type=refresh_token` + `refresh_token` salvo; atualizar `access_token` e `expires_at`.

## Chamando a API do Google Calendar

```ts
// pseudo — server-side, após pegar access_token válido do clinic_integrations
const res = await fetch(
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10",
  { headers: { authorization: `Bearer ${accessToken}` } },
);
```

## Tabela `clinic_integrations`

| coluna | valor |
|---|---|
| `provider` | `'google_calendar'` |
| `status` | `'connected'` / `'disconnected'` |
| `access_token` | OAuth access token |
| `refresh_token` | OAuth refresh token (long-lived) |
| `expires_at` | quando o access_token expira |
| `calendar_id` | email da conta Google |
| `scope` | escopos concedidos |
| `metadata.account_email` | email da conta Google |
