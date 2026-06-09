---
title: Verticais de Mercado — DrFlux
type: market-strategy
last_updated: 2026-06-09
status: v1
---

# DrFlux — Mapa de Verticais

> O núcleo do produto é o mesmo em todas as verticais: garantir que nenhum paciente fique pelo caminho. O que muda é o vocabulário, os gatilhos de automação e as integrações específicas de cada nicho.

---

## Fase 1 — Odontologia (2026)

**Status:** Em validação. Produto ativo como DentalFlux → renomear para DrFlux Odonto.

### Dores principais
- Lead chegou no fim de semana, clínica não respondeu
- Paciente pediu orçamento de implante e sumiu após o preço
- Alta rotatividade de recepcionistas gera gaps de acompanhamento
- Pacientes que faltaram nunca são reagendados ativamente
- Cobranças de tratamentos parcelados ficam sem follow-up
- Dentistas dependem de indicação e não têm processo de reativação de inativos

### Oportunidades
- Mercado de ~120.000 consultórios no Brasil (CFO 2024)
- Ticket médio alto: implantes (R$ 3.000–15.000), tratamentos longos
- LTV por paciente significativo — justifica custo de retenção
- Digitalização acelerada pós-pandemia: WhatsApp como canal principal
- Maioria dos consultórios tem 1–3 cadeiras e equipe enxuta — automação tem ROI imediato

### Adaptações necessárias (já implementadas ou em sprint)
- Importação de planilhas de sistemas odontológicos comuns (Clinicorp, Dental Office, iDental)
- Vocabulário: "consulta", "retorno", "orçamento", "plano de tratamento"
- Fluxos: confirmação de consulta, reativação de inativo, cobrança de parcela, solicitação de avaliação Google
- Integração WhatsApp (Z-API) para comunicação direta

---

## Fase 2 — Clínicas Médicas Ambulatoriais (2027 — Q1)

**Status:** Pesquisa de mercado.

### Perfil do cliente
Clínicas de especialidades (cardiologia, dermatologia, ortopedia, urologia, ginecologia) com atendimento particular e/ou convênio.

### Dores principais
- Volume alto de agendamentos com taxa de no-show elevada (15–30%)
- Pacientes com doenças crônicas que precisam de acompanhamento periódico e não retornam espontaneamente
- Conciliação entre particular e convênio: pacientes de convênio têm LTV baixo isoladamente, mas volume alto
- Cobranças de procedimentos fora do convênio ficam perdidas
- Gestão de encaminhamentos: paciente encaminhado por outro médico nunca fecha o ciclo

### Oportunidades
- Mercado ainda mais fragmentado que odontologia: clínicas menores, processos mais manuais
- Paciente crônico tem ciclo de vida muito longo — retenção tem valor enorme
- No-show é custo direto: cadeira vazia, médico ocioso
- Nicho sub-digitalizado: WhatsApp domina, sistemas são pesados e caros

### Adaptações necessárias
- Vocabulário: "consulta de retorno", "exame", "encaminhamento", "laudo"
- Fluxo de controle de retorno programado (consultar em 30/90/180 dias)
- Gestão de pré-consulta: preparo de exame, documentação necessária
- Integração com TISS/convênio para identificar atendimentos fora da rede

---

## Fase 3 — Estética (2027 — Q2/Q3)

**Status:** Mapeamento inicial.

### Perfil do cliente
Clínicas de estética médica (dermatologistas com procedimentos), clínicas de estética (depilação, tratamentos corporais, injetáveis), spas médicos.

### Dores principais
- Paciente fez 1 sessão de procedimento e não voltou para o pacote completo
- Sazonalidade extrema: verão e pré-verão geram pico, restante do ano é ocioso
- Alta sensibilidade a preço: paciente some quando vê concorrente mais barato
- Indicações informais não são rastreadas — perda de dados de origem
- Pacientes insatisfeitos não reclamam, apenas não voltam

### Oportunidades
- Pacotes de tratamento (10 sessões, 6 meses) criam ciclos de receita recorrente
- Potencial de upsell entre procedimentos altíssimo
- Sazonalidade previsível — campanhas de reativação podem ser programadas com antecedência
- Avaliações Google têm impacto direto em conversão: mais importante que qualquer outro nicho

### Adaptações necessárias
- Vocabulário: "sessão", "pacote", "protocolo", "procedimento"
- Fluxo de acompanhamento de pacote incompleto
- Campanha sazonal automática (ex: reativar inativos em agosto para verão)
- Gestão de indicações com rastreamento de origem

---

## Fase 4 — Fisioterapia (2027 — Q4)

**Status:** Identificada por demanda de mercado.

### Perfil do cliente
Clínicas de fisioterapia, esportiva e reabilitação. Profissionais autônomos com agenda própria.

