// Mock data realista para DentalFlux MVP. Estrutura preparada para Supabase.
// Toda entidade carrega clinicId (multi-tenant ready).

export const CLINIC = {
  id: "cli_01",
  name: "Clínica Sorriso Pleno",
  slug: "sorriso-pleno",
  city: "São Paulo, SP",
};

export const USER = {
  id: "usr_01",
  name: "Dra. Marina Lopes",
  email: "marina@sorrisopleno.com.br",
  role: "Admin",
};

// ─── KPIs ──────────────────────────────────────────────────────────────────
export type Kpi = {
  key: string;
  label: string;
  value: string;
  delta: number; // %
  spark: number[];
  tone?: "primary" | "success" | "warning" | "danger" | "info";
};

export const KPIS: Kpi[] = [
  { key: "leads",    label: "Leads recebidos",        value: "248", delta: 12.4, spark: [18,22,19,26,24,31,28,35,33,38,42,40] },
  { key: "resp",     label: "Leads respondidos",      value: "231", delta: 18.1, spark: [16,20,18,24,23,29,28,33,32,36,40,39] },
  { key: "ag",       label: "Pacientes agendados",    value: "164", delta: 9.2,  spark: [12,14,13,17,16,20,19,23,22,25,28,27] },
  { key: "conf",     label: "Confirmados",            value: "141", delta: 14.0, spark: [10,12,12,15,14,18,17,21,21,23,26,26] },
  { key: "falt",     label: "Faltas",                 value: "12",  delta: -22.0, spark: [6,5,7,5,4,5,4,3,4,3,3,2], tone: "warning" },
  { key: "recup",    label: "Pacientes recuperados",  value: "37",  delta: 41.0, spark: [2,3,4,3,5,4,6,5,7,6,8,9], tone: "success" },
  { key: "aval",     label: "Avaliações geradas",     value: "58",  delta: 22.0, spark: [3,4,5,4,5,6,5,7,6,8,7,9] },
  { key: "conv",     label: "Conversão do funil",     value: "21.4%", delta: 3.6, spark: [16,17,17,18,18,19,19,20,20,20,21,21] },
];

export const FINANCIAL_KPIS: Kpi[] = [
  { key: "recovered",  label: "Receita potencial recuperada",        value: "R$ 86.420", delta: 28.4, spark: [12,18,22,28,32,38,42,52,58,66,72,86], tone: "success" },
  { key: "open",       label: "Oportunidades abertas",               value: "R$ 314.800", delta: 11.2, spark: [200,220,240,260,255,270,280,290,295,305,310,314], tone: "primary" },
  { key: "saved",      label: "Consultas salvas por confirmação",    value: "47", delta: 38.0, spark: [2,3,4,5,5,6,5,7,8,7,9,10], tone: "info" },
];

// ─── Funil DentalFlux ──────────────────────────────────────────────────────
export const FUNNEL = [
  { stage: "Lead",                   count: 248 },
  { stage: "Primeiro Contato",       count: 231 },
  { stage: "Agendamento",            count: 164 },
  { stage: "Comparecimento",         count: 141 },
  { stage: "Tratamento",             count: 98 },
  { stage: "Retorno",                count: 64 },
  { stage: "Avaliação",              count: 53 },
  { stage: "Indicação",              count: 21 },
];

// ─── Oportunidades (Kanban) ────────────────────────────────────────────────
export type OppStage =
  | "novo"
  | "contato"
  | "agendada"
  | "confirmada"
  | "compareceu"
  | "tratamento"
  | "ativo";

export const OPP_STAGES: { id: OppStage; label: string; tone: string }[] = [
  { id: "novo",        label: "Novo Contato",          tone: "bg-chart-2/10 text-chart-2" },
  { id: "contato",     label: "Contato Iniciado",      tone: "bg-info/10 text-info" },
  { id: "agendada",    label: "Avaliação Agendada",    tone: "bg-primary/10 text-primary" },
  { id: "confirmada",  label: "Avaliação Confirmada",  tone: "bg-accent text-accent-foreground" },
  { id: "compareceu",  label: "Compareceu",            tone: "bg-warning/15 text-warning-foreground" },
  { id: "tratamento",  label: "Tratamento Iniciado",   tone: "bg-chart-3/15 text-chart-3" },
  { id: "ativo",       label: "Paciente Ativo",        tone: "bg-success/10 text-success" },
];

export type Opportunity = {
  id: string;
  name: string;
  stage: OppStage;
  source: "Google Ads" | "Instagram" | "Meta Ads" | "Indicação" | "Google Meu Negócio" | "Site";
  value: number;
  owner: string;
  nextAction: string;
  daysInStage: number;
  phone: string;
};

