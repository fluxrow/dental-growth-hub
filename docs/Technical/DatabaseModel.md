# DentalFlux — Database Model

> Última atualização: 2026-06-08  
> Banco: Supabase (PostgreSQL)  
> Status: Modelagem pré-implementação

---

## Princípios

- **Multi-tenant via `clinic_id`**: todas as tabelas de negócio carregam `clinic_id` como FK
- **Row Level Security (RLS)**: habilitado em todas as tabelas — políticas baseadas em `clinic_id` e `user_id`
- **Soft delete**: usar `deleted_at TIMESTAMPTZ` em vez de DELETE físico nas entidades principais
- **UUID**: todas as PKs são `UUID DEFAULT gen_random_uuid()`
- **Timestamps**: `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`

---

## Entidades

### `clinicas`
Raiz do multi-tenant. Cada clínica é uma tenant isolada.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | TEXT NOT NULL | |
| slug | TEXT UNIQUE NOT NULL | ex: "clinica-sorrir" |
| cnpj | TEXT | |
| address | TEXT | |
| city | TEXT | |
| phone | TEXT | |
| logo_url | TEXT | |
| timezone | TEXT | DEFAULT 'America/Sao_Paulo' |
| tone | TEXT | acolhedora / institucional / descontraida |
| plan | TEXT | starter / pro / business |
| plan_expires_at | TIMESTAMPTZ | |
| zapi_instance | TEXT | |
| zapi_token | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `usuarios`
Membros da equipe com acesso à clínica. Um usuário pode pertencer a múltiplas clínicas.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | = auth.users.id |
| clinic_id | UUID FK | -> clinicas.id |
| email | TEXT NOT NULL | |
| name | TEXT NOT NULL | |
| role | TEXT | admin / recepcao / dentista / marketing |
| avatar_url | TEXT | |
| active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, email)`, `(clinic_id, role)`

---

### `pacientes`
Base de pacientes da clínica.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| name | TEXT NOT NULL | |
| phone | TEXT NOT NULL | formato E.164: +5511999999999 |
| email | TEXT | |
| status | TEXT | ativo / tratamento / inativo / recuperado |
| source | TEXT | ex: "Google Ads", "Indicação" |
| ltv | NUMERIC(10,2) | DEFAULT 0 |
| last_visit_at | TIMESTAMPTZ | |
| next_action | TEXT | |
| tags | TEXT[] | ex: ['implante','particular','vip'] |
| consent_lgpd | BOOLEAN | DEFAULT false |
| consent_at | TIMESTAMPTZ | |
| anonymized_at | TIMESTAMPTZ | soft delete LGPD |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, status)`, `(clinic_id, phone)`, `(clinic_id, source)`

---

### `oportunidades`
Pipeline de conversão de leads em pacientes ativos.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| patient_id | UUID FK | -> pacientes.id (NULL se não convertido) |
| name | TEXT NOT NULL | nome do lead |
| phone | TEXT | |
| stage | TEXT | novo / contato / agendada / confirmada / compareceu / tratamento / ativo / perdida |
| source | TEXT | |
| value | NUMERIC(10,2) | |
| owner_id | UUID FK | -> usuarios.id |
| next_action | TEXT | |
| days_in_stage | INTEGER GENERATED | EXTRACT(day FROM now() - stage_changed_at) |
| stage_changed_at | TIMESTAMPTZ | DEFAULT now() |
| lost_reason | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, stage)`, `(clinic_id, owner_id)`, `(clinic_id, source)`

---

### `conversas`
Thread de conversa por paciente/canal.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| patient_id | UUID FK | -> pacientes.id |
| channel | TEXT | whatsapp / email / sms |
| phone | TEXT NOT NULL | |
| status | TEXT | novo / aguardando / agendado / ativo / fechado |
| unread | INTEGER | DEFAULT 0 |
| assigned_to | UUID FK | -> usuarios.id |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, status)`, `(clinic_id, patient_id)`, `(clinic_id, assigned_to)`

---

### `mensagens`
Mensagens individuais dentro de uma conversa.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| conversation_id | UUID FK | -> conversas.id |
| from_type | TEXT | patient / clinic / bot |
| sender_id | UUID FK | -> usuarios.id (NULL se patient/bot) |
| content | TEXT NOT NULL | |
| media_url | TEXT | |
| media_type | TEXT | image / audio / document / video |
| status | TEXT | sent / delivered / read / failed |
| zapi_message_id | TEXT | ID retornado pela Z-API |
| created_at | TIMESTAMPTZ | |

**Índices:** `(conversation_id, created_at)`, `(clinic_id, zapi_message_id)`

---

### `campanhas`
Campanhas de disparo em massa para segmentos de pacientes.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| name | TEXT NOT NULL | |
| type | TEXT | reativacao / confirmacao / cobranca / avaliacao |
| status | TEXT | rascunho / agendada / enviando / concluida / pausada |
| template | TEXT NOT NULL | variáveis: {{nome}}, {{clinica}}, etc. |
| audience | JSONB | filtros: status[], source[], tags[], last_visit_days |
| scheduled_at | TIMESTAMPTZ | |
| sent_at | TIMESTAMPTZ | |
| sent_count | INTEGER | DEFAULT 0 |
| opened_count | INTEGER | DEFAULT 0 |
| responded_count | INTEGER | DEFAULT 0 |
| converted_count | INTEGER | DEFAULT 0 |
| revenue | NUMERIC(10,2) | DEFAULT 0 |
| created_by | UUID FK | -> usuarios.id |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `campanha_envios`
Registro individual de cada envio de campanha.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| campaign_id | UUID FK | -> campanhas.id |
| patient_id | UUID FK | -> pacientes.id |
| phone | TEXT NOT NULL | |
| status | TEXT | pendente / enviado / entregue / lido / respondido / convertido / falhou |
| sent_at | TIMESTAMPTZ | |
| delivered_at | TIMESTAMPTZ | |
| read_at | TIMESTAMPTZ | |
| responded_at | TIMESTAMPTZ | |
| error_msg | TEXT | |
| created_at | TIMESTAMPTZ | |

