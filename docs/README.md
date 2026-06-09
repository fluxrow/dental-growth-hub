# DentalFlux — Documentação Técnica

> Repositório: https://github.com/fluxrow/dental-growth-hub  
> Stack: React 19 + TanStack Start + Supabase + Z-API  
> Última atualização: 2026-06-09

---

## Índice

### Produto
- [ProductMap.md](./Product/ProductMap.md) — Mapa completo de telas e funcionalidades

### Técnico
- [DatabaseModel.md](./Technical/DatabaseModel.md) — Modelagem do banco de dados (Lovable Cloud / PostgreSQL)
- [ZAPIIntegration.md](./Technical/ZAPIIntegration.md) — Integração WhatsApp via Z-API
- [AuditReport.md](./Technical/AuditReport.md) — Relatório de auditoria

### Desenvolvimento
- [Sprint01.md](./Development/Sprint01.md) — ✅ Concluída: Cloud + Auth + Multi-tenant + Pacientes/Oportunidades/Atividade
- [Sprint02.md](./Development/Sprint02.md) — Próxima: Z-API + Conversas + Confirmações

---

## Status Atual (pós-Sprint 01)

| Módulo | Frontend | Backend | Integração |
|--------|----------|---------|-----------|
| Landing Page | ✅ | — | — |
| Auth (`/auth`) | ✅ | ✅ Cloud | — |
| Onboarding | ✅ | ✅ Cloud | — |
| Dashboard | ✅ Mock | 🔨 Sprint 02 | — |
| Oportunidades | ✅ | ✅ Cloud (real toggle) | — |
| Conversas | ✅ Mock | 🔨 Sprint 02 | 🔨 Sprint 02 (Z-API) |
| Pacientes | ✅ | ✅ Cloud (real toggle) | — |
| Atividade | ✅ | ✅ Cloud (real toggle) | — |
| Campanhas | ✅ Mock | 🔨 Sprint 03 | 🔨 Sprint 03 (Z-API) |
| Automações | ✅ Mock | 🔨 Sprint 03 | 🔨 Sprint 03 (Z-API) |
| Cobranças | ✅ Mock | 🔨 Sprint 03 | 🔨 Sprint 03 (Stripe) |
| Avaliações | ✅ Mock | 🔨 Sprint 04 | 🔨 Sprint 04 (Google) |
| Relatórios | ✅ Mock | 🔨 Sprint 04 | — |
| Configurações | ✅ Mock | 🔨 Sprint 02 | — |
| Portal Paciente | ✅ Mock | 🔨 Sprint 03 | — |

### Toggle Demo / Real
Header do `AppShell` tem um toggle:
- **Real** (default) — lê do Lovable Cloud / Supabase
- **Demo** — usa mocks (para apresentação)

