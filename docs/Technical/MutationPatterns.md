# Mutation Patterns — Dr.Flux

> Convenção de escrita ao banco de dados e invalidação de cache para todo o app.
> Última atualização: 2026-06-09

---

## Regra fundamental

**Zero writes diretos ao Supabase em `src/routes/` ou `src/components/`.**

Toda mutation passa por um `createServerFn` em `src/lib/*.functions.ts`.
O cliente só lê (queries via TanStack Query) e chama server fns para escrever.

```
┌──────────────────────────────────────────────┐
│  src/routes/ ou src/components/              │
│                                              │
│  ┌─────────────┐     ┌──────────────────┐   │
│  │ TanStack    │     │  server fn call  │   │
│  │ Query (READ)│     │  (WRITE via RPC) │   │
│  └──────┬──────┘     └────────┬─────────┘   │
│         │                     │             │
└─────────┼─────────────────────┼─────────────┘
          │                     │
          ▼                     ▼
    supabase.from()      createServerFn
    .select(...)         + requireSupabaseAuth
    (anon client,        (JWT do usuário,
     RLS ativo)           RLS ativo no servidor)
```

---

## Localização dos arquivos

| Entidade         | Arquivo                               | Server fns disponíveis                                          |
| ---------------- | ------------------------------------- | --------------------------------------------------------------- |
| `clinicas`       | `src/lib/clinicas.functions.ts`       | `updateClinic`, `setClinicLogoUrl` (via onboarding)             |
| `onboarding`     | `src/lib/onboarding.functions.ts`     | `completeOnboarding`, `setClinicLogoUrl`                        |
| `pacientes`      | `src/lib/pacientes.functions.ts`      | `createPaciente`, `updatePaciente`                              |
| `oportunidades`  | `src/lib/oportunidades.functions.ts`  | `createOportunidade`, `advanceOportunidade`, `loseOportunidade` |
| `googleCalendar` | `src/lib/googleCalendar.functions.ts` | `startGoogleCalendarConnect`, `disconnectGoogleCalendar`        |

---

## Convenção de `queryClient.invalidateQueries`

Após cada mutation, invalide as queries pelo `queryKey` correto:

```ts
const queryClient = useQueryClient();

// ── clinicas / perfil ─────────────────────────────────────────────────────
// Quando: updateClinic, setClinicLogoUrl, completeOnboarding
queryClient.invalidateQueries({ queryKey: ["profile", userId] });

// ── pacientes ─────────────────────────────────────────────────────────────
// Quando: createPaciente, updatePaciente
queryClient.invalidateQueries({ queryKey: ["pacientes"] });

// ── oportunidades ─────────────────────────────────────────────────────────
// Quando: createOportunidade, advanceOportunidade, loseOportunidade
queryClient.invalidateQueries({ queryKey: ["oportunidades"] });

// ── atividades ────────────────────────────────────────────────────────────
// Quando: qualquer ação que gere uma nova atividade no feed
queryClient.invalidateQueries({ queryKey: ["atividades"] });

// ── profile global (invalidar tudo do usuário) ────────────────────────────
// Quando: mudar clinic_id ou dados críticos de perfil
queryClient.invalidateQueries({ queryKey: ["profile"] });
```

---

## Padrão de handler com feedback ao usuário

```tsx
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    await myServerFn({ data: { ... } });
    queryClient.invalidateQueries({ queryKey: ["relevant-key"] });
    toast.success("Salvo!");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao salvar");
  } finally {
    setSaving(false);
  }
};

// No JSX:
<button onClick={handleSave} disabled={saving}>
  {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Salvar"}
</button>
```

---

## Middleware obrigatório

Todo server fn que escreve no banco usa `requireSupabaseAuth`:

```ts
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const minhaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])          // ← obrigatório
  .inputValidator((input: { ... }) => { ... })
  .handler(async ({ data, context }) => {
    // context.supabase  → cliente com JWT do usuário (RLS ativo)
    // context.userId    → string UUID do usuário autenticado
  });
```

**Nunca usar `supabaseAdmin` em server fns de escrita de usuário** — ele bypass RLS.
`supabaseAdmin` é reservado para callbacks OAuth (`api/public/google/callback.ts`) e
operações de sistema sem contexto de usuário.

---

## Storage (exceção intencional)

Upload de arquivos (`supabase.storage.upload()`) **permanece client-side** porque
o `File` object vive no browser e não pode ser serializado para o servidor.

Após o upload, persista o path via server fn:

```ts
// ❌ Direto no cliente após upload — não faça
await supabase.from("clinicas").update({ logo_url: path }).eq("id", id);

// ✅ Via server fn
await setClinicLogoUrl({ data: { clinicId, logoUrl: path } });
```

---

## Checklist para nova mutation

- [ ] Arquivo `src/lib/{entidade}.functions.ts` existe?
- [ ] Server fn usa `.middleware([requireSupabaseAuth])`?
- [ ] `inputValidator` valida campos obrigatórios?
- [ ] Handler usa `context.supabase` (não `supabaseAdmin`)?
- [ ] Chamador invalida o `queryKey` correto após sucesso?
- [ ] UI tem estado `saving` + `disabled` + `Loader2`?
- [ ] Erro é capturado e mostrado via `toast.error`?
