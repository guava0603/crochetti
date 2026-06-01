# Components layout

```
components/
├── shell/          # App chrome (layout, footer, footbar)
├── shared/         # Reusable UI with no product rules (buttons, inputs, ui, …)
├── features/       # Product areas (pages + domain widgets)
│   ├── home/
│   ├── project/    # ProjectPage, lists, component-card, design-print/
│   ├── record/     # RecordPage, widgets, record-print/
│   ├── user/
│   ├── add-project/  # AddProjectPage + form/
│   ├── crochet-editor/  # CrochetTable, BottomToolbar, Wizard
│   ├── achievements/
│   ├── wish/
│   ├── auth/
│   ├── about/
│   ├── debug/
│   └── quick-start/
└── modals/         # Dialogs grouped by domain
    ├── shell/      # ModalShell
    ├── global/
    ├── project/
    ├── record/
    ├── print/
    └── user/
```

Route shells stay in `src/views/` (data + API). Screen UI lives under `features/*/`.

Import convention: `@/components/{shell|shared|features|modals}/…`

To update paths after moves, run `node scripts/update-component-imports.mjs`.
