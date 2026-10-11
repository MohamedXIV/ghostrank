# Ghostrank Visual Reboot — Visual Proof & shadcn Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver three genuinely graphical, reviewable Shell/Recon/Market references plus the first production-quality, accessible shadcn/UI and asset foundation, without rewriting any gameplay or prematurely migrating the whole game.

**Architecture:** First prove the visual design in an isolated offline reference harness using actual player-visible fixtures and original illustrations; obtain a human visual review. Then install only the shadcn primitives needed for the approved proof, bridge them to existing distro tokens/accessibility, establish reusable art and hardware-card view-model contracts, and validate in a standalone showcase. Later game-app migration is split into separately testable work packages; this plan does not pretend to implement the full reboot.

**Tech Stack:** Next.js 16.3.8, React 19.3, TypeScript 6.0.3, Tailwind CSS 4.3.3, source-owned shadcn/ui, Radix dependencies introduced only for adopted primitives, Lucide, Motion 14, Vitest 5, Playwright Chromium 1.56.1, Node 24, TinyBase player-safe read model.

**Spec:** `docs/superpowers/specs/2026-10-11-ghostrank-visual-reboot-design.md`, approved by the user on 2026-10-11. Relevant existing rules: `docs/INTERFACE_AND_DISTROS.md`, `docs/UI_UX_AND_ART.md`, `docs/TECHNICAL_ARCHITECTURE.md`.

## Global Constraints

- User-approved direction is **A premium Shell + B tactical Recon + C illustrated accents**. The OS must look inhabited and visually expressive, not like a generic admin dashboard.
- **shadcn/ui is the actual shared React component foundation**, source-owned, themed per Ghostrank. Do not count `components.json` or the old homegrown Button as sufficient adoption.
- No change to `WorldState`, deterministic simulation, CommandBus behavior, costs, rank mechanics, game time, save truth, or terminal/GUI parity.
- Only player-safe projections may feed visible statuses or graphics. Do not fabricate vendors, refurbishment condition, rarity, hidden threats, source confidence or network links for presentation.
- Hardware catalog current projected fields: `label`, `category`, `cost`, `compute`, `memory`, `vram`, `storage`, `network`, `owned`. Wallet credits are a separate projection value. Product art must derive from `HardwareCategory` = `workstation|cpu|memory|gpu|storage|network`.
- Existing GUI purchases use `buyHardwareFromGui(id)`; owned items may remain purchasable. Zero-cost `rig-starter` is an existing genuine catalog entry. UI presenters must not invent purchase eligibility rules.
- The five distros `ghost-os`, `lattice`, `velvet`, `daybreak` and `petal` retain all user settings and their own personality; default Ghost/OS is dark, not a hard-coded all-distro dark theme.
- All interactive React controls must use source-owned shadcn components or justified accessible specialized compositions; Phaser, graph SVG/canvas, terminal renderer and OS dragging are legitimate bounded exceptions.
- Minimum Node **24**. Browser-only static export must continue to build. No required runtime network requests for UI assets, fonts or data.
- UI typography must prioritize readability: proposed standard body **14–16px**, heading **16–20px**, secondary text **12px**; not 9–10px for primary information. Numerical values are starting design candidates to validate in screenshots.
- Reduced motion, high contrast, text scaling, keyboard focus, 390px phone adaptation and non-color semantics are mandatory.
- Keep existing `src/components/game/**` and `src/app/globals.css` in one explicitly owned Claude UI implementation lane; GPT coordinator owns plan/docs, player-safe projections, CI checks and isolated tests. Do not edit a shared file from two active branches at once.
- Preserve existing G3/G6 real Chromium gates and Game-First unfamiliar-human acceptance as **NOT RUN**, not passing because screenshots look good.
- **Visual approval gate:** no integration into the live Shell/Market/Recon UI before the three reference compositions are shown to and reviewed by the user.

## Review Focus

1. **390px phone plus large text:** app purpose, primary action and critical status remain readable and keyboard/touch reachable without hidden horizontal clipping; tested in Task 3 and Task 7.
2. **Daybreak/Petal light and high-contrast modes:** shared primitives inherit the active distro and accessible focus rather than retaining Ghost/OS dark hard-coded styles; tested in Task 5 and Task 7.
3. **Missing category art or unfamiliar catalog item:** a generic readable hardware silhouette is used, with exact name/stats/price intact and no fabricated provider/condition; tested in Task 2 and Task 6.
4. **Zero-cost/owned/unaffordable catalog records:** presentation shows the actual projected CR price, count and affordability without treating `owned > 0` as automatically unpurchasable; tested in Task 6.
5. **Keyboard dialog/overlay focus and ESC:** focus enters/exits correctly, current gameplay shortcut handling does not close a background window or dispatch a gameplay action while a foreground dialog is active; tested in Task 4 and Task 7.

