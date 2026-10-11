# Ghostrank Visual Reboot — Design Spec v1

**Status:** Written design spec approved by the user on 2026-10-11 for Superpowers implementation planning. **This approval does not authorize implementation code; the execution plan requires separate review/approval.**
**Scope:** Whole player-facing UI over multiple implementation phases, with an initial visual proof for OS Shell, Recon/Operations, and Market.
**Reference:** User-provided Market screenshot showing an unillustrated, text-first hardware catalog.
**Approach:** Superpowers architectural brainstorming. Not authorization to implement or merge UI changes.

## 1. Intent and success criteria

Ghostrank is an anonymous hacker-society simulation experienced primarily through an inhabited fictional computer. The redesign must feel like a **game**, not a monochrome spreadsheet, debug console, text wall, corporate admin dashboard, or overdecorated cyberpunk movie prop.

The user explicitly approved **A + B with touches of C**:
- **A — premium modern desktop OS** anchors the shell, window manager, navigation and standard interaction controls.
- **B — tactical cyber interface** anchors Recon, live operations, player-visible networks and evidence.
- **C — expressive neo-retro/illustrated accents** anchors product artwork, application iconography, fictional marks and character, without making the whole OS pixel-art or nostalgic.
- **shadcn/ui must be the actual shared foundation across the full React interface**, extensively themed for this fictional world; it must not be represented merely by a configuration file and one Button component.
- The design must improve art, logos, visual hierarchy, hardware/product presence and semantic imagery, not merely reformat textual cards.

**Outcomes to demonstrate before broad migration:**
1. A player can identify the current app and its purpose, primary action and actionable state by glancing, without reading paragraphs.
2. Market items are recognizably different classes of hardware, the price/owned/affordability relationship is legible, and shopping feels like interacting with an in-world store.
3. Recon puts meaningful player-known topology and operational stakes in the visual foreground; uncertainty and consequences remain honest.
4. The OS feels inhabited, coherent and customizable, while individual apps have their own brands.
5. The resulting design works at laptop/desktop and compact phone widths, keyboard-only, reduced motion, higher text scale and high contrast; readability is a primary feature.
6. Existing simulation authority and terminal/GUI command equivalence remain identical; no rank gate or invented knowledge is introduced.

## 2. Verified current starting point (2026-10-11, main 9def6635)

- `components.json` configures shadcn `new-york`, Tailwind CSS and Lucide; `src/lib/utils.ts` implements `cn`.
- `src/components/ui` holds a small set of shared components; `button.tsx` is a custom CVA/`ui-button-*` primitive. It is **not** a broad adopted shadcn component library.
- `src/components/game/computer-desktop.tsx` is ~3,697 lines, with Market, desktop and multiple apps entangled; much markup uses native repeated buttons.
- `src/app/globals.css` is ~5,241 lines (~107 KB); it contains many app- and distro-specific selectors. Its size is a design-maintenance warning, not itself a runtime benchmark.
- The Market catalog already exposes real projected item `label`, `cost`, `owned`, `compute`, `memory`, `vram`, `storage`, `network`; `credits` is available, and purchases go through `buyHardwareFromGui(id)` to the authoritative runtime. Owned hardware also exposes category and acquisition world-minute.
- Market currently includes wallet, rig capability, speed, scale, owned hardware, catalog, housing, software, tools, machines, models, forge/workflows and ledger surfaces. The redesign **must preserve these capabilities**, not silently drop them in favor of a pretty hardware-only mockup.
- `src/components/game/operation/operation-pressure-desk.tsx` implements real projected operation status and receipts; existing G3 Network Mapping supports both Nightshade and an independent generated scene.
- Existing written policy `docs/INTERFACE_AND_DISTROS.md` already demands recognition-before-reading, player-safe information, distinct app identity, semantic tokens, shadcn/UI, distros and accessibility. This spec operationalizes those promises.
- No `public/` asset directory was found on main during review. Asset implementation is new work, not an assertion that art already ships.

The existing user-visible Market screenshot is evidence of presentation dissatisfaction, not evidence that the underlying commerce rules fail. The design preserves those rules unless another gameplay project separately changes them.

## 3. Core visual language and choices

### 3.1 Shared visual grammar