export const OPPORTUNITIES: Opportunity[] = [
  { id: "op1",  name: "Carolina Ribeiro",  stage: "novo",       source: "Google Ads",         value: 4200, owner: "Bia (recepção)",    nextAction: "Responder WhatsApp", daysInStage: 0, phone: "+55 11 98432-1098" },
  { id: "op2",  name: "Pedro Henrique Sá", stage: "novo",       source: "Instagram",          value: 1800, owner: "Bia (recepção)",    nextAction: "Enviar tabela",      daysInStage: 1, phone: "+55 11 99213-7765" },
  { id: "op3",  name: "Larissa Monteiro",  stage: "novo",       source: "Indicação",          value: 9500, owner: "Marina",            nextAction: "Ligar",              daysInStage: 0, phone: "+55 11 99877-2310" },
  { id: "op4",  name: "Rafael Almeida",    stage: "contato",    source: "Meta Ads",           value: 3200, owner: "Bia (recepção)",    nextAction: "Agendar avaliação",  daysInStage: 1, phone: "+55 11 98112-4456" },
  { id: "op5",  name: "Juliana Castro",    stage: "contato",    source: "Google Meu Negócio", value: 2400, owner: "Bia (recepção)",    nextAction: "Confirmar interesse",daysInStage: 2, phone: "+55 11 97554-3322" },
  { id: "op6",  name: "Bruno Carvalho",    stage: "agendada",   source: "Google Ads",         value: 5600, owner: "Marina",            nextAction: "Confirmar amanhã",   daysInStage: 0, phone: "+55 11 98443-1209" },
  { id: "op7",  name: "Amanda Faria",      stage: "agendada",   source: "Instagram",          value: 3100, owner: "Bia (recepção)",    nextAction: "Enviar lembrete",    daysInStage: 1, phone: "+55 11 99001-7788" },
  { id: "op8",  name: "Thiago Mendes",     stage: "confirmada", source: "Site",               value: 7800, owner: "Marina",            nextAction: "Preparar prontuário",daysInStage: 0, phone: "+55 11 98775-4423" },
  { id: "op9",  name: "Patrícia Lima",     stage: "confirmada", source: "Indicação",          value: 12400,owner: "Marina",            nextAction: "Enviar orientações", daysInStage: 1, phone: "+55 11 97223-9981" },
  { id: "op10", name: "Eduardo Tavares",   stage: "compareceu", source: "Google Ads",         value: 4800, owner: "Marina",            nextAction: "Enviar orçamento",   daysInStage: 0, phone: "+55 11 98123-3344" },
  { id: "op11", name: "Sofia Cardoso",     stage: "compareceu", source: "Meta Ads",           value: 6200, owner: "Marina",            nextAction: "Follow-up orçamento",daysInStage: 2, phone: "+55 11 98998-0012" },
  { id: "op12", name: "Marcelo Pinto",     stage: "tratamento", source: "Indicação",          value: 18900,owner: "Marina",            nextAction: "Agendar próxima sessão", daysInStage: 3, phone: "+55 11 97665-1144" },
  { id: "op13", name: "Camila Vasconcelos",stage: "tratamento", source: "Google Ads",         value: 8400, owner: "Marina",            nextAction: "Confirmar próxima",  daysInStage: 5, phone: "+55 11 98223-7755" },
  { id: "op14", name: "Renato Siqueira",   stage: "ativo",      source: "Indicação",          value: 22000,owner: "Marina",            nextAction: "Pedir avaliação",    daysInStage: 14, phone: "+55 11 99443-2211" },
  { id: "op15", name: "Beatriz Nogueira",  stage: "ativo",      source: "Site",               value: 4200, owner: "Marina",            nextAction: "Manutenção semestral", daysInStage: 22, phone: "+55 11 98554-9988" },
];

// ─── Conversas ─────────────────────────────────────────────────────────────
export type ConvStatus = "novo" | "aguardando" | "agendado" | "ativo";

export type Message = {
  id: string;
  from: "patient" | "clinic";
  text: string;
  time: string; // "14:32"
};

