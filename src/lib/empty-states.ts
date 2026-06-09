import {
  LayoutDashboard, Target, MessagesSquare, Users, Megaphone, Zap, Wallet, Star, BarChart3,
} from "lucide-react";
import type { EmptyStateProps } from "@/components/app/empty-state";

type Cfg = Omit<EmptyStateProps, "className">;

export const EMPTY_STATES = {
  dashboard: {
    icon: LayoutDashboard,
    eyebrow: "Comece em 3 minutos",
    title: "Seu painel está pronto para receber dados",
    description:
      "Conecte seu WhatsApp e importe sua base para começar a ver leads, agendamentos, faltas e receita recuperada em tempo real.",
    steps: [
      { title: "Conectar WhatsApp", description: "Plugue sua linha via Z-API ou Meta para começar a registrar conversas." },
      { title: "Importar pacientes", description: "Suba sua planilha ou conecte seu sistema atual em 1 clique." },
      { title: "Ativar primeira automação", description: "Confirmação 24h antes já recupera, em média, 8 consultas por semana." },
    ],
    primary: { label: "Conectar WhatsApp", href: "/app/configuracoes" },
    secondary: { label: "Importar pacientes", href: "/app/pacientes" },
    tip: "Clínicas que ativam as 3 etapas no primeiro dia recuperam até 22% mais receita em 30 dias.",
  } satisfies Cfg,

  oportunidades: {
    icon: Target,
    eyebrow: "Funil DentalFlux",
    title: "Nenhuma oportunidade no seu funil ainda",
    description:
      "Toda pessoa que mostra interesse pela sua clínica deveria virar uma oportunidade. Conecte suas fontes e capture leads automaticamente.",
    steps: [
      { title: "Conectar Meta Ads e Google", description: "Receba leads do Instagram, Facebook e Google direto no Kanban." },
      { title: "Importar leads existentes", description: "Tem leads em uma planilha? Suba o CSV e organize no funil." },
      { title: "Criar oportunidade manual", description: "Cadastre o próximo paciente em menos de 30 segundos." },
    ],
    primary: { label: "Criar oportunidade", href: "/app/oportunidades" },
    secondary: { label: "Conectar fontes", href: "/app/configuracoes" },
    tip: "Leads respondidos em menos de 5 minutos têm 9× mais chance de virar consulta.",
  } satisfies Cfg,

  conversas: {
    icon: MessagesSquare,
    eyebrow: "Inbox unificado",
    title: "Sua caixa de entrada está vazia",
    description:
      "Centralize WhatsApp, Instagram e formulários do site em um único inbox. Sua recepção responde mais rápido e nenhum lead se perde.",
    steps: [
      { title: "Conectar WhatsApp", description: "Z-API em ~2 minutos. Sua linha continua funcionando normalmente." },
      { title: "Definir respostas rápidas", description: "Pré-configure mensagens para clareamento, implante, ortodontia." },
      { title: "Ativar resposta automática", description: "Acolha o paciente em segundos, mesmo fora do expediente." },
    ],
    primary: { label: "Conectar WhatsApp", href: "/app/configuracoes" },
    secondary: { label: "Ver automações", href: "/app/automacoes" },
    tip: "94% das clínicas perdem leads por demora na primeira resposta. Não seja uma delas.",
  } satisfies Cfg,

  pacientes: {
    icon: Users,
    eyebrow: "Base de pacientes",
    title: "Você ainda não tem pacientes cadastrados",
    description:
      "Sua base é seu maior ativo. Importe pacientes ativos, inativos e tratamentos em andamento para começar a recuperar receita.",
    steps: [
      { title: "Importar CSV", description: "Modelo pronto: nome, telefone, última visita, status." },
      { title: "Migrar do sistema atual", description: "Suportamos Easy Dental, Dental Office, Clinicorp e outros." },
      { title: "Cadastrar manualmente", description: "Comece pelos pacientes em tratamento ativo." },
    ],
    primary: { label: "Importar pacientes", href: "/app/pacientes" },
    secondary: { label: "Cadastrar manual", href: "/app/pacientes" },
    tip: "Pacientes inativos há 6+ meses são a maior fonte oculta de receita da sua clínica.",
  } satisfies Cfg,

  campanhas: {
    icon: Megaphone,
    eyebrow: "Reativação inteligente",
    title: "Crie sua primeira campanha de relacionamento",
    description:
      "Reative pacientes inativos, recupere orçamentos parados e peça avaliações no piloto automático — sem parecer spam.",
    steps: [
      { title: "Escolher um template", description: "Reativação 6 meses, follow-up de orçamento, manutenção semestral." },
      { title: "Definir o público", description: "Filtre por tags, última visita, valor de orçamento ou origem." },
      { title: "Disparar e medir", description: "Acompanhe abertura, resposta e receita gerada em tempo real." },
    ],
    primary: { label: "Criar campanha", href: "/app/campanhas" },
    secondary: { label: "Ver templates", href: "/app/campanhas" },
    tip: "Uma campanha de reativação bem-feita devolve, em média, R$ 8 para cada R$ 1 investido.",
  } satisfies Cfg,

  automacoes: {
    icon: Zap,
    eyebrow: "Trabalho no piloto automático",
    title: "Ative as automações que recuperam receita",
    description:
      "Cada automação é uma economia mensal de horas da recepção e um salto na taxa de comparecimento e recuperação.",
    steps: [
      { title: "Confirmação 24h antes", description: "Reduz faltas em até 65% logo no primeiro mês." },
      { title: "Cobrança amigável D+3", description: "Texto humanizado, sem tom agressivo, que recupera ~70% das pendências." },
      { title: "Pedido de avaliação no Google", description: "Aumenta sua nota e atrai novos pacientes organicamente." },
    ],
    primary: { label: "Ativar automações", href: "/app/automacoes" },
    secondary: { label: "Ver biblioteca", href: "/app/automacoes" },
    tip: "Comece com 3 automações. Mais que isso confunde — menos do que isso deixa dinheiro na mesa.",
  } satisfies Cfg,

  cobrancas: {
    icon: Wallet,
    eyebrow: "Recuperação financeira",
    title: "Comece a recuperar receita parada",
    description:
      "Cobranças humanizadas, no canal certo, no momento certo. Sem constrangimento e sem perder o paciente.",
    steps: [
      { title: "Configurar formas de pagamento", description: "Pix, cartão e parcelamento — em links prontos para o WhatsApp." },
      { title: "Importar pendências atuais", description: "Suba a lista de valores em aberto da sua clínica." },
      { title: "Ativar régua automática", description: "Sequência D-3, D+3, D+7 com tom respeitoso e eficiente." },
    ],
    primary: { label: "Configurar cobranças", href: "/app/cobrancas" },
    secondary: { label: "Importar pendências", href: "/app/cobrancas" },
    tip: "78% das pendências viram pagamento quando a mensagem chega humanizada nos 3 primeiros dias.",
  } satisfies Cfg,

  avaliacoes: {
    icon: Star,
    eyebrow: "Reputação online",
    title: "Comece a transformar pacientes em avaliações 5★",
    description:
      "Cada paciente satisfeito é um anúncio gratuito no Google. Peça no momento certo, no canal certo, com a mensagem certa.",
    steps: [
      { title: "Conectar Google Meu Negócio", description: "Receba avaliações novas direto aqui e responda em 1 clique." },
      { title: "Ativar pedido pós-consulta", description: "Disparo 24h depois — momento de maior satisfação." },
      { title: "Personalizar mensagem", description: "Tom da sua clínica + link direto para avaliar." },
    ],
    primary: { label: "Conectar Google", href: "/app/configuracoes" },
    secondary: { label: "Ativar pedido", href: "/app/automacoes" },
    tip: "Subir de 4.2 para 4.8 estrelas pode dobrar sua taxa de cliques no Google Maps.",
  } satisfies Cfg,

  relatorios: {
    icon: BarChart3,
    eyebrow: "Decisões com dados",
    title: "Seus relatórios estão prontos para ganhar vida",
    description:
      "Em poucos dias de uso, o DentalFlux mostra exatamente onde sua clínica perde dinheiro — e quanto está recuperando.",
    steps: [
      { title: "Conectar canais e fontes", description: "Quanto mais dados, mais preciso o diagnóstico." },
      { title: "Importar histórico recente", description: "90 dias já são suficientes para análises de tendência." },
      { title: "Aguardar 7 dias de operação", description: "Tempo para gerar a primeira leitura sólida de funil e receita." },
    ],
    primary: { label: "Conectar canais", href: "/app/configuracoes" },
    secondary: { label: "Importar histórico", href: "/app/pacientes" },
    tip: "O dado mais valioso é o motivo da perda. Comece registrando isso desde o primeiro dia.",
  } satisfies Cfg,
};

export type EmptyStateKey = keyof typeof EMPTY_STATES;
