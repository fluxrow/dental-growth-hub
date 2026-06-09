---
title: Roadmap de Expansão — DrFlux
type: strategic-planning
last_updated: 2026-06-09
status: v1
---

# DrFlux — Roadmap de Expansão

---

## Horizonte 2026 — Odontologia

**Objetivo:** Validar o modelo de negócio e atingir product-market fit em odontologia.

### Metas de produto
- [ ] Renomear DentalFlux → DrFlux Odonto (identidade visual + domínio)
- [ ] Core: importação de planilha + diagnóstico + Revenue Leak Engine
- [ ] Sprint 03: automação de follow-up via WhatsApp (Z-API)
- [ ] Sprint 04: campanhas de reativação de inativos
- [ ] Sprint 05: gestão de cobranças com lembretes automáticos
- [ ] Sprint 06: solicitação automática de avaliações Google pós-consulta
- [ ] Integração nativa com Clinicorp (exportação direta)

### Metas de negócio
- Atingir 50 clínicas ativas pagantes (MRR: R$ 50.000+)
- NPS > 50 com clínicas ativas
- 3 casos de estudo documentados com ROI mensurável
- Churn mensal < 5%
- Playbook de vendas validado com ciclo de < 14 dias

### Prioridades de mercado
- Foco geográfico: SP (capital) + cidades do interior com >100k habitantes
- Perfil: dentista dono de clínica, 1–3 cadeiras, usa WhatsApp como canal principal
- Canal de aquisição: tráfego pago (Meta + Google) + indicação entre dentistas

### Riscos 2026
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Churn alto antes de ver resultado | Alta | Alto | Onboarding guiado + diagnóstico na primeira semana |
| Clínica não tem planilha organizada | Média | Médio | Wizard de importação tolerante a dados sujos |
| Resistência a pagar por acompanhamento | Média | Alto | Demo com dados reais + período gratuito de 14 dias |
| Concorrente incumbente copia feature | Baixa | Médio | Velocidade de execução + comunidade de early adopters |

---

## Horizonte 2027 — Saúde Ambulatorial

**Objetivo:** Expandir para clínicas médicas mantendo o mesmo núcleo de produto.

### Premissas de expansão
- Odontologia com PMF validado (>50 clínicas, churn < 5%)
- Produto core estável com time de CS dedicado
- Documentação de playbook por vertical pronta

### Fases de entrada na saúde ambulatorial

**Q1 2027 — Pesquisa e adaptação**
- Entrevistar 30+ gestores de clínicas médicas
- Mapear vocabulário, fluxos e diferenças críticas vs. odontologia
- Adaptar templates de comunicação para o nicho

**Q2 2027 — Beta fechado**
- 10 clínicas piloto (cardiologia, dermatologia, ortopedia)
- Acompanhamento semanal, feedback direto
- Ajustes de produto baseados em uso real

**Q3 2027 — Lançamento DrFlux Saúde**
- Vertical com landing page e posicionamento independente
- Time de CS especializado no nicho
- Campanha de tráfego com criativo específico para clínica médica

**Q4 2027 — Escala**
- Meta: 30 clínicas médicas ativas
- Parceria com associações médicas regionais

### Riscos 2027
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade regulatória (CFM) | Média | Alto | Consultoria jurídica especializada em saúde digital |
| Fluxos de convênio são complexos demais | Alta | Médio | Fase 1 focada em particular; convênio como fase 2 |
| Custo de CS por cliente é alto | Média | Médio | Automatizar onboarding; base de conhecimento vertical |
| Odontologia ainda precisa de atenção | Alta | Alto | Time de produto separado por vertical |

---

## Horizonte 2028 — Ecossistema Completo

**Objetivo:** DrFlux como plataforma padrão de relacionamento com pacientes para clínicas de saúde no Brasil.

### Visão do produto em 2028

```
DrFlux Platform
│
├── Relacionamento      → follow-up, confirmação, reativação, cobrança
├── Diagnóstico         → health score, revenue leak, ações recomendadas
├── Automação           → WhatsApp, email, SMS por gatilho e contexto
├── Inteligência        → predição de churn, score de reativação, LTV
├── Marketplace         → integrações com sistemas de gestão por vertical
└── Verticais           → Odonto, Saúde, Estética, Fisio, Psico, Vet
```

### Iniciativas 2028

**Plataforma multi-vertical**
- Dashboard unificado para grupos de clínicas (redes e franquias)
- White-label para franqueadoras de saúde
- API aberta para integração com sistemas de gestão verticais

**Inteligência preditiva**
- Score de risco de abandono por paciente
- Melhor momento de envio por perfil de paciente
- Predição de valor de tratamento por histórico

**Comunidade e rede**
- Rede de dentistas e médicos referenciando DrFlux (programa de indicação)
- Comunidade de gestores de clínicas: benchmarks, melhores práticas
- Certificação DrFlux para gestores de clínicas

**Expansão geográfica**
- Portugal (mercado lusófono, regulação mais próxima)
- América Latina (México, Colômbia, Argentina — espanhol + adaptação regulatória)

### Metas 2028
- 1.000 clínicas ativas em todas as verticais
- MRR: R$ 1.500.000+
- Presença em 3 verticais com PMF validado
- Série A em andamento ou concluída

### Riscos 2028
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Concorrente bem-capitalizado entra no nicho | Alta | Alto | Dados proprietários + comunidade + velocidade |
| Custo de infraestrutura escala mais rápido que receita | Média | Alto | Arquitetura multi-tenant eficiente desde Fase 1 |
| Regulação de IA em saúde restringe automações | Baixa | Alto | Manter humano no loop; automação assistida, não autônoma |
| Churn em expansão geográfica | Média | Médio | Validar PMF antes de escalar geo |

---

## Princípios de Expansão

1. **PMF antes de expansão.** Não entrar em nova vertical sem NPS > 40 na anterior.
2. **Mesmo núcleo, vocabulário diferente.** O produto não muda — a comunicação e os templates mudam.
3. **CS define produto.** As primeiras clínicas de cada vertical são acompanhadas semanalmente. O feedback vira roadmap.
4. **Receita antes de investimento.** Cada vertical precisa ser autossustentável antes de escalar.
5. **O paciente é sempre o protagonista.** Em qualquer vertical, o benefício comunicado é sempre para o paciente — não para a tecnologia.

---

*Última atualização: 2026-06-09 · Responsável: Strategy DrFlux*
