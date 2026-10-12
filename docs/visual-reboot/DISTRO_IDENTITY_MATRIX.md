# Ghostrank — Distro Identity Matrix v1

**Status:** User-approved visual identity contract (2026-10-11). Five distinct distro shell geometries, icon sets and original wallpapers shipped via PR #164 on 2026-10-11. Ten Light/Dark modes and FlexLayout docking/floating are **not yet shipped**; see [implementation contract](SHADCN_FLEXLAYOUT_CONTRACT.md) and issues #166 / #167.
**Owner:** GPT-6 only. No Claude or external implementation agent.
**Baseline:** Ghostrank Visual Reboot direction = a believable Linux-desktop-inspired fictional OS + grounded tactical Recon + original illustrated assets. Inspired by the user's real Linux desktop examples (Cutefish, Pop-style workstation), **not** copies of their copyrighted icon packs, wallpapers, branding or applications.
**Governing docs:** `docs/INTERFACE_AND_DISTROS.md`; `docs/superpowers/specs/2026-10-11-ghostrank-visual-reboot-design.md`; `docs/superpowers/plans/2026-10-11-ghostrank-visual-proof-foundation.md`.
**Scope:** Presentation profiles and visual acceptance. No game-mechanics, simulation, save, projection, or command edits authorized by this matrix.

## 1. Non-negotiable distinction: distro ≠ theme ≠ application

1. **Distro:** a recognizable desktop-environment family — window chrome, dock/taskbar/launcher placement and presentation, spacing, icon family, wallpaper, OS marks, typography character, boot/handover identity, motion character, and how apps inherit the OS frame.
2. **Theme:** variants *inside* that family — for example Petal Light/Night, changing palette/material/light conditions **without silently changing the shell identity**. Existing shipping metadata currently lists Ghost/OS Ash, Lattice Grid, Velvet Plum, Daybreak Warm, Petal Light/Night. Names like Wire/Static/Roseglass/Mint in older design brainstorming are **ideas, not shipped themes**.
3. **App:** Market, Recon, Underground, History, Terminal, Settings and other real app surfaces retain individual authored visual identities. They inherit shared accessibility, native feeling, primitive components, and distro-specific chrome/material. Do **not** recolor all apps into the same dashboard.

**Recognition test:** at equal viewport, flatten five Shell screenshots to grayscale and hide the distro wordmarks. Ghost/OS, Lattice, Velvet, Daybreak, and Petal should still be distinguishable through **at least three non-palette signals** each: shell geometry, launcher location/form, icon shapes/illustration style, wallpaper composition, header/window construction, or spacing rhythm. A palette swap alone **fails**.

**Believability test:** when screenshots are shown without explanations, the desktop reads as a used fictional workstation, not an AI-generated landing page, cybersecurity poster or app-only dashboard. No fake affordances, invented OS internals, or decorative “network activity” generated from unknown state.

## 2. Identity matrix (cross-distro)

