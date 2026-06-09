# DentalFlux — Relatório de Auditoria

> Data: 2026-06-08  
> Auditor: CTO/Solution Architect  
> Repositório: https://github.com/fluxrow/dental-growth-hub

---

## Resumo Executivo

O repositório contém um **MVP visual completo** do DentalFlux criado pelo Lovable, com todas as 13 telas implementadas, ~42KB de dados mockados realistas e uma stack moderna (React 19, TanStack Start, Tailwind v4). O produto está visualmente pronto para demonstração, mas requer desenvolvimento backend completo antes do go-live.

---

## Já Pronto

| Item | Detalhes |
|------|---------|
| Landing Page | Completa, estática, pronta para produção |
| Layout / AppShell | Sidebar, topbar, notificações, modo demo/vazio |
| Design System | shadcn/ui completo (40+ componentes) |
| Dashboard | KPIs, funil, sparklines funcionais |
| Kanban de Oportunidades | Mover entre etapas funciona em memória |
| Inbox de Conversas | Layout 3 colunas, seleção de conversa ativa |
| Base de Pacientes | Tabela + drawer de detalhes |
| Campanhas | Visualização de métricas |
| Automações | Visualização por categoria |
| Cobranças | Visualização + tabs |
| Avaliações | Visualização + elegíveis |
| Relatórios | Gráficos Recharts funcionais (6 tipos) |
| Configurações | UI completa (5 abas) |
| Portal do Paciente | Layout completo + billingMessage humanizada |
| Onboarding Wizard | 4 passos com validação e localStorage |
| Feed de Atividades | Filtros + marcar como lido (localStorage) |
| Tipos TypeScript | 20+ entidades modeladas em mock.ts |
| Modo Empty State | Toggle global com useSyncExternalStore |

---

## Precisa Ajustar

| Item | Problema | Solução |
|------|---------|---------|
| Guard de auth em `/app` | Usa `localStorage` boolean — inseguro | Substituir por `supabase.auth.getUser()` |
| Onboarding persistence | Salva em `localStorage` apenas | Migrar para INSERT no Supabase |
| Busca de pacientes | Input presente, sem lógica | Implementar filtro com `ilike` |
| Tabs de cobranças | Sem filtro funcional | Filtrar array por `status` |
| Portal do paciente | Token de fallback — qualquer URL mostra dados demo | Implementar lookup real + 404 |
| Seletor de período | Visual apenas, sem filtro de dados | Conectar a queries com range de datas |

---

## Precisa Desenvolver

| Item | Prioridade | Sprint |
|------|-----------|--------|
| Supabase Auth (login/register/logout) | Alta | Sprint 01 |
| Migrations SQL + RLS multi-tenant | Alta | Sprint 01 |
| Queries reais (substituir mock.ts) | Alta | Sprint 01-02 |
| Integração Z-API (send/receive) | Alta | Sprint 02 |
| Webhooks de recebimento | Alta | Sprint 02 |
| Supabase Realtime (mensagens) | Alta | Sprint 02 |
| Criação/edição de paciente | Média | Sprint 02 |
| Criação/edição de oportunidade | Média | Sprint 02 |
| Disparo de campanha | Média | Sprint 03 |
| Automações com agendamento | Média | Sprint 03 |
| Cobranças (Stripe/Asaas) | Média | Sprint 03 |
| Google Business API (avaliações) | Média | Sprint 04 |
| Portal tokenizado (geração de link) | Média | Sprint 03 |
| Upload de arquivos (logo, docs) | Baixa | Sprint 03 |
| Drag and drop no Kanban | Baixa | Sprint 02 |
| Editor de template de mensagem | Média | Sprint 02 |

---

## Backlog Futuro

| Item | Justificativa |
|------|--------------|
| App mobile (React Native) | Acesso da equipe em campo |
| Integração Google Calendar | Sync de agendamentos |
| Integração Meta Ads | Atribuição de leads |
| Análise de sentimento (OpenAI) | Já mockado, aguarda integração |
| Sugestão de resposta com IA | Campo `nextAction` já existe no modelo |
| Builder visual de automação | Fluxos complexos multi-etapa |
| Importação de pacientes via CSV | Migração de clínicas existentes |
| Relatórios exportáveis em PDF | Exigência comercial |
| Multi-clínica (rede) | Gestão de grupos de clínicas |
| Plano de tratamento digital | Integração com software odontológico |
| Assinatura digital de documentos | Termos de consentimento |
| Telemedicina / videochamada | Consultas remotas |

---

## Stack e Arquitetura

### Pontos Fortes
- **TanStack Start + SSR**: preparado para server-side rendering real, loaders já estruturados
- **TypeScript estrito**: todos os tipos modelados, facilitará migração do mock para Supabase
- **shadcn/ui**: componentes acessíveis e customizáveis
- **Comentários de roadmap**: `mock.ts` já documenta intenção de migrar para Supabase
- **Multi-tenant ready**: `clinicId` presente em todas as entidades mockadas

### Débitos Técnicos
- **Autenticação frágil**: localStorage boolean não é auth — deve ser eliminado antes de qualquer beta
- **42KB de dados hardcoded**: `mock.ts` deve ser gradualmente substituído, não deletado de uma vez
- **Sem testes**: nenhum teste unitário ou e2e — recomendável adicionar antes do backend
- **Sem tratamento de erro**: nenhuma página de erro, sem error boundary React

### Decisão de Arquitetura: TanStack Start vs Next.js
O projeto usa **TanStack Start** (não Next.js), com roteamento file-based via TanStack Router. Isso é funcional mas menos maduro que Next.js. As migrações de backend devem usar os **TanStack Start loaders** (server functions), não API routes estilo Next.js.

---

## Próximos Passos

1. **Executar Sprint 01** — Supabase + Auth + Multi-tenant + Pacientes
2. Manter `mock.ts` funcionando em paralelo durante migração
3. Testar RLS com 2 tenants antes de qualquer beta
4. Definir data de Sprint 02 após entrega do Sprint 01
