## Contexto e virada

O fluxo correto é:

- **Reunião de implementação (venda)** → mora na **landing page**, agendada pelo lead com o meu email. Não entra no onboarding do cliente que já contratou. Fora do escopo desta entrega.
- **Google Calendar no onboarding** → é a clínica conectando **a agenda dela**, pra o sistema fazer o que promete: ler horários ocupados, criar consultas, disparar lembretes/confirmações via WhatsApp baseados nos eventos, identificar pacientes sem retorno (inativos) cruzando com histórico de agenda, etc.

E os 3 problemas atuais continuam:

1. Botão "Enviar logo" é mock.
2. Passo WhatsApp pede Z-API/Token/número — isso é responsabilidade nossa (custo nosso, complexidade técnica nossa), provisionado no Admin Panel.
3. Onboarding finge ser self-serve técnico; precisa virar self-serve **só do que o dono sabe** + uma conexão Google nativa.

## O que entregamos vs o que ajustamos

### O que o sistema promete entregar (e portanto precisa da agenda Google)

- Lembrete automático de consulta via WhatsApp (24h e 2h antes).
- Confirmação de presença com resposta caindo no CRM.
- Detecção de "no-show" e reagendamento.
- Identificação de pacientes inativos (sem evento na agenda há X meses).
- Sugestão de horários livres ao recepcionista no chat.
- Sincronização bidirecional: consulta criada no DentalFlux aparece no Google Calendar da clínica e vice-versa.

→ Sem agenda conectada, **nada disso funciona**. Por isso conectar Google é um passo de onboarding obrigatório (ou explicitamente adiado, com aviso de funcionalidades bloqueadas).

### O que ajustamos no onboarding

Novo fluxo (4 passos):

```text
1. Clínica          → nome, CNPJ, endereço, especialidades, LOGO (upload real)
2. Equipe           → admin (já preenchido) + papel
3. Conectar agenda  → "Conecte o Google Calendar da clínica"
                      botão grande [Conectar com Google]
                      lista o que isso destrava
                      + link discreto "Pular por agora — algumas funções ficarão bloqueadas"
4. Pronto           → status: Agenda ✅/⏸ · WhatsApp ⏸ (ativaremos) · Reviews ⏸
                      botão "Carregar dados demo" + "Entrar no Dashboard"
```

Sai do onboarding: tudo de Z-API / Meta / Instância / Token / telefone. Esses campos viram coluna do banco que **só o Admin Panel** preenche (sprint separada).  
issso temos que infomormar em algum lugar pequeno pra a pessoa entenda necessadedade da implementacao e manutencao e supeorte do sistema 

## Conexão Google Calendar (per-user, da clínica)

O connector Google Calendar do Lovable autentica **a conta do dono do workspace** (eu). Não serve — precisamos da agenda **de cada clínica**. Logo: **per-user OAuth**.

Caminho técnico:

1. **Google Cloud Console** (manual nosso, fora do código):
  - Criar OAuth Client ID "DentalFlux App".
  - Ativar Google Calendar API.
  - Scopes: `https://www.googleapis.com/auth/calendar.events` + `calendar.readonly`.
  - Redirect URI: nosso domínio + `/auth/google/callback`.
2. **Secrets** (peço quando chegar a hora de implementar de verdade):
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
3. **Banco** — nova tabela `clinic_integrations`:
  - `clinic_id`, `provider` ('google_calendar'), `access_token`, `refresh_token`, `expires_at`, `scope`, `calendar_id`, `connected_by_user_id`, `connected_at`, `last_sync_at`, `status`.
  - RLS: só membros da clínica leem; só edge function escreve (via service_role).
4. **Rotas**:
  - Server route `src/routes/api/auth/google/start.ts` → monta URL OAuth Google e redireciona.
  - Server route `src/routes/api/auth/google/callback.ts` → troca code por tokens, grava em `clinic_integrations`, redireciona pra `/onboarding?step=pronto&calendar=connected`.
5. **Server function** `disconnectCalendar()` para o usuário desfazer.
6. **Server function** `listCalendarEvents({ from, to })` (helper inicial) que usa o refresh token salvo. Não consumida no onboarding — fica pronta pra Dashboard/Lembretes/Agenda usarem na próxima sprint.

### Esta entrega — implementa o que?

Para não inflar a sprint, dividir em **dois marcos**:

**Marco A (esta entrega, sem Google Cloud Console ainda):**

- UI do onboarding reformulada (passos 1-4 acima).
- Upload de logo funcionando (bucket `clinic-logos` + RLS + grava `logo_url`).
- Botão "Conectar com Google" presente, mas em estado **"Em breve — vamos ativar no seu setup"** (mesmo padrão dos outros canais). Dá pra pular sem bloquear.
- Tabela `clinic_integrations` criada (vazia, pronta).
- Doc `docs/integrations/google-calendar.md` com o checklist exato do que configurar no Google Cloud Console + lista dos secrets necessários.
- Doc `docs/integrations/webhooks.md` com contratos Z-API / Meta esperados (auditoria que você pediu antes).

**Marco B (sprint seguinte, depois que você criar o OAuth Client no Google Cloud):**

- Implementar de fato as rotas `/api/auth/google/start` e `/callback`.
- Trocar o estado "Em breve" do botão por OAuth real.
- `listCalendarEvents` + primeiro consumidor (widget "Próximas consultas" no Dashboard).

Isso evita criar código OAuth quebrado sem os secrets, e mantém o onboarding visualmente correto **agora**.

## Mudanças no código (Marco A)

### Migrations

- Bucket `clinic-logos` (público, leitura aberta; insert/update por membro da clínica via RLS em `storage.objects`).
- `clinicas` ganha: `logo_url text`, `provisioning_status jsonb default '{"calendar":"pending","whatsapp":"pending","reviews":"pending","email":"pending"}'`.
- Nova tabela `clinic_integrations` (estrutura acima) + RLS.

### `src/routes/onboarding.tsx`

- **StepClinic**: upload real de logo (input file escondido + ref + preview + upload pro bucket → `logo_url`).
- **StepWhatsApp → StepAgenda**: remove tudo de Z-API. Card grande "Conectar Google Calendar" com lista de benefícios (lembretes, confirmações, inativos, sugestões de horário), botão "Em breve" + link "Pular por agora".
- **StepDone**: grid de status dos 4 canais (Agenda, WhatsApp, Reviews, Email), cada um com badge e copy clara.
- Remove insert dos campos `whatsapp_*`.

### Docs

- `docs/integrations/google-calendar.md` — passo a passo Google Cloud Console + scopes + redirect URIs + lista de secrets.
- `docs/integrations/webhooks.md` — contratos Z-API e Meta (auditoria).

## Pergunta única antes de seguir

Topa esse modelo de **dois marcos** (UI + tabelas + docs agora; OAuth real na próxima sprint quando os secrets do Google Cloud estiverem prontos)?  Ou prefere que eu já tente implementar o OAuth real agora — nesse caso vou precisar que você crie o OAuth Client no Google Cloud Console e me passe `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` antes de começar.  
  
vamos nesse modelo de dois sprints, fica mais controlado.