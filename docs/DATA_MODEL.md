# DATA_MODEL.md

> Schema Supabase do DrFlux — tabelas, RPCs e estado de uso no código.
> Fonte: `src/integrations/supabase/types.ts` + auditoria QA 2026-06-09.

---

## Tabelas

### `profiles`

Perfil do usuário autenticado (1:1 com `auth.users`).

| Coluna       | Tipo        | Notas             |
| ------------ | ----------- | ----------------- |
| `id`         | uuid (PK)   | = `auth.users.id` |
| `name`       | text        | Nome do dentista  |
| `email`      | text        |                   |
| `created_at` | timestamptz |                   |

**Usado em**: `src/hooks/use-profile.ts` (leitura client-side)

---

### `clinicas`

Clínica pertencente a um profile.

| Coluna       | Tipo        | Notas                                 |
| ------------ | ----------- | ------------------------------------- |
| `id`         | uuid (PK)   |                                       |
| `name`       | text        |                                       |
| `city`       | text        |                                       |
| `slug`       | text        | `xxx.dentalflux.app`                  |
| `onboarded`  | boolean     | `false` → redireciona para onboarding |
| `tone`       | text        | Tom de comunicação                    |
| `created_at` | timestamptz |                                       |

**Usado em**: `use-profile.ts` (leitura), `onboarding.tsx` (escrita), `app.tsx` (guard)
**⚠️ Quebrado**: `app.configuracoes.tsx` ClinicTab lê de `CLINIC` mock — não lê nem escreve nesta tabela

---

### `pacientes`

Pacientes da clínica.

| Coluna relevante | Tipo        | Notas                                        |
| ---------------- | ----------- | -------------------------------------------- |
| `id`             | uuid        |                                              |
| `clinic_id`      | uuid        | FK → `clinicas`                              |
| `name`           | text        |                                              |
| `phone`          | text        |                                              |
| `status`         | enum        | ativo, tratamento, inativo, recuperado, lead |
| `source`         | text        | canal de origem                              |
| `last_visit_at`  | timestamptz |                                              |
| `next_action`    | text        |                                              |
| `ltv`            | numeric     | Lifetime value                               |
| `tags`           | text[]      |                                              |
| `created_at`     | timestamptz |                                              |

**Usado em**: `app.pacientes.tsx` (leitura quando live mode)
**⚠️ Sem escrita**: "Novo paciente" button morto — nenhum `insert` no código

---

### `oportunidades`

Oportunidades no funil de conversão.

| Coluna relevante | Tipo    | Notas             |
| ---------------- | ------- | ----------------- |
| `id`             | uuid    |                   |
| `clinic_id`      | uuid    | FK → `clinicas`   |
| `patient_id`     | uuid    | FK → `pacientes`  |
| `name`           | text    | Nome/descrição    |
| `stage`          | text    | Estágio no kanban |
| `value`          | numeric | Valor potencial   |
| `days_in_stage`  | int     |                   |

**Usado em**: `app.oportunidades.tsx` (leitura quando live mode)
**⚠️ Sem escrita persistente**: `advance()` e `lose()` só atualizam `useState` local

---

### `clinic_diagnostics`

Resultado do diagnóstico clínico por clínica.

| Coluna relevante | Tipo        | Notas                 |
| ---------------- | ----------- | --------------------- |
| `id`             | uuid        |                       |
| `clinic_id`      | uuid        | FK → `clinicas`       |
| `score`          | numeric     | Score geral           |
| `details`        | jsonb       | Detalhes por dimensão |
| `calculated_at`  | timestamptz |                       |

**Usado em**: `app.diagnostico.tsx` (leitura + RPC recalcula)
**✓ Feature mais completa do app**

---

### `clinic_integrations`

Integrações da clínica (Google Calendar, etc).