export type Conversation = {
  id: string;
  patientName: string;
  phone: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  status: ConvStatus;
  source: Opportunity["source"];
  stage: OppStage;
  estValue: number;
  tags: string[];
  nextAction: string;
  messages: Message[];
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    patientName: "Carolina Ribeiro",
    phone: "+55 11 98432-1098",
    lastMessage: "Oi! Vi o anúncio sobre clareamento, vocês fazem?",
    lastTime: "agora",
    unread: 2,
    status: "novo",
    source: "Google Ads",
    stage: "novo",
    estValue: 4200,
    tags: ["clareamento", "primeira-vez"],
    nextAction: "Responder em até 5 min",
    messages: [
      { id: "m1", from: "patient", text: "Oi! Vi o anúncio sobre clareamento, vocês fazem?", time: "14:30" },
      { id: "m2", from: "patient", text: "Quanto custa?", time: "14:31" },
    ],
  },
  {
    id: "c2",
    patientName: "Bruno Carvalho",
    phone: "+55 11 98443-1209",
    lastMessage: "Posso confirmar para amanhã às 10h?",
    lastTime: "12 min",
    unread: 1,
    status: "aguardando",
    source: "Google Ads",
    stage: "agendada",
    estValue: 5600,
    tags: ["implante"],
    nextAction: "Confirmar agendamento",
    messages: [
      { id: "m1", from: "clinic",  text: "Olá Bruno! Confirmando sua avaliação amanhã (10/06) às 10h.", time: "11:00" },
      { id: "m2", from: "patient", text: "Posso confirmar para amanhã às 10h?", time: "11:14" },
    ],
  },
  {
    id: "c3",
    patientName: "Patrícia Lima",
    phone: "+55 11 97223-9981",
    lastMessage: "Perfeito, obrigada! Até amanhã 🙏",
    lastTime: "1 h",
    unread: 0,
    status: "agendado",
    source: "Indicação",
    stage: "confirmada",
    estValue: 12400,
    tags: ["ortodontia", "alta-receita"],
    nextAction: "Enviar orientações pré-consulta",
    messages: [
      { id: "m1", from: "clinic",  text: "Olá Patrícia, confirmando sua consulta amanhã às 15h.", time: "10:30" },
      { id: "m2", from: "patient", text: "Perfeito, obrigada! Até amanhã 🙏", time: "10:34" },
    ],
  },
  {
    id: "c4",
    patientName: "Sofia Cardoso",
    phone: "+55 11 98998-0012",
    lastMessage: "Vou pensar e te aviso até sexta.",
    lastTime: "3 h",
    unread: 0,
    status: "aguardando",
    source: "Meta Ads",
    stage: "compareceu",
    estValue: 6200,
    tags: ["restauração", "orçamento"],
    nextAction: "Follow-up de orçamento (sexta)",
    messages: [
      { id: "m1", from: "clinic",  text: "Oi Sofia! Segue o orçamento conforme conversamos. Qualquer dúvida me chame.", time: "10:00" },
      { id: "m2", from: "patient", text: "Vou pensar e te aviso até sexta.", time: "11:32" },
    ],
  },
  {
    id: "c5",
    patientName: "Eduardo Tavares",
    phone: "+55 11 98123-3344",
    lastMessage: "Recebi sim, obrigado!",
    lastTime: "ontem",
    unread: 0,
    status: "ativo",
    source: "Google Ads",
    stage: "compareceu",
    estValue: 4800,
    tags: ["limpeza"],
    nextAction: "Pedir avaliação no Google",
    messages: [
      { id: "m1", from: "clinic",  text: "Eduardo, foi um prazer te atender! Como foi sua experiência?", time: "18:00" },
      { id: "m2", from: "patient", text: "Recebi sim, obrigado!", time: "18:12" },
    ],
  },
  {
    id: "c6",
    patientName: "Renato Siqueira",
    phone: "+55 11 99443-2211",
    lastMessage: "Pode marcar dia 20 sim 👍",
    lastTime: "ontem",
    unread: 0,
    status: "ativo",
    source: "Indicação",
    stage: "ativo",
    estValue: 22000,
    tags: ["paciente-ouro", "ortodontia"],
    nextAction: "Confirmar manutenção dia 20",
    messages: [
      { id: "m1", from: "clinic",  text: "Renato, podemos marcar sua manutenção dia 20/06?", time: "16:40" },
      { id: "m2", from: "patient", text: "Pode marcar dia 20 sim 👍", time: "17:02" },
    ],
  },
];

// ─── Pacientes ─────────────────────────────────────────────────────────────
export type Patient = {
  id: string;
  name: string;
  phone: string;
  status: "ativo" | "tratamento" | "inativo" | "recuperado";
  source: Opportunity["source"];
  lastVisit: string;
  nextAction: string;
  ltv: number;
  tags: string[];
  consent: boolean;
};

export const PATIENTS: Patient[] = [
  { id: "p1",  name: "Renato Siqueira",     phone: "+55 11 99443-2211", status: "ativo",      source: "Indicação",          lastVisit: "12/05/2026", nextAction: "Manutenção 20/06",  ltv: 22000, tags: ["paciente-ouro","ortodontia"], consent: true },
  { id: "p2",  name: "Beatriz Nogueira",    phone: "+55 11 98554-9988", status: "ativo",      source: "Site",               lastVisit: "28/04/2026", nextAction: "Limpeza semestral", ltv: 4200,  tags: ["limpeza"], consent: true },
  { id: "p3",  name: "Marcelo Pinto",       phone: "+55 11 97665-1144", status: "tratamento", source: "Indicação",          lastVisit: "01/06/2026", nextAction: "Próxima sessão 18/06", ltv: 18900, tags: ["implante"], consent: true },
  { id: "p4",  name: "Camila Vasconcelos",  phone: "+55 11 98223-7755", status: "tratamento", source: "Google Ads",         lastVisit: "30/05/2026", nextAction: "Continuar tratamento", ltv: 8400,  tags: ["clareamento"], consent: true },
  { id: "p5",  name: "Eduardo Tavares",     phone: "+55 11 98123-3344", status: "recuperado", source: "Google Ads",         lastVisit: "05/06/2026", nextAction: "Pedir avaliação",   ltv: 4800,  tags: ["limpeza"], consent: true },
  { id: "p6",  name: "Sofia Cardoso",       phone: "+55 11 98998-0012", status: "tratamento", source: "Meta Ads",           lastVisit: "03/06/2026", nextAction: "Follow-up orçamento", ltv: 6200,  tags: ["restauração"], consent: true },
  { id: "p7",  name: "Patrícia Lima",       phone: "+55 11 97223-9981", status: "ativo",      source: "Indicação",          lastVisit: "—",          nextAction: "Avaliação amanhã",  ltv: 12400, tags: ["ortodontia"], consent: true },
  { id: "p8",  name: "Helena Marques",      phone: "+55 11 98345-1122", status: "inativo",    source: "Google Ads",         lastVisit: "14/11/2025", nextAction: "Campanha reativação", ltv: 3200, tags: ["inativo-6m"], consent: true },
  { id: "p9",  name: "Lucas Borges",        phone: "+55 11 99765-4321", status: "inativo",    source: "Instagram",          lastVisit: "22/09/2025", nextAction: "Campanha reativação", ltv: 5600, tags: ["inativo-9m"], consent: false },
  { id: "p10", name: "Vinícius Andrade",    phone: "+55 11 98876-5544", status: "ativo",      source: "Indicação",          lastVisit: "20/05/2026", nextAction: "—",                 ltv: 9800,  tags: [], consent: true },
  { id: "p11", name: "Fernanda Rocha",      phone: "+55 11 97334-2211", status: "recuperado", source: "Google Ads",         lastVisit: "02/06/2026", nextAction: "Pedir avaliação",   ltv: 5200,  tags: [], consent: true },
  { id: "p12", name: "Roberto Cunha",       phone: "+55 11 98112-9087", status: "inativo",    source: "Google Meu Negócio", lastVisit: "10/08/2025", nextAction: "Campanha reativação", ltv: 7400, tags: ["inativo-10m"], consent: true },
];