---

## Boundaries and delivery map

**V0 (THIS PLAN):** original reference assets, truthful fixture proof for three screens, visual review gate, core shadcn primitives, distro tokens, category icon kit, portable product presenter and automated QA. **No automatic live app replacement.**

**V1 (separate subsequent plan): Shell/window manager.** Split `src/components/game/computer-desktop.tsx` by responsibility, preserving `useUiStore` open/focus/cycle state, settings, keyboard shortcuts, window transitions, OS room switching, onboarding and distros. Keep custom OS window behavior outside a generic shadcn Dialog. Review actual shell visuals.

**V2 (separate subsequent plan): Market.** Extract Market from the giant desktop module and preserve all 14 projected record families (hardware, housing, software, tools, machines, models, forge, queue, workflows, value graph, ledger etc.). Migrate each category to purposeful visuals and existing command adapters. Start with illustrated hardware and before/after screenshot acceptance.

**V3 (separate subsequent plan): Recon/Operations.** Preserve `ReconTopology`, `NetworkRouteWorkbench`, `OperationPressureDesk`, G3 cross-target mapping and G6 receipts. New topology-centered composition must not fabricate world truth or alter command semantics.

**V4 (separate subsequent plans by independent app family):** Underground/Relationships/Contracts; Forge & AI/Compute; History/Endings; Settings/First Run/Onboarding; terminal chrome and other app surfaces. These can have parallel workers **only if their exact modified-file sets do not overlap**.

**V5 (later dedicated art plan):** Phaser room atmosphere/props, not a 3D or navigation rewrite; full multi-distro visual/accessibility/human acceptance.

Every later plan must state exact touched files, preserve respective behavior contracts, include its own TDD/checks, use a dedicated branch and block on unresolved shared files. No claim of full UI reboot completion at V0.

## File responsibility map — V0

| Path | Responsibility / owner |
| --- | --- |
| `scripts/browser-smoke/visual-reboot-baseline.mjs` | Actual current Shell, Market, Recon before-captures using existing app flow (Claude/UI lane) |
| `scripts/visual-reboot/reference/index.html` | Standalone concept preview structure; not a production Next.js route (Claude/UI lane) |
| `scripts/visual-reboot/reference/reference.css` | Concept-only layout/distro type/composition styles (Claude/UI lane) |
| `scripts/visual-reboot/reference/reference.js` | Static user-visible representative fixtures and three selectable states (Claude/UI lane) |
| `scripts/browser-smoke/visual-reboot-reference.mjs` | Chromium screenshots and functional visual-proof checks (GPT QA lane; no UI source edits) |
| `public/visual-reboot/` | Original distributable app icons, OS marks, hardware silhouettes plus index JSON (Claude art/UI lane) |
| `src/presentation/visual-reboot/asset-map.ts` | Source-owned category-to-asset resolver (Claude/UI lane) |
| `src/presentation/visual-reboot/asset-map.test.ts` | Asset contract tests; unknown category fallback (GPT QA lane) |
| `src/components/ui/{button,card,badge,tabs,tooltip,dialog,sheet,scroll-area}.tsx` | Source-owned shadcn primitives and existing Button compatibility (Claude/UI lane) |
| `src/components/ui/button.test.ts` | Button variants, disabled, ref, focus, safe type (GPT QA lane) |
| `src/components/ui/dialog-a11y.test.tsx` | Accessible dialog contract (GPT QA lane; use browser for actual focus testing) |
| `src/app/globals.css` | Existing distro semantic tokens and compatibility bridge only; Claude/UI lane |
| `src/components/game/market/hardware-item-model.ts` | Pure projected catalog-card presenter; not simulation authority (Claude/UI lane) |
| `src/components/game/market/hardware-item-model.test.ts` | Projection → precise card data tests (GPT QA lane) |
| `scripts/browser-smoke/visual-reboot-foundation.mjs` | Post-foundation real browser checks, screenshots and JSON report (GPT QA lane) |
| `docs/visual-reboot/REFERENCE_REVIEW.md` | Screenshot index, visual decisions, before/after proof and explicit human visual review status (design owner) |
| `package.json`, `package-lock.json` | Add only dependencies used by adopted shadcn primitives, owned by the same foundation branch |
| `src/game/**`, `src/stores/projection/**` | **Do not touch** in V0; existing truth and gameplay remain stable |