- **Hierarchy:** focal area > selected object > primary action/status > contextual detail. Not ten indistinguishable bordered rows.
- **Shape:** refined OS surfaces, subtle elevation, limited restrained blur, consistent corner radii; dense technical panels reserved for analysis surfaces rather than every app.
- **Typography:** a readable UI sans for controls and body; monospace only for terminal, IDs, code, exact telemetry and intentional tiny instrument labels. Proposed starting scale: 14–16px default body, 16–20px section heading, 12px secondary metadata, never use 9–10px for primary information. Exact tokens validated on prototype rather than treated as final.
- **Color:** default Ghost/OS charcoal graphite with limited muted mineral/green accents, legible text and state colors. Semantic warning, success, threat and source uncertainty each also have shape/icon/text cues. A distro may alter palette and chrome, but never game truth.
- **Spacing:** breathe around groups and art, not between every label. Compact and comfortable density presets; comfortable touch areas and clear focus are not optional.
- **Lighting:** restrained ambient glow for desktop material and device imagery; no pervasive bloom, vibrating neon, blinding grids or constant alert pulsing.
- **Motion:** animate open/close/focus, relevant link changes, newly acquired item/record, stage transitions and explicit alerts only; motion never stands in for a required label. Honor reduced motion.
- **Fictional atmosphere:** late-night workstation and quiet isolation; subtle city/desk cues, not a photoreal game requirement.

### 3.2 Truth and accessibility contract

Render only **player-visible projection**, never private world state. Confirmed, observed, inferred, rumored, stale and unknown must remain distinguishable through outlines/fills/patterns + legend/tooltip/text, **not color alone**. Existing terminal and GUI continue to hit the same CommandBus authority. No artwork, animation, product badge, NPC relationship icon or graph edge may reveal unobserved truth.

For any inferred/unknown visual, label the uncertainty. A visual representation of a projected fact is allowed; filling unsurfaced fields with plausible fiction is not. Keep keyboard navigation, focus indication, readable text scaling, high contrast, reduced transparency, reduced motion and desktop/390px phone adaptation.

## 4. App targets

### 4.1 Shell/Desktop — A dominant

**Composition:**
- Refined wallpaper/texture as a quiet canvas with OS logo or insignia and a subtle atmosphere. App content always wins contrast.
- Coherent launcher/dock or taskbar with **distinct authored app icons** and accessible names; OS status area shows only truly projected/presentation state.
- Window chrome for app identity, focus/z-order, close/minimize and current available window interactions; no fake system controls. Apps must be readily distinguished even when windows overlap.
- Notifications/toasts and command feedback receive a clear visual hierarchy rather than disappearing as tiny monochrome lines.
- Tablet/phone adaptation favors one focused app/window and accessible app switcher without inventing a second gameplay mode.

**Distro layering:** OS core interaction patterns -> distro design tokens/chrome/typography/icon treatment -> theme -> accessibility overrides. Ghost/OS is the art-direction reference; Lattice, Velvet, Daybreak, Petal must remain meaningfully different visual personalities without duplicating each app's business logic. Preserve existing install/reboot behavior; appearance changes never tick world time.

**Do not turn this into** a static dashboard with one fixed grid of panels or a fake OS whose windows do not actually respond.

### 4.2 Recon / Operations — B dominant

**Composition:**
- A topology-centered workspace using the **existing player-safe network data**: observed machines/services/connections, inferred/unknown marks and understandable selection state. Prefer genuine graph topology over decorative node art.
- Context/Inspector alongside the chosen node, offering sourced facts, actual tools and command affordances, not private diagnostics.
- An always-recognizable operation pressure strip/region: target, stage (recon/intrusive/idle), elapsed world-time, actual footprint/traces/evidence, viable choices (e.g. ESCALATE/DISENGAGE) and explicit refusal reasons.
- Command receipts show **what actually changed** after the CommandBus call; keep prior G6 behavior and projection lifecycle fixes.
- Map interaction remains equivalent to real Network Mapping / action commands, with meaningful keyboard and reduced-motion alternatives.
- Compact layout swaps side inspector for a sheet/drawer and keeps the topology and action affordances legible.

**Do not** draw topology, threat alerts, source trust or predicted results unavailable to the player; decorative hacking animations must not simulate nonexistent network traffic.

### 4.3 Market — A structural base + C illustrations

**Composition:**
- Branded in-world Market app: vendor-neutral shell until data supports a real provider; category navigation for Hardware, Machines, Housing, Software/Tools, Models/Forge and financial views **only as supported by existing projection**. Categories are presentation routing, not new catalogs.
- At a glance: wallet, major rig capability/constraints and visible upkeep, with truthful presentation of current and prospective lift where derivable.
- Hardware items use illustrated product thumbnails/silhouettes by verified *category*; product name, exact CR price, CPU/MEM/VRAM/STO/NET deltas, owned quantity and one dominant purchase action.
- Affordability derives from current credits vs actual cost. Disabled actions explain insufficiency. Owned ≠ unavailable: currently-repeatable buy rules must remain authoritative. Never disable merely because an item is owned.
- Product detail sheet/drawer may compare currently projected stats/cost and issue the same existing command. Do not invent item slots, compatibility, vendor identity, rarity, condition, refurbishment label, depreciation, bonuses, effects or provenance absent from the existing model.
- Search/filter/sort are permitted **read-only client-side views** over the visible projected collection, introduced incrementally and tested; no hidden inventory or speculative prices. Keep pagination/large catalog reachability.
- Non-hardware categories require **purpose-built visuals** (floor-plan/location card, tool/application mark, machine silhouette, model glyph, ledger flow), not hardware product art pasted onto unrelated economic surfaces.

