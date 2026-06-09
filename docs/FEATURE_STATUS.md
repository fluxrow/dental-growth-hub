# FEATURE_STATUS.md

> Status de cada tela/feature do DrFlux. Atualizado após auditoria QA de 2026-06-09.
>
> Legenda: **REAL** = dados reais do Supabase, ações funcionam | **PARCIAL** = lê dados reais mas escrita/ações quebradas | **CASCA** = 100% mock, zero backend

---

## Resumo rápido

| #   | Rota                 | Tela            | Status      | Dados                                               |
| --- | -------------------- | --------------- | ----------- | --------------------------------------------------- |
| 1   | `/app`               | Dashboard       | **CASCA**   | `@/lib/mock`                                        |
| 2   | `/app/pacientes`     | Pacientes       | **PARCIAL** | Lê `pacientes` (real) — escrita morta               |
| 3   | `/app/oportunidades` | Oportunidades   | **PARCIAL** | Lê `oportunidades` (real) — ações toast-only        |
| 4   | `/app/diagnostico`   | Diagnóstico     | **REAL**    | `clinic_diagnostics` + RPC                          |
| 5   | `/app/automacoes`    | Automações      | **CASCA**   | `@/lib/mock`                                        |
| 6   | `/app/campanhas`     | Campanhas       | **CASCA**   | `@/lib/mock`                                        |
| 7   | `/app/cobrancas`     | Cobranças       | **CASCA**   | `@/lib/mock`                                        |
| 8   | `/app/avaliacoes`    | Avaliações      | **CASCA**   | `@/lib/mock`                                        |
| 9   | `/app/relatorios`    | Relatórios      | **CASCA**   | `@/lib/mock`                                        |
| 10  | `/app/conversas`     | Conversas       | **CASCA**   | `@/lib/mock` (send broken)                          |
| 11  | `/app/atividade`     | Atividade       | **PARCIAL** | Lê `atividades` (real) — markAllRead usa mock       |
| 12  | `/app/importar`      | Importar        | **PARCIAL** | Lê `migration_jobs` — upload "Wizard em construção" |
| 13  | `/app/configuracoes` | Configurações   | **PARCIAL** | AgendaTab real — resto casca                        |
| 14  | `/p/$token`          | Portal Paciente | **CASCA**   | `getPortalData()` de `@/lib/mock`                   |
| 15  | `/onboarding`        | Onboarding      | **REAL**    | `clinicas` + `profiles` + Google Calendar           |
| 16  | `/auth`              | Autenticação    | **PARCIAL** | Email real — Google ⚠️ TS2307                       |

---

## Detalhamento por tela

### 1. Dashboard `/app` — CASCA

- **Arquivo**: `src/routes/app.index.tsx`
- **Dados**: `KPIS`, `FINANCIAL_KPIS`, `CONVERSATIONS`, `OPPORTUNITIES` todos de `@/lib/mock`
- **Botões quebrados**: `href="/app/conversas"` e `href="/app/oportunidades"` nas linhas 60 e 96 usam `href` puro (full page reload), não `<Link to=>`
- **Decorativos**: PeriodSelector hardcoded `i === 2` como "30 dias" ativo sem filtro real
- **Ação necessária**: Conectar KPIs ao Supabase; trocar `href` por `<Link to>`

### 2. Pacientes `/app/pacientes` — PARCIAL

- **Arquivo**: `src/routes/app.pacientes.tsx`
- **Real**: `supabase.from("pacientes").select(...)` quando `live === true`
- **Quebrado**:
  - "Novo paciente" button (linha 92) — sem `onClick`
  - "Agendar consulta" button (linha 316) — sem handler
  - "Enviar mensagem" button (linha 319) — sem handler
  - "Exportar dados" link (linha 282) — sem handler
- **Filtros**: busca e filtro de status — funcionam no frontend (só no array local)

### 3. Oportunidades `/app/oportunidades` — PARCIAL

- **Arquivo**: `src/routes/app.oportunidades.tsx`
- **Real**: `supabase.from("oportunidades").select(...)` quando `live === true`
- **Quebrado**: `advance(id)` apenas atualiza `useState` local — não escreve no Supabase; `lose(id)` idem
- **Toast-only**: "Registrar comparecimento", "Agendar follow-up", "Abrir conversa", "Ver paciente" — todos disparam `toast()` sem ação real
- **Sem drag-drop**: kanban não tem arrastar card entre colunas

### 4. Diagnóstico `/app/diagnostico` — REAL ✓

- **Arquivo**: `src/routes/app.diagnostico.tsx`
- **Real**: `supabase.from("clinic_diagnostics").select(...)` + `supabase.rpc("calculate_and_save_diagnostic")`
- **Funciona**: Cálculo, exibição e recálculo do diagnóstico clínico
- **Pendente**: ⚠️ Verificar RLS em `clinic_diagnostics`

