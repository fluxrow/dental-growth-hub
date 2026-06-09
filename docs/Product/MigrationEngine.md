---
title: Migration Engine
status: architecture
last_updated: 2026-06-08
---

# DentalFlux — Migration Engine

> Arquitetura do motor de importação de dados de clínicas existentes.
> Status: Documentação pré-implementação.

---

## Objetivo

Toda clínica que adota o DentalFlux já possui dados existentes em algum formato.
O Migration Engine elimina a barreira de adoção ao transformar dados brutos
em pacientes, oportunidades e cobranças estruturadas no Supabase.

A importação bem-sucedida é o gatilho para o **Diagnóstico Inicial da Clínica**
(ver `ClinicDiagnostic.md`).

---

## Fontes Suportadas

### Fase 1 (MVP)

| Fonte         | Formato             | Método             |
| ------------- | ------------------- | ------------------ |
| Excel         | `.xlsx`, `.xls`     | Upload de arquivo  |
| CSV           | `.csv`              | Upload de arquivo  |
| Google Sheets | URL pública/privada | OAuth + Sheets API |

### Fase 2 (Roadmap)

| Fonte                      | Integração                         |
| -------------------------- | ---------------------------------- |
| Clinicorp                  | API REST                           |
| Dental Office              | Exportação CSV estruturada         |
| iDental                    | API (a validar)                    |
| Fácil Odonto               | Exportação via planilha            |
| Sistema próprio da clínica | Importação genérica com mapeamento |

---

## As 6 Etapas do Migration Engine

### Etapa 1 — Upload

**Entrada:** Arquivo (`.xlsx`, `.csv`) ou URL do Google Sheets

**Ações:**

- Validar extensão e tamanho (máx. 50MB)
- Upload para Supabase Storage: `migrations/{clinic_id}/{timestamp}_{filename}`
- Criar registro em `migration_jobs` com `status = 'uploaded'`
- Retornar `job_id` para polling de status

**Restrições:**

- Apenas arquivos do próprio usuário (RLS via clinic_id)
- Máximo 50.000 linhas por importação
- Formatos aceitos na Fase 1: `.csv`, `.xlsx`, `.xls`

---

### Etapa 2 — Leitura (Parsing)

**Processamento server-side (Supabase Edge Function):**

Para CSV:

```
Detectar encoding (UTF-8, ISO-8859-1, Windows-1252)
Detectar delimitador (vírgula, ponto-e-vírgula, tab)
Detectar se tem header na primeira linha
Extrair array de { headers[], rows[][] }
```

Para Excel:

```
Ler workbook via SheetJS (xlsx)
Listar abas disponíveis → solicitar seleção ao usuário se múltiplas
Extrair dados da aba selecionada como array de objetos
```

Para Google Sheets:

```
OAuth flow com scope: spreadsheets.readonly
Listar abas → solicitar seleção
Extrair via Sheets API v4: spreadsheets.values.get
```

**Saída:** `{ headers: string[], preview: object[10], totalRows: number }`

Atualizar `migration_jobs.status = 'parsed'`

---

### Etapa 3 — Mapeamento (Column Mapping)

**Interface:** Tela onde o usuário associa colunas da planilha aos campos do DentalFlux.

**Campos alvo (tabela `pacientes`):**

| Campo DentalFlux | Obrigatório | Tipo    | Normalização                      |
| ---------------- | ----------- | ------- | --------------------------------- |
| `name`           | Sim         | TEXT    | Trim + Title Case                 |
| `phone`          | Sim         | TEXT    | Normalizar para E.164             |
| `email`          | Não         | TEXT    | Lowercase + trim                  |
| `status`         | Não         | ENUM    | Mapeamento de valores             |
| `last_visit_at`  | Não         | DATE    | Múltiplos formatos aceitos        |
| `ltv`            | Não         | NUMERIC | Remover R$, vírgulas, pontos      |
| `source`         | Não         | TEXT    | Livre                             |
| `tags`           | Não         | TEXT[]  | Split por vírgula/ponto-e-vírgula |

**Detecção automática de colunas:**

| Coluna detectada                           | Match automático  |
| ------------------------------------------ | ----------------- |
| "Nome", "Nome Paciente", "Patient"         | → `name`          |
| "Telefone", "Celular", "Phone", "WhatsApp" | → `phone`         |
| "Email", "E-mail"                          | → `email`         |
| "Última Visita", "Último Atendimento"      | → `last_visit_at` |
| "Valor Total", "LTV", "Receita"            | → `ltv`           |

Confiança do auto-match exibida ao usuário: Alta / Média / Baixa.

**Mapeamento de status:**

```
"Ativo"         → ativo
"Em Tratamento" → tratamento
"Inativo"       → inativo
"Alta"          → ativo
"Desistiu"      → inativo
[qualquer outro] → inativo (default)
```

Atualizar `migration_jobs.status = 'mapped'`, salvar em `migration_jobs.column_map JSONB`

---

### Etapa 4 — Validação

**Classificação de cada linha:**

