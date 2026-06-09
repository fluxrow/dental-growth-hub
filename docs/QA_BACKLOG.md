# QA_BACKLOG.md

> Backlog de problemas encontrados na auditoria de 2026-06-09.
> Prioridade: **P0** = bloqueia produção | **P1** = funcionalidade core quebrada | **P2** = UX degradada | **P3** = dívida técnica

---

## P0 — Bloqueia produção

### P0-1: OAuth Bug 2 incompleto — `redirect_uri_mismatch` intermitente

- **Arquivo**: `src/routes/api/public/google/callback.ts:92`
- **Problema**: linha 92 usa `url.origin` para reconstruir `redirectUri` na troca de token. O fix parcial já armazenou `redirectOrigin` no estado HMAC assinado (`googleCalendar.functions.ts:61`) mas a callback não o usa.
- **Fix**: `const redirectUri = \`${stateData.redirectOrigin ?? url.origin}/api/public/google/callback\`;`
- **Risco sem fix**: token exchange retorna 400 (`redirect_uri_mismatch`) quando o proxy Cloudflare/Lovable reescreve a URL da request.

### P0-2: TypeScript — `@lovable.dev/cloud-auth-js` não encontrado

- **Arquivo**: `src/integrations/lovable/index.ts:3`
- **Erro**: `TS2307 Cannot find module '@lovable.dev/cloud-auth-js'`
- **Impacto**: Google sign-in na tela de auth pode quebrar silenciosamente em build/deploy
- **Fix**: verificar se o pacote está instalado (`npm ls @lovable.dev/cloud-auth-js`) ou adicionar `@types` correto

---

## P1 — Funcionalidade core quebrada

### P1-1: Conversas — "Enviar" não faz nada

- **Arquivo**: `src/routes/app.conversas.tsx:199`
- **Problema**: `<button>Enviar</button>` sem `onClick`; `<textarea>` sem `onChange` — chat completamente inoperante
- **Fix**: Implementar integração Z-API (ou fila de mensagens) + `useState` para o campo de texto

### P1-2: Portal Paciente — sempre mostra paciente fictício

- **Arquivo**: `src/routes/p.$token.tsx:loader`
- **Problema**: `getPortalData(params.token)` retorna dados de `@/lib/mock`, independente do token. Qualquer URL `/p/qualquer-coisa` mostra o mesmo "Dra. Marina Lopes".
- **Fix**: Criar tabela `patient_portals` ou query via token em `pacientes`; substituir loader por `createServerFn`

### P1-3: Pacientes — "Novo paciente" morto

- **Arquivo**: `src/routes/app.pacientes.tsx:92`
- **Problema**: `<button>Novo paciente</button>` sem `onClick`. Não existe modal/formulário de criação.
- **Fix**: Implementar drawer de criação + `supabase.from("pacientes").insert(...)`

### P1-4: Configurações — ClinicTab "Salvar" morto

- **Arquivo**: `src/routes/app.configuracoes.tsx:120`
- **Problema**: "Salvar alterações" sem `onClick`; campos leem de `CLINIC` (mock), não do Supabase
- **Fix**: Substituir `CLINIC` por `useProfile()`, adicionar `onSubmit` que escreve em `clinicas`

### P1-5: Oportunidades — avanço de stage não persiste

- **Arquivo**: `src/routes/app.oportunidades.tsx:55-67`
- **Problema**: `advance(id)` e `lose(id)` atualizam só `useState` local. Ao recarregar a página, voltam ao estado do banco.
- **Fix**: Chamar `supabase.from("oportunidades").update({ stage: next.id }).eq("id", id)` + invalidar query cache

### P1-6: `markAllRead()` opera sobre mock, não Supabase

- **Arquivo**: `src/hooks/use-notifications.ts:55`
- **Problema**: itera sobre `ACTIVITY_FEED` (mock) — quando em live mode, IDs reais não existem no set `readSet`
- **Fix**: Quando `live === true`, buscar IDs de `atividades` do Supabase para marcar como lidas; ou usar coluna `read_at` na tabela

---

## P2 — UX degradada

### P2-1: Dashboard — href causa full page reload

- **Arquivo**: `src/routes/app.index.tsx:60,96`
- **Problema**: `href="/app/conversas"` e `href="/app/oportunidades"` em componentes `Panel` causam hard reload (perde estado do React)
- **Fix**: Já passa `href` para `<Link to={href as never}>` dentro de Panel — verificar se `Panel` de `app-shell` recebe o prop corretamente; se sim, o bug está no `href` passado vs `to`

