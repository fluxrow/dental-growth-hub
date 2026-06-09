// Mapeia códigos de erro do fluxo OAuth do Google Calendar para mensagens claras
// + guia de recuperação para o usuário.

export type GoogleOAuthErrorInfo = {
  title: string;
  hint: string;
};

export function describeGoogleOAuthError(code?: string | null): GoogleOAuthErrorInfo {
  switch (code) {
    case "access_denied":
      return {
        title: "Você negou a permissão do Google Calendar",
        hint: "Para conectar, clique em Conectar novamente e marque TODAS as caixas de permissão (ler e criar eventos). Sem isso, lembretes e confirmações ficam desligados.",
      };
    case "popup_closed":
      return {
        title: "Janela do Google foi fechada antes de concluir",
        hint: "Clique em Conectar novamente e mantenha a janela aberta até ver a mensagem de sucesso.",
      };
    case "popup_blocked":
      return {
        title: "Seu navegador bloqueou o popup",
        hint: "Permita popups deste site nas configurações do navegador e clique em Conectar novamente.",
      };
    case "invalid_state":
    case "missing_params":
      return {
        title: "Sessão de conexão expirou",
        hint: "Atualize a página e clique em Conectar novamente. O link de autorização vale por 10 minutos.",
      };
    case "oauth_not_configured":
      return {
        title: "Integração não configurada",
        hint: "Avise o suporte: as credenciais do Google Calendar não estão configuradas no servidor.",
      };
    case "db_save_failed":
      return {
        title: "Conta autorizada, mas falha ao salvar",
        hint: "Tente conectar novamente. Se persistir, contate o suporte.",
      };
    case "admin_policy_enforced":
      return {
        title: "Bloqueado pela política do seu Google Workspace",
        hint: "Peça ao admin do Workspace para liberar o DrFlux ou use uma conta Google pessoal.",
      };
    default:
      if (code?.startsWith("token_exchange_")) {
        return {
          title: "Falha técnica ao trocar o código com o Google",
          hint: "Tente novamente em alguns segundos. Se persistir, desconecte e conecte de novo.",
        };
      }
      return {
        title: "Não foi possível conectar com o Google",
        hint: "Tente novamente. Se persistir, contate o suporte.",
      };
  }
}
