# Hacking and Tools

## Design goal

Hacking should feel like manipulating a coherent simulated computer world rather than selecting attacks from a menu.

We deliberately combine recognizable computing concepts with fictional protocols, simplified abstractions, and game-specific commands. The goal is believable reasoning, not operational real-world instruction.

## Capability model

The simulation exposes small composable capabilities such as:
- discover,
- inspect,
- query,
- connect,
- route,
- capture,
- compare,
- correlate,
- transfer,
- analyze,
- execute virtual workloads,
- read/write simulated files or records,
- observe logs,
- manage identities,
- manage simulated processes.

Names and exact semantics are fictionalized and data-driven.

A consequential operation is built from capabilities, not a generic success roll.

## Shared hacking gameplay capabilities (D073)

Network mapping, traffic analysis, log forensics, access/trust, sandbox triage and camera investigation are reusable **world capabilities**, not scripted mini-games owned by a mission. Authored encounters and generated targets supply topology, evidence, goals and consequences, but the common simulation decides route hypotheses, cost and results. A mechanic is not considered agnostic until the same authority works against a separate, genuinely different target. Nightshade is a teaching scenario, not the system's owner or a required gate.

Current design proposal: `docs/superpowers/specs/2026-10-10-g3-reusable-hacking-mechanics-design.md` (#105 / PR #106). No new gameplay shipped; human approval is still required for the detailed specification and implementation plan.

## One system, many interfaces

The same capability may be invoked from:
- the in-game terminal,
- a GUI application,
- a purchased tool,
- a player-authored tool,
- an AI-authored workflow,
- an automated scheduled routine.

Example concept:

A premium mapper may perform discovery, inspection, classification, correlation, and visualization automatically.

An expert player may reproduce most of that manually with a precise sequence of terminal commands.

The premium tool buys speed, ergonomics, repeatability, scale, and visualization — not a different universe of rules.

## Terminal

The terminal is important but never mandatory for every activity.

It uses a game-specific command language whose syntax is inspired by real shells but whose operations are backed by the virtual simulation.

Requirements:
- discoverable help,
- history,
- piping/composition where valuable,
- aliases,
- saved workflows,
- clear error output,
- structured rich output where it improves comprehension (tables, hierarchy, glyphs, compact bars or sparklines),
- no access to the host OS,
- no real network operations.

The terminal should reward fluency without forcing memorization of dozens of real commands.

## GUI tools

GUI applications can expose:
- topology maps,
- traffic/activity views,
- identity graphs,
- wallet/value graphs,
- file/log explorers,
- diff/comparison views,
- workflow builders,
- dashboards,
- alarms,
- AI analysis.

A GUI is a view/controller over the same domain capabilities.

GUI tools should visualize the structure they actually operate on instead of flattening everything into text and buttons. Topology, relationship, value, workflow, and causal views are encouraged when the underlying simulation provides those relationships. AI inference and rumor must remain visually distinct from confirmed/observed evidence.

GUIs can be:
- bundled,
- purchased,
- stolen,
- modified,
- commissioned,
- AI-generated,
- authored by well-known NPC toolmakers.

## Software market

Tools have authorship and social history.

Properties can include:
- author/handle,
- version,
- price,
- reputation,
- known signatures,
- dependencies,
- resource cost,
- permissions,
- supported capabilities,
- update channel,
- known incidents,
- popularity.

A famous tool may be valuable because it is efficient and trusted, while also being easier for adversaries to recognize.

Risks include:
- hidden telemetry in the fiction,
- backdoors,
- malicious forks,
- copied branding,
- signature correlation,
- supply-chain compromise,
- abandoned dependencies.

## Player-authored software

The player does not type real Python/Rust application source as a core loop.

Instead they define intent, inputs, outputs, permissions, language/tooling preference, tests, UI needs, and automation rules. In-world AI and character proficiency transform the specification into a virtual program representation.

A program is stored as a safe workflow/IR, for example:

    discover(target)
      -> inspect(services)
      -> filter(anomalies)
      -> correlate(localKnowledge)
      -> visualize(topology)

The runtime validates and executes this representation against simulated APIs.

This allows:
- custom tools,
- modifiable workflows,
- bugs,
- tests,
- versions,
- performance differences,
- software sales,
without executing arbitrary generated host code.

## Manual versus bought versus built

Every tool decision should express the triangle:

**Money vs Time vs Skill**

Manual:
- cheapest,
- flexible,
- knowledge intensive,
- slower under pressure,
- more prone to human error.

Bought:
- immediate,
- tested or at least socially reviewed,
- expensive,
- may have signatures or trust risks.

Built:
- consumes time and compute,
- customizable,
- can be optimized for the player's habits,
- may contain defects,
- can become a product and income source.

## Tool discovery

Players should learn tools through:
- marketplaces,
- contacts,
- forum discussions,
- leaked packages,
- target machines,
- other hackers,
- contract requirements,
- observing what opponents use.

There is no global storefront containing every solution.

## Opponent tools

NPC hackers use the same conceptual capability model. They can scan, automate, defend, deceive, correlate, attack the player, sell software, and make mistakes.

The simulation should avoid one-sided rules where only the player can be clever.