### 5. Automações `/app/automacoes` — CASCA

- **Arquivo**: `src/routes/app.automacoes.tsx`
- **Dados**: `AUTOMATIONS` de `@/lib/mock` — 6 templates hardcoded
- **Backend**: zero — nenhum `supabase.*`, nenhum `createServerFn`
- **Ação**: Criar tabela `automacoes` no banco; implementar CRUD

### 6. Campanhas `/app/campanhas` — CASCA

- **Arquivo**: `src/routes/app.campanhas.tsx`
- **Dados**: `CAMPAIGNS` de `@/lib/mock`
- **Backend**: zero

### 7. Cobranças `/app/cobrancas` — CASCA

- **Arquivo**: `src/routes/app.cobrancas.tsx`
- **Dados**: `CHARGES`, `CHARGE_KPIS` de `@/lib/mock`
- **Backend**: zero

### 8. Avaliações `/app/avaliacoes` — CASCA

- **Arquivo**: `src/routes/app.avaliacoes.tsx`
- **Dados**: `REVIEWS`, `REVIEW_KPIS`, `ELIGIBLE_FOR_REVIEW` de `@/lib/mock`
- **Backend**: zero

### 9. Relatórios `/app/relatorios` — CASCA

- **Arquivo**: `src/routes/app.relatorios.tsx`
- **Dados**: `ATTENDANCE_RATE`, `MONTHLY_EVOLUTION`, `SOURCE_BREAKDOWN` de `@/lib/mock`
- **Backend**: zero

### 10. Conversas `/app/conversas` — CASCA

- **Arquivo**: `src/routes/app.conversas.tsx`
- **Dados**: `CONVERSATIONS` de `@/lib/mock`
- **Quebrado**: "Enviar" button (linha 199) sem `onClick`; `<textarea>` sem `onChange` — completamente não-funcional
- **Backend**: zero — sem Z-API, sem Supabase

### 11. Atividade `/app/atividade` — PARCIAL

- **Arquivo**: `src/routes/app.atividade.tsx`
- **Real**: `supabase.from("atividades").select(...)` quando `live === true`
- **Quebrado**: `markAllRead()` lê de `ACTIVITY_FEED` (mock) — ignora dados do Supabase
- **ESLint**: `react-hooks/exhaustive-deps` warning

### 12. Importar `/app/importar` — PARCIAL

- **Arquivo**: `src/routes/app.importar.tsx`
- **Real**: `supabase.from("migration_jobs").select(...)` mostra histórico de jobs
- **Casca**: "Próximo" button explicitamente `disabled` com tooltip "Wizard em construção"
- **Pendência**: Implementar upload para `migration_jobs` + processamento de CSV/XLSX

### 13. Configurações `/app/configuracoes` — PARCIAL

- **Arquivo**: `src/routes/app.configuracoes.tsx`

| Tab         | Status    | Detalhes                                                                      |
| ----------- | --------- | ----------------------------------------------------------------------------- |
| Agenda      | **REAL**  | `GoogleCalendarConnector` funcional via `getGoogleCalendarStatus` + OAuth     |
| Clínica     | **CASCA** | Campos `defaultValue={CLINIC.xxx}` de mock; "Salvar alterações" sem `onClick` |
| Usuários    | **CASCA** | Tabela de `TEAM` de mock; "Convidar usuário" sem handler                      |
| WhatsApp    | **CASCA** | Campos sem handler; "Conectar WhatsApp" sem `onClick`                         |
| Integrações | **CASCA** | `INTEGRATIONS` de mock                                                        |
| Planos      | **CASCA** | `PLANS` de mock                                                               |

### 14. Portal Paciente `/p/$token` — CASCA

- **Arquivo**: `src/routes/p.$token.tsx`
- **Dados**: `getPortalData(params.token)` de `@/lib/mock` — sempre retorna o mesmo paciente fictício
- **Quebrado**: Rating submit `onClick={() => setSent(true)}` apenas muda estado local — sem chamada API

### 15. Onboarding `/onboarding` — REAL ✓

- **Arquivo**: `src/routes/onboarding.tsx`
- **Real**: Cria/atualiza `clinicas`, `profiles`; Google Calendar via `GoogleCalendarConnector`
- **Draft persistence**: localStorage `drflux:onboarding-draft:v1`

### 16. Auth `/auth` — PARCIAL

- **Arquivo**: `src/routes/auth.tsx`
- **Real**: Email/senha via `supabase.auth.signInWithPassword` / `signUp`
- **Risco**: Google sign-in usa `lovable.auth.signInWithOAuth` de `@lovable.dev/cloud-auth-js` — TypeScript reporta **TS2307** (module not found) — pode quebrar em build

---

_Última atualização: 2026-06-09 — auditoria manual completa_