| Dimension | Ghost/OS — night workstation | Lattice — structured analyst | Velvet — elegant nocturne | Daybreak — bright productivity | Petal — expressive desktop |
| --- | --- | --- | --- | --- | --- |
| Real-world *inspiration*, not imitation | GNOME/Pop-style developer workspace | tiling WM + dense productivity DE | bespoke dark desktop / refined creative workstation | traditional taskbar-based desktop + calm editorial UI | Cutefish-like soft, personal desktop |
| Primary mood | quiet stealth, inhabited, practical | precision, speed, grid | soft luxury, focus, mood | approachable, open, sunlit | warm, playful, charming, capable |
| Existing palette anchor (from code) | `#05080b` / `#10171c` / `#94d1b6` | `#071019` / `#10232f` / `#79c9ec` | `#100a12` / `#211624` / `#d59ac7` | `#f3efe6` / `#fffaf0` / `#2f7c74` | `#fff5fa` / `#f1d9ef` / `#c8689f` (Night uses separate dark-berry overrides) |
| Shell structure target | slim top bar + restrained centered bottom dock; visible workspaces | narrow top information strip + left compact launcher; aligned tile-like window zones | discreet upper controls + small side-edge app shelf; deliberately layered free windows | bottom taskbar/application list + clear menu/search entry | airy upper quick-controls + oversized illustrated bottom dock; soft desktop widgets **only if real** |
| Window chrome | compact square-ish corners, precise focused border, utilitarian toolbar | flat/tight title bar, crisp nearly-square edges, strong active tile outline | rounded raised frames, subtle translucent layers, refined title treatments | clear light borders, larger window title, familiar taskbar grouping | friendly large-radius chrome, soft shadow, colorful but legible active-state marks |
| Wallpaper | original solitary city/night desk mood or atmospheric skyline; medium-low contrast behind windows | abstract lines, grids, topology-inspired engineering paper without pretending to show actual network | abstract velvet folds/ink topography, aubergine gradients that feel authored rather than generic | bright morning horizon, warm geometry, restrained editorial illustration | authored soft sculptural/botanical forms, gentle character and a consistent pastel/night adaptation |
| Icon family | lean geometric silhouettes, minimal filled accents, no stock distro marks | monochrome technical line/diagram symbols | slim refined outlines + dark jewel highlights | simple friendly pictograms, strong legibility | custom rounded/pictorial illustrated icons; cute **without** toy UI |
| Typography | neutral clean sans; monospace for IDs/terminal | compact technical sans + exact aligned telemetry | calm expressive display accents only in headings, readable sans for body | open high-legibility sans and generous headings | gentle rounded display captions only, readable normal sans for core controls |
| Default density | compact/comfortable | more compact **until overridden** | comfortable with purposeful whitespace | comfortable editorial | comfortable, larger tap/focus affordances |
| Material/elevation | mostly opaque low-glare graphite, modest shadow | flat panel separators and minimal blur | nuanced translucency where accessibility allows, rich surface layers | bright opaque surfaces, visible edges | soft materials, discreet depth and consistent contrast |
| Motion character | brisk understated focus and notification arrival | fast crisp state changes, no gratuitous sliding | slowish smooth handoffs within shared accessibility budget | low-motion, gentle directional transitions | light spring-like feeling, restrained and fully disableable |
| OS boot/branding | spectral geometric emblem; quiet understated boot | calibrated modular grid mark and technical handover | refined faceted/plum mark, discreet elegant handover | sunrise/arc glyph and clean loading steps | original flower-like mark, soft playful boot; Night shares the same mark |

All five preserve the exact existing input/focus semantics, workspaces/windows functionality actually implemented, app labels, CommandBus authority and user accessibility overrides. A distro can change *where* a discoverable entry point sits without changing *what* it does or inventing parallel power systems.

## 3. Five distinctive profiles

### 3.1 Ghost/OS — “The anonymous night operator”

- **Silhouette:** Pop/GNOME-like top shell and bottom compact dock, sparse shortcuts, plausible overlapping terminal/utility windows. This is our reference for a *believable* desktop, not permission to invent real Linux packages, wireless controls or a battery simulation.
- **Window:** dark charcoal with subtly brighter focused edge, consistent 36–42px-ish usable titlebar (candidate), button grouping is obvious, no ghost buttons.
- **Market:** utilitarian vendor-neutral hardware store, dark equipment portraits/silhouettes, strong actual CR prices, clearly distinguished installed ownership and existing BUY action, no fake shopping cart system.
- **Recon:** analysis workstation with topology + inspector + truthful pressure desk; compact controls; authored signal accents only where projection justifies them.
- **Wallpaper/brand:** low-key nocturnal skyline/atmospheric computer-world art. If a dramatic skyline is used, windows and text still dominate. No reused third-party OS logos.
- **Signature:** compact top bar + restrained functional dock + believable window layering.

### 3.2 Lattice — “The systems analyst”

