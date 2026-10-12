# Ghostrank — shadcn-first UI and FlexLayout contract

**Decision:** approved 2026-10-12. **Scope:** fictional in-game operating system presentation only.  
**Tracking:** [ten distro modes](https://github.com/MohamedXIV/ghostrank/issues/166) · [FlexLayout window system](https://github.com/MohamedXIV/ghostrank/issues/167).

## 1. Source-of-truth priority

1. For controls, overlays, menus, tables, forms, disclosure and theme tokens, consult **[shadcn/ui's current docs and registry](https://ui.shadcn.com/)** first. Use the upstream component source with the project's React/Next/Tailwind versions. Prefer its existing components, accessibility patterns, `class-variance-authority` variants and Tailwind semantic classes over a homegrown parallel implementation.
2. **shadcn/ui does not implement a desktop window manager.** Use [caplin/FlexLayout](https://github.com/caplin/FlexLayout) for docked tabs, splits, resize, maximization and floating panels. Use supported exported API, not internal hooks or direct model mutation.
3. Create custom components only for game-only surfaces (network topology, evidence epistemics, terminal internals) or when neither library offers the required behavior. Compose upstream primitives; avoid expanding a generic mega-component or creating one file per 10-line helper.
4. Don't replace distinctive original app/art direction with a generic shadcn dashboard. No fake apps or fabricated data. Props and purchasing/command actions derive from authoritative world projections.

## 2. Distro × mode

Five distinct desktop families remain: Ghost/OS, Lattice, Velvet, Daybreak, Petal. Each **will support Light and Dark**, for ten visual modes; this is a *target*, **not currently shipped**.

| Family | Shipped mode | Missing mode to add | Stable silhouette |
| --- | --- | --- | --- |
| Ghost/OS | Ash (dark) | light | top bar and centered dock |
| Lattice | Grid (dark) | light | narrow left application rail |
| Velvet | Plum (dark) | light | floating edge shelf and layered windows |
| Daybreak | Warm (light) | dark | full-width bottom taskbar |
| Petal | Light and Night | none | expressive floating dock |

A **distro** controls shape, placements, icon family, wallpaper composition, motion and window chrome. A **mode** controls the semantic color/material tokens **without changing that identity**. An **app** remains an authored view within that OS.

Use the [shadcn semantic token scheme](https://ui.shadcn.com/docs/theming): `background/foreground`, `card/card-foreground`, `primary/primary-foreground`, `muted/muted-foreground`, `popover/popover-foreground`, `border`, `input`, `ring`, `destructive`, etc., mapped to existing distro presentation variables. Keep truth/evidence/danger provenance tokens separately identifiable and accessible in both modes. No broad hand-written CSS overrides to emulate a built-in shadcn component.

**Scope boundary:** the shadcn Next.js dark-mode guide commonly attaches `next-themes` to `html`, but Ghostrank's theme is **inside the player's simulated desktop**. Do not impose a global page `dark` state that overrides the physical room or boot view. The existing `usePresentationStore` and `data-distro`/`data-theme` are the OS truth and persistence mechanisms; adapt standard semantic tokens to that scoped selection. Existing saved themes must normalize without breaking active runs.

## 3. FlexLayout authority

Target npm dependency: `flexlayout-react` from [caplin/FlexLayout](https://github.com/caplin/FlexLayout), MIT, React 19-compatible, ESM-only. Verify current published version before installing and update `package-lock.json` together with `package.json` (upstream GitHub `master` reports version `0.11.1` as of this decision).

- **Game runtime/CommandBus/TinyBase:** owns actions, outcomes, evidence, market, terminal state and simulation time. Unchanged.
- **Zustand `useUiStore`:** which of the six real apps are open and focused; supports current launcher actions and Alt+1…6/F1/Escape/Alt+W.
- **FlexLayout `Model`:** tree of docked tabs, splits, floating panels and layout geometry; serialize only validated presentation state. Use `Model.fromJson`, `model.toJson`, `model.doAction(Actions.*)` and the public `<Layout>`/factory interface. Bridge open/close/focus both ways and avoid bidirectional update loops.
- **Window behavior:** prefer **in-page floating panels** to preserve fictional-OS feeling and avoid browser popup blockers. Native browser popouts are optional deferred enhancement; they need a second document/style/focus strategy.
- **Theming:** use FlexLayout's shipped `combined.css` and its documented `--flexlayout-*` variables mapped to shadcn semantic distro tokens. No forked FlexLayout CSS/JS bundle.

Default layouts may vary by distro while the six apps retain exactly the same world capabilities. Test real dragging/resizing/close/reopen, tabs/splits/floating, actual keyboard focus and mobile fallback. Do **not** mislabel screenshots, technically green CI or automated interactions as an unassisted human playtest.

## 4. Execution order

1. Audit/normalize existing source-owned shadcn primitives against upstream. Complete theme token coverage and mode selector; test all ten combinations, high-contrast and text scaling.
2. Install and integrate FlexLayout in a **separate bounded PR**, replacing hardcoded absolute `WindowFrame` geometry only when real E2E behavior is green.
3. Continue individual Market/Recon design improvements independently of window management. No wholesale app rewrite, no game-logic changes, no parallel second state model.

Keep these independent: [#166](https://github.com/MohamedXIV/ghostrank/issues/166) theme system; [#167](https://github.com/MohamedXIV/ghostrank/issues/167) FlexLayout. Existing Shell PR #164 is merged, Market PR #165 remains separately reviewable.
