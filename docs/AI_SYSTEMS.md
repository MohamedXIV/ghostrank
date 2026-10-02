# AI Systems

## Purpose

Modern AI is a first-class part of Ghostrank's world and economy.

AI should amplify a player's decisions, not replace them with a win button.

## Cloud versus local

### Cloud models

Advantages:
- strong capability,
- no major local hardware requirement,
- fast onboarding,
- scalable compute.

Risks/costs in the fiction:
- subscription and usage costs,
- account dependence,
- data exposure,
- policy refusal,
- rate limits,
- provider logs,
- access interruption.

### Local models

Advantages:
- player-controlled environment,
- offline operation,
- customizable behavior,
- stronger privacy within the fiction.

Costs:
- hardware,
- VRAM,
- storage,
- power/heat,
- slower performance,
- model management,
- quality trade-offs.

## Model characteristics

Models may differ across:
- reasoning,
- coding,
- context size,
- analysis,
- autonomy,
- reliability,
- alignment/restriction,
- speed,
- memory footprint,
- specialization.

The player can choose smaller, quantized, specialized, or larger models according to hardware and task.

## Reliability

AI can be wrong.

A model can:
- misclassify,
- hallucinate a relationship,
- overstate confidence,
- miss a pattern,
- generate a defective workflow.

Expert play involves verifying important AI conclusions.

The UI should communicate provenance and confidence without turning every result into a deterministic percentage.

## Behavioral modification

Some in-world models may refuse certain requests. The player can choose other models or modify a local model's behavior within fictional systems.

This is a game mechanic about capability/reliability trade-offs, not a real guide to bypassing current products.

More permissive configuration may trade against reliability, safety checks, support, or stability.

## AI-assisted software development

The player specifies software rather than writing source line by line.

Inputs can include:
- purpose,
- capabilities,
- data sources,
- outputs,
- language/runtime preference,
- UI requirements,
- tests,
- performance goals,
- permissions.

The AI produces a virtual workflow/IR over in-game time.

Build duration depends on:
- model capability,
- local or rented compute,
- hardware,
- project complexity,
- tests,
- character proficiency,
- interruptions.

Builds may finish with:
- success,
- warnings,
- failed tests,
- unresolved behaviors,
- performance problems.

## Compute contention

AI workloads consume resources that may be needed elsewhere.

Example:
- a local model occupies most GPU memory while building a tool,
- the player wants the same GPU for a time-sensitive analysis operation,
- they can pause the build, change model quality, rent compute, or accept slower execution.

Compute budgeting should turn hardware ownership into decisions rather than passive bonuses.

## NPC use

NPC hackers can:
- use commercial models,
- host local models,
- buy specialized models,
- author and sell models,
- make AI-assisted mistakes,
- use automation to watch the player.

AI is part of the ecosystem, not a player-exclusive superpower.
