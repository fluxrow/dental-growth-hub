# Plano: Login com Google + reuso da conta para a Agenda

## Objetivo
Permitir que o usuário entre no DrFlux direto com a conta Google (1 clique) e, no onboarding, perguntar se quer usar **a mesma conta Google** já autenticada como agenda da clínica — pulando o segundo popup de OAuth quando possível.

---

## 1. Login com Google (Sign in with Google)

- Habilitar **Google** como provider via `supabase--configure_social_auth` (managed Google OAuth do Lovable Cloud — zero config do usuário).
- Atualizar `src/routes/auth.tsx`:
  - Adicionar botão **"Continuar com Google"** no topo (acima do form de email/senha).
  - Usar `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` (módulo `@/integrations/lovable`).
  - Manter email/senha como alternativa secundária.
- Trigger `handle_new_user` já cria o `profile` automaticamente — funciona igual para signup OAuth.
- Após login bem-sucedido, o `__root.tsx` (listener `onAuthStateChange`) redireciona para `/app` ou `/onboarding` conforme já existe.

## 2. Reuso da conta Google para a Agenda

A questão: o login do Google via Lovable broker **não pede** os escopos de Calendar e **não retorna refresh_token de Calendar** para nós. Então tecnicamente ainda precisamos de **um** consent do Calendar. O que dá pra fazer é tornar a experiência quase invisível:

### Fluxo proposto

1. No onboarding, etapa **Agenda**, detectar se o usuário logou com Google:
   - Ler `session.user.app_metadata.provider === "google"` e `user.email`.
2. Se sim, mostrar card:
   > "Detectamos que você entrou com **maria@clinica.com**. Quer usar essa mesma agenda do Google para os agendamentos da clínica?"
   > [ Usar esta conta ] [ Escolher outra conta ]
3. Ao clicar **Usar esta conta**:
   - Chamar `startGoogleCalendarConnect` (fluxo OAuth atual), mas passar `login_hint=<email>` e `prompt=consent` na URL de autorização.
   - Resultado: Google pula a tela de seleção de conta e vai direto pra tela de consent dos escopos de Calendar — 1 clique em "Permitir" e pronto.
4. **Escolher outra conta** → fluxo OAuth normal sem `login_hint`.

### Mudanças técnicas

- `src/lib/googleCalendar.functions.ts` → `startGoogleCalendarConnect`:
  - Adicionar input opcional `loginHint?: string`.
  - Incluir `login_hint` no `URLSearchParams` quando presente.
- `src/routes/onboarding.tsx`:
  - Ler `user.email` + `app_metadata.provider`.
  - Renderizar o card de "reusar conta" + dois botões; passar `loginHint` quando aplicável.
- Validação: depois do callback, comparar o `email` retornado pelo Google com o `user.email` — se diferentes e o usuário escolheu "Usar esta conta", mostrar warning "Você conectou outra agenda (X) em vez de (Y). Tudo bem?" com opção de refazer.

## 3. Documentação

- Atualizar `docs/integrations/google-calendar.md` com seção "Reuso da conta de login".
- Nota: continuamos precisando do projeto Google Cloud Console (DrFlux) com as credenciais OAuth — login social é separado da API de Calendar.

---

## Fora do escopo desta sprint
- Unificar login Google + permissão Calendar em **um único** consent (exigiria mover o login de Google para fora do broker do Lovable e usar nosso próprio client OAuth também para auth — trade-off grande, fica para depois se virar dor real).
- Apple / outros providers de login.

## Detalhes técnicos resumidos
- Login: `lovable.auth.signInWithOAuth("google", ...)` + `supabase--configure_social_auth({ providers: ["google"] })`.
- Calendar: mantém OAuth direto Google Cloud (já implementado), só adiciona `login_hint` param.
- Sem mudança de schema, sem nova migration.