// ─── Campanhas ─────────────────────────────────────────────────────────────
export type CampaignType = "reativacao" | "confirmacao" | "cobranca" | "avaliacao";

export type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  status: "ativa" | "pausada" | "rascunho";
  sent: number;
  opened: number;
  responded: number;
  converted: number;
  revenue: number;
};

export const CAMPAIGNS: Campaign[] = [
  { id: "cp1", name: "Reativar inativos 6+ meses",   type: "reativacao",  status: "ativa",    sent: 142, opened: 118, responded: 41, converted: 17, revenue: 38400 },
  { id: "cp2", name: "Confirmação 24h antes",        type: "confirmacao", status: "ativa",    sent: 87,  opened: 84,  responded: 79, converted: 76, revenue: 0 },
  { id: "cp3", name: "Cobrança amigável D+3",        type: "cobranca",    status: "ativa",    sent: 23,  opened: 22,  responded: 14, converted: 11, revenue: 18900 },
  { id: "cp4", name: "Pedido de avaliação Google",   type: "avaliacao",   status: "ativa",    sent: 64,  opened: 59,  responded: 38, converted: 28, revenue: 0 },
  { id: "cp5", name: "Reativar pacientes ortodontia",type: "reativacao",  status: "pausada",  sent: 56,  opened: 41,  responded: 12, converted: 4,  revenue: 22400 },
  { id: "cp6", name: "Follow-up orçamento 7 dias",   type: "confirmacao", status: "ativa",    sent: 38,  opened: 33,  responded: 19, converted: 9,  revenue: 27200 },
];

// ─── Automações ────────────────────────────────────────────────────────────
export type AutomationCategory = "confirmacao" | "reativacao" | "cobranca" | "avaliacao" | "follow-up";

export type Automation = {
  id: string;
  name: string;
  category: AutomationCategory;
  trigger: string;
  status: "ativa" | "pausada";
  sent: number;
  responseRate: number;
  conversion: number;
  revenue: number;
};

export const AUTOMATIONS: Automation[] = [
  { id: "a1", name: "Confirmação 24h antes",          category: "confirmacao", trigger: "24h antes da consulta",             status: "ativa", sent: 412, responseRate: 91, conversion: 87, revenue: 0 },
  { id: "a2", name: "Confirmação 2h antes",           category: "confirmacao", trigger: "2h antes da consulta",              status: "ativa", sent: 387, responseRate: 64, conversion: 58, revenue: 0 },
  { id: "a3", name: "Reativar 6+ meses sem visita",   category: "reativacao",  trigger: "Última visita > 180 dias",          status: "ativa", sent: 142, responseRate: 29, conversion: 12, revenue: 38400 },
  { id: "a4", name: "Reativar 12+ meses",             category: "reativacao",  trigger: "Última visita > 365 dias",          status: "ativa", sent: 64,  responseRate: 18, conversion: 6,  revenue: 14200 },
  { id: "a5", name: "Cobrança preventiva D-3",        category: "cobranca",    trigger: "3 dias antes do vencimento",        status: "ativa", sent: 78,  responseRate: 41, conversion: 31, revenue: 22400 },
  { id: "a6", name: "Cobrança amigável D+3",          category: "cobranca",    trigger: "3 dias após vencimento",            status: "ativa", sent: 32,  responseRate: 56, conversion: 19, revenue: 18900 },
  { id: "a7", name: "Pedido de avaliação Google",     category: "avaliacao",   trigger: "24h após consulta concluída",       status: "ativa", sent: 96,  responseRate: 59, conversion: 47, revenue: 0 },
  { id: "a8", name: "Follow-up de orçamento — 3 dias",category: "follow-up",   trigger: "3 dias após envio do orçamento",    status: "ativa", sent: 54,  responseRate: 44, conversion: 18, revenue: 42600 },
  { id: "a9", name: "Follow-up de orçamento — 7 dias",category: "follow-up",   trigger: "7 dias após envio do orçamento",    status: "ativa", sent: 38,  responseRate: 32, conversion: 9,  revenue: 27200 },
  { id: "a10",name: "Aniversário do paciente",        category: "follow-up",   trigger: "No dia do aniversário",             status: "pausada", sent: 21, responseRate: 38, conversion: 4,  revenue: 3200 },
];

