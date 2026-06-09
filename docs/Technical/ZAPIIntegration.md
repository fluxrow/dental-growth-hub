# DentalFlux — Z-API Integration

> Última atualização: 2026-06-08  
> Provedor principal: Z-API (https://z-api.io)  
> Status: Planejamento pré-implementação

---

## Visão Geral

A integração com Z-API é o núcleo operacional do DentalFlux. Toda comunicação com pacientes (confirmações, cobranças, avaliações, campanhas) acontece via WhatsApp através desta API.

---

## Credenciais e Configuração

Cada clínica possui sua própria instância Z-API. As credenciais são armazenadas criptografadas na tabela `clinicas`:

| Campo | Descrição |
|-------|-----------|
| `zapi_instance` | ID da instância Z-API da clínica |
| `zapi_token` | Token de autenticação da instância |

**Variáveis de ambiente (servidor):**
```
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_SECURITY_TOKEN=<token_de_segurança_da_conta>   # token global da conta DentalFlux
```

**Headers padrão por request:**
```
Client-Token: <ZAPI_SECURITY_TOKEN>
Content-Type: application/json
```

**URL base por instância:**
```
https://api.z-api.io/instances/{instanceId}/token/{token}/
```

---

## Endpoints de Uso

### Verificar status da instância

```
GET /instances/{instanceId}/token/{token}/status
```

Resposta:
```json
{
  "connected": true,
  "status": "CONNECTED",
  "phone": "5511999999999"
}
```

Uso: tela de Configurações → aba WhatsApp → botão "Verificar conexão".

---

### Enviar mensagem de texto

```
POST /instances/{instanceId}/token/{token}/send-text
```

Payload:
```json
{
  "phone": "5511999999999",
  "message": "Olá {{nome}}, sua consulta está confirmada para amanhã às 14h!"
}
```

Uso: envio manual em conversas, campanhas, automações e cobranças.

---

### Enviar mensagem com imagem

```
POST /instances/{instanceId}/token/{token}/send-image
```

Payload:
```json
{
  "phone": "5511999999999",
  "image": "https://storage.supabase.co/...",
  "caption": "Seu orçamento está pronto!"
}
```

---

### Enviar mensagem com documento

```
POST /instances/{instanceId}/token/{token}/send-document/pdf
```

Payload:
```json
{
  "phone": "5511999999999",
  "document": "https://storage.supabase.co/...",
  "fileName": "plano-de-tratamento.pdf"
}
```

Uso: envio de documentos pelo portal do paciente.

---

### Enviar template (lista)

```
POST /instances/{instanceId}/token/{token}/send-list
```

Uso: menus interativos (ex: "Responda 1 para confirmar, 2 para reagendar").

---

## Webhooks de Recebimento

### Configuração

Registrar a URL de webhook no painel Z-API ou via API:

```
POST /instances/{instanceId}/token/{token}/update-webhook-received
Body: { "webhookReceivedDelivery": "https://api.dentalflux.com.br/webhooks/zapi/{clinicId}" }
```

### Estrutura do Payload Recebido

```json
{
  "instanceId": "3ABC1234",
  "messageId": "BAE5F4CEB35B3F0F",
  "phone": "5511999999999",
  "fromMe": false,
  "momment": 1717689600000,
  "status": "RECEIVED",
  "chatName": "Ana Lima",
  "senderName": "Ana Lima",
  "senderPhoto": "https://...",
  "isStatusReply": false,
  "isGroup": false,
  "text": {
    "message": "Olá, quero agendar uma consulta"
  }
}
```

### Tipos de Mensagem

| Tipo | Campo no payload |
|------|-----------------|
| Texto | `text.message` |
| Imagem | `image.imageUrl` + `image.caption` |
| Áudio | `audio.audioUrl` |
| Documento | `document.documentUrl` + `document.fileName` |
| Localização | `location.latitude` + `location.longitude` |
| Contato | `contact.name` + `contact.phone` |

---

## Fluxo de Recebimento de Mensagem

```
Z-API → POST /webhooks/zapi/{clinicId}
  ↓
Validar assinatura / clinicId
  ↓
Buscar ou criar Paciente por phone
  ↓
Buscar ou criar Conversa por (clinic_id, phone)
  ↓
Inserir Mensagem em mensagens
  ↓
Atualizar conversas.unread + updated_at
  ↓
Inserir Notificação para usuários da clínica
  ↓
Emitir evento Supabase Realtime → frontend
```

---

## Fluxo de Envio de Mensagem

```
Frontend → POST /api/messages/send
  ↓
Buscar credenciais Z-API da clínica (clinicas.zapi_*)
  ↓
POST z-api.io/send-text
  ↓
Registrar mensagem em mensagens (status: 'sent')
  ↓
Webhook de status Z-API → atualizar para 'delivered' ou 'read'
```

---

## Webhook de Status de Entrega

Z-API notifica status das mensagens enviadas:

```json
{
  "instanceId": "3ABC1234",
  "messageId": "BAE5F4CEB35B3F0F",
  "status": "READ",
  "momment": 1717689700000
}
```

Status possíveis: `SENT` → `DELIVERED` → `READ` | `FAILED`

Mapeamento para tabela `mensagens`: `sent` → `delivered` → `read` | `failed`

---

## Templates de Mensagem

Templates são strings com variáveis `{{nome}}`. Serão armazenados na tabela `automacoes.template` e `campanhas.template`.

### Variáveis disponíveis

| Variável | Valor |
|----------|-------|
| `{{nome}}` | Primeiro nome do paciente |
| `{{clinica}}` | Nome da clínica |
| `{{data}}` | Data da consulta (ex: "amanhã às 14h") |
| `{{valor}}` | Valor da cobrança |
| `{{vencimento}}` | Data de vencimento |
| `{{link_portal}}` | URL do portal do paciente |
| `{{link_pagamento}}` | Link de pagamento (Stripe/Asaas) |

### Exemplos por categoria

**Confirmação de consulta (D-1):**
```
Oi {{nome}}! Lembrando da sua consulta amanhã às {{data}} na {{clinica}}.
Para confirmar, responda SIM. Para reagendar, responda NÃO.
```

**Cobrança (D+3):**
```
Olá {{nome}}, identificamos uma pendência de R$ {{valor}} com vencimento em {{vencimento}}.
Para regularizar: {{link_pagamento}}
Dúvidas? Estamos aqui!
```

**Pedido de avaliação:**
```
{{nome}}, foi um prazer atender você!
Sua opinião é muito importante para nós.
Avalie nossa clínica no Google: {{link_avaliacao}}
```

---

## Rate Limits e Boas Práticas

- **Z-API**: sem rate limit documentado, mas recomenda-se intervalo mínimo de 2-5s entre mensagens em campanhas em massa
- **Anti-spam**: nunca enviar mais de 1 mensagem não solicitada por semana para o mesmo número
- **Horário**: disparos de campanha entre 08h e 20h (fuso da clínica)
- **Opt-out**: sempre incluir opção "SAIR" e processar via webhook
- **Logs**: registrar todos os envios em `campanha_envios` e `logs`

---

## Tratamento de Erros

| Erro Z-API | Ação |
|------------|------|
| `disconnected` | Notificar admin da clínica para reconectar WhatsApp |
| `phone_not_found` | Marcar mensagem como `failed`, notificar equipe |
| `message_failed` | Retry automático 1x após 5 min, depois `failed` |
| `rate_limited` | Backoff exponencial: 1min, 5min, 15min |
