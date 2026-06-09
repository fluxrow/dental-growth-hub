# DentalFlux — Product Map

> Última atualização: 2026-06-08  
> Status: Auditoria pré-desenvolvimento backend

---

## Visão Geral

O DentalFlux é uma plataforma SaaS multi-tenant para clínicas odontológicas, focada em crescimento de receita via automação de WhatsApp, gestão de pipeline de pacientes e recuperação de inadimplência.

---

## Mapa de Telas

### 1. Landing Page (`/`)

**Objetivo:** Página pública de marketing para conversão de visitantes em trials.

**Componentes:**
- `SiteHeader` — navegação fixa com CTA "Começar grátis"
- `Hero` — headline + `DashboardMockup` (mockup animado do produto)
- `SocialProof` — logos de clínicas parceiras fictícias
- `Problem` — 6 dores identificadas das clínicas
- `HowItWorks` — 3 passos de onboarding
- `FunnelSection` — visualização das 8 etapas do funil
- `Benefits` — 6 benefícios em grid
- `Results` — 4 métricas de resultado (+38% faturamento, -42% faltas, R$86k recuperados, 4.8★)
- `Testimonials` — 3 depoimentos
- `FinalCta` — CTA final
- `SiteFooter`

**Funcionalidades:** Estática, sem interações além de scroll e CTAs.

**Dependências futuras:**
- Integração com formulário de captação de leads
- Analytics de conversão (UTM tracking)

---

### 2. Onboarding (`/onboarding`)

**Objetivo:** Wizard de configuração inicial da clínica em 4 passos antes de acessar o app.

**Componentes:**
- `StepClinic` — dados da clínica (nome, CNPJ, endereço, especialidades, logo)
- `StepTeam` — cadastro de até 5 membros da equipe com roles
- `StepWhatsApp` — seleção de provedor Z-API/Meta e credenciais
- `StepDone` — resumo e checklist de conclusão

**Funcionalidades:**
- Wizard multi-step com validação por etapa
- Persistência em `localStorage` (`dentalflux:onboarding`, `dentalflux:onboarded`)
- Redirecionamento para `/app` ao concluir

**Dependências futuras:**
- Substituir localStorage por Supabase (tabelas `clinicas`, `usuarios`)
- Upload real de logo (Supabase Storage)
- Validação CNPJ em tempo real
- Verificação de conexão WhatsApp real (Z-API webhook)
- Envio de convite por email aos membros

---

### 3. Dashboard (`/app`)

**Objetivo:** Visão executiva da operação com KPIs, funil de conversão e painéis de ação rápida.

**Componentes:**
- `AppShell` — wrapper com sidebar (11 itens) e topbar
- `KpiCard` × 6 — cards com valor, delta% e sparkline (Recharts)
- `FunnelChart` — funil visual das 8 etapas
- `EmptyState` — exibido quando `useEmptyMode() = true`
- Panel "Precisa de resposta" — conversas com `unread > 0`
- Panel "Próximas ações" — oportunidades em agendada/confirmada/compareceu

**Funcionalidades:**
- Toggle Demo/Vazio no topbar para alternar entre dados mock e empty states
- Seletor de período (Hoje/7d/30d/90d) — visual apenas, sem filtro
- Notificações no topbar (popover)

**Dados consumidos:** `KPIS`, `FINANCIAL_KPIS`, `CONVERSATIONS`, `OPPORTUNITIES`

**Dependências futuras:**
- Conectar KPIs a queries reais do Supabase
- Filtro de período funcional
- Real-time updates via Supabase Realtime

---

### 4. Oportunidades (`/app/oportunidades`)

**Objetivo:** Pipeline de oportunidades em formato Kanban com 7 colunas representando o funil de conversão.

**Componentes:**
- Kanban em colunas (`novo` → `contato` → `agendada` → `confirmada` → `compareceu` → `tratamento` → `ativo`)
- `OpportunityCardActions` — dropdown com ações por card
- Toggle Kanban/Tabela — apenas visual
- Filtros por Origem e Responsável — apenas visual

**Funcionalidades:**
- Avançar etapa de uma oportunidade (em memória, sem persistência)
- Marcar oportunidade como perdida (em memória)
- Soma de valor por coluna
- Contador de dias na etapa

**Dependências futuras:**
- Drag and drop entre colunas
- Persistência real no Supabase
- Filtros funcionais
- Vista tabular
- Criação de nova oportunidade
- Histórico de movimentações

---

### 5. Conversas (`/app/conversas`)

**Objetivo:** Inbox unificado de WhatsApp estilo WhatsApp Web para gestão de todas as conversas com pacientes.

**Componentes:**
- Coluna esquerda — lista de conversas + filtros (Todas/Não lidas/Aguardando)
- Coluna central — thread de mensagens + input + quick replies
- Coluna direita — contexto do paciente (etapa, valor, tags, próxima ação sugerida)

**Funcionalidades:**
- Seleção de conversa ativa
- Quick replies hardcoded: "Olá! 😊", "Confirmar consulta", "Enviar orçamento", "Reagendar"
- Exibição da etapa do funil e valor estimado do paciente

**Dependências futuras:**
- Integração Z-API para envio/recebimento real de mensagens
- WebSocket/Supabase Realtime para mensagens em tempo real
- Upload de arquivos e mídias
- Templates de mensagem cadastrados
- IA para sugestão de resposta
- Atribuição de conversa a um agente

---

### 6. Pacientes (`/app/pacientes`)

**Objetivo:** Base de pacientes com listagem tabular, busca e drawer de detalhes.