No code should depend on the reference harness in production. Concept fixtures are examples of already projected information, not a new world data source. Test files and UI implementations may live on separate commits but must be verified together before merge.

### Task 1: Capture a reproducible **real-game** before baseline

**Files:**
- Create: `scripts/browser-smoke/visual-reboot-baseline.mjs`
- Create: `docs/visual-reboot/REFERENCE_REVIEW.md`
- Read (no modification): `scripts/browser-smoke/g6-operation-desk-smoke.mjs` and `src/components/game/computer-desktop.tsx`

**Interfaces:**
- Consumes: current static `out/` build, existing New Run → workstation → `Alt+2` Recon / `Alt+4` Market flow, Playwright `chromium` and `GHOSTRANK_SMOKE_CHROMIUM` env convention.
- Produces: `.smoke/visual-reboot/before/{shell,market,recon}-desktop.png`, `...-phone-390.png` and `baseline-report.json`.

- [ ] **Step 1: Create a failing baseline smoke entry.** Assert six screenshot artifacts exist, screenshot pages have no uncaught JS errors, and the real Market catalog includes `Secondhand Workstation` and a real BUY action. A failed navigation or uncaptured view is a **FAIL**, not a skipped PASS.
- [ ] **Step 2: Run `npm run build && node scripts/browser-smoke/visual-reboot-baseline.mjs`.** Expected initial: FAIL because the script or screenshots do not yet exist.
- [ ] **Step 3: Implement Playwright flow** reusing G6's static server/bootstrap approach and the existing publicly visible UI. Enter computer, open Shell/Market/Recon, capture desktop `1280×800` and phone `390×844`. Never inject or mutate hidden `WorldState` for a pretty screenshot. Save ephemeral screenshots only in `.smoke/` (not as large Git blobs).
- [ ] **Step 4: Rerun and verify six real screenshots + non-empty report.** Expected: PASS; record the exact baseline commit SHA, viewport, run seed/scenario in `REFERENCE_REVIEW.md`.
- [ ] **Step 5: Commit source and review doc** with `git add scripts/browser-smoke/visual-reboot-baseline.mjs docs/visual-reboot/REFERENCE_REVIEW.md && git commit -m "test(ui): capture reproducible visual reboot baseline"`.

### Task 2: Create a reviewed **original visual asset kit** (first art proof)

**Files:**
- Create: `public/visual-reboot/asset-index.json`
- Create: `public/visual-reboot/os/*.svg`
- Create: `public/visual-reboot/apps/*.svg`
- Create: `public/visual-reboot/hardware/*.svg` (six category silhouettes plus `generic.svg`)
- Create: `src/presentation/visual-reboot/asset-map.ts`
- Create: `src/presentation/visual-reboot/asset-map.test.ts`
- Modify: `docs/visual-reboot/REFERENCE_REVIEW.md`

**Interfaces:**
- Consumes: `HardwareCategory` from `@/content/hardware-catalog`, active distro theme for presentation only.
- Produces: `export function hardwareArtSrc(category: HardwareCategory | string): string`, which returns `/visual-reboot/hardware/<category>.svg` for the six supported categories or `.../generic.svg` otherwise; `export function appIconSrc(id: ComputerWindowId): string` maps the existing six window IDs. No import of the simulation state or world truth.

- [ ] **Step 1: Write failing `asset-map.test.ts`** covering every supported category and `appIconSrc` ID, missing/unknown category fallback, existing nonempty asset file + index entry, safe SVG provenance metadata, and no fabricated vendor/condition/rarity attributes.
- [ ] **Step 2: Run `npm test -- src/presentation/visual-reboot/asset-map.test.ts`.** Expected initial: FAIL (module/assets absent).
- [ ] **Step 3: Author source-owned SVG marks/silhouettes** in a restrained premium/neo-retro editorial visual family. Six category silhouettes should be recognizable from shape alone and remain legible at thumbnail size; app marks must be different from category glyphs. The artwork may use controlled illustration; no expensive per-catalog-item variations required. Fill `asset-index.json` with license/source (= original), ID, role and alt-text description for every asset.
- [ ] **Step 4: Implement asset resolvers** with exact signatures above, using only the fixed allowlisted asset paths; never build URL paths from untrusted labels or simulate a seller/rarity.
- [ ] **Step 5: Run `npm test -- src/presentation/visual-reboot/asset-map.test.ts`.** Expected: PASS, with specific unknown-id fallback assertion.
- [ ] **Step 6: Add thumbnails and category legibility notes** to `REFERENCE_REVIEW.md`, then commit the asset kit. Verify all assets are original/licensed and bundled offline.