// ─── Cobranças ─────────────────────────────────────────────────────────────
export type ChargeStatus = "pendente" | "vencendo" | "atrasada" | "recuperada" | "paga";

export type Charge = {
  id: string;
  patient: string;
  description: string;
  value: number;
  dueDate: string;
  status: ChargeStatus;
  daysOverdue?: number;
};

export const CHARGES: Charge[] = [
  { id: "ch1",  patient: "Marcelo Pinto",       description: "Implante — parcela 3/5",   value: 1890, dueDate: "15/06/2026", status: "pendente" },
  { id: "ch2",  patient: "Camila Vasconcelos",  description: "Clareamento — parcela 2/3",value: 840,  dueDate: "12/06/2026", status: "vencendo" },
  { id: "ch3",  patient: "Sofia Cardoso",       description: "Restauração — parcela 1/2",value: 620,  dueDate: "10/06/2026", status: "vencendo" },
  { id: "ch4",  patient: "Lucas Borges",        description: "Avaliação clínica",        value: 280,  dueDate: "30/05/2026", status: "atrasada", daysOverdue: 11 },
  { id: "ch5",  patient: "Helena Marques",      description: "Limpeza + raio-X",         value: 420,  dueDate: "02/06/2026", status: "atrasada", daysOverdue: 8 },
  { id: "ch6",  patient: "Roberto Cunha",       description: "Ortodontia — parcela 4/12",value: 320,  dueDate: "28/05/2026", status: "atrasada", daysOverdue: 13 },
  { id: "ch7",  patient: "Eduardo Tavares",     description: "Limpeza + flúor",          value: 480,  dueDate: "05/06/2026", status: "recuperada" },
  { id: "ch8",  patient: "Fernanda Rocha",      description: "Restauração",              value: 520,  dueDate: "01/06/2026", status: "recuperada" },
  { id: "ch9",  patient: "Patrícia Lima",       description: "Avaliação ortodôntica",    value: 350,  dueDate: "08/06/2026", status: "paga" },
  { id: "ch10", patient: "Renato Siqueira",     description: "Manutenção ortodontia",    value: 280,  dueDate: "01/06/2026", status: "paga" },
  { id: "ch11", patient: "Beatriz Nogueira",    description: "Limpeza",                  value: 220,  dueDate: "20/06/2026", status: "pendente" },
  { id: "ch12", patient: "Vinícius Andrade",    description: "Restauração — parcela 2/2",value: 540,  dueDate: "25/06/2026", status: "pendente" },
];

export const CHARGE_KPIS: Kpi[] = [
  { key: "pending",  label: "Valor pendente",     value: "R$ 12.840", delta: -8.2,  spark: [16,15,15,14,14,13,13,13,12,12,12,12], tone: "info" },
  { key: "recov",    label: "Valor recuperado",   value: "R$ 86.420", delta: 28.4,  spark: [12,18,22,28,32,38,42,52,58,66,72,86], tone: "success" },
  { key: "rate",     label: "Taxa de recuperação",value: "78%",       delta: 6.0,   spark: [62,64,66,68,69,70,72,73,74,75,77,78], tone: "primary" },
  { key: "sent",     label: "Cobranças enviadas", value: "133",       delta: 18.0,  spark: [60,68,72,80,88,95,102,110,118,124,128,133] },
];

// ─── Avaliações ────────────────────────────────────────────────────────────
export const REVIEW_KPIS: Kpi[] = [
  { key: "sent",    label: "Avaliações enviadas",     value: "96", delta: 24.0, spark: [4,6,7,9,8,10,11,9,12,11,13,12] },
  { key: "got",     label: "Avaliações recebidas",    value: "58", delta: 22.0, spark: [3,4,5,4,5,6,5,7,6,8,7,9] },
  { key: "rating",  label: "Nota média Google",       value: "4.8", delta: 4.0,  spark: [44,45,45,46,46,47,47,47,47,48,48,48], tone: "success" },
  { key: "rate",    label: "Taxa de resposta",        value: "60%", delta: 8.0, spark: [48,50,51,52,53,54,55,56,57,58,59,60] },
];

export type Review = {
  id: string;
  patient: string;
  rating: number;
  text: string;
  date: string;
  sentiment: "positive" | "neutral" | "negative";
};

export const REVIEWS: Review[] = [
  { id: "r1", patient: "Eduardo Tavares",   rating: 5, text: "Atendimento impecável da Dra. Marina e da Bia! Saí com o sorriso novo.", date: "07/06/2026", sentiment: "positive" },
  { id: "r2", patient: "Beatriz Nogueira",  rating: 5, text: "Clínica linda, equipe atenciosa, recomendo demais.", date: "06/06/2026", sentiment: "positive" },
  { id: "r3", patient: "Fernanda Rocha",    rating: 5, text: "Resolveram uma cárie que outra clínica deixou pior. Profissionais top.", date: "04/06/2026", sentiment: "positive" },
  { id: "r4", patient: "Marcelo Pinto",     rating: 4, text: "Implante andando bem, comunicação ótima por WhatsApp.", date: "02/06/2026", sentiment: "positive" },
  { id: "r5", patient: "Helena Marques",    rating: 3, text: "Atendimento bom, mas tive que esperar 30 min além do horário.", date: "29/05/2026", sentiment: "neutral" },
];

