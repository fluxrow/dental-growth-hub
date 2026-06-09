---
title: Product Vision V2 — DrFlux
type: product-strategy
last_updated: 2026-06-09
replaces: ProductVision.md (DentalFlux)
status: v2
---

# DrFlux — Visão do Produto V2

> Este documento substitui a visão original do DentalFlux.
> O produto evolui. A tese central permanece: nenhum paciente fica pelo caminho.

---

## O que somos

**DrFlux é uma plataforma de relacionamento, acompanhamento e recuperação de receita para clínicas.**

Nosso trabalho começa onde o agendamento termina.

Quando uma clínica agenda uma consulta, o sistema de gestão registra.
Quando o paciente confirma, o sistema anota.
Quando o paciente falta, some, para de pagar ou abandona o tratamento — ninguém faz nada.

É nesse espaço que o DrFlux opera.

**Garantimos que:**
- Leads que chegam recebem resposta no mesmo dia — mesmo no fim de semana
- Consultas agendadas recebem confirmação 24h antes
- Orçamentos sem resposta recebem follow-up em 48h
- Pacientes que faltaram são reagendados ativamente
- Cobranças em aberto recebem lembretes progressivos e gentis
- Pacientes inativos há 90+ dias recebem mensagem de reativação personalizada
- Tratamentos concluídos geram pedido de avaliação no Google automaticamente

---

## O que não somos

Esta distinção é crítica para o posicionamento do produto e para evitar confusão no mercado.

### Não somos ERP
ERP odontológico/médico cuida de gestão interna: faturamento, estoque, financeiro, fiscal.
DrFlux cuida do relacionamento externo: o paciente, a comunicação, o acompanhamento.
Coexistimos. Não competimos.

### Não somos prontuário eletrônico
Prontuário registra o histórico clínico do paciente.
DrFlux registra o histórico de relacionamento — mensagens, acompanhamentos, retornos, cobranças.
São camadas complementares.

### Não somos agenda
Agenda gerencia horários disponíveis.
DrFlux garante que os horários agendados sejam cumpridos — e que os perdidos sejam recuperados.

### Não somos chatbot
Chatbot genérico responde qualquer pessoa que fala com a clínica.
DrFlux age de forma contextual: identifica o paciente, seu histórico e sua situação, e escolhe a comunicação adequada.
Não é automação de resposta — é acompanhamento inteligente.

### Não somos plataforma de marketing
Marketing traz pacientes novos.
DrFlux retém e recupera os que já existem.
São investimentos diferentes, com ROI diferente.

---

## Por que existimos

A maioria das ferramentas de software para clínicas foi construída para registrar o passado.

O prontuário registra o que foi feito.
A agenda registra o que foi agendado.
O financeiro registra o que foi cobrado.

Nenhum deles garante o que precisa acontecer amanhã.

O DrFlux foi construído com uma premissa diferente:
**o maior risco de uma clínica não é falta de paciente novo — é perder o paciente que já chegou.**

Um paciente perdido por falta de acompanhamento representa:
- O custo de marketing para trazê-lo (já gasto)
- O valor do tratamento que não foi concluído
- O LTV futuro de todos os retornos que não acontecerão
- A avaliação positiva que nunca foi escrita
- A indicação que nunca foi feita

Multiplicado por centenas de pacientes ao longo do ano, isso representa dezenas a centenas de milhares de reais em receita invisível — dinheiro que a clínica nunca vê porque não existe ferramenta para mostrá-lo.

**DrFlux torna esse buraco visível. E o fecha.**

---

## Princípios do produto

### 1. Ação antes de dashboard
O produto não entrega relatórios — entrega listas de ação.
"Ligue para esses 12 hoje" é mais valioso que "você tem 247 inativos".
Diagnóstico existe para embasar ação, não para ser admirado.

### 2. Adoção em minutos, não em meses
A clínica não pode ter meses de onboarding.
O produto precisa mostrar valor na primeira semana.
Padrão: import de planilha → diagnóstico → primeiros fluxos ativos em menos de 30 minutos.

### 3. Comunicação contextual, não spam
Cada mensagem enviada pelo DrFlux deve fazer sentido para aquele paciente específico.
O paciente que faltou ontem recebe mensagem diferente do que sumiu há 6 meses.
A cobrança de R$ 200 tem tom diferente da cobrança de R$ 8.000.
Contexto é tudo.

### 4. O usuário controla, o sistema executa
DrFlux não age sem supervisão humana no início.
O dentista ou gestor define as regras — quem contactar, quando, com qual tom.
O sistema executa e reporta.
Com o tempo, confiança se constrói e autonomia aumenta.

### 5. Resultado em linguagem de resultado
Nunca comunicamos features.
Comunicamos: "Você recuperou R$ 12.400 esse mês em pacientes inativos."
"23 consultas foram confirmadas que provavelmente faltariam."
O produto é invisível. O resultado é o protagonista.

---

## Jornada do produto por versão

### V1 — DentalFlux (sprint 01–02)
- Diagnóstico financeiro
- Revenue Leak Engine
- Importação de planilha (Migration Engine)
- Dashboard com KPIs

### V2 — DrFlux Odonto (sprint 03–05)
- WhatsApp como canal de comunicação (Z-API)
- Campanhas de reativação automáticas
- Gestão de cobranças com lembretes
- Confirmação de consultas automática
- Solicitação de avaliação Google

### V3 — DrFlux Multi-vertical (2027)
- Adaptações de vocabulário por nicho
- Templates de comunicação por vertical
- Integrações com sistemas de cada vertical
- Onboarding diferenciado por tipo de clínica

### V4 — DrFlux Platform (2028)
- Multi-tenant para grupos e redes de clínicas
- API aberta
- Marketplace de integrações
- Inteligência preditiva (score de churn, LTV prediction)

---

## Métricas que definem sucesso

O produto é bem-sucedido quando:

| Métrica | Definição | Meta |
|---|---|---|
| Pacientes contactados | Nº de pacientes que receberam acompanhamento ativo via DrFlux no mês | +100 por clínica/mês |
| Taxa de retorno | % de inativos contatados que voltaram a agendar | >15% |
| Taxa de confirmação | % de consultas confirmadas antes de faltar | >80% |
| Cobranças recuperadas | Valor total recuperado de cobranças em aberto | >30% do total |
| Tempo para primeiro resultado | Dias entre cadastro e primeiro paciente recuperado | <7 dias |
| NPS do dentista | Satisfação geral com o produto | >50 |

---

## O que o sucesso parece para o cliente

> *"Antes do DrFlux, eu tinha uma planilha que ninguém olhava. Hoje eu sei, toda segunda-feira, quem ligar, quem cobrar e quem está pronto para voltar. Na primeira semana, recuperei 3 pacientes que estavam sumidos há mais de 4 meses. Não fiz tráfego. Não criei nada. Só entrei em contato."*

---

*Última atualização: 2026-06-09 · Responsável: Produto DrFlux*
