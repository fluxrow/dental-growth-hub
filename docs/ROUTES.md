# ROUTES.md

> Mapeamento completo de rotas do DrFlux (TanStack Router, file-based).
> Gerado pela auditoria QA de 2026-06-09.

---

## Estrutura de arquivos → rotas

| Arquivo                                    | Rota                          | Autenticado? | Tipo                |
| ------------------------------------------ | ----------------------------- | ------------ | ------------------- |
| `src/routes/__root.tsx`                    | (raiz)                        | —            | Layout raiz         |
| `src/routes/index.tsx`                     | `/`                           | Não          | Landing page        |
| `src/routes/auth.tsx`                      | `/auth`                       | Não          | Login / cadastro    |
| `src/routes/onboarding.tsx`                | `/onboarding`                 | Sim          | Setup inicial       |
| `src/routes/app.tsx`                       | `/app`                        | **Guard**    | Layout autenticado  |
| `src/routes/app.index.tsx`                 | `/app`                        | Sim          | Dashboard           |
| `src/routes/app.pacientes.tsx`             | `/app/pacientes`              | Sim          | Lista de pacientes  |
| `src/routes/app.oportunidades.tsx`         | `/app/oportunidades`          | Sim          | Kanban pipeline     |
| `src/routes/app.diagnostico.tsx`           | `/app/diagnostico`            | Sim          | Diagnóstico clínico |
| `src/routes/app.automacoes.tsx`            | `/app/automacoes`             | Sim          | Automações          |
| `src/routes/app.campanhas.tsx`             | `/app/campanhas`              | Sim          | Campanhas           |
| `src/routes/app.cobrancas.tsx`             | `/app/cobrancas`              | Sim          | Cobranças           |
| `src/routes/app.avaliacoes.tsx`            | `/app/avaliacoes`             | Sim          | Avaliações          |
| `src/routes/app.relatorios.tsx`            | `/app/relatorios`             | Sim          | Relatórios          |
| `src/routes/app.conversas.tsx`             | `/app/conversas`              | Sim          | Chat WhatsApp       |
| `src/routes/app.atividade.tsx`             | `/app/atividade`              | Sim          | Log de atividades   |
| `src/routes/app.importar.tsx`              | `/app/importar`               | Sim          | Importar CSV/XLSX   |
| `src/routes/app.configuracoes.tsx`         | `/app/configuracoes`          | Sim          | Configurações       |
| `src/routes/p.$token.tsx`                  | `/p/:token`                   | Não          | Portal do paciente  |
| `src/routes/api/public/google/callback.ts` | `/api/public/google/callback` | Não          | OAuth callback      |

**Total: 19 rotas** (20 arquivos, 1 é layout raiz sem rota própria)

---

## Guard de autenticação

`src/routes/app.tsx` verifica:

1. `useAuth()` → se não há usuário, redireciona para `/auth`
2. `useProfile()` → se não há clínica ou `clinic.onboarded === false`, redireciona para `/onboarding`
3. Exibe spinner enquanto carrega

```
/app/* → app.tsx (guard)
  ↓ sem user → /auth
  ↓ sem clínica ou não onboardado → /onboarding
  ↓ ok → renderiza rota filha
```

---

## Navegação sidebar (app-shell.tsx)

13 itens no array `NAV` — todos mapeados para rotas existentes:

| Label         | `to=`                | Ícone           |
| ------------- | -------------------- | --------------- |
| Dashboard     | `/app`               | LayoutDashboard |
| Pacientes     | `/app/pacientes`     | Users           |
| Conversas     | `/app/conversas`     | MessageCircle   |
| Oportunidades | `/app/oportunidades` | Target          |
| Automações    | `/app/automacoes`    | Zap             |
| Campanhas     | `/app/campanhas`     | Megaphone       |
| Cobranças     | `/app/cobrancas`     | Wallet          |
| Avaliações    | `/app/avaliacoes`    | Star            |
| Relatórios    | `/app/relatorios`    | BarChart3       |
| Diagnóstico   | `/app/diagnostico`   | Stethoscope     |
| Importar      | `/app/importar`      | Upload          |
| Atividade     | `/app/atividade`     | Activity        |
| Configurações | `/app/configuracoes` | Settings        |

Rodapé do sidebar também tem `<Link to="/app/configuracoes">` ("Gerenciar agenda Google →").

---

## Problemas de navegação encontrados

### BUG-NAV-1: href puro no Dashboard

- **Arquivo**: `src/routes/app.index.tsx:60,96`
- `href="/app/conversas"` e `href="/app/oportunidades"` passados para componente `Panel`
- `Panel` os repassa para `<Link to={href as never}>` — funciona, mas o type cast `as never` é frágil
- **Risco**: Qualquer refactor do `Panel` pode reverter para `<a href>` nativo → hard reload

### BUG-NAV-2: Decorativos sem funcionalidade

- PeriodSelector: hardcoded `i === 2` como ativo — seleção sem efeito
- Search bar: sem `onChange`/`onSubmit`
- Clinic switcher: sem `onClick`

---

## Rotas públicas

| Rota                          | Propósito       | Backend                       |
| ----------------------------- | --------------- | ----------------------------- |
| `/`                           | Landing         | Estático                      |
| `/auth`                       | Auth            | Supabase Auth                 |
| `/p/:token`                   | Portal paciente | **Mock** (deve usar Supabase) |
| `/api/public/google/callback` | OAuth           | Supabase Admin (service role) |

---

_Atualizado: 2026-06-09_