export const ELIGIBLE_FOR_REVIEW: Patient[] = PATIENTS.filter((p) => p.status === "recuperado");

// ─── Relatórios — séries para gráficos ─────────────────────────────────────
export const MONTHLY_EVOLUTION = [
  { mes: "Jan", leads: 156, agendados: 98,  atendidos: 78,  recuperados: 12 },
  { mes: "Fev", leads: 168, agendados: 112, atendidos: 92,  recuperados: 16 },
  { mes: "Mar", leads: 182, agendados: 121, atendidos: 101, recuperados: 21 },
  { mes: "Abr", leads: 201, agendados: 138, atendidos: 116, recuperados: 24 },
  { mes: "Mai", leads: 224, agendados: 152, atendidos: 128, recuperados: 30 },
  { mes: "Jun", leads: 248, agendados: 164, atendidos: 141, recuperados: 37 },
];

export const SOURCE_BREAKDOWN = [
  { name: "Google Ads",         value: 82, color: "var(--chart-1)" },
  { name: "Instagram",          value: 54, color: "var(--chart-2)" },
  { name: "Indicação",          value: 48, color: "var(--chart-3)" },
  { name: "Meta Ads",           value: 36, color: "var(--chart-4)" },
  { name: "Google Meu Negócio", value: 18, color: "var(--chart-5)" },
  { name: "Site",               value: 10, color: "oklch(0.7 0.04 260)" },
];

export const ATTENDANCE_RATE = [
  { mes: "Jan", taxa: 78 },
  { mes: "Fev", taxa: 81 },
  { mes: "Mar", taxa: 83 },
  { mes: "Abr", taxa: 84 },
  { mes: "Mai", taxa: 86 },
  { mes: "Jun", taxa: 89 },
];

// ─── Configurações ─────────────────────────────────────────────────────────
export const TEAM = [
  { id: "u1", name: "Dra. Marina Lopes",    email: "marina@sorrisopleno.com.br",    role: "Admin",     active: true },
  { id: "u2", name: "Bia Oliveira",         email: "bia@sorrisopleno.com.br",       role: "Recepção",  active: true },
  { id: "u3", name: "Dr. Caio Fernandes",   email: "caio@sorrisopleno.com.br",      role: "Dentista",  active: true },
  { id: "u4", name: "Lara Souza",           email: "lara@sorrisopleno.com.br",      role: "Marketing", active: true },
];

export const INTEGRATIONS = [
  { id: "wa",     name: "WhatsApp via Z-API",    desc: "Conecte sua linha do WhatsApp para conversas, automações e cobranças.", connected: false },
  { id: "gr",     name: "Google Reviews",        desc: "Importe avaliações do seu Google Meu Negócio automaticamente.",           connected: false },
  { id: "gcal",   name: "Google Calendar",       desc: "Sincronize agendamentos com a agenda da clínica.",                       connected: false },
  { id: "meta",   name: "Meta Ads",              desc: "Receba leads do Instagram e Facebook direto no funil.",                  connected: false },
  { id: "openai", name: "OpenAI",                desc: "Sugestões de próxima ação e resumo automático de conversas.",            connected: false },
  { id: "stripe", name: "Stripe",                desc: "Receba pagamentos e cobranças recorrentes via link.",                    connected: false },
];

export const PLANS = [
  { id: "starter",  name: "Starter",  price: "R$ 197", per: "/clínica/mês", features: ["Até 200 pacientes ativos","WhatsApp + automações","Funil completo","1 usuário"], highlighted: false },
  { id: "pro",      name: "Pro",      price: "R$ 397", per: "/clínica/mês", features: ["Até 1.000 pacientes ativos","Tudo do Starter","Campanhas e cobranças","5 usuários","Relatórios avançados"], highlighted: true },
  { id: "business", name: "Business", price: "R$ 797", per: "/clínica/mês", features: ["Pacientes ilimitados","Tudo do Pro","White-label","Usuários ilimitados","Suporte prioritário","API"], highlighted: false },
];

// ─── Portal do Paciente ────────────────────────────────────────────────────
export type PortalBillingStatus = "em-dia" | "a-vencer" | "vencido" | "pago";
export type PortalChargeChannel = "WhatsApp" | "Email" | "SMS";
export type PortalChargeStatus = "enviada" | "lida" | "respondida" | "paga" | "falhou";

export type PortalBilling = {
  pending: number;
  dueDate: string;
  status: PortalBillingStatus;
  description: string;
  humanMessage: string;
  installmentInfo?: string;
};

export type PortalChargeHistory = {
  id: string;
  date: string;
  channel: PortalChargeChannel;
  status: PortalChargeStatus;
  value: number;
  message: string;
};

export type PortalTimelineEvent = {
  id: string;
  type: "mensagem" | "confirmacao" | "consulta" | "documento" | "cobranca";
  title: string;
  description?: string;
  date: string;
};

export type PortalData = {
  token: string;
  clinic: { name: string; city: string };
  patient: { name: string; firstName: string; phone: string };
  treatment: {
    stage: OppStage;
    progress: number; // 0-100
    nextAppointment?: { date: string; time: string; dentist: string; room: string };
  };
  billing: PortalBilling;
  billingHistory: PortalChargeHistory[];
  timeline: PortalTimelineEvent[];
  documents: { id: string; name: string; type: string; date: string }[];
};

