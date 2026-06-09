# DentalFlux — MVP v1

Plataforma de **crescimento, relacionamento, recuperação e retenção** de pacientes odontológicos. NÃO é ERP, agenda ou prontuário. O protagonista é o **funil de conversão e o relacionamento** — a agenda é coadjuvante.

Promessa: *"Sua clínica não precisa de mais pacientes. Precisa parar de perder os que já chegam."*

## Direção visual (locked)

- **Tema claro obrigatório**, sem dark mode nesta fase
- Inspiração: **Attio + Linear + Stripe Dashboard** — denso mas respirável, bordas finas, divisores em vez de bordas pesadas, sombras quase imperceptíveis
- Tipografia: **Inter** (corpo) + **Inter Display** com tracking apertado para títulos e números tabulares nos KPIs
- Paleta:
  - Base: branco, off-white, cinzas frios (slate)
  - Acento: **azul-violeta** `oklch(0.58 0.18 270)` para CTAs, nav ativo, gráficos
  - Semânticas: verde (sucesso), âmbar (atenção), vermelho (crítico), azul (info) — usadas com parcimônia
- Radius médio (12–14px), micro-sparklines inline nos KPIs, tabelas tipo Linear
- **Não pode parecer**: hospitalar, clínico antigo, ERP legado, carregado, multicolorido

## Entregas

### 1. Landing (`/`) — pública, 9 seções

1. **Hero** — promessa + sub + CTA "Começar gratuitamente" + mockup do Dashboard
2. **Problema** — "Você investe em Ads e perde no WhatsApp" com 6 dores reais
3. **Como funciona** — 3 passos (Conecte / Acompanhe / Recupere)
4. **O Funil DentalFlux** — visualização das 8 etapas (Lead → Indicação)
5. **Benefícios** — grid de 6 cards (resposta rápida, follow-up automático, reativação, confirmação, avaliações, indicadores)
6. **Resultados** — estatísticas mock (% de pacientes recuperados, R$ recuperados, etc.)
7. **Depoimentos** — 3 cards mock de donos de clínica
8. **CTA final** — "Pare de perder pacientes hoje"
9. **Footer** — links institucionais

### 2. App — 9 telas internas

Layout compartilhado: **sidebar fixa estreita** + header com seletor de clínica e período. Sem auth real (botão "Entrar" da landing leva direto ao `/app`).

#### Dashboard (`/app`)

- 8 KPIs primários com sparkline e delta vs período anterior: leads recebidos, respondidos, agendados, confirmados, faltantes, recuperados, avaliações geradas, conversão geral
- 3 KPIs financeiros em destaque (cards maiores): **Receita potencial recuperada**, **Oportunidades abertas (R$)**, **Consultas salvas por confirmação automática**
- **Funil DentalFlux visual** (stepper horizontal com larguras proporcionais e taxas entre etapas)
- "Precisa de resposta agora" (conversas paradas há >X horas)
- "Próximas ações" (confirmar amanhã, follow-up de orçamento, reativar inativo)

#### Oportunidades (`/app/oportunidades`) — substitui Leads

Kanban com 7 colunas: Novo Contato → Contato Iniciado → Avaliação Agendada → Avaliação Confirmada → Compareceu → Tratamento Iniciado → Paciente Ativo. Card mostra origem, valor estimado, responsável, próxima ação, tempo na etapa. Toggle Kanban ↔ Tabela. Filtros por origem (Google Ads, Instagram, Meta Ads, Indicação, GMN), responsável, período.

#### Conversas (`/app/conversas`)

3 colunas estilo WhatsApp Web:

- Esquerda: lista com badges de não-lidas, status, última msg
- Centro: thread com bubbles, separadores de data, composer com templates rápidos
- Direita: contexto do paciente (etapa do funil, oportunidade vinculada, valor, próxima ação sugerida, tags, origem, histórico resumido)

#### Pacientes (`/app/pacientes`)

Tabela densa (Attio-like): nome, telefone, status, origem, última visita, próxima ação, LTV mock, tags. Filtros e busca. Click abre **drawer lateral** com perfil completo: timeline de interações, consultas, campanhas recebidas, avaliações dadas, tag de consentimento LGPD.

#### Campanhas (`/app/campanhas`)

4 tipos como cards de entrada (Reativação, Confirmação, Cobrança, Avaliação). Cada um lista campanhas ativas com métricas: enviadas, abertas, respondidas, conversão, engajamento. Botão "Nova campanha" abre modal (template + segmento + canal).

