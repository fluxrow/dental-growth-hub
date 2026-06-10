# QA de Responsividade — Checklist

> Rode esta checklist sempre que alterar componentes principais
> (`Dashboard`, `Leads`, `Conversas`, `Pacientes`, `Oportunidades`,
> `Triagem`, `AppShell`, qualquer header/card/tabela compartilhada).

---

## Componentes principais cobertos

| Componente / Rota   | Arquivo                                |
| ------------------- | -------------------------------------- |
| Dashboard           | `src/routes/app.index.tsx`             |
| Leads / Oportunidades | `src/routes/app.oportunidades.tsx`   |
| Triagem             | `src/routes/app.triagem.tsx`           |
| Conversas           | `src/routes/app.conversas.tsx`         |
| Pacientes           | `src/routes/app.pacientes.tsx`         |
| Shell / Navegação   | `src/components/app/app-shell.tsx`     |
| Cards de KPI        | `src/components/app/kpi-card.tsx`      |

---

## Viewports obrigatórios

Testar **cada componente alterado** nos 3 tamanhos:

- **Mobile** — `375 × 812` (iPhone padrão)
- **Tablet** — `768 × 1024` (iPad retrato)
- **Desktop** — `1440 × 900`

Trocar no preview pelo botão de device (acima do iframe) ou via tool
`preview_ui--set_preview_device_viewport`.

---

## Checklist por viewport

### 1. Layout & overflow

- [ ] Nenhum scroll horizontal indesejado (`overflow-x` na raiz da página)
- [ ] Headers de cards/listas não quebram nem cortam título
- [ ] Textos longos truncam com `truncate` (não vazam o container)
- [ ] Ícones e avatares têm `shrink-0`
- [ ] Containers de texto em flex/grid têm `min-w-0`
- [ ] Grids viram coluna única no mobile (`grid-cols-1 sm:grid-cols-2 ...`)

### 2. Tipografia & espaçamento

- [ ] Tamanhos de fonte escalam (`text-xl sm:text-2xl`) onde necessário
- [ ] Padding interno de cards confortável em mobile (mínimo `p-3`)
- [ ] Espaçamento entre seções não some no mobile
- [ ] Linhas de KPI usam tabular-nums (alinhamento de números)

### 3. Interação & toque

- [ ] Botões e links têm alvo mínimo 40 × 40 px no mobile
- [ ] Modais / drawers cabem na viewport (não exigem scroll lateral)
- [ ] Menus, popovers e tooltips não saem da tela
- [ ] Formulários: inputs com largura total no mobile (`w-full`)

### 4. Navegação

- [ ] Sidebar colapsa para drawer no mobile
- [ ] Tabs/segmented controls fazem scroll horizontal quando excedem
- [ ] Breadcrumbs colapsam (ex.: mostrar só último nível no mobile)

### 5. Estados

- [ ] Loading skeleton respeita as colunas/altura do conteúdo final
- [ ] Empty state centralizado e legível em todos os tamanhos
- [ ] Mensagens de erro não quebram layout

### 6. Validação técnica

- [ ] Console limpo (sem warnings de layout/React)
- [ ] DevTools → Toggle Device Mode → testar `375`, `768`, `1440`
- [ ] Comparar antes/depois com screenshot em cada viewport

---

## Workflow recomendado

1. Faça as alterações no componente.
2. Abra o preview no viewport **mobile** primeiro (mais restritivo).
3. Percorra a checklist acima.
4. Repita em **tablet** e **desktop**.
5. Anexe screenshot dos 3 viewports no PR/commit quando a mudança for visual.
6. Se algo quebrar, aplique o padrão de
   [Responsive Layout Patterns](#padrão-de-correção-rápida) abaixo.

---

## Padrão de correção rápida

Para qualquer row com texto + widget fixo:

```tsx
<header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
  <div className="flex min-w-0 items-center gap-3">
    <Avatar className="shrink-0" />
    <h1 className="truncate text-xl font-semibold sm:text-2xl">{title}</h1>
  </div>
  <ActionWidget />
</header>
```

Regras imutáveis:

- `min-w-0` em todo container flex/grid com texto
- `shrink-0` em ícones/avatares de tamanho fixo
- `truncate` em títulos de uma linha
- `grid` no mobile → `flex` no `sm:` quando há múltiplos elementos

---

_Atualizado: 2026-06-10_