export const PORTAL_DATA: Record<string, PortalData> = {
  "marina-2026": {
    token: "marina-2026",
    clinic: { name: CLINIC.name, city: CLINIC.city },
    patient: { name: "Marina Costa Silva", firstName: "Marina", phone: "+55 11 98765-4321" },
    treatment: {
      stage: "tratamento",
      progress: 62,
      nextAppointment: {
        date: "18 de junho, quinta-feira",
        time: "14:30",
        dentist: "Dra. Marina Lopes",
        room: "Sala 2",
      },
    },
    billing: {
      pending: 1890,
      dueDate: "15/06/2026",
      status: "a-vencer",
      description: "Implante dentário — parcela 3 de 5",
      installmentInfo: "Parcela 3/5 do plano de tratamento",
      humanMessage:
        "Olá Marina! Identificamos que sua próxima parcela vence em breve. Estamos à disposição para ajustar a melhor forma de pagamento, é só nos chamar pelo WhatsApp.",
    },
    billingHistory: [
      { id: "h1", date: "08/06/2026 09:12", channel: "WhatsApp", status: "lida",       value: 1890, message: "Olá Marina, sua parcela 3/5 vence em 15/06. Posso te ajudar com o pagamento?" },
      { id: "h2", date: "12/05/2026 10:00", channel: "WhatsApp", status: "paga",       value: 1890, message: "Parcela 2/5 — link de pagamento enviado." },
      { id: "h3", date: "12/04/2026 10:00", channel: "WhatsApp", status: "paga",       value: 1890, message: "Parcela 1/5 — link de pagamento enviado." },
      { id: "h4", date: "01/04/2026 14:30", channel: "Email",    status: "respondida", value: 0,    message: "Plano de tratamento e orçamento detalhado." },
    ],
    timeline: [
      { id: "t1", type: "consulta",    title: "Sessão de tratamento concluída",   description: "Dra. Marina Lopes · 60 min", date: "01/06/2026" },
      { id: "t2", type: "confirmacao", title: "Consulta confirmada por WhatsApp", date: "31/05/2026" },
      { id: "t3", type: "mensagem",    title: "Você recebeu orientações pré-consulta", date: "30/05/2026" },
      { id: "t4", type: "cobranca",    title: "Parcela 2/5 paga",                 description: "R$ 1.890,00 · PIX",         date: "12/05/2026" },
      { id: "t5", type: "documento",   title: "Plano de tratamento aprovado",     date: "01/04/2026" },
    ],
    documents: [
      { id: "d1", name: "Plano de tratamento.pdf",    type: "Orçamento",     date: "01/04/2026" },
      { id: "d2", name: "Termo de consentimento.pdf", type: "Documento",     date: "01/04/2026" },
      { id: "d3", name: "Radiografia panorâmica.jpg", type: "Exame",         date: "28/03/2026" },
    ],
  },
};

export function getPortalData(token: string): PortalData | null {
  return PORTAL_DATA[token] ?? PORTAL_DATA["marina-2026"]; // fallback para demo
}

// ─── Atividade / Notificações ──────────────────────────────────────────────
export type ActivityKind =
  | "resposta"
  | "confirmacao"
  | "falha"
  | "avaliacao"
  | "cobranca-enviada"
  | "cobranca-respondida"
  | "pagamento-confirmado"
  | "pagamento-atrasado"
  | "cobranca-falhou"
  | "sistema";

export type ActivityCategory = "respostas" | "confirmacoes" | "falhas" | "avaliacoes" | "financeiro" | "sistema";

export type Activity = {
  id: string;
  kind: ActivityKind;
  category: ActivityCategory;
  title: string;
  detail: string;
  patient?: string;
  value?: number;
  time: string;          // "agora", "12 min", "2 h"
  dayLabel: "Hoje" | "Ontem" | string;
  unread: boolean;
  action?: { label: string; href?: string };
};