### Task 3: Show **three visual compositions** before production migration

**Files:**
- Create: `scripts/visual-reboot/reference/index.html`
- Create: `scripts/visual-reboot/reference/reference.css`
- Create: `scripts/visual-reboot/reference/reference.js`
- Create: `scripts/browser-smoke/visual-reboot-reference.mjs`
- Modify: `docs/visual-reboot/REFERENCE_REVIEW.md`

**Interfaces:**
- Consumes: static preview fixture using existing real labels/categories/prices from `src/content/hardware-catalog.ts` (e.g. `rig-starter`, `storage-array`), artwork from Task 2, existing visible Recon states from G3/G6, and current Shell window IDs. **No CommandBus**: the reference is clearly labeled concept-only.
- Produces: screenshot gallery + `.smoke/visual-reboot/reference-report.json` for Shell, Recon, Market at 1280×800/390×844 and Ghost/OS plus Daybreak contrast; screenshots are human review evidence, not production QA.

- [ ] **Step 1: Write failing browser checks** asserting three distinct compositions have recognizable app title/mark, nontext focal visualization, readable primary status/action, real representative catalog amount/capability, and no fake vendor/condition badges; include 390px layout no horizontal overflow and focusable navigation.
- [ ] **Step 2: Run `node scripts/browser-smoke/visual-reboot-reference.mjs`.** Expected initial: FAIL, because concept harness is not yet present.
- [ ] **Step 3: Implement references**: A-dominant desktop with wallpaper/app icon dock/window chrome; B-dominant Recon with meaningful illustrative topology/selected Inspector/operation pressure; A+C Market with illustrated hardware cards/clear CR/delta/owned state. Show a second distro in a contrasting palette. The concept's controls may switch panels but MUST NOT pretend to execute world commands.
- [ ] **Step 4: Run visual Chromium checks and inspect actual screenshots**, including 390px, text scale, reduced motion, high contrast and light theme. Expected: PASS. Correct hierarchy and art defects while prototypes are cheap; do not normalize tiny labels or low-contrast flourishes.
- [ ] **Step 5: Commit the concept-only harness** and record screenshot paths and honest pass/fail in `REFERENCE_REVIEW.md`.
- [ ] **Step 6 — HARD USER GATE:** present **the actual three screenshots** (not descriptions alone) and explicitly ask whether Shell, Recon and Market match the approved A+B+C identity. STOP any following foundation or production UI integration until the human approves or requests revisions. Automated PASS does not waive this gate.

### Task 4: Adopt **real source-owned shadcn primitives**, keeping Button callers working

**Files:**
- Modify: `components.json` only if the installed official registry's schema genuinely requires it
- Modify: `src/components/ui/button.tsx`
- Create: `src/components/ui/{card,badge,tabs,tooltip,dialog,sheet,scroll-area}.tsx` (only those used in the approved reference or first pilots)
- Create: `src/components/ui/button.test.ts`
- Create: `src/components/ui/dialog-a11y.test.tsx`
- Modify: `package.json`, `package-lock.json` only for actually required Radix/UI deps

**Interfaces:**
- Consumes: existing `ButtonProps` and known callers, including `variant="default"|"ghost"|"danger"` and `size="default"|"sm"|"icon"`.
- Produces: source-owned shadcn `Button` preserving `danger` as a project-specific alias to destructive styling (not replacing caller semantics), stable `type="button"` default, `data-slot` and className merge; accessible shadcn composites with predictable keyboard/focus behavior.

- [ ] **Step 1: Write failing component tests** asserting existing dangerous/ghost/default variants still render, disabled Button cannot trigger action, native button does not silently become submit, forwarded `ref` works, and dialog ESC restores focus without firing an underlying action.
- [ ] **Step 2: Run `npm test -- src/components/ui/button.test.ts src/components/ui/dialog-a11y.test.tsx`.** Expected initial: FAIL on missing/incorrect primitives or missing focus semantics.
- [ ] **Step 3: Add current official shadcn source-owned components** for the specific approved interactions, adapt to project tokens; add only required Radix dependencies and commit lockfile. Preserve `danger` API, use the official accessible primitives rather than reimplementing popovers/dialogs with bare HTML.
- [ ] **Step 4: Run targeted tests and `npm run typecheck`.** Expected: PASS. Test real focus order/escape in Chromium when server rendering alone cannot prove it.
- [ ] **Step 5: Commit foundation primitives** with no replacements to `GameRuntime`/`src/game/**`.