| Classificação | Critério                                           | Ação                          |
| ------------- | -------------------------------------------------- | ----------------------------- |
| `valid`       | Todos os campos obrigatórios presentes e válidos   | Importar                      |
| `warning`     | Campos opcionais ausentes ou mal formatados        | Importar com alerta           |
| `duplicate`   | Phone já existe em `pacientes` para este clinic_id | Perguntar: atualizar ou pular |
| `error`       | Campo obrigatório ausente ou inválido              | Excluir da importação         |

**Validações por campo:**

`phone`:

- Remover caracteres não numéricos: `55 (11) 9 9999-9999` → `5511999999999`
- Validar: 10–13 dígitos, prefixo 55 ou adicionar automaticamente
- Erro se inválido após normalização

`last_visit_at`:

- Tentar parsear: `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`, timestamp
- Warning se não reconhecido, NULL se impossível

`email`:

- Regex básico: `\S+@\S+\.\S+`
- Warning se inválido, NULL

`name`:

- Erro se vazio ou `< 2 caracteres`

**Relatório de validação:**

```typescript
interface ValidationReport {
  total: number;
  valid: number;
  warnings: number;
  duplicates: number;
  errors: number;

  errorRows: Array<{ row: number; field: string; value: string; reason: string }>;
  warningRows: Array<{ row: number; field: string; value: string; suggestion: string }>;
  duplicateRows: Array<{ row: number; existingPatientId: string; phone: string }>;
}
```

Atualizar `migration_jobs.status = 'validated'`, salvar em `migration_jobs.validation_report JSONB`

---

### Etapa 5 — Importação

**Após aprovação do usuário:**

```
Para cada linha válida ou warning:
  1. Normalizar campos conforme regras
  2. INSERT INTO pacientes (clinic_id, name, phone, ...)
     ON CONFLICT (clinic_id, phone)
       DO UPDATE  -- se usuário escolheu "atualizar duplicatas"
       ou SKIP    -- se usuário escolheu "ignorar duplicatas"
  3. Registrar em migration_job_rows (row_number, patient_id, status, error_msg)

Processar em batches de 500 linhas
Atualizar migration_jobs.progress_pct após cada batch
Emitir evento Supabase Realtime para barra de progresso no frontend
```

**Tabela `migration_jobs`:**

```sql
id                UUID PK
clinic_id         UUID FK → clinicas.id
source_type       TEXT   -- 'csv','xlsx','google_sheets'
source_url        TEXT   -- storage URL ou sheets URL
status            TEXT   -- uploaded→parsed→mapped→validated→importing→done→error
column_map        JSONB
validation_report JSONB
progress_pct      INTEGER DEFAULT 0
total_rows        INTEGER
imported_rows     INTEGER DEFAULT 0
skipped_rows      INTEGER DEFAULT 0
error_rows        INTEGER DEFAULT 0
created_by        UUID FK → usuarios.id
started_at        TIMESTAMPTZ
completed_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ
```

---

### Etapa 6 — Diagnóstico

**Após `status = 'done'`, disparar automaticamente:**

```
POST /api/clinic/run-diagnostic
{ jobId, clinicId }
```

Calcula e persiste o Diagnóstico Inicial (ver `ClinicDiagnostic.md`)
e redireciona para a tela de resultado.

**Tela de conclusão exibe:**

- Total de pacientes importados
- Pacientes inativos identificados
- Cobranças pendentes encontradas (se coluna de valor foi mapeada)
- Potencial de recuperação estimado
- CTA: "Ver diagnóstico completo"

---

## Fluxo de Telas (UX)

```
/app/importar
  │
  ├── Step 1: Upload
  │   └── Drag & drop ou seleção de arquivo / URL Google Sheets
  │
  ├── Step 2: Preview
  │   └── Tabela com primeiras 10 linhas + seleção de aba (Excel/Sheets)
  │
  ├── Step 3: Mapeamento
  │   └── "Sua coluna" → "Campo DentalFlux" (auto-match + override manual)
  │
  ├── Step 4: Validação
  │   └── X válidos, Y warnings, Z erros + lista detalhada
  │   └── CTA: "Importar X pacientes" ou "Corrigir erros"
  │
  ├── Step 5: Importando...
  │   └── Barra de progresso em tempo real (Supabase Realtime)
  │
  └── Step 6: Diagnóstico
      └── Resultado + métricas + CTA para oportunidades
```

---

## Tratamento de Erros Comuns

| Erro                        | Mensagem ao usuário                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Arquivo corrompido          | "Não conseguimos ler este arquivo. Tente exportar novamente do Excel."                         |
| Encoding inválido           | "Arquivo com caracteres especiais. Salve como UTF-8 no Excel."                                 |
| Sem coluna de nome          | "Não encontramos uma coluna de nomes. Verifique o mapeamento."                                 |
| Sem coluna de telefone      | "A coluna de telefone é obrigatória para importação."                                          |
| 0 linhas válidas            | "Nenhuma linha pôde ser importada. Verifique os erros abaixo."                                 |
| Google Sheets sem permissão | "Planilha privada. Compartilhe como 'Qualquer pessoa com o link' ou conecte sua conta Google." |