**Art direction:** recognizable tiny workstations, memory, NIC, CPU, storage and compute rigs; legible silhouettes and material language. Use copyright-clean original game assets, cohesive illustration conventions, concise scene art/lighting, and intentional empty states. Asset variants must represent categories, not unverifiable item histories.

**Before/after example:** existing `Secondhand Workstation` becomes a visually recognizable machine card; actual projected `cpu +1 / mem +1 / sto +1 / net +1` and price are visually grouped. An invented `Local Reseller`, `Refurbished` or `Rare` badge is **not** allowed unless the authoritative projection genuinely provides that attribute.

## 5. Artwork, branding and visual storytelling

### 5.1 Cohesive asset families

1. **OS/distro identities:** Ghost/OS primary logo family, equivalent symbols for Lattice/Velvet/Daybreak/Petal; icon legibility at small dock size and as larger installation/boot marks.
2. **Application identities:** Market, Recon, Underground, Forge, History, Terminal and other real apps have own marks, header motifs and icon families, with shared OS usability contracts.
3. **Hardware/product illustrations:** controlled perspective (slightly isometric or sophisticated editorial 3D/2D), comparable framing, transparent/background variants, repeatable silhouette grammar and category-specific visual cues.
4. **World/faction/vendor marks:** create only for actual fictional entities supported by game content; no invented world facts solely for visuals.
5. **Semantic marks:** provenance, owned, affordable, unknown, evidence, trace, deadline, grudge, rumors, operation stage, error/success. Always pair with accessible text/label.
6. **Empty/loading/error states:** small designed scenes, diagrams or illustrations; communicate next action or real state rather than decorative filler.

**Asset delivery requirements:** copyright-clean/source-owned or properly licensed, documented provenance, optimized web sizes, prefer vector for simple marks and image assets for illustrations, accessible text alternatives, light/dark compatibility, coherent export/resolution rules. No required external network request to run the game offline. Avoid per-item bespoke asset explosion: start with category kits and reusable motifs.

### 5.2 Limits

The physical Phaser room retains its role as an atmospheric location and tension instrument. A later dedicated art pass will replace primitive-looking geometry with achievable layered props/lighting/desk/device cues. The UI visual reboot **does not** authorize a full 3D environment or a major movement redesign. The initial three-screen proof focuses on computer visuals; the whole player-facing UI, including room overlays and lifecycle screens, joins the eventual migration.

## 6. Actual shadcn foundation and boundaries

- Install/adopt official **source-owned shadcn/ui components** appropriate to each real interaction, with Radix-based accessibility behavior where supplied: Button, Card, Badge, Input, Label, Tabs, Dialog, AlertDialog, Sheet, Popover, Tooltip, DropdownMenu, Select, Separator, ScrollArea, Table, Progress, Skeleton, Toast/Sonner equivalent as justified. This is a candidate set, **not** an instruction to install unused components preemptively.
- Existing homegrown `button.tsx` and CSS-only controls must be reconciled through usage-driven migration; do not keep duplicate competing primitives.
- Build a small app-design layer on top: `OsWindow`, `AppHeader`, `StatusReadout`, `EvidenceMark`, `CapabilityDelta`, `ProductTile`, `OperationStrip` etc. Only genuinely reused behavior is promoted to shared abstractions.
- **Every ordinary React interaction** should use these shadcn primitives or clearly justified accessible composites built on them. Exceptions: Phaser, terminal text input renderer as needed, canvas/SVG graph, OS window drag/resize and specialized game instruments. These exceptions still follow shared keyboard, visual tokens and interaction contracts.
- Tailwind v4 and semantic tokens power layout and theming; app-specific CSS or CSS modules can implement distinct art direction where needed. Migrate the existing giant global file incrementally into durable foundational tokens, component-level styles and scoped app styles; do not split into tiny files for ten lines each.
- Keep component boundaries driven by **responsibility**, not line count. Split `computer-desktop.tsx` by app/OS surfaces, view models, action adapters and stable shared components; no unrelated full-repo refactor or replacement state manager.
- Reuse existing game-session, projection, presentation store and CommandBus; the UI is a consumer. No new alternate game state or visual-only stat truth.
- Source code and art are web-first/offline-safe; Next.js export must keep working. No required server dependency.