### Dores principais
- Alta taxa de abandono no meio do tratamento (paciente melhorou 60% e parou)
- Protocolos longos (20–40 sessões) dependem de aderência do paciente
- Concorrência de plano de saúde: paciente muda para clínica credenciada quando consegue autorização
- Pacientes pós-cirúrgicos precisam de acompanhamento proativo — não buscam espontaneamente
- Sazonalidade de lesões esportivas: janeiro (academias) e pós-férias são picos

### Oportunidades
- Acompanhamento de evolução é diferencial — paciente que vê resultado continua
- Follow-up de abandono no meio do protocolo tem retorno alto
- Recorrência por lesões repetitivas: o mesmo paciente volta 2–3 vezes por ano

### Adaptações necessárias
- Vocabulário: "sessão", "protocolo", "alta", "reabilitação"
- Fluxo de acompanhamento de evolução entre sessões
- Alertas de risco de abandono (paciente faltou 2 sessões consecutivas)
- Reativação por sazonalidade (inverno: dores musculares; verão: lesões esportivas)

---

## Fase 5 — Psicologia (2028)

**Status:** Identificada. Requer atenção especial à LGPD e ao sigilo profissional.

### Perfil do cliente
Psicólogos e psicoterapeutas com atendimento particular. Consultórios individuais e pequenas clínicas.

### Dores principais
- Alta taxa de desistência nos primeiros meses de terapia (antes de resultados consolidados)
- Dificuldade de cobrar: relação terapêutica torna cobrança constrangedora
- Cancelamentos de última hora geram buraco na agenda sem reposição
- Sessões online exigem mais lembretes e confirmações que presencial
- Pacientes em lista de espera: não recebem comunicação enquanto aguardam

### Oportunidades
- Demanda por terapia em crescimento constante no Brasil
- Ticket fixo por sessão → previsibilidade de receita com baixo churn = alto LTV
- Cobrança automatizada reduz constrangimento na relação terapêutica
- Gestão de lista de espera com reativação automática quando vaga abre

### Adaptações necessárias
- Atenção máxima à LGPD: anonimização, controle granular de dados sensíveis
- Vocabulário neutro: "sessão", "consulta", nada que expõe diagnóstico
- Fluxo de cobrança discreto e não invasivo
- Gestão de cancelamentos com política de 24h integrada ao fluxo de comunicação
- **Nota:** esta vertical pode exigir termos de uso e DPA específicos para conformidade com CFP (Conselho Federal de Psicologia)

---

## Fase 6 — Veterinária (2028)

**Status:** Identificada. Mercado em crescimento acelerado.

### Perfil do cliente
Clínicas veterinárias de pequenos animais (cães e gatos) com foco em saúde preventiva e tratamentos.

### Dores principais
- Vacinação anual: 40–60% dos tutores não retornam espontaneamente para reforço
- Consultas de rotina abandonadas: tutor só volta quando animal está doente
- Tratamentos longos (dermatite, oncologia) com alto índice de abandono
- Cobranças de internação e cirurgia ficam abertas
- Tutores emocionalmente envolvidos: comunicação tem que ser mais cuidadosa

### Oportunidades
- Mercado pet no Brasil: R$ 60 bi/ano e crescendo 15% ao ano
- Retenção tem ROI enorme: tutor fidelizado gasta 3–5x mais por animal por ano
- Calendário vacinal é previsível — reativação pode ser totalmente programada
- Lembrete de vermifugação, antipulgas, consulta anual: receita recorrente automática

### Adaptações necessárias
- Vocabulário: "tutor", "paciente" (o animal), "consulta de rotina", "vacinação"
- Cadastro com dados do animal (espécie, raça, idade, histórico)
- Fluxo de calendário vacinal automatizado com lembretes programados por data de nascimento
- Comunicação emocional: tom mais próximo, mais afetivo do que nas outras verticais

---

## Matriz de Priorização

| Vertical | Tamanho de Mercado | Dor de Acompanhamento | Complexidade de Adaptação | Prioridade |
|---|---|---|---|---|
| Odontologia | ★★★★★ | ★★★★★ | ★ (atual) | **Fase 1** |
| Clínicas médicas | ★★★★★ | ★★★★ | ★★ | **Fase 2** |
| Estética | ★★★★ | ★★★★ | ★★ | **Fase 3** |
| Fisioterapia | ★★★ | ★★★★★ | ★★ | **Fase 4** |
| Psicologia | ★★★ | ★★★ | ★★★ (LGPD) | **Fase 5** |
| Veterinária | ★★★★ | ★★★★ | ★★★ | **Fase 6** |

---

*Última atualização: 2026-06-09 · Responsável: Produto DrFlux*