export const ACTIVITY_FEED: Activity[] = [
  // Hoje
  { id: "n1", kind: "resposta",            category: "respostas",    title: "Nova resposta no WhatsApp", detail: "“Quanto custa o clareamento?”", patient: "Carolina Ribeiro", time: "agora",   dayLabel: "Hoje", unread: true, action: { label: "Abrir conversa", href: "/app/conversas" } },
  { id: "n2", kind: "confirmacao",         category: "confirmacoes", title: "Consulta confirmada",       detail: "Avaliação amanhã 10:00",        patient: "Bruno Carvalho",    time: "12 min",  dayLabel: "Hoje", unread: true, action: { label: "Ver paciente",   href: "/app/pacientes" } },
  { id: "n3", kind: "pagamento-confirmado",category: "financeiro",   title: "Pagamento confirmado",      detail: "PIX recebido",                  patient: "Patrícia Lima",     value: 350,  time: "28 min", dayLabel: "Hoje", unread: true,  action: { label: "Ver cobrança",   href: "/app/cobrancas" } },
  { id: "n4", kind: "cobranca-enviada",    category: "financeiro",   title: "Cobrança enviada",          detail: "Parcela 3/5 — vence 15/06",     patient: "Marcelo Pinto",     value: 1890, time: "1 h",    dayLabel: "Hoje", unread: false, action: { label: "Ver cobrança",   href: "/app/cobrancas" } },
  { id: "n5", kind: "avaliacao",           category: "avaliacoes",   title: "Nova avaliação 5 estrelas", detail: "“Atendimento impecável!”",      patient: "Eduardo Tavares",   time: "2 h",    dayLabel: "Hoje", unread: false, action: { label: "Ver avaliação",  href: "/app/avaliacoes" } },
  { id: "n6", kind: "cobranca-respondida", category: "financeiro",   title: "Cobrança respondida",       detail: "“Posso pagar até sexta”",       patient: "Camila Vasconcelos", value: 840, time: "3 h",    dayLabel: "Hoje", unread: false, action: { label: "Abrir conversa", href: "/app/conversas" } },
  { id: "n7", kind: "falha",               category: "falhas",       title: "Falha no follow-up",        detail: "Número não recebe WhatsApp",    patient: "Lucas Borges",      time: "4 h",    dayLabel: "Hoje", unread: false, action: { label: "Ver paciente",   href: "/app/pacientes" } },
  { id: "n8", kind: "cobranca-falhou",     category: "financeiro",   title: "Falha no envio da cobrança",detail: "Z-API: timeout",                patient: "Roberto Cunha",     value: 320,  time: "5 h",    dayLabel: "Hoje", unread: false, action: { label: "Tentar novamente" } },

  // Ontem
  { id: "n9",  kind: "pagamento-atrasado",  category: "financeiro",   title: "Pagamento atrasado",        detail: "11 dias em atraso",             patient: "Lucas Borges",      value: 280, time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Ver cobrança",   href: "/app/cobrancas" } },
  { id: "n10", kind: "confirmacao",         category: "confirmacoes", title: "Consulta confirmada",       detail: "Manutenção dia 20 ok",          patient: "Renato Siqueira",   time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Ver paciente",   href: "/app/pacientes" } },
  { id: "n11", kind: "pagamento-confirmado",category: "financeiro",   title: "Pagamento confirmado",      detail: "Cartão de crédito",             patient: "Renato Siqueira",   value: 280, time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Ver cobrança",   href: "/app/cobrancas" } },
  { id: "n12", kind: "resposta",            category: "respostas",    title: "Resposta recebida",         detail: "“Vou pensar e te aviso”",       patient: "Sofia Cardoso",     time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Abrir conversa", href: "/app/conversas" } },
  { id: "n13", kind: "avaliacao",           category: "avaliacoes",   title: "Avaliação 5 estrelas",      detail: "“Equipe atenciosa, recomendo!”", patient: "Beatriz Nogueira",  time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Ver avaliação",  href: "/app/avaliacoes" } },
  { id: "n14", kind: "cobranca-enviada",    category: "financeiro",   title: "Cobrança enviada",          detail: "Restauração — parcela 1/2",     patient: "Sofia Cardoso",     value: 620, time: "ontem", dayLabel: "Ontem", unread: false, action: { label: "Ver cobrança",   href: "/app/cobrancas" } },

  // Esta semana
  { id: "n15", kind: "pagamento-atrasado",  category: "financeiro",   title: "Pagamento atrasado",        detail: "8 dias em atraso",              patient: "Helena Marques",    value: 420, time: "2d", dayLabel: "Esta semana", unread: false, action: { label: "Ver cobrança",   href: "/app/cobrancas" } },
  { id: "n16", kind: "cobranca-respondida", category: "financeiro",   title: "Cobrança respondida",       detail: "“Vou pagar amanhã”",            patient: "Marcelo Pinto",     value: 1890,time: "2d", dayLabel: "Esta semana", unread: false, action: { label: "Abrir conversa", href: "/app/conversas" } },
  { id: "n17", kind: "sistema",             category: "sistema",      title: "Automação atualizada",      detail: "“Reativar 6+ meses” agora envia às 10h", time: "3d", dayLabel: "Esta semana", unread: false },
  { id: "n18", kind: "confirmacao",         category: "confirmacoes", title: "Consulta confirmada",       detail: "Confirmada automaticamente",    patient: "Patrícia Lima",     time: "3d", dayLabel: "Esta semana", unread: false },
  { id: "n19", kind: "falha",               category: "falhas",       title: "Falha de follow-up",        detail: "Mensagem não entregue (bloqueio)", patient: "Lucas Borges",   time: "4d", dayLabel: "Esta semana", unread: false },
  { id: "n20", kind: "pagamento-confirmado",category: "financeiro",   title: "Pagamento confirmado",      detail: "Boleto liquidado",              patient: "Fernanda Rocha",    value: 520, time: "5d", dayLabel: "Esta semana", unread: false },
];

export const ACTIVITY_CATEGORIES: { id: ActivityCategory | "todas"; label: string }[] = [
  { id: "todas",        label: "Todas" },
  { id: "respostas",    label: "Respostas" },
  { id: "confirmacoes", label: "Confirmações" },
  { id: "falhas",       label: "Falhas" },
  { id: "avaliacoes",   label: "Avaliações" },
  { id: "financeiro",   label: "Financeiro" },
  { id: "sistema",      label: "Sistema" },
];
