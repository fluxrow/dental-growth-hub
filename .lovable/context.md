# .lovable/context.md

> Contexto do projeto para a IA (Lovable / Claude). Leia isso antes de qualquer modificação.
> Mantido manualmente — atualizar após mudanças arquiteturais significativas.

---

## O que é este projeto

**DrFlux** — SaaS para clínicas odontológicas gerenciarem o ciclo completo de pacientes:
captação → atendimento → follow-up → cobrança → avaliação.

Produto em construção. Maioria das telas é protótipo visual (mock data) — apenas as features listadas abaixo têm backend real.

---

## Stack obrigatória

- **TanStack Start** (SSR, React 19) — NÃO usar Next.js, não usar Remix
- **TanStack Router** (file-based) — rotas em `src/routes/*.tsx`
- **Supabase** — banco + auth + RLS — NÃO criar Edge Functions, usar `createServerFn`
- **Tailwind CSS v4** com tokens OKLCH — NÃO adicionar valores hardcoded de cor
- **Vite** via `@lovable.dev/vite-tanstack-config` — NÃO modificar `vite.config.ts` sem necessidade

---

## Regras críticas

### 1. Dados reais vs mock

- `useEmptyMode()` retorna `true` quando dados reais estão ativos
- Toda tela com dados reais deve respeitar o padrão: `enabled: live` no useQuery + fallback para mock
- Dados mock: `src/lib/mock.ts` — NÃO duplicar mocks em outros arquivos

### 2. Server functions

- Use `createServerFn` (de `@tanstack/react-start`) para toda operação server-side
- Arquivo deve ter `.functions.ts` no nome se contém server fns
- `supabaseAdmin` (service role) **somente** em arquivos `*.server.ts`

### 3. Rotas

- Criar rotas em `src/routes/` — o `routeTree.gen.ts` é auto-gerado
- NÃO editar `routeTree.gen.ts` manualmente (exceto remoção de duplicatas)
- NÃO usar `<a href>` para navegação interna — sempre `<Link to=>`

### 4. Autenticação

- Guard em `src/routes/app.tsx` — todas as rotas `/app/*` são protegidas
- Auth state via `useAuth()` e `useProfile()` — não acessar `supabase.auth` diretamente nos componentes

---

## Features com backend real (não mexer sem cuidado)

| Feature                | Arquivos-chave                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Google Calendar OAuth  | `src/lib/googleCalendar.functions.ts`, `src/routes/api/public/google/callback.ts`, `src/components/app/google-calendar-connector.tsx` |
| Onboarding             | `src/routes/onboarding.tsx`                                                                                                           |
| Diagnóstico clínico    | `src/routes/app.diagnostico.tsx`                                                                                                      |
| Lista de pacientes     | `src/routes/app.pacientes.tsx` (leitura)                                                                                              |
| Lista de oportunidades | `src/routes/app.oportunidades.tsx` (leitura)                                                                                          |
| Log de atividades      | `src/routes/app.atividade.tsx`                                                                                                        |

---

## Bugs conhecidos (não fechados)

1. **OAuth Bug 2** — `src/routes/api/public/google/callback.ts:92` usa `url.origin` em vez de `stateData.redirectOrigin` para reconstruir `redirectUri`. Fix: `${stateData.redirectOrigin ?? url.origin}`.
2. **TS2307** — `@lovable.dev/cloud-auth-js` sem types declarados em `src/integrations/lovable/index.ts`.

---

## Próximos blocos de trabalho (conforme prioridade)

1. **OAuth Bug 2** — 1 linha, baixo risco, alto impacto
2. **Conversas** — implementar integração Z-API real
3. **ClinicTab** — conectar form ao Supabase `clinicas`
4. **Portal Paciente** — conectar `/p/$token` ao banco real
5. **Oportunidades** — persistir `advance()`/`lose()` no Supabase

---

## Estrutura de cor (Tailwind v4 OKLCH)

Não usar valores hex/rgb. Usar as variáveis CSS:

```
--color-primary        --color-primary-foreground
--color-background     --color-surface      --color-surface-muted
--color-foreground     --color-muted-foreground
--color-border         --color-input        --color-ring
--color-success        --color-info
--color-chart-1 ... --color-chart-5
```

---

_Atualizado: 2026-06-09_
