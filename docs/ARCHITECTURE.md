# ARCHITECTURE.md

> Visão arquitetural do DrFlux. Referência rápida para desenvolvimento.
> Auditoria QA: 2026-06-09.

---

## Stack

| Camada           | Tecnologia                                   | Notas                                                            |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Framework        | TanStack Start (SSR)                         | React 19, file-based routing                                     |
| Roteamento       | TanStack Router                              | `routeTree.gen.ts` auto-gerado pelo dev server                   |
| UI               | React 19 + Tailwind CSS v4                   | OKLCH color tokens via CSS custom properties                     |
| Banco            | Supabase (PostgreSQL)                        | Auth + RLS + RPCs                                                |
| Deploy           | Lovable → Cloudflare (via Nitro)             | `@lovable.dev/vite-tanstack-config`                              |
| Build            | Vite + Nitro                                 | `vite.config.ts` — config mínima, plugins injetados pelo Lovable |
| Auth             | Supabase Auth + `@lovable.dev/cloud-auth-js` | Email/senha + Google OAuth                                       |
| Server functions | `createServerFn` (TanStack Start)            | Preferido para todas as operações server-side                    |
| Queries          | TanStack Query (`useQuery`)                  | Cache + invalidação                                              |
| Estilo           | Inter (corpo) + font-display                 | Variáveis CSS OKLCH                                              |

---

## Estrutura de pastas

```
src/
  routes/           # Rotas (file-based, TanStack Router)
    api/public/     # Endpoints públicos (OAuth callback)
    app.*.tsx       # Rotas autenticadas
    __root.tsx      # Layout raiz (providers globais)
  components/
    app/            # Componentes de produto (AppShell, etc)
    portal/         # Componentes do portal do paciente
    ui/             # Design system (shadcn-like)
  hooks/            # Hooks React (use-auth, use-profile, use-empty-mode, etc)
  lib/
    mock.ts         # Dados fictícios para modo demo/empty
    empty-states.ts # Configuração de estados vazios por tela
    googleCalendar.functions.ts  # Server functions Google OAuth
  integrations/
    supabase/
      client.ts           # Cliente anon (browser + server)
      client.server.ts    # Cliente service-role (server-only)
      types.ts            # Tipos gerados do schema
      auth-middleware.ts  # Middleware para createServerFn
    lovable/
      index.ts            # Cloud auth JS wrapper
supabase/
  migrations/       # 6 migrations SQL (criadas pelo Lovable)
```

---

## Padrão: Mock vs Real (useEmptyMode)

O app tem dois modos de dados controlados por `localStorage`:

```
localStorage["dentalflux:empty-mode"] = "1"  → modo empty/demo (mock)
localStorage["dentalflux:empty-mode"] = "0"  → modo real (Supabase)
```

Hook: `src/hooks/use-empty-mode.ts`
Toggle: `EmptyModeToggle` no sidebar (apenas em dev)

**Regra de uso nas telas:**

```tsx
const live = useEmptyMode(); // true = real, false = mock

const { data } = useQuery({
  queryKey: ["pacientes"],
  enabled: live,              // só busca quando real
  queryFn: () => supabase.from("pacientes").select(...)
});

const rows = live ? (data ?? []) : PATIENTS; // fallback para mock
```

**Status atual**: apenas `pacientes`, `oportunidades`, `atividades`, `clinic_diagnostics` e `clinic_integrations` têm dados reais. Todas as outras telas ignoram `live` e sempre usam mock.

---

## Padrão: Server Functions

Para operações que requerem segurança server-side, usar `createServerFn`:

```ts
// src/lib/exemplo.functions.ts
export const minhaAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])   // garante usuário autenticado
  .inputValidator((input: { id: string }) => { ... })
  .handler(async ({ data, context }) => {
    // context.userId, context.supabase disponíveis
    // NUNCA usar supabase client aqui — usar context.supabase (com RLS)
    // supabaseAdmin apenas se necessário bypassing RLS (raro)
  });
```

**Regra crítica**: `supabaseAdmin` (service role) **somente** em arquivos `.server.ts`.

---

## Autenticação

```
/auth → supabase.auth.signInWithPassword / signUp
      → lovable.auth.signInWithOAuth("google") [⚠️ TS2307]

app.tsx (guard):
  useAuth() → verifica session Supabase
  useProfile() → carrega perfil + clínica
  → sem user: redirect /auth
  → sem clínica ou onboarded=false: redirect /onboarding
```

---

## Google Calendar OAuth (popup flow)

```
Usuário clica "Conectar Google"
  → GoogleCalendarConnector.tsx
    → window.open(authUrl, "google-oauth", ...)
      → startGoogleCalendarConnect (server fn)
        → gera state HMAC + redirectUri
        → retorna authorizationUrl do Google

Popup navega para Google → usuário autoriza → Google redireciona para:
  /api/public/google/callback?code=...&state=...
    → verifica HMAC do state
    → troca code por tokens
    → upsert em clinic_integrations (via supabaseAdmin)
    → htmlResponse com script postMessage
      → window.opener.postMessage({ type: 'google-oauth-result', ... })
        → Popup fecha
          → GoogleCalendarConnector recebe mensagem
            → callback onSuccess/onError
```

**Bugs conhecidos**:

- Bug 1 (COOP header): **corrigido** — `"Cross-Origin-Opener-Policy": "unsafe-none"` na resposta
- Bug 2 (redirect_uri): **parcialmente corrigido** — `redirectOrigin` está no state, mas `callback.ts:92` ainda usa `url.origin`

---

## Lovable / Deploy

- Lovable é o IDE cloud que gera e faz push para o GitHub
- Clone local em `/tmp/dental-growth-hub` (não é o diretório de trabalho do Lovable)
- Modificações locais precisam de `git push origin main` para chegar no Lovable/deploy
- `routeTree.gen.ts` é auto-gerado pelo `vite dev` — não editar manualmente, mas pode precisar de ajustes manuais quando o servidor não está rodando

---

_Atualizado: 2026-06-09_
