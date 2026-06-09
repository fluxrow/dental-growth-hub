## Problema

Ao se cadastrar, o Supabase envia um email de confirmação. O link desse email aponta para o domínio padrão do Lovable Cloud (não para a sua app), então ao clicar você cai numa tela de login estranha do Lovable em vez de voltar para o DentalFlux autenticado. Sem confirmar, o login falha com `Email not confirmed` (visto nos logs de auth agora há pouco).

Em ambiente de desenvolvimento de SaaS é comum **desligar** essa etapa para iterar rápido. Em produção você reativa e configura um domínio de email próprio (Lovable Emails) com templates da marca DentalFlux.

## Plano

**1. Desativar `Confirm email` no Supabase Auth (ambiente atual)**
- Via `supabase--configure_auth` com `auto_confirm_email: true`.
- Efeito: novos signups entram autenticados imediatamente; o `signInWithPassword` logo depois do `signUp` funciona sem precisar clicar em link nenhum.
- Mantém: `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true` (proteção contra senhas vazadas).

**2. Confirmar manualmente o usuário já criado (`fbcfarias@icloud.com`)**
- Esse usuário foi criado **antes** da mudança, então está com `email_confirmed_at = null`.
- Rodar uma migration SQL pontual: `UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'fbcfarias@icloud.com' AND email_confirmed_at IS NULL;`
- Assim você consegue logar com a conta que já cadastrou, sem precisar criar outra.

**3. Validar o fluxo**
- Você faz login em `/auth` com `fbcfarias@icloud.com`.
- Cai no `/onboarding` (porque ainda não tem clínica).
- Conclui o onboarding → clínica criada, role `admin`, redireciona pro `/app`.
- Pode clicar em "Carregar dados demo" no último passo pra já ter pacientes/oportunidades pra explorar a Importação, Diagnóstico, etc.

## Fora do escopo desta etapa (fica pra depois)

- Configurar **Lovable Emails** com domínio próprio (`notify.dentalflux.com.br` por ex.) e templates de auth com a marca — recomendado antes de abrir pra clientes reais.
- Reativar `Confirm email` quando os templates estiverem prontos.
- Adicionar **Google sign-in** (recomendado por padrão pra SaaS B2B; reduz fricção). Posso configurar numa próxima sprint.

## Detalhes técnicos

- `auto_confirm_email` é uma flag do GoTrue (Supabase Auth) — não muda código da app.
- A migration de update em `auth.users` é uma exceção pontual e segura (campo gerenciado pelo próprio Supabase, mas alterável por service role). Não fica como padrão.
- Não há mudanças em arquivos `.tsx` neste plano — é só config de backend + 1 migration de 1 linha.

Confirma que posso aplicar?