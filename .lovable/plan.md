# Plano — DentalFlux V1.1 (revisado)

Adicionar 4 módulos ao MVP, mantendo dados mock e estética Linear/Attio.

---

## 1. Portal do Paciente (público, fora do `/app`)

**Rota:** `src/routes/p.$token.tsx` → `/p/:token`

Layout 1 coluna centralizada (max-w-2xl), light, sem sidebar.

Seções:
- Header com logo da clínica + nome do paciente
- **Status do tratamento**: etapa atual no funil (badge + barra de progresso 7 etapas), próxima consulta (data, dentista, sala)
- **Timeline** das últimas interações (mensagens, confirmações, consultas)
- **Pagamentos & cobranças** (novo):
  - Card destaque com **valor pendente**, **vencimento**, **status** (Em dia · A vencer · Vencido · Pago) em badge colorido
  - Mensagem humanizada, sem tom de cobrança agressiva (ex.: "Olá Marina, identificamos um valor em aberto. Estamos à disposição para ajustar a melhor forma de pagamento.")
  - Botão primário **"Ver formas de pagamento"** → abre Dialog mock (Pix, Cartão, Boleto, Parcelamento) com instruções fake
  - **Histórico de cobranças** (lista): data, canal (WhatsApp/Email/SMS), status (Enviada · Lida · Respondida · Paga · Falhou), valor, link "Ver mensagem"
- **Avalie sua experiência**: estrelas 1–5, textarea opcional, envio → estado de sucesso com CTA "Avaliar no Google" (mock)
- **Documentos & orçamentos** (lista mock)
- Footer LGPD

Mock em `src/lib/mock.ts`: `patientPortalTokens`, `portalBilling`, `billingHistory`, helper `getPortalData(token)`.

---

## 2. Central de Notificações & Atividade Recente

**Sino no header** (`AppShell`) → Popover com lista + link "Ver tudo".
**Rota nova:** `src/routes/app.atividade.tsx` → `/app/atividade` (item novo no sidebar, ícone `Bell`).

Filtros (chips): Todas · Respostas · Confirmações · Falhas · Avaliações · **Financeiro** · Sistema

Tipos de evento (com cor/ícone):
- Resposta recebida (azul)
- Confirmação de consulta (verde)
- Falha de follow-up (vermelho)
- Avaliação recebida (amarelo)
- **Cobrança enviada** (violeta, ícone `Send`)
- **Cobrança respondida** (azul, ícone `MessageSquare`)
- **Pagamento confirmado** (verde, ícone `CheckCircle2`)
- **Pagamento atrasado** (laranja, ícone `AlertTriangle`)
- **Falha no envio da cobrança** (vermelho, ícone `XCircle`)
- Sistema (cinza)

Lista densa estilo Linear: ícone, título, paciente, etapa/valor, timestamp relativo, ação inline ("Abrir conversa", "Reenviar cobrança", "Ver portal"). Agrupamento por dia. Badge de não-lidas no sino.

Mock: `activityFeed` com ~40 eventos incluindo financeiros em `src/lib/mock.ts`.

---

## 3. Ações Rápidas no Kanban de Oportunidades

Em cada card:
- Botão **"→"** hover-revealed para avançar etapa
- Menu `...` (DropdownMenu) com:
  - Registrar comparecimento (Dialog: data, observação)
  - Criar próxima ação (Dialog: tipo, data, responsável, nota)
  - Marcar como perdida (motivo)
  - Abrir conversa · Ver paciente

Toast (Sonner) em todas as ações. Estado local sem backend.

---

## 4. Onboarding Inicial

**Rota:** `src/routes/onboarding.tsx`. Gate via `localStorage["dentalflux:onboarded"]` no layout `app.tsx`.

Wizard 4 passos (Stepper + split layout):
1. **Clínica** — nome, CNPJ, endereço, especialidades, logo upload mock
2. **Responsáveis** — até 5 usuários (nome, email, papel)
3. **WhatsApp** — provedor (Z-API/Meta), instância, telefone, "Conectar" mock
4. **Pronto** — resumo + CTA "Entrar no Dashboard"

Persistência em `localStorage`.

---

## Arquivos a criar

- `src/routes/p.$token.tsx`
- `src/routes/app.atividade.tsx`
- `src/routes/onboarding.tsx`
- `src/components/app/notifications-popover.tsx`
- `src/components/app/opportunity-card-actions.tsx`
- `src/components/portal/billing-card.tsx`
- `src/components/portal/billing-history.tsx`
- `src/components/portal/payment-methods-dialog.tsx`
- `src/components/onboarding/stepper.tsx` + 4 step components

## Arquivos a editar

- `src/lib/mock.ts` — portal, billing, activity feed com eventos financeiros
- `src/components/app/app-shell.tsx` — sino + popover, item "Atividade" no sidebar
- `src/routes/app.tsx` — gate de onboarding
- `src/routes/app.oportunidades.tsx` — ações rápidas + Sonner

## Fora do escopo

Backend real, Stripe/gateway real, envio real ao Google, upload real de logo, push notifications.