### Task 5: Bridge **distro/accessibility tokens** without new authority or CSS sprawl

**Files:**
- Modify: `src/app/globals.css` (only the token/root/compatibility section, preserve existing downstream styles)
- Create: `src/components/ui/visual-tokens.test.ts`
- Read: `src/presentation/distros.ts`, `src/stores/ui/use-presentation-store.ts`

**Interfaces:**
- Consumes: existing `data-distro`, `data-theme`, `data-text-scale`, `data-density`, `data-contrast`, `data-transparency`, `data-motion-mode` settings already placed on `.desktop-surface`/`.boot-screen`.
- Produces: shadcn-compatible semantic CSS variables (`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--destructive`, `--ring`, `--radius`, etc.) mapped to the existing distro layer, not a second independent truth map.

- [ ] **Step 1: Add failing tokens test** verifying the required token names exist, every distro receives valid foreground/background/focus contrast intent and no shadcn card/dialog is hard-coded to a dark Ghost/OS fill. Include large-text and high-contrast override contract assertions.
- [ ] **Step 2: Run `npm test -- src/components/ui/visual-tokens.test.ts`.** Expected initial: FAIL (missing tokens or overrides).
- [ ] **Step 3: Implement the minimal token bridge** using existing distro selectors and compatibility aliases; keep application-specific CSS in its current location until later scoped migrations. Use CSS variables and accessible non-color focus rules. Do not globally change type scale in one PR without comparing screenshots.
- [ ] **Step 4: Run targeted tokens tests + real Chromium contrast/readability screenshots** for Ghost/OS, Daybreak and Petal, normal/high contrast, 390px and desktop. Expected: PASS against documented assertions, with human screenshot review for aesthetic choices.
- [ ] **Step 5: Commit token bridge** as an independent change, not mixed with a broad `globals.css` rewrite.

### Task 6: Create a **truthful hardware card view-model contract**

**Files:**
- Create: `src/components/game/market/hardware-item-model.ts`
- Create: `src/components/game/market/hardware-item-model.test.ts`

**Interfaces:**
- Consumes: `type HardwareCategory` from `@/content/hardware-catalog`; `export interface ProjectedHardwareRow { label: string; category: HardwareCategory; cost: number; compute: number; memory: number; vram: number; storage: number; network: number; owned: number }`; separate wallet `credits: number`.
- Produces: `export function presentHardwareItem(id: string, row: Readonly<ProjectedHardwareRow>, credits: number): HardwareItemPresentation` where `HardwareItemPresentation` has `id`, `label`, `category`, `artSrc`, `priceCr`, `ownedCount`, `affordable`, `statDeltas: ReadonlyArray<{ metric: "CPU"|"MEM"|"VRAM"|"STO"|"NET"; value: number }>`, `isIncluded: boolean`. Positive deltas only; `affordable = credits >= cost`; `isIncluded = cost === 0`. The view model **does not** decide whether the CommandBus accepts a purchase.

- [ ] **Step 1: Write failing tests** using the real `rig-starter` (0 CR, owned copy, full CPU/MEM/STO/NET deltas), `storage-array` (250 CR, STO +5), `cpu-overclock` (400 CR, CPU +3). Test credits 0, 249, 250; owned count >0 with affordability independent; category asset mapping; no vendor/rarity/condition field in result.
- [ ] **Step 2: Run `npm test -- src/components/game/market/hardware-item-model.test.ts`.** Expected initial: FAIL (missing presenter).
- [ ] **Step 3: Implement the pure presenter** by projecting exact catalog row fields and Task 2's asset path; no call to `runtime.execute`, no catalog price rewriting, no new economic state.
- [ ] **Step 4: Run targeted test and typecheck.** Expected: PASS. Compare test fixtures with `HARDWARE_CATALOG` or `projectWorld(createSliceWorldState()).economy.catalog` to ensure no invented default price/stats.
- [ ] **Step 5: Commit presenter** as an independently reviewed preparatory unit. The live Market remains unchanged until V2.

### Task 7: Integrate **foundation QA** without claiming full reboot