| Coluna                 | Tipo        | Notas                       |
| ---------------------- | ----------- | --------------------------- |
| `clinic_id`            | uuid        | PK composta com `provider`  |
| `provider`             | text        | `google_calendar`, etc      |
| `status`               | text        | `connected`, `disconnected` |
| `access_token`         | text        | ⚠️ sensível                 |
| `refresh_token`        | text        | ⚠️ sensível                 |
| `expires_at`           | timestamptz |                             |
| `scope`                | text        |                             |
| `calendar_id`          | text        | Email da conta Google       |
| `connected_by_user_id` | uuid        |                             |
| `connected_at`         | timestamptz |                             |
| `metadata`             | jsonb       | `{ account_email }`         |

**Usado em**:

- `api/public/google/callback.ts` — escrita via `supabaseAdmin` (bypassa RLS)
- `googleCalendar.functions.ts` — leitura via server fn (RLS ativo)
- `app.configuracoes.tsx` AgendaTab — via `GoogleCalendarConnector`

---

### `atividades`

Log de atividades da operação da clínica.

| Coluna       | Tipo        | Notas            |
| ------------ | ----------- | ---------------- |
| `id`         | uuid        |                  |
| `clinic_id`  | uuid        | FK → `clinicas`  |
| `patient_id` | uuid?       | FK → `pacientes` |
| `kind`       | enum        | `activity_kind`  |
| `title`      | text        |                  |
| `detail`     | text?       |                  |
| `value`      | numeric?    | Valor financeiro |
| `created_at` | timestamptz |                  |

**Usado em**: `app.atividade.tsx` (leitura quando live mode)
**⚠️ Sem escrita**: nenhuma parte do código insere em `atividades` — tabela só é populada via DB triggers ou diretamente

---

### `migration_jobs`

Histórico de importações de planilhas.

| Coluna            | Tipo        | Notas                            |
| ----------------- | ----------- | -------------------------------- |
| `id`              | uuid        |                                  |
| `clinic_id`       | uuid        | FK → `clinicas`                  |
| `source_filename` | text        | Nome do arquivo                  |
| `status`          | text        | importando, done, erro, uploaded |
| `total_rows`      | int         |                                  |
| `imported_rows`   | int         |                                  |
| `created_at`      | timestamptz |                                  |

**Usado em**: `app.importar.tsx` (leitura do histórico)
**⚠️ Sem escrita**: "Wizard em construção" — nunca cria novos jobs

---

### `migration_job_rows`

Linhas individuais de um job de importação.

**Usado em**: ⚠️ **Nenhuma referência no código** — tabela órfã no frontend

---

### `notificacoes`

Notificações da clínica.

**Usado em**: ⚠️ **Nenhuma referência no código** — tabela órfã

---

### `user_roles`

Papéis de usuários.

**Usado em**: ⚠️ **Nenhuma referência no código** (RPC `has_role` também sem uso)

---

## RPCs (Stored Procedures)

| RPC                             | Assinatura                             | Usado em                        |
| ------------------------------- | -------------------------------------- | ------------------------------- |
| `calculate_and_save_diagnostic` | `(p_clinic_id, p_triggered_by)` → void | `app.diagnostico.tsx`           |
| `current_clinic_id`             | `()` → uuid                            | ⚠️ Nenhuma referência em `src/` |
| `has_role`                      | `(role)` → boolean                     | ⚠️ Nenhuma referência em `src/` |

---

## Clientes Supabase

| Client                         | Arquivo                                  | Uso                              |
| ------------------------------ | ---------------------------------------- | -------------------------------- |
| `supabase` (anon key)          | `integrations/supabase/client.ts`        | Frontend / server fns com RLS    |
| `supabaseAdmin` (service role) | `integrations/supabase/client.server.ts` | Apenas server-side — bypassa RLS |

**Regra**: `supabaseAdmin` **nunca** deve ser importado em arquivos sem `.server.ts` no nome.

---

## Estado de RLS

⚠️ RLS não verificado para nenhuma tabela durante esta auditoria — requer inspeção das migrations em `supabase/migrations/`.

---

_Atualizado: 2026-06-09_