---

### `automacoes`
Fluxos de automação baseados em eventos ou agendamentos.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| name | TEXT NOT NULL | |
| category | TEXT | confirmacoes / reativacoes / cobrancas / avaliacoes / followup |
| trigger_type | TEXT | schedule / event / webhook |
| trigger_config | JSONB | ex: {"days_before": 3, "event": "appointment_created"} |
| template | TEXT NOT NULL | |
| status | TEXT | ativo / pausado / rascunho |
| sent_count | INTEGER | DEFAULT 0 |
| response_rate | NUMERIC(5,2) | DEFAULT 0 |
| conversion_rate | NUMERIC(5,2) | DEFAULT 0 |
| revenue | NUMERIC(10,2) | DEFAULT 0 |
| created_by | UUID FK | -> usuarios.id |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `cobrancas`
Gestão de cobranças e inadimplência.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| patient_id | UUID FK | -> pacientes.id |
| description | TEXT NOT NULL | |
| value | NUMERIC(10,2) NOT NULL | |
| due_date | DATE NOT NULL | |
| status | TEXT | pendente / vencendo / atrasada / recuperada / paga / cancelada |
| days_overdue | INTEGER GENERATED | GREATEST(0, CURRENT_DATE - due_date) |
| payment_method | TEXT | pix / cartao / boleto / dinheiro |
| paid_at | TIMESTAMPTZ | |
| stripe_payment_intent | TEXT | |
| asaas_id | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, status)`, `(clinic_id, patient_id)`, `(clinic_id, due_date)`

---

### `avaliacoes`
Avaliações recebidas e pedidos enviados.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| patient_id | UUID FK | -> pacientes.id |
| rating | INTEGER | CHECK BETWEEN 1 AND 5 |
| text | TEXT | |
| sentiment | TEXT | positive / neutral / negative |
| source | TEXT | google / portal / direto |
| google_review_id | TEXT | |
| request_sent_at | TIMESTAMPTZ | |
| responded_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

### `notificacoes`
Feed de atividades e notificações internas.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| user_id | UUID FK | -> usuarios.id (NULL = broadcast clínica) |
| kind | TEXT | conversa / oportunidade / cobranca / avaliacao / sistema |
| category | TEXT | |
| title | TEXT NOT NULL | |
| detail | TEXT | |
| patient_id | UUID FK | -> pacientes.id |
| value | NUMERIC(10,2) | |
| read | BOOLEAN | DEFAULT false |
| read_at | TIMESTAMPTZ | |
| action_url | TEXT | |
| created_at | TIMESTAMPTZ | |

**Índices:** `(clinic_id, user_id, read)`, `(clinic_id, created_at DESC)`

---

### `portal_tokens`
Tokens únicos para acesso ao portal do paciente.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| patient_id | UUID FK | -> pacientes.id |
| token | TEXT UNIQUE NOT NULL | gerado: nanoid(21) |
| expires_at | TIMESTAMPTZ | NULL = sem expiração |
| accessed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

### `logs`
Log de auditoria e rastreabilidade.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| clinic_id | UUID FK | -> clinicas.id |
| user_id | UUID FK | -> usuarios.id |
| entity_type | TEXT NOT NULL | paciente / oportunidade / cobranca / ... |
| entity_id | UUID NOT NULL | |
| action | TEXT NOT NULL | created / updated / deleted / stage_changed / ... |
| payload | JSONB | diff de campos alterados |
| ip_address | INET | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## Relacionamentos

```
clinicas 1──n usuarios
clinicas 1──n pacientes
clinicas 1──n oportunidades
clinicas 1──n conversas
clinicas 1──n campanhas
clinicas 1──n automacoes
clinicas 1──n cobrancas
clinicas 1──n avaliacoes
clinicas 1──n notificacoes

pacientes 1──n oportunidades
pacientes 1──n conversas
pacientes 1──n cobrancas
pacientes 1──n avaliacoes
pacientes 1──n portal_tokens

conversas 1──n mensagens

campanhas 1──n campanha_envios
campanha_envios n──1 pacientes

usuarios 1──n oportunidades (owner)
usuarios 1──n conversas (assigned)
```

---

## Estratégia Multi-tenant

### Row Level Security (RLS)

Todas as tabelas terão RLS habilitado. Política padrão de isolamento por clínica:

```
Habilitar RLS na tabela
Criar policy "clinic_isolation" usando:
  clinic_id = (SELECT clinic_id FROM usuarios WHERE id = auth.uid())
```

### Função auxiliar

```
current_clinic_id() → UUID
  Retorna o clinic_id do usuário autenticado
  Usada internamente pelas policies RLS
```

---

## Índices de Performance (planejados)

| Índice | Tabela | Propósito |
|--------|--------|-----------|
| idx_conversas_unread | conversas(clinic_id, unread) WHERE unread > 0 | Busca de conversas não lidas |
| idx_cobrancas_due | cobrancas(clinic_id, due_date, status) | Cobranças por vencimento |
| idx_notif_unread | notificacoes(clinic_id, user_id, created_at DESC) WHERE read = false | Notificações não lidas |
| idx_portal_tokens_token | portal_tokens(token) UNIQUE | Lookup de token do portal |