- **Silhouette:** clearly **not** Ghost/OS recolored: left-side narrow, keyboard-friendly launcher, tight top information band, pane-aligned/tile-*inspired* layouts. “Tile-inspired” is a presentation layout goal, not a promise that true tiling WM/multi-monitor resizing is already implemented.
- **Window:** flatter and more rectilinear, obvious keyboard focus, crisp separator rhythm. Dense inspector surfaces without making text tiny.
- **Market:** scannable comparison rows/grid; pictures still present but smaller; fixed alignment of cost, gain and action. A sorting/filter control exists only if implemented.
- **Recon:** graph with structured side panes and tabular supporting evidence; keyboard navigation feels first-class, uncertainty line styles remain faithful.
- **Wallpaper/brand:** original grid-paper, circuit-like abstract geometry with quiet blocks, no imagined live telemetry.
- **Signature:** vertical tool rail + structured pane tiling + technical icon family.
- **Accessibility guard:** density preference/high text scale **override** the compact default; never force 10px primary text.

### 3.3 Velvet — “The quiet creative operator”

- **Silhouette:** free-floating editorial-feeling desktop with a discrete **edge app shelf** instead of Ghost/OS's centered dock; window presence comes from material/chrome and thoughtful layering, not symmetrical hero cards.
- **Window:** curved corners, softened focused shadow and fine linework; translucent material allowed only when reduced transparency/high contrast settings permit it.
- **Market:** dark boutique technology storefront with category imagery, quieter price hierarchy but same immediate affordances and truthful catalog. No invented luxury vendor, provenance or quality tier.
- **Recon:** an instrument-like black/plum tool; topology front and center; selected host and action status remain direct and serious rather than decadent or illegible.
- **Wallpaper/brand:** original abstract velvet/ink/satin-like art; avoid stock bokeh and unbounded neon glow.
- **Signature:** edge shelf + tactile layered windows + refined plum linework.
- **Accessibility guard:** gradients/translucency never obscure tooltip/focus/status or low-contrast text.

### 3.4 Daybreak — “The open everyday computer”

- **Silhouette:** deliberately switches to a **full-width bottom taskbar** with grouped running app indicators and an obvious menu entry; large, bright workstation feeling. Does not simply put a cream background behind Ghost/OS's centered dock.
- **Window:** bright opaque surfaces, visible dividers, distinct selected tabs, larger text rhythm and generous clear work area.
- **Market:** editorial catalog with pale cards, original realistic hardware mini-art, strongly legible price/deltas and conventional controls.
- **Recon:** light-background graph as readable as a paper diagram; solid/dashed/inferred distinctions survive; threats cannot rely on red/pink alone.
- **Wallpaper/brand:** warm sunrise/architectural shapes/quiet horizon, with space for shortcut visibility.
- **Signature:** bottom taskbar + bright calm shell + open typography.
- **Accessibility guard:** light surfaces provide actual contrast for body text and links, including disabled controls.

### 3.5 Petal — “The friendly personalized system”

- **Silhouette:** playful soft desktop with larger distinctive illustrated icons and a **floating expressive dock**; a friendly control center/settings panel. Not a joke skin, and not “cute = hard to use”.
- **Window:** rounded, softly elevated chrome and friendly selected-state shapes; no excessive all-pink fields. Quick settings may expose only *real presentation preferences* (theme, density, contrast, motion, sound) rather than fake Wi-Fi/Bluetooth/power/device toggles.
- **Market:** rich category silhouettes, welcoming spacing, cheerful accents, but serious prices/ownership/BUY states and exact hardware specs.
- **Recon:** graph and operation controls stay tactically legible. Cute shell visuals never trivialize pressure, remove danger labels or leak hidden truth.
- **Wallpaper/brand:** authored sculptural/botanical soft 2D/3D illustration (light) and consistent berry-night alternative.
- **Signature:** pictorial icon set + floating expressive dock + soft geometry/quick settings.
- **Themes currently real:** Light and Night. Both share layout, branding, icon family and semantic meaning. Night is **not a separate distro**.
- **Accessibility guard:** pastel text never falls below practical contrast; emoji/sticker flavor never replaces legible labels or canonical Lucide/shadcn interaction glyphs.

