# DentalFlux

## Geração automática do `routeTree.gen.ts`

O TanStack Router usa o arquivo `src/routeTree.gen.ts` para registrar todas
as rotas do app. Esse arquivo é **auto-gerado** — nunca deve ser editado à
mão.

### Como funciona

1. **Durante `vite dev` / `vite build`** o plugin do TanStack Router observa
   `src/routes/` e regenera o `routeTree.gen.ts` automaticamente sempre que
   um arquivo de rota é criado, renomeado ou removido.
2. **Antes do dev server subir** (`predev`) e **antes de cada build**
   (`prebuild`), o script `scripts/gen-routes.mjs` roda automaticamente e
   garante que o arquivo exista. Isso evita o erro
   `Failed to load url ./routeTree.gen` caso o arquivo tenha sido apagado
   por engano, perdido em um checkout sujo, ou nunca tenha sido gerado em
   um clone novo.

Os hooks já estão registrados no `package.json`:

```json
"predev": "node scripts/gen-routes.mjs",
"prebuild": "node scripts/gen-routes.mjs",
"gen:routes": "node scripts/gen-routes.mjs"
```

### Quando rodar `scripts/gen-routes.mjs` manualmente

Rode `bun run gen:routes` (ou `node scripts/gen-routes.mjs`) quando:

- Acabou de clonar o repositório e o `src/routeTree.gen.ts` não existe.
- Você apagou ou moveu o `routeTree.gen.ts` e o preview ficou em branco
  com o erro `Cannot access 'AppRouteWithChildren' before initialization`
  ou `Failed to load url ./routeTree.gen`.
- Você adicionou/renomeou rotas com o dev server desligado e quer atualizar
  o tipo antes de rodar `tsc` ou `eslint`.
- O CI/CD precisa validar tipos sem subir o Vite dev (ex.: lint isolado).

### Quando **não** precisa rodar

- Durante o desenvolvimento normal com `bun run dev` — o plugin já regenera
  a cada mudança.
- Antes de `bun run build` / `bun run build:dev` — o hook `prebuild`
  já cuida disso.

### Regras importantes

- **Nunca edite** `src/routeTree.gen.ts` manualmente. Qualquer alteração
  será sobrescrita na próxima geração.
- Adicione rotas criando arquivos em `src/routes/` seguindo a convenção
  flat dot-separated (ex.: `app.admin.cs-queue.tsx` → `/app/admin/cs-queue`).
- Se o arquivo gerado parecer corrompido ou desatualizado, delete-o e rode
  `bun run gen:routes` para recriar do zero.