## 7. Data flow, behavior, errors and acceptance

`WorldState → player-safe simulation projection/TinyBase → app view models → shadcn-based presentation → existing typed GUI command adapter → CommandBus → new projection`.

- View models handle formatting/category presentation, not authority.
- Empty, loading, insufficient funds, command refused, ended run, stale/unavailable information and persistence errors have explicit visual treatment; errors do not silently trigger alternative outcomes.
- Color and illustration remain derived outputs; branding does not alter rank, credibility, NPC rules or resource costs.
- Existing nonvisual behavior (save/restore, command semantics, market purchase and equipment effects, G3 network challenge, G6 operation receipts, GUI/terminal parity) must survive.
- Visual QA includes desktop/390px screenshots, keyboard focus traversal, dialog/overlay focus, contrast, scalable text, reduced motion, screen reader names and an **unfamiliar human player** review; automated Chromium tests are not a substitute for the last.
- Quantitative acceptance checks should verify displayed prices/stat deltas/ownership and enabled actions match projected data; player-visible graph nodes/edges only match accessible facts; running an action produces exact same world transition as the previous GUI and terminal path.
- Screenshots are required design evidence, not proof of human enjoyment. Compare actual Before/After Market and both Ghost/OS and one contrasting distro, at realistic desktop/mobile viewport.
- Regression suites must include Node24 typecheck/lint/build, game unit tests and existing G3/G6 Chromium contract; add targeted screen-specific tests where behavior changes.

## 8. Sequence and ownership (proposed; no implementation approval implied)

**Visual proof before mass migration**:
1. Define reference screens and compact reusable visual grammar (color/typography/geometry, icon/illustration prototypes). Make a reviewable design proof for **Shell + Recon + Market**; get feedback before shipping pervasive changes.
2. Implement only the shadcn foundation actually used by that proof, with theming and accessibility.
3. Refactor Shell/window chrome and app navigation carefully, keeping lifecycle and distro behavior.
4. Rebuild Market as the deliberately high-contrast before/after example: illustrated hardware and truthful purchase/capability economics, then preserve the other market subsections.
5. Recompose Recon around sourced topology, inspector and current operation pressure behavior; never redo network gameplay to fit artwork.
6. Migrate Underground, Contracts, History, Forge/Tools, Settings, Endings, first-run screens, terminal chrome and all remaining user-facing React controls; treat Phaser room art as dedicated later vertical.
7. Conduct complete multi-distro visual QA, accessibility and human acceptance; only then call the UI reboot complete.

Ownership boundaries:
- **GPT-6 — sole implementation owner (user override 2026-10-11):** visual references, original illustration/logo/icon assets, source-owned shadcn/UI, React/CSS app migration, test and accessibility automation, simulation/projection safeguards, integration and final visual QA.
- **No Claude or additional implementation agents** participate in this reboot. Changes to `src/components/game/**` and `src/app/globals.css` are performed sequentially by the single owner on isolated branches.
- The user still reviews the actual three-screen visuals before production migration, and later human usability/playtesting gates remain independent of successful automated tests.
- Existing G5 simulation and G3 proposal #110 / PR #116 are **out of scope**. This spec does not approve G3 P2 or close Game-First human playtest gates.

## 9. Explicit non-goals

- No rewrite of deterministic simulation, contracts, economy, hardware authority, worldgen, saves, terminal command semantics or rank mechanics.
- No invented vendors, conditions, item rarities, unseen host links, hidden hostility or unobserved NPC actions to make the UI look populated.
- No backend service, new UI state database, full game-engine replacement or forced Tauri packaging.
- No giant all-at-once migration without visual review and exact behavior/visual regression checks.
- No promise that adopting shadcn itself guarantees attractive artwork. **The component foundation and authored art direction are separate deliverables.**

## 10. Review gates and decisions

**Decisions already approved:**
- Full UI reboot, actual shadcn ownership across the interface, deliberate logos/illustrations, direction **A + B + C accents**.
- Shell (A-dominant), Recon (B-dominant), Market (A + illustrated C) as the first three visual reference surfaces.
- The game should look and feel like an inhabited OS, not a plain admin dashboard.

**Written-spec review passed (user-approved, 2026-10-11):** composition hierarchy, asset style, planned full-interface coverage, honest fallback for unavailable world data and phased migration order. The exact typography/spacing/color numeric tokens and mockups are **design candidates**, to be finalized through reviewed visual proofs.

**Subsequent gates:** Superpowers `writing-plans` implementation plan → user approval of the plan/execution method → implementation work with tests/visual proofs. Approval or merge of this docs-only PR is **not** implementation authorization.