## 4. Shared app, different distro: explicit adaptation contract

### 4.1 Market

**Always present where available:** authoritative wallet CR, true category, projected hardware label, actual five capability deltas, exact price, count owned, affordability and actual BUY command. Real nonhardware market sections (housing, machines, models, software, tools, ledger, etc.) must survive any app extraction. Repeated purchases are governed by the command, **not** a UI assumption that “Owned” makes BUY impossible.

**May differ:** card-vs-comparison-row default density, illustrated framing, side-navigation styling, elevation, tab presentation, tooltips, filtering controls (if implemented), title treatments and category icon accents.

**Never invent:** vendors, rarity, condition, stock counts, pretend cart/orders, component capacities like “32 GB” when simulation only provides abstract MEM +4, or a price converted to a realistic real-world amount. Some older image-generation concepts contain such fabricated values; treat them as **non-authoritative moodboards**, not implementation specs.

### 4.2 Recon/Operations

**Always present where available:** player-observed target identity, known network nodes/edges, visibly distinct inferred/rumored/stale facts, selection inspector, actual operation stage, only projected pressure/evidence/footprint, live actions/receipts and refusal reasons.

**May differ:** drawing style of graph, icon family, pane edge shape, topology tools' arrangement and animation character. Graph must show *sourced* topology, never fabricated connections because the wallpaper or art implies them.

**Never invent:** host OS/version, discovered servers, scans, real network IPs, passive monitoring, vulnerabilities, action outcomes or secret NPC investigation truth. The generated Recon reference's extra hosts and telemetry are visual illustration only.

### 4.3 Shell + system utilities

**Always present:** real playable apps, launcher/focus/close behaviors, visible selection, consistent keyboard shortcuts and meaningful boot/install states. A taskbar/dock shows genuine windows and project state, not random non-existent software shortcuts.

**May differ:** toolbar placement, launcher geometry, icon size, app switching affordance presentation, wallpaper and OS logos, status typography.

**Never invent:** real package management/OS kernel versions, fake filesystem, actual Wi-Fi, fake media playback, battery percentages, CPU process load or clocks not present in game/presentation state. Quick controls that only modify settings must say so. If a feature is only a future goal, label its prototype as a concept, not a working control.

## 5. Architecture and implementation guardrails

- **One runtime + one shared app tree**, no five cloned Next.js desktops and no separate implementations of Market/Recon commands. Presentational profiles are data/slots/tokens that compose a common interaction contract.
- **shadcn/ui primitives are source-owned** and provide controls, menus, dialogs, sheets, tabs, focus, keyboard and accessibility. Do **not** expect shadcn/ui to design a fictional distro. Define OS chrome, dock, taskbar, wallpapers and application artwork in bespoke components/assets using the shared primitives.
- Current code already exposes `DistroId`, `DistroProfile`, theme descriptions/swatches/sound and accessibility overrides in `src/presentation/distros.ts`; `use-presentation-store.ts` provides install/activate settings; CSS scopes `data-distro`/`data-theme`. These are a **starting compatibility surface**, not evidence the proposed shell geometries already exist.
- **Suggested presentation-only shape (not a committed API yet):** shell mode `topbar-dock|compact-rail|edge-shelf|bottom-taskbar|soft-dock`; window chrome style; icon-family key; wallpaper family; font tone; density preference; visual-motion tone. Exact TS type and composition API are deferred to V1 code planning, not additional simulation state.
- Theme/data layering: `OS interaction core → Distro shell profile → Theme palette/material variant → Accessibility/user overrides`. All five must coexist with high contrast, large font, compact/comfortable density, reduced transparency/motion and keyboard-only input.
- Switching installed distros uses the **existing in-world install/reboot/handover** sequence, not an instant CSS palette flip; no world-clock advance or simulation mutation. Sound identity is optional and accessible (existing distro profiles already provide sound configurations).
- Asset source is original or legally licensed, bundled offline. Distinct logos, wallpaper art, UI icon language and category silhouettes per distro can reuse underlying silhouettes and semantic grammar — do not commission bespoke drawings for every fake item.
- Ensure viewport 390px has intentional presentation rules: app switcher/status panel may fold, but controls must remain discoverable, labeled, and usable. Mobile should not simulate an unreachable multiwindow DE.
- Preserve OS apps' own brand identity even when the distro changes. Market should remain identifiably Market; Recon remains identifiably Recon.