### P2-2: PeriodSelector hardcoded

- **Arquivo**: `src/components/app/app-shell.tsx`
- **Problema**: `i === 2` sempre "30 dias" ativo — seletor visual sem efeito
- **Fix**: `useState` para período selecionado + passar via contexto/prop para componentes que fazem queries

### P2-3: Search bar sem handler

- **Arquivo**: `src/components/app/app-shell.tsx`
- **Problema**: Barra de busca global sem `onChange`/`onSubmit` — decorativa

### P2-4: Clinic switcher sem handler

- **Arquivo**: `src/components/app/app-shell.tsx`
- **Problema**: Botão `<ChevronDown>` sem `onClick`

### P2-5: Configurações — UsersTab "Convidar usuário" morto

- **Arquivo**: `src/routes/app.configuracoes.tsx:143`
- **Problema**: `<button>Convidar usuário</button>` sem handler

### P2-6: Configurações — WhatsApp "Conectar" morto

- **Arquivo**: `src/routes/app.configuracoes.tsx:210`
- **Problema**: Formulário com campos Instance ID e Token sem nenhum `onSubmit` ou `onClick`

### P2-7: Pacientes — ações no drawer sem handler

- **Arquivo**: `src/routes/app.pacientes.tsx:316,319`
- **Problema**: "Agendar consulta" e "Enviar mensagem" no drawer de detalhe sem handlers

### P2-8: Importar — "Wizard em construção"

- **Arquivo**: `src/routes/app.importar.tsx:135`
- **Problema**: Button "Próximo" explicitamente `disabled` com tooltip "Wizard em construção" — feature de importação visível mas inutilizável

---

## Bloqueado / aguardando feature

### B-1: `business_hours` JSONB em `clinicas`

- **Proposta Dara**: `ALTER TABLE public.clinicas ADD COLUMN business_hours JSONB DEFAULT NULL`
- **Motivo do bloqueio**: coluna morta até a feature de automação de confirmação de consulta ser implementada (regra de negócio depende do horário para disparos)
- **Quando desbloquear**: na sprint que implementar "Confirmar consulta automático"
- **Estrutura esperada**: `{"seg":{"open":"08:00","close":"19:00"}, ...}`

---

## P3 — Dívida técnica

### P3-1: ESLint — 14 erros prettier + 1 exhaustive-deps

- **Arquivos**: `onboarding.tsx` (7), `auth.tsx` (6), `app.configuracoes.tsx` (1), `app.atividade.tsx` (1)
- **Fix**: `npx prettier --write src/routes/onboarding.tsx src/routes/auth.tsx src/routes/app.configuracoes.tsx`

### P3-2: Tabelas sem uso no código

- `notificacoes` — tabela existe no schema, zero referências em `src/`
- `user_roles` — tabela + RPC `has_role` existem, zero referências em `src/`
- `migration_job_rows` — tabela existe, não é lida (apenas `migration_jobs` é consultada)

### P3-3: Portal paciente rating não persiste

- **Arquivo**: `src/routes/p.$token.tsx:294`
- **Problema**: `onClick={() => setSent(true)}` — avaliação some ao fechar a aba

### P3-4: `useProfile` faz queries client-side

- **Arquivo**: `src/hooks/use-profile.ts`
- **Risco**: Expõe queries de perfil + clínica no bundle do cliente; melhor mover para `createServerFn` ou loader SSR

---

## Rastreamento de correções

| ID   | Descrição                          | Status       | Commit   |
| ---- | ---------------------------------- | ------------ | -------- |
| P0-1 | OAuth Bug 2 — callback.ts:92       | ✅ Corrigido | anterior |
| P0-2 | TS2307 lovable-cloud-auth-js       | ✅ Corrigido | anterior |
| Bug1 | COOP header OAuth popup            | ✅ Corrigido | anterior |
| P1-4 | ClinicTab "Salvar" morto           | ✅ Corrigido | 0ef445d  |
| P3-1 | ESLint prettier + exhaustive-deps  | ✅ Corrigido | anterior |
| D1   | RLS WITH CHECK clinicas_update_own | ✅ Aplicado  | 7e8891a  |
| B-1  | business_hours JSONB               | 🚫 Bloqueado | —        |

---

_Auditoria: 2026-06-09 — 21 issues encontrados (2 P0, 5 P1, 8 P2, 4 P3)_
_Sessão 2026-06-09: P0-1, P0-2, Bug1, P1-4, P3-1 resolvidos; D1 segurança aplicado_