**Componentes:**
- Tabela com colunas: Paciente, Status, Origem, Última visita, Próxima ação, LTV, Tags
- `PatientDrawer` — painel lateral com timeline, campanhas recebidas e ações

**Funcionalidades:**
- Drawer de detalhes do paciente
- Badge LGPD (consentimento)
- Ação "Exportar dados" e "Anonimizar" (visuais apenas)

**Dependências futuras:**
- Busca funcional
- Filtros por status, origem, tags
- Criação e edição de paciente
- Timeline real de eventos
- Importação via CSV
- Consentimento LGPD persistido

---

### 7. Campanhas (`/app/campanhas`)

**Objetivo:** Gestão e métricas de campanhas de WhatsApp (reativação, confirmação, cobrança, avaliação).

**Componentes:**
- Cards de tipo de campanha com contadores
- Tabela de campanhas com métricas (enviadas, abertura%, resposta%, conversão%, receita)

**Funcionalidades:** Apenas visualização de dados mockados.

**Dependências futuras:**
- Criação de nova campanha
- Seleção de audiência (segmentação de pacientes)
- Editor de template de mensagem
- Agendamento e disparo
- Relatório detalhado por campanha

---

### 8. Automações (`/app/automacoes`)

**Objetivo:** Gerenciamento de fluxos de automação por categoria (confirmações, reativações, cobranças, avaliações, follow-up).

**Componentes:**
- "Impact strip" com totais: mensagens, conversões, receita, horas economizadas
- Listagem por categoria com métricas por automação

**Funcionalidades:** Apenas visualização de dados mockados.

**Dependências futuras:**
- Builder visual de fluxo de automação
- Configuração de trigger (agendamento, evento)
- Ativar/pausar automação
- Editor de template de mensagem por etapa
- Teste de disparo manual

---

### 9. Cobranças (`/app/cobrancas`)

**Objetivo:** Gestão de cobranças com filtros por status e automações de recuperação ativas.

**Componentes:**
- 4 KPI cards (total pendente, vencendo, atrasado, recuperado)
- Tabs de filtro: Todas, Pendentes, Vencendo, Atrasadas, Recuperadas
- Tabela de cobranças com ação "Enviar cobrança"
- Seção de automações ativas: D-3, D, D+3, D+10

**Funcionalidades:** Tabs e botões visuais sem lógica funcional.

**Dependências futuras:**
- Filtros funcionais por tab
- Integração Stripe/Asaas/PagSeguro
- Disparo manual de cobrança via WhatsApp
- Configuração dos gatilhos de automação
- Parcelamento e negociação

---

### 10. Avaliações (`/app/avaliacoes`)

**Objetivo:** Gestão da reputação no Google — envio de pedidos de avaliação e monitoramento.

**Componentes:**
- 4 KPIs: avaliações enviadas, recebidas, nota média, taxa de resposta
- Lista de pacientes elegíveis + botão "Enviar pedido"
- Lista de avaliações recebidas com análise de sentimento

**Funcionalidades:** Sentimento (positive/neutral/negative) exibido como badge (dado mockado).

**Dependências futuras:**
- Integração Google Business API
- Envio real via WhatsApp (Z-API)
- Análise de sentimento via OpenAI
- Resposta a avaliações negativas

---

### 11. Relatórios (`/app/relatorios`)

**Objetivo:** Dashboard analítico executivo com múltiplos gráficos.

**Componentes (todos Recharts):**
- `FunnelChart` — funil de conversão
- `PieChart` — origem dos pacientes
- `AreaChart` — taxa de comparecimento mensal
- `BarChart` — pacientes recuperados por mês
- `LineChart` — evolução mensal leads→agendados→atendidos→recuperados

**Funcionalidades:** Gráficos funcionais com dados mockados.

**Dependências futuras:**
- Conectar a queries reais do Supabase
- Filtro de período funcional
- Exportar relatório PDF
- Comparação entre períodos

---

### 12. Configurações (`/app/configuracoes`)

**Objetivo:** Gerenciamento de conta, equipe, integrações e plano.

**Abas:**
1. **Clínica** — nome, slug, cidade, telefone, horário, logo
2. **Usuários** — tabela de membros + convidar
3. **WhatsApp** — credenciais Z-API + conexão
4. **Integrações** — Z-API, Google Reviews, Google Calendar, Meta Ads, OpenAI, Stripe
5. **Planos** — Starter R$197, Pro R$397, Business R$797

**Funcionalidades:** Todos os campos e botões são visuais sem ação real.

**Dependências futuras:**
- Salvar configurações no Supabase
- Conexão real com Z-API
- Integração Stripe para upgrade de plano
- Sistema de convite por email
- Gerenciamento de permissões por role

---

### 13. Portal do Paciente (`/p/:token`)

**Objetivo:** Portal público acessado pelo paciente via link único tokenizado. Permite acompanhar tratamento, pagamentos e deixar avaliação.

**Componentes:**
- Progresso do tratamento (stepper 7 etapas)
- Próxima consulta (data, hora, sala, dentista)
- `BillingCard` — cobrança pendente com mensagem humanizada por tom da clínica
- `BillingHistory` — histórico de cobranças por canal
- Timeline de eventos
- `ReviewCard` — formulário de avaliação com estrelas + texto
- Documentos para download

**Funcionalidades:**
- `billingMessage()` — gera mensagem humanizada por status e tom da clínica (acolhedora/institucional/descontraída)
- `ReviewCard` com estado local (envia e exibe confirmação)
- Fallback automático para dados demo em qualquer token

**Dependências futuras:**
- Geração real de tokens únicos por paciente
- Integração com dados reais do Supabase
- Download real de documentos
- Envio de avaliação para Google Business
- Pagamento via Stripe/Asaas no portal