## 6. Visual acceptance matrix and gates

**Concept evaluation (before wide source migration):**
- Present a Shell reference for **all five** at the same desktop viewport and enough phone evidence to show different adaptive chrome.
- Show Market and Recon in **Ghost/OS + one strong contrasting distro** first; then expand all five before declaring the whole UI reboot visually complete.
- Human reviewer must be able to name three non-color differences per distro without being prompted. Ask for feedback on *authentic desktop feel* and whether any still reads “generic AI dashboard”.
- Contrast/presentation variants: show Petal Light and Night and Daybreak bright; test Ghost/OS vs Velvet night despite both being dark.
- Label simulated/static concept imagery explicitly; the React implementation must be grounded in actual data.

**Implementation test grid before final approval:**
- Five distros × Shell/Market/Recon × desktop 1280×800 and 390×844 = **30 real browser state screenshots** (plus Petal Night/high contrast/reduced-motion spot cases).
- **Behavior checks:** same projected price/owned/capability/action results in Market; same visible topology and Commands/receipts in Recon; same window state, focus, keyboard shortcuts and reinstall/reboot semantics across distros.
- **Accessibility checks:** tab focus, screen reader labels, 200% text-scale/zoom intent, readable small-window app controls, disabled-action reasons, 390px reachability, contrast, reduced motion and transparency.
- **No fake controls and hidden facts** in shipped interface. If an icon is merely art, label its role or mark it decorative.
- Screenshot diffs/visual review must judge actual density and art, not just “all CSS selectors rendered”.
- No claiming “human usability PASS” from Chromium automation. Unfamiliar-human playtest gate remains separate.

**Hard gate from V0 plan still applies:** the user rejected first generic visual references and requested genuine distro inspiration. Later static/AI mockups are *directional references only*. Approval of the five identity profiles permits execution of these designs, but **does not constitute visual acceptance of code-rendered V0 prototypes**; present those actual screenshots before integrating the new production UI.

## 7. Ownership and sequence

**Owner:** GPT-6 solo from design through implementation, original art, shadcn migration, tests and GitHub integration. No Claude overlap.

1. Incorporate this identity matrix into the approved visual-reboot spec after user review.
2. Produce authentic grounded Shell **V0 Revision** samples for five distros (real-looking window managers/DEs), including a reference image with actual runnable UI proof where possible.
3. Confirm the mood/artwork with user; distinguish moodboard concept screenshots from code-rendered app screenshots.
4. Implement the shared shadcn foundation and profile-driven Shell (V1), then truth-derived illustrated Market (V2), Recon (V3) and remaining app families (V4).
5. Complete art/polish, visual test matrix, game/terminal regression and human usability testing before closing the epic.

## 8. Current code status and review request

- The *existing* five distro IDs/profiles, swatches, theme choices, install/handover and accessibility hooks already exist.
- The richer launcher geometry, wallpaper/icon packs and window chrome differences in this document are **targets**, not features already shipped.
- The user has approved **all five specific identities and their different Dock/Taskbar/Launcher placements** on 2026-10-11. Proceed with real, reviewable visual reference screens and the established V0 visual-review gate before production UI migration.
