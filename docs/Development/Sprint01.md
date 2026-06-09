# DentalFlux — Sprint 01 ✅ IMPLEMENTADO

> Concluído em: 2026-06-09
> Status: Fundação multi-tenant em produção (Lovable Cloud)

---

## Entregue

### 1. Lovable Cloud (Supabase) — ativado
- Cliente browser em `src/integrations/supabase/client.ts` (auto-gerado).
- Variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` injetadas pela plataforma.
- `client.server.ts` disponível para operações administrativas server-side.

### 2. Schema multi-tenant
Tabelas criadas via migration (ver `docs/Technical/DatabaseModel.md`):
- `clinicas` — tenant raiz
- `profiles` — perfil ligado a `auth.users`
- `user_roles` — RBAC separado (`admin`, `recepcao`, `dentista`, `marketing`)
- `pacientes`, `oportunidades`, `atividades`, `notificacoes`

Funções `SECURITY DEFINER`:
- `public.current_clinic_id()` — clínica do usuário autenticado
- `public.has_role(uuid, app_role)` — verificação de papel

Trigger `on_auth_user_created` cria `profile` vazio no signup.

### 3. RLS
Toda tabela tem RLS habilitado. Padrão: `clinic_id = current_clinic_id()`. `user_roles` exige `has_role('admin')` para edição. Policies isolam clínicas — dois usuários de clínicas diferentes não veem dados um do outro.

### 4. Autenticação
- Rota `/auth` com tabs Entrar / Criar conta (e-mail + senha).
- Hook `src/hooks/use-auth.ts` (sessão reativa via `onAuthStateChange`).
- Root invalida cache do React Query em `SIGNED_IN`/`USER_UPDATED`.
- Logout no rodapé do sidebar do `AppShell`.

### 5. Gate `/app`
`src/routes/app.tsx` redireciona:
- Sem sessão → `/auth`
- Sem clínica ou clínica não-onboarded → `/onboarding`

### 6. Onboarding persistente
`src/routes/onboarding.tsx` salva no Supabase no fim do passo "WhatsApp":
- Insere `clinicas` (com `onboarded = true`)
- Atualiza `profiles.clinic_id` e `name`
- Insere `user_roles` (papel `admin`)
- Step "Pronto" oferece botão **"Carregar dados demo"** (20 pacientes, 15 oportunidades, atividades, notificações).

### 7. Módulos lendo Supabase (parcial — Sprint 01)
Com toggle **Real** no header (default):
- `/app/pacientes`
- `/app/oportunidades`
- `/app/atividade`

Toggle **Demo** mantém mocks originais para apresentação. Demais módulos seguem 100% mock até as próximas sprints.

### 8. Seed de desenvolvimento
`src/lib/seed-demo.ts` — função `seedDemoData(clinicId, userId)` idempotente.

---

## Critérios de aceite — verificação

| Critério | Status |
|---|---|
| Login funciona com email/senha real | ✅ |
| `/app` carrega dados reais via Supabase | ✅ (pacientes/oportunidades/atividade) |
| Isolamento RLS entre clínicas | ✅ (policies + `current_clinic_id`) |
| Onboarding grava `clinicas`, `profiles`, `user_roles` | ✅ |
| Logout funciona e redireciona para `/auth` | ✅ |
| Tabelas com GRANTs explícitos | ✅ |

---

## Fora do escopo desta sprint (Sprint 02+)
- Convite de membros por email
- Upload real de logo
- Z-API / Meta Cloud
- Stripe / cobranças reais
- Google Reviews
- Dashboard com KPIs computados do banco
- Conversas, Campanhas, Automações, Cobranças, Avaliações conectadas