**Files:**
- Create: `scripts/browser-smoke/visual-reboot-foundation.mjs`
- Modify: `docs/visual-reboot/REFERENCE_REVIEW.md`
- Modify: existing CI workflow **only** if new checks must run automatically on scoped UI PRs; otherwise invoke locally/explicitly and provide exact results.

**Interfaces:**
- Consumes: verified Task 1 baseline; Task 3 reference screenshots; Task 4 shadcn primitives; Task 5 distro tokens; Task 6 view model.
- Produces: `.smoke/visual-reboot/foundation-report.json` and screenshots, with **PASS / FAIL** fields for desktop, 390px, light distro, reduced motion, high contrast, keyboard focus/ESC and no clipping. No "known blocker" may be silently counted as PASS.

- [ ] **Step 1: Add a failing foundation smoke command** requiring actual focus traversal, dialog open/ESC/return focus, visual contrast modes, asset reachability, 390px layout and console-error absence. Cover Review Focus points #1–#5 by exact names in the JSON report.
- [ ] **Step 2: Run `npm run build && node scripts/browser-smoke/visual-reboot-foundation.mjs`.** Expected initial: FAIL until the preview harness can render the adopted components and token layers, not only static HTML.
- [ ] **Step 3: Implement an isolated browser-test showcase** for shadcn primitives and pure projected data; do **not** add a shipping /design-preview Next.js route. If the static reference alone cannot mount the React primitives, use a dedicated test harness started by this script, not fake DOM assertions.
- [ ] **Step 4: Rerun targeted tests, then `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and existing `npm run smoke:browser:network` + G6 browser smoke. Expected: all PASS on Node24; record exact counts/checks, never assume the previous 1,373/1,373 baseline still holds.
- [ ] **Step 5: Review actual screenshots** alongside Task 1 and Task 3, confirm no hidden-fact art, keyboard regressions or light-theme failures, and commit QA script/evidence doc.
- [ ] **Step 6: Open scoped PR(s) for the V0 artifacts** and request final review. Do not treat V0 as whole UI redesign completion. No full UI migration until the user has approved V0 reference screenshots and the separate V1/V2/V3 execution plans.

## Self-review / execution prerequisites

1. **Spec coverage map:** V0 satisfies visual direction/proof, foundational shadcn/UI, first asset family, truthful hardware mapping, distro/accessibility bridge and QA. V1–V5 explicitly own migration of Shell, Market, Recon, remaining apps and room. V0 alone does not satisfy full UI acceptance and must not be reported as doing so.
2. **Interface sanity:** `HardwareCategory`, `ComputerWindowId` and the listed projection fields were verified in the repository. `hardwareArtSrc` and `presentHardwareItem` are produced before consumer use. The presenter never provides buy authority.
3. **Dependency order:** Task 1 → Task 2 → Task 3 → **human visual approval** → Tasks 4/5/6 (sequential where shared files exist; independent test owners may prepare tests in separate no-conflict branches) → Task 7.
4. **Failure review:** All five cases in `Review Focus` have owner tests/screenshots in Tasks 2–7. Ensure screenshot checks test actual rendered behavior, not hard-coded strings alone.
5. **Proportionality:** This is the **first independent, testable V0 project**, not a fictitious complete implementation plan for every app. Later phases get their own task-by-task documents after reference art approval; scope remains user-approved from the design spec.
6. **Not done yet:** Written-plan review, execution-mode selection, visual-reference screenshots, production implementation, browser QA and unfamiliar-human playtesting. All remain unperformed until actually executed.

## Reviewer and worker handoff

**Reviewer now:** inspect this V0 plan together with the approved spec. Confirm whether the visual proof + shadcn foundation scope, hard screenshot gate and deferred app-level plans match the intended full reboot.

**Execution choice after plan approval:**
- **Native:** GPT coordinator implements explicitly assigned tasks in isolated branches. The user separately coordinates Claude for UI-owned files; GPT does not modify Claude's branch or claim to dispatch him.
- **Subagent-driven:** fresh agent per task with independent review before proceeding; useful for art, shadcn and browser QA separation, but must not run UI file mutations on the same branch/file concurrently.

**Recommended:** **Native with deliberate, user-coordinated Claude UI ownership boundaries**, because existing game UI code and `globals.css` are tightly shared; uncontrolled parallel edits risk undoing each other's work. Treat independent QA/data contracts as separate file lanes; visual approvals block migration.

**No implementation authority is implied by filing or approving a design/spec PR.** Wait for review of this plan and the explicit execution method before writing implementation code.