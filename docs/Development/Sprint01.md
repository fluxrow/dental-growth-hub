# DentalFlux — Sprint 01

> Data: 2026-06-08  
> Duração estimada: 2 semanas  
> Objetivo: Fundação técnica — backend, auth e multi-tenant

---

## Escopo do Sprint

**Incluído:**
- [ ] Setup Supabase (projeto, variáveis de ambiente)
- [ ] Autenticação (Supabase Auth + middleware)
- [ ] Multi-tenant (RLS, isolamento por clinic_id)
- [ ] Tabela `clinicas`
- [ ] Tabela `usuarios`
- [ ] Tabela `pacientes`

**Excluído (sprints futuros):**
- Integração Z-API
- Campanhas, Automações
- Cobranças, Avaliações
- Portal do Paciente tokenizado
- Relatórios com dados reais

---

## Tarefas Detalhadas

### Setup Supabase

- [ ] Criar projeto Supabase (produção)
- [ ] Criar projeto Supabase (staging/dev)
- [ ] Configurar variáveis de ambiente no projeto TanStack:
  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=   # apenas server-side
  ```
- [ ] Instalar cliente Supabase: `bun add @supabase/supabase-js`
- [ ] Criar `src/lib/supabase.ts` (client browser) e `src/lib/supabase.server.ts` (client server)

---

### Autenticação

- [ ] Habilitar provider Email/Password no Supabase Auth
- [ ] Criar tela de login (`/login`) — email + senha
- [ ] Criar tela de registro (`/register`) — apenas para trial
- [ ] Criar tela de recuperação de senha (`/forgot-password`)
- [ ] Substituir guard de `localStorage` em `src/routes/app.tsx` por verificação real de sessão Supabase
- [ ] Criar loader server-side para verificar `auth.getUser()` antes de renderizar `/app`
- [ ] Implementar logout
- [ ] Proteger `/onboarding` — redirecionar para `/login` se não autenticado

**Fluxo de auth:**
```
/ → "Começar grátis" → /register → /onboarding → /app
/ → "Entrar" → /login → /app
/app (sem sessão) → /login
```

---

### Multi-tenant

- [ ] Criar migration: tabela `clinicas`
- [ ] Criar migration: tabela `usuarios`
- [ ] Habilitar RLS em `clinicas` e `usuarios`
- [ ] Criar função auxiliar `current_clinic_id()`
- [ ] Criar políticas RLS:
  - `usuarios`: SELECT/INSERT/UPDATE apenas do próprio clinic_id
  - `clinicas`: SELECT/UPDATE apenas da própria clínica
- [ ] Criar trigger `on_auth_user_created` para inserir em `usuarios` após signup

---

### Migração do Onboarding

- [ ] Substituir persistência de localStorage por insert no Supabase:
  - `StepClinic` → INSERT INTO `clinicas`
  - `StepTeam` → INSERT INTO `usuarios` (múltiplos)
  - Manter WhatsApp como localStorage até Sprint 02 (Z-API)
- [ ] Após insert bem-sucedido, redirecionar para `/app`
- [ ] Validar unicidade de `clinicas.slug` via query antes do submit

---

### Tabela Pacientes

- [ ] Criar migration: tabela `pacientes`
- [ ] Habilitar RLS em `pacientes`
- [ ] Criar política: `clinic_isolation` (SELECT/INSERT/UPDATE/DELETE)
- [ ] Conectar página `/app/pacientes` a query real:
  ```typescript
  const { data } = await supabase
    .from('pacientes')
    .select('*')
    .order('name')
  ```
- [ ] Substituir `PATIENTS` mock por dados reais
- [ ] Implementar busca funcional (ilike no name ou phone)
- [ ] Inserir pacientes de exemplo via seed SQL para teste

---

### Critérios de Aceite

- [ ] Login funciona com email/senha real
- [ ] Após login, `/app` carrega dados do Supabase (pacientes reais)
- [ ] Dois usuários de clínicas diferentes NÃO conseguem ver dados um do outro (RLS validado)
- [ ] Onboarding cria registro real na tabela `clinicas`
- [ ] Busca de pacientes filtra por nome
- [ ] Logout funciona e redireciona para `/login`

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/lib/supabase.ts` | Criar |
| `src/lib/supabase.server.ts` | Criar |
| `src/routes/login.tsx` | Criar |
| `src/routes/register.tsx` | Criar |
| `src/routes/forgot-password.tsx` | Criar |
| `src/routes/app.tsx` | Modificar (guard real) |
| `src/routes/onboarding.tsx` | Modificar (insert Supabase) |
| `src/routes/app.pacientes.tsx` | Modificar (query real) |
| `supabase/migrations/001_clinicas.sql` | Criar |
| `supabase/migrations/002_usuarios.sql` | Criar |
| `supabase/migrations/003_pacientes.sql` | Criar |

---

## Definição de Pronto (DoD)

- Código commitado na branch `sprint-01`
- Migrations aplicadas em staging
- RLS testado manualmente com 2 usuários de clínicas diferentes
- Tela de pacientes exibe dados reais
- Sem dados hardcoded de pacientes no frontend
