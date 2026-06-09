# Webhooks — Auditoria de integrações externas

> Status: **documentação / checklist**. Endpoints reais entram em sprint futura junto com Admin Panel.

Z-API, Meta Cloud API e Google Business são responsabilidade **nossa** (DentalFlux), não do cliente. O dono da clínica não compra essas APIs nem as configura — provisionamos durante a implementação paga.

Cada clínica recebe URLs públicas estáveis sob `/api/public/webhooks/*`. Não há autenticação Lovable; segurança é por **assinatura HMAC** + `clinic_id` no path.

---

## Z-API (WhatsApp não oficial)

**URL para configurar no painel Z-API:**
```
https://<dominio>/api/public/webhooks/zapi/{clinic_id}
```

### Eventos esperados
- `on-message-received` — mensagem recebida do paciente
- `on-message-status` — entregue / lido / falha
- `on-presence` — digitando / online
- `on-disconnected` — instância caiu

### Payload mínimo (mensagem recebida)
```json
{
  "instanceId": "...",
  "messageId": "...",
  "phone": "5511999999999",
  "fromMe": false,
  "type": "text",
  "text": { "message": "Posso remarcar?" },
  "momment": 1717891200000
}
```

### Ações que o webhook dispara no sistema
1. Match do `phone` com `pacientes.phone` da clínica.
2. Cria `atividade` (tipo `whatsapp_in`) ligada ao paciente.
3. Se houver oportunidade ativa, atualiza `last_contact_at`.
4. Roda LLM para classificar intenção (confirmar / remarcar / cancelar / dúvida).
5. Notifica recepção via `notificacoes` quando intenção for "cancelar" ou "remarcar".

### Segurança
- Header `X-Z-Api-Token: <token>` — comparar com secret `ZAPI_WEBHOOK_TOKEN_<clinic_id>` (timing-safe).
- Reject `clinic_id` inexistente.
- Rate-limit no recebimento (sugestão: 50 req/s por clínica).

---

## Meta Cloud API (WhatsApp oficial)

**URL para configurar no Meta Business / App:**
```
https://<dominio>/api/public/webhooks/meta/{clinic_id}
```

### Verificação inicial (GET)
Meta envia `GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`. Responder com `hub.challenge` em texto puro se `verify_token == META_VERIFY_TOKEN_<clinic_id>`.

### POST de eventos
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
        "contacts": [{ "profile": { "name": "..." }, "wa_id": "5511999999999" }],
        "messages": [{
          "from": "5511999999999",
          "id": "wamid....",
          "timestamp": "...",
          "type": "text",
          "text": { "body": "Posso remarcar?" }
        }]
      }
    }]
  }]
}
```

### Segurança
- Validar assinatura HMAC-SHA256 do raw body com `META_APP_SECRET` (header `X-Hub-Signature-256`).
- Resposta SEMPRE `200 OK` rápido (<5s); processar em background se necessário.

### Ações
Mesma cadeia do Z-API. O `phone_number_id` resolve a clínica como fallback ao `clinic_id` no path.

---

## Google Business Profile — Avaliações

**Fluxo:** Google **não** envia webhook nativo para avaliações novas. Precisamos de **polling** via Google My Business API v4 a cada N minutos (cron):

```
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
```

### Cron sugerido
- `src/routes/api/public/cron/reviews-poll.ts` chamado a cada 15 min por pg_cron.
- Compara `reviewId` com tabela `reviews` (a criar) → insere novas.
- Trigger: review com nota ≤ 3 → cria `notificacoes` urgente para o admin.

### Auth
- OAuth com escopo `https://www.googleapis.com/auth/business.manage` — armazenado em `clinic_integrations` (provider `google_business`).

---

## Resumo do que cada provedor exige de nós

| Provedor | Quem paga | Quem configura | Frequência |
|---|---|---|---|
| Z-API | DentalFlux | DentalFlux (Admin Panel) | Instância por clínica (R$ ~99/mês) |
| Meta Cloud | DentalFlux | DentalFlux (Admin Panel) | Por conversa iniciada pela clínica |
| Google Business | DentalFlux | OAuth + polling | Custo zero (cota gratuita) |
| Google Calendar | DentalFlux | OAuth per-user (clínica conecta) | Custo zero |

---

## Próxima sprint (Admin Panel)
- `/admin/clinicas/:id/integracoes` — campos para inserir Z-API instance/token, Meta phone_number_id/token, Google Business location.
- Botão "Testar conexão" por canal.
- Toggle do `provisioning_status.<canal>` para `connected`.
- Página pública de status para a clínica acompanhar: ⏸ pendente → 🟡 em provisionamento → ✅ ativo.
