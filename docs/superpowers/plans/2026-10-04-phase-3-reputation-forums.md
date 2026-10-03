# Phase 3 P4 — Reputation Descriptors and Forums (closes Phase 3)

Issue: #21
Builds on: P0–P3

## Goal

Finish the underground ecosystem. The scene talks in public (forums) and describes the player from what the player actually did (descriptors). Both are observations: nothing here is chosen by the player, nothing gates a target, and rank never feeds either.

## Reputation descriptors

Derived, never stored. A pure function of history the player already knows: contracts, traces. Each descriptor carries its **context** and the **basis** (count) so the player can see why.

| Descriptor | Context | Rule |
| --- | --- | --- |
| Professional | contracts | `>= 2` contracts delivered and none missed (accepted then expired) |
| Opportunist | contracts | `>= 1` accepted contract missed; basis = missed count |
| Hunter | intrusions | `>= 1` intrusion contract delivered |
| Predator | intrusions | `>= 3` operation-escalation traces |

A missed contract blocks Professional, so Professional and Opportunist never appear together.

Projection: `player descriptors[]` of `{id, label, context, basis}`. TinyBase table `descriptors`. No persistence change (derived).

## Forums

Two public boards, one per network (`white`, `black`). Posts are authored by actors on their own board.

State: `UndergroundState.forumPosts[]`: `id, board, authorId, subject {kind, id}, worldMinute`.

Subjects:
- `incident`: a public NPC incident. Per network, 60% chance of one post by an actor of that network who is not a party; picked by hash.
- `unmasking`: always condemned. When an actor unmasks the player, one non-unmasker actor from each network posts.
- `contract`: when the player delivers a contract, the issuer posts on its own board (a public vouch).

The player reads the board of their own network only. Projection is structured (no free text, no hidden truth), newest first, cap 30.

Event: `ForumPosted {postId, board, authorId, subjectKind, subjectId, worldMinute}`.

## Commands

None. Both are read surfaces.

## Invariants (tested)

- descriptors follow history, are rank-independent, and a missed contract blocks Professional,
- posts are deterministic, rank-independent, split-invariant and survive restore-and-continue,
- incident posters are never parties and post on their own network's board,
- unmasking is condemned on both boards; delivering a contract earns a vouch,
- the player sees only their network's board,
- legacy saves load with no posts.

## Out of scope

Player-authored posts, tool discovery through forums (Phase 4+), moderation.
