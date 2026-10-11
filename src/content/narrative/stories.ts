/** G9 P5 — versioned, trusted author-authored Ink. No external functions. */
export type NarrativeStoryId = "g9.npc-relay.v1" | "g9.lead-dilemma.v1";
export type NarrativeVariant = "npc" | "unmapped" | "mapped";
export const NARRATIVE_STORIES: Record<NarrativeStoryId, { readonly version: 1; readonly source: string }> = {
  "g9.npc-relay.v1": {
    version: 1,
    source: `-> exchange

=== exchange ===
The underground is noisy. Every handle has a story; few have proof.
* [Ask what would count as evidence.]
    "I don't certify rumors. A mapped host tells you where to look, not who was right."
    -> END
* [End the conversation.]
    "Then keep your own counsel." The channel closes.
    -> END
`,
  },
  "g9.lead-dilemma.v1": {
    version: 1,
    source: `-> unmapped

=== unmapped ===
A lead has surfaced. The source may be public, or just another person's claim. You need real recon before acting.
* [Investigate an observed host.]
    You ask the simulation to check what you actually observed.
    -> END
* [Ignore the lead.]
    The world does not stop because you walked away.
    -> END

=== mapped ===
You mapped an involved host, not the truth of the incident. This choice will affect people and the market.
* [Disclose the account.]
    You put your name behind the account. Others will judge what it claims.
    -> END
* [Trade the information.]
    A buyer receives the intelligence. The subject won't welcome it.
    -> END
* [Exploit the opening.]
    You extract greater value, and create a deeper grudge.
    -> END
* [Ignore it.]
    You leave without cashing in.
    -> END
`,
  },
};
