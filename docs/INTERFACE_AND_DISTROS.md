# Interface, Visual Language, and Distros

## Purpose

Ghostrank is played primarily through a fictional computer, but it must not feel like a wall of buttons, menus, terminal text, and status paragraphs.

The computer should feel like an inhabited operating environment: comfortable to look at for long sessions, visually expressive, readable at a glance, and still grounded in the game's systems-heavy tone.

The terminal is one application inside that environment. It is not the visual template for every application.

## Core principles

### Recognition before reading

When information can be communicated reliably through structure, iconography, spatial layout, color, shape, or motion, prefer that first layer over another sentence or badge.

Text remains authoritative when precision matters, but the player should often understand the direction of a situation before reading every label.

Examples:
- hostile or rival relationships acquire a recognizable visual treatment,
- infrastructure is easier to understand as topology than as a flat machine list,
- contracts expose objective and deadline shape visually,
- value movement can be read as a graph or timeline,
- terminal output may use compact tables, glyphs, sparklines, and hierarchy rather than raw prose.

### Visuals must respect epistemic truth

Presentation must never reveal hidden simulation truth merely because a graph or icon would be convenient.

The visual layer may represent only information available to the player projection.

Use a consistent truth vocabulary:

| Meaning | Default visual treatment |
| --- | --- |
| confirmed | solid / stable |
| observed | outlined / directly sourced |
| inferred | translucent or otherwise visibly analytical |
| rumored | dashed / socially sourced |
| stale | faded / aged |
| unknown | absent, masked, or unresolved placeholder |

Exact artwork may vary by distro, but the semantic distinction must remain.

### Never rely on color alone

Relationship state, danger, uncertainty, success, and failure need a second cue such as:
- icon,
- shape,
- border treatment,
- label,
- pattern,
- placement.

This is both an accessibility rule and a readability rule.

### Motion communicates change

Animation should explain state change, hierarchy, or focus rather than decorate every interaction.

Use motion for:
- window open/close/minimize/maximize,
- app switching,
- list insertion/removal,
- graph/topology changes,
- focus movement,
- a newly surfaced warning or message,
- meaningful state transitions.

Do not turn persistent danger into perpetual pulsing or flashing.

### Apps keep their own identity

The OS shell should be coherent, but Market, Recon, Underground, Forge, History, Terminal, and future apps should not collapse into one generic dashboard template.

Shared controls should behave consistently. Information architecture and visual personality may differ by app.

## Semantic visual language

The UI should derive presentation states from already-authoritative or already-projected facts. It should not invent parallel gameplay booleans merely to style a row.

For example, a visual "rival" treatment should derive from surfaced relationship/history information rather than introducing an authoritative `isRival` gameplay flag.

Useful cross-app semantic categories include:
- relationship: trusted / neutral / wary / hostile / rival,
- evidence: confirmed / observed / inferred / rumored / stale / unknown,
- attention: ordinary / noteworthy / urgent,
- operation: quiet / active / escalated / disengaged,
- provenance: player / contact / market / authored tool / AI inference,
- lifecycle: available / running / cooling / completed / failed.

These categories are presentation vocabulary, not a new power system.

## Visual information surfaces

Prefer meaningful diagrams where the underlying game structure justifies them.

### Recon

Recon should progressively form a topology:
- target,
- known machines,
- known services,
- observed links,
- unresolved or inferred structure.

AI analysis must look different from confirmed evidence.

### Relationships and Underground

Handles can carry compact relationship signatures and incident context.

A player who has become a genuine rival should become visually recognizable across surfaces without every row spelling out the same explanation.

Rumors, public incidents, direct messages, and known facts must keep distinct treatments.

### Contracts

Contracts should expose:
- objective family,
- target,
- progress-relevant known facts,
- deadline,
- issuer,
- lifecycle.

A timeline or compact visual deadline is preferable to requiring the player to parse raw minutes.

### Market and compute

Hardware, models, software, and machines may use compact capability signatures and comparison graphics.

Do not add decorative radar charts that obscure exact values. Visual summaries supplement inspectable numbers.

### History and postmortems

Causal history is naturally visual:
- action,
- escalation,
- consequence,
- retaliation,
- investigation,
- reaction,
- probe,
- physical event,
- ending.

Completed-run timelines are ordered from archived actions and surfaced evidence. They name the kind of record and its world time; adjacent events are context, not proof that one caused another. Postmortem attribution may cite stored provenance only through the existing player-safe facts, and must never expose hidden actors, investigation progress, probe correctness, or source ids.

The final screen gives each ending its own authored presentation while preserving the terminal status and minute exactly. A cause is stated only when the player-safe record supports it; otherwise the screen reports the limit and shows nearby surfaced evidence without joining it into an invented explanation. Rank remains reputation only.

The room is a restrained physical frame around the computer. Ambient motion follows the effective reduced-motion setting. Its tension light and optional warning cue may use only a projected physical signal at the current location; no room or audio presentation reads hidden actors or causes.

### Terminal

The terminal remains text-first but can be visually literate.

Allowed output includes:
- structured tables,
- aligned columns,
- hierarchy,
- Unicode glyphs,
- compact bars,
- sparklines,
- color accents,
- links/identifiers where the terminal UI supports them.

GUI and terminal still call the same simulation commands and capabilities.

## UI implementation direction

Phase 9 standardizes the React UI around:

- Tailwind CSS for layout and low-level styling,
- shadcn/ui as the owned component foundation,
- semantic CSS variables/tokens rather than app-local hard-coded palettes,
- Motion for React state/layout animation,
- native CSS/Tailwind transitions for small hover/focus/color transitions,
- Lucide or equivalent coherent iconography unless a later art pass replaces particular marks.

GSAP and React Spring are not part of the baseline stack. Add either only if a demonstrated interaction cannot be expressed cleanly with Motion/CSS.

Shadcn components are source-owned building blocks, not a mandate that every Ghostrank app look identical.

## Distro architecture

Presentation is layered:

    OS core
      -> distro profile
          -> theme variant
              -> accessibility/user overrides

A distro may define:
- palette,
- typography,
- density,
- radii,
- elevation,
- window chrome,
- launcher/panel treatment,
- icon treatment,
- wallpaper/background,
- motion character,
- system sounds.

A distro must not change:
- simulation rules,
- rank,
- target access,
- command results,
- capability values,
- evidence truth,
- RNG,
- economy outcomes.

Installing or switching a distro is player expression, not character power.

A distro is **not** a one-click theme toggle. The in-world computer should treat distro changes as operating-system lifecycle events:

- Ghost/OS is installed by default.
- A distro not yet installed must go through an installer experience with package verification, unpack/configuration steps, visible progress, completion, and a reboot/handover moment.
- Installed distros remain available in presentation settings and can be booted later without reinstalling them.
- Booting/switching an installed distro still uses a short OS handover/reboot experience rather than instantly recoloring the current frame.
- Installer/reboot time is UI presentation time only. It never advances world minutes, runs ecosystem ticks, changes deadlines, or alters deterministic outcomes.
- Reduced-motion mode may shorten or remove decorative motion, but must preserve clear installation state/progress text.
- The installation experience must remain cancel-safe before commit where practical and must never corrupt a run if presentation persistence is unavailable.

Each distro may also define a **sound identity** for install, boot, completion, notifications, and other shell cues. P7 adds short ending and newly surfaced physical-warning cues to those profiles. These are event-driven, optional, muted before audio output is opened, and never a required carrier of state. No continuous room ambience is required.

Presentation preferences, installed-distro records, and sound preferences live outside authoritative `WorldState`.

## Visual Reboot — distinct distro identities (2026-10-11)

The user-approved reboot requires **genuinely differentiated desktop environments**, not five recolors of one shell. The proposed per-distro direction — shell geometry, taskbar/dock/launcher placement, wallpaper, icon family, window chrome, type, Market/Recon adaptation, and cross-distro QA — is documented in [Distro Identity Matrix v1](visual-reboot/DISTRO_IDENTITY_MATRIX.md). It is a detailed **proposal pending review**, not a claim that the new shells already ship.

The Linux-distro-inspired reference means *believable workstation behavior and identity*, never copied Linux branding, fake kernel/system information, invented services, or extra gameplay authority. The presentational core and accessibility contract below remain binding.

## Initial distro family

### Ghost/OS

Default reference identity.

Dark, stealthy, restrained, compact, technical, and low-saturation.

It should feel serious without looking like a green-on-black movie terminal.

### Lattice

Dense productivity/analysis identity.

Structured, grid-conscious, efficient, keyboard-friendly, with a cooler technical palette and tighter information density.

### Velvet

Elegant dark identity.

Softer edges, richer surfaces, restrained plum/mauve/rose accents, and smoother motion. Stylish without becoming ornamental.

### Daybreak

Bright editorial identity.

Warm light surfaces, excellent long-form readability, calm contrast, and a modern desktop feel. It proves that "hacker OS" does not mean "dark theme required."

### Petal

Cute, colorful, playful identity.

Pastel-capable, soft, warm, expressive, and deliberately charming while remaining fully usable for serious play.

Petal may support both light and dark variants. A cute or feminine-leaning presentation is a legitimate player preference, not a joke skin, and must receive the same readability/accessibility care as every other distro.

## Themes versus distros

A distro is a larger visual personality and shell profile.

A theme is a smaller variant inside that distro.

Examples:
- Ghost/OS: Ash, Wire, Static
- Velvet: Noir, Plum, Roseglass
- Petal: Light, Night, Sakura, Mint

Exact shipping variants remain content decisions. The architecture should not require a separate React application per distro.

## Accessibility overrides

Accessibility settings sit above distro styling and must work with every profile.

Phase 9 should support or establish the hooks for:
- reduced motion,
- stronger focus indication,
- high-contrast treatment,
- UI/text scaling,
- comfortable density,
- reduced transparency/blur,
- keyboard navigation,
- non-color status cues.

A distro cannot opt out of these overrides.

## Persistence boundary

Selected distro, theme, UI scale, motion preference, and similar presentation settings are player/application settings, not simulation state.

They may persist through the host settings layer and survive run completion.

Changing presentation must not change deterministic run output.

## Phase 9 acceptance direction

The Phase 9 UI work should leave Ghostrank feeling like a computer the player inhabits rather than a sequence of forms.

Success means:
- important state can often be recognized before reading,
- long sessions remain visually comfortable,
- apps are distinct but coherent,
- the same information semantics survive across distros,
- no visual shortcut leaks hidden truth,
- terminal and GUI parity remains intact,
- accessibility overrides remain first-class.
