# UI, UX, and Art Direction

## Two-layer presentation

Ghostrank has two tightly connected presentation layers.

### Computer layer
The majority of play:
- desktop/window manager,
- terminal,
- browser/forums,
- messaging,
- marketplaces,
- file/log viewers,
- network tools,
- wallet/value graphs,
- AI studio,
- software builder,
- settings and utilities.

Implemented with Next.js/React and web UI primitives.

### Physical layer
A small top-down/isometric room or safehouse rendered with Phaser 4:
- avatar,
- desk,
- computer hardware,
- monitors,
- door/window,
- lighting,
- ambient effects,
- alarms/cameras,
- contextual movement.

The room should make the player feel located without becoming a separate exploration game.

## Computer UI principles

The simulated computer must feel inhabited and customizable, not like a website dashboard.

Applications may have distinct authors and visual styles.

A famous underground tool should not automatically look like the built-in OS settings app.

Use shadcn/ui as implementation primitives, then heavily theme and customize them.

## Window system

The desktop should support as appropriate:
- movable/resizable windows,
- focus/z-order,
- tabs,
- multiple terminals,
- notifications,
- drag/drop,
- context menus,
- keyboard shortcuts,
- command palette,
- saved layouts,
- multi-monitor layouts when hardware supports them.

Hardware upgrades should produce visible ergonomic changes where possible.

A second monitor should be a real additional workspace, not only a stat.

## Information design

Because the game is dense, information must be:
- inspectable,
- sortable,
- searchable,
- cross-linkable,
- attributable to a source,
- allowed to be uncertain.

Avoid flattening rich evidence into one green/red answer.

Examples:
- relationship graphs,
- network topology,
- timeline views,
- tool provenance,
- confidence annotations,
- transaction/value graphs.

## Room camera

Default camera: compact top-down/isometric framing.

The player can move only within the small location.

Entering deep computer interaction can bring the computer layer visually forward while preserving a sense of the physical room through edges, lighting, audio, or quick zoom-out.

## Atmosphere

Desired mood:
- late-night isolation,
- monitor glow,
- rain or city ambience,
- fan noise under compute load,
- distant traffic,
- electrical hum,
- occasional silence,
- environmental signals that may or may not be threats.

The room is a tension instrument.

## Hardware feedback

Heavy local compute can affect:
- fan audio,
- visible case activity,
- room lighting,
- temperature indicators,
- power draw UI.

Buying hardware should create tangible presence.

## Art scope

Keep physical art intentionally achievable:
- small rooms,
- reusable modular props,
- limited character animation,
- strong lighting,
- readable silhouettes,
- controlled camera.

Do not spend production budget on large walkable environments that do not improve the core computer simulation.

## Accessibility

Plan for:
- scalable UI,
- keyboard-first navigation where possible,
- readable typography,
- reduced motion,
- high contrast,
- alternatives to color-only state,
- adjustable terminal font size,
- audio cues with optional visual equivalents.

The game can be difficult without being physically difficult to read.