#### Avaliações (`/app/avaliacoes`)

KPIs: enviadas, recebidas, nota média Google, taxa de resposta. Lista de pacientes elegíveis (atendidos nos últimos 7d sem pedido). Feed de reviews recebidas com sentiment.

#### Relatórios (`/app/relatorios`) — painel executivo

- Conversão por etapa (funil com taxas)
- Origem dos pacientes (donut + tabela)
- Taxa de comparecimento (linha temporal)
- Pacientes recuperados (barras mensais + R$)
- Evolução mensal (multi-line: leads, agendados, atendidos, recuperados)

#### Configurações (`/app/configuracoes`)

Tabs: **Clínica** (dados, logo, horário), **Usuários** (lista com roles: Admin / Recepção / Dentista / Marketing), **WhatsApp** (placeholder "Conectar via Z-API"), **Integrações** (cards: Google Reviews, Google Calendar, Meta Ads, OpenAI, Stripe — todos "Conectar"), **Planos** (3 cards: Starter / Pro / Business com preços mock).

## Detalhes técnicos

- **Stack**: TanStack Start v1 + React 19 + Tailwind v4 + shadcn/ui + lucide-react (já configurado)
- **Rotas** (file-based em `src/routes/`):
  - `index.tsx` — landing (substitui o placeholder atual)
  - `app.tsx` — layout pathless com sidebar + header + `<Outlet />`
  - `app.index.tsx`, `app.oportunidades.tsx`, `app.conversas.tsx`, `app.pacientes.tsx`, `app.campanhas.tsx`, `app.avaliacoes.tsx`, `app.relatorios.tsx`, `app.configuracoes.tsx`
- Cada rota com `head()` específico em pt-BR (title + description + og)
- **Tokens** em `src/styles.css` via `@theme inline`: adiciono violet accent, semânticas, surfaces neutras frias
- **Mock data** centralizado em `src/lib/mock/` (oportunidades, pacientes, conversas, campanhas, avaliacoes, kpis) — estrutura com `clinicId` em tudo, pronto para virar queries Supabase com RLS
- **Sem TanStack Query / serverFns** nesta fase: tudo client-side com mocks
- **Gráficos**: recharts (já presente no shadcn) para sparklines, donut, barras, linhas
- **Sem auth, sem Supabase, sem integrações reais** — botões de integração mostram modal "Em breve"

## Fora de escopo (próxima fase)

- Lovable Cloud (Supabase): auth + multi-tenant via RLS + roles + tabelas reais
- Integrações reais: Z-API (WhatsApp), Google Reviews, Google Calendar, Meta Ads, OpenAI (sugestão de próxima ação / resumo de conversa), Stripe (assinaturas)
- Builder visual de campanhas com automações (gatilhos, delays, condicionais)
- Portal do paciente, módulo financeiro/cobrança, multi-clínica real
- Dark mode

## Próximo passo

Aprovar o plano e eu construo tudo. Após a primeira renderização, ajustamos densidade/paleta se quiser refinar antes de partir para Supabase.  
  
Adicionar módulo Financeiro & Cobranças.

O objetivo não é criar um ERP financeiro.

O objetivo é ajudar clínicas odontológicas a reduzir inadimplência através de lembretes automáticos e acompanhamento de pagamentos.

Criar tela:

Cobranças

Exibir:

- Pendentes

- Vencendo

- Atrasadas

- Recuperadas

KPIs:

- Valor pendente

- Valor recuperado

- Taxa de recuperação

- Cobranças enviadas

- Cobranças pagas

Adicionar automações futuras:

- lembrete preventivo

- lembrete de vencimento

- cobrança amigável

- cobrança reforçada

O foco é recuperação de receita e não gestão financeira completa.  
  
Adicionar módulo chamado:

Automações

Objetivo:

Centralizar todos os fluxos automáticos da clínica.

Categorias:

1. Confirmações

2. Reativações

3. Cobranças

4. Avaliações

5. Follow-up de orçamento

Cada automação deve exibir:

- gatilho

- quantidade enviada

- taxa de resposta

- taxa de conversão

- receita gerada

O foco é mostrar o impacto financeiro das automações.

DentalFlux não é apenas um CRM.

É uma plataforma de crescimento e recuperação de receita.

&nbsp;