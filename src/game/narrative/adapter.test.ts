import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { captureWorldOpportunities } from "@/game/content/opportunities";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { renderInkNarrative } from "@/game/narrative/ink-runtime";
import { formatNarrativeTerminalView } from "@/game/narrative/terminal-view";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { WorldState } from "@/game/simulation/state/world-state";

const npcStory = "g9.npc-relay.v1" as const;
const leadStory = "g9.lead-dilemma.v1" as const;

function fixture(seed = 7): WorldState {
  return createSliceWorldState({ seed, scenario: "fresh-scene", handle: "PilotLab" });
}

function publicLeadWorld(seed = 7): WorldState {
  const world = fixture(seed);
  const owner = world.underground.actors.find((a) => a.targetId);
  const peer = world.underground.actors.find((a) => a.id !== owner?.id);
  if (!owner?.targetId || !peer) throw Error("missing owner or peer");
  world.underground.incidents.push({
    id: "incident:story", kind: "npc-intrusion", actorId: peer.id,
    counterpartId: owner.id, public: true, outcome: "succeeded", worldMinute: 0,
  });
  const created = captureWorldOpportunities(world, [{
    type: "UndergroundActivity", incidentId: "incident:story",
    actorId: peer.id, counterpartId: owner.id, public: true,
    outcome: "succeeded", worldMinute: 0,
  }]);
  expect(created).toHaveLength(1);
  return world;
}
function proveOneHost(world: WorldState): void {
  const lead = world.opportunities?.[0];
  const machine = world.targets.find(t => t.id === lead?.targetId)?.machines[0];
  if (!machine) throw Error("no lead host");
  world.evidence.push({
    id: "observed:story", kind: "machine-presence",
    subjectId: machine.id, source: "direct-observation",
    confidence: "observed", worldMinute: world.worldMinute,
  });
}
function start(bus: CommandBus, storyId: typeof npcStory | typeof leadStory, refId: string) {
  return bus.execute({ type: "startNarrative", storyId, refId });
}
function current(bus: CommandBus) {
  const projected = projectWorld(bus.snapshot()).narrative;
  if (!projected) throw Error("narrative missing");
  return projected;
}
function choose(bus: CommandBus, n: number) {
  const scene = current(bus);
  const choice = scene.choices[n];
  if (!choice) throw Error("missing choice");
  return bus.execute({ type: "chooseNarrative", sceneId: scene.id, choiceId: choice.id });
}

describe("G9 P5 inkjs story and authoritative intents", () => {
  it("compiles and plays an actual Ink NPC dialogue from the public roster", () => {
    const bus = new CommandBus(fixture());
    const actor = bus.snapshot().underground.actors[0];
    const before = JSON.stringify(bus.snapshot());
    expect(start(bus, npcStory, actor.id)).toMatchObject({ ok: true });
    const presented = current(bus);
    expect(presented.subjectLabel).toBe(actor.handle);
    expect(presented.storyId).toBe(npcStory);
    expect(presented.version).toBe(1);
    expect(presented.choices).toHaveLength(2);
    expect(presented.text).toContain("Every handle has a story");
    expect(presented.choices[0].costLabel).toBe("No clock cost");
    expect(choose(bus, 0).events).toContainEqual(expect.objectContaining({
      type: "NarrativeChoiceRecorded", sceneId: presented.id, choiceIndex: 0,
    }));
    expect(current(bus).text).toContain("don't certify rumors");
    expect(current(bus).finished).toBe(true);
    expect(current(bus).choices).toHaveLength(0);
    expect(bus.snapshot().player.rank).toBe(JSON.parse(before).player.rank);
    expect(bus.snapshot().economy.credits).toBe(JSON.parse(before).economy.credits);
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("rejects invented story IDs, actor refs, forged or stale choice IDs without mutation", () => {
    const bus = new CommandBus(fixture());
    const actor = bus.snapshot().underground.actors[0];
    const original = JSON.stringify(bus.snapshot());
    expect(start(bus, npcStory, "fictional:secret").error).toBe("STORY_SOURCE_UNAVAILABLE");
    expect(bus.execute({
      type: "startNarrative", storyId: "g9.raw.world-exec.v1" as typeof npcStory,
      refId: actor.id,
    }).error).toBe("STORY_NOT_FOUND");
    expect(bus.execute({
      type: "startNarrative", storyId: "__proto__" as typeof npcStory, refId: actor.id,
    }).error).toBe("STORY_NOT_FOUND");
    expect(JSON.stringify(bus.snapshot())).toBe(original);
    expect(start(bus, npcStory, actor.id).ok).toBe(true);
    const prior = JSON.stringify(bus.snapshot());
    const scene = current(bus);
    expect(bus.execute({
      type: "chooseNarrative", sceneId: "scene:999",
      choiceId: scene.choices[0].id,
    }).error).toBe("STORY_SESSION_INVALID");
    expect(bus.execute({
      type: "chooseNarrative", sceneId: scene.id,
      choiceId: "scene:1:choice:world.credits=999999",
    }).error).toBe("STORY_CHOICE_INVALID");
    expect(JSON.stringify(bus.snapshot())).toBe(prior);
    expect(choose(bus, 1).ok).toBe(true);
    expect(bus.execute({ type: "chooseNarrative",
      sceneId: scene.id, choiceId: scene.choices[0].id,
    }).error).toBe("STORY_SESSION_INVALID");
  });

  it("offers a real non-contract lead choice and routes its economic effect through CommandBus", () => {
    const state = publicLeadWorld(9);
    proveOneHost(state);
    const leadId = state.opportunities![0].id;
    const bus = new CommandBus(state);
    expect(start(bus, leadStory, leadId).ok).toBe(true);
    const pending = current(bus);
    expect(pending.choices).toHaveLength(2);
    expect(pending.text).toContain("need real recon");
    expect(choose(bus, 0).ok).toBe(true);
    expect(bus.snapshot().opportunities?.[0].status).toBe("mapped");
    expect(bus.snapshot().economy.credits).toBe(0);
    expect(start(bus, leadStory, leadId).ok).toBe(true);
    const mapped = current(bus);
    expect(mapped.choices.map(c => c.text)).toEqual([
      "Disclose the account.", "Trade the information.",
      "Exploit the opening.", "Ignore it.",
    ]);
    const result = choose(bus, 1);
    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "ValueTransferred", causeKind: "opportunity", causeId: leadId,
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "RelationshipChanged", causeKind: "opportunity", causeId: leadId,
    }));
    expect(bus.snapshot().economy.credits).toBeGreaterThan(0);
    expect(bus.snapshot().opportunities?.[0].status).toBe("resolved");
    expect(current(bus).finished).toBe(true);
    expect(chooseFromFinished(bus, mapped.choices[1].id)).toBe("STORY_SESSION_INVALID");
  });

  it("failed lead intent leaves the session choice available and cannot mint credits", () => {
    const state = publicLeadWorld();
    const leadId = state.opportunities![0].id;
    const bus = new CommandBus(state);
    expect(start(bus, leadStory, leadId).ok).toBe(true);
    const scene = current(bus);
    expect(choose(bus, 0).error).toBe("LEAD_NEEDS_OBSERVED_HOST");
    expect(current(bus).choices).toEqual(scene.choices);
    expect(bus.snapshot().economy.credits).toBe(0);
    expect(bus.snapshot().narrative?.current?.selectedIndex).toBeUndefined();
    // A forged direct choice for a mapped branch was never offered by Ink.
    expect(bus.execute({
      type: "chooseNarrative", sceneId: scene.id, choiceId: scene.id + ":choice:3",
    }).error).toBe("STORY_CHOICE_INVALID");
  });

  it("starts a lead story only from a legitimately visible source; private truth stays hidden", () => {
    const world = fixture(13);
    const owner = world.underground.actors.find(a => a.targetId)!;
    const peer = world.underground.actors.find(a => a.id !== owner.id)!;
    world.underground.incidents.push({
      id: "private:1", actorId: peer.id, counterpartId: owner.id,
      kind: "npc-intrusion", public: false, outcome: "repelled", worldMinute: 0,
    });
    world.underground.rumors.push({
      id: "rumor:1", kind: "incident-leak", sourceId: "private:1",
      relayId: peer.id, accurate: false, worldMinute: 0,
      claim: { actorId: peer.id, counterpartId: owner.id, outcome: "succeeded" },
    });
    world.underground.messages.push({
      id: "message:1", fromId: peer.id, rumorId: "rumor:1",
      read: false, worldMinute: 0,
    });
    const bus = new CommandBus(world);
    expect(start(bus, leadStory, "lead:report:message:1").error)
      .toBe("STORY_SOURCE_UNAVAILABLE");
    expect(bus.execute({ type: "readMessage", messageId: "message:1" }).ok).toBe(true);
    const id = "lead:report:message:1";
    expect(start(bus, leadStory, id).ok).toBe(true);
    const visible = JSON.stringify(current(bus));
    expect(visible).not.toContain("repelled");
    expect(visible).not.toContain("accurate");
    expect(visible).not.toContain(owner.targetId!);
    expect(visible).not.toContain(owner.skill.toString() + " hidden");
    expect(current(bus).subjectLabel).toBe("Unverified relay");
  });

  it("replays deterministic Ink text/choices through save/reload with pinned source version", () => {
    const world = publicLeadWorld();
    const id = world.opportunities![0].id;
    const live = new CommandBus(world);
    start(live, leadStory, id);
    const pending = current(live);
    const restored = new CommandBus(worldStateSchema.parse(JSON.parse(JSON.stringify(live.snapshot()))));
    expect(current(restored)).toEqual(pending);
    expect(choose(live, 1)).toEqual(choose(restored, 1));
    expect(restored.snapshot()).toEqual(live.snapshot());
    expect(current(restored).text).toEqual(current(live).text);
    const edited = JSON.parse(JSON.stringify(restored.snapshot()));
    edited.narrative.current.version = 2;
    expect(worldStateSchema.safeParse(edited).success).toBe(false);
  });

  it("terminal can read the very same projected Ink dialogue and available choice IDs", () => {
    const bus = new CommandBus(publicLeadWorld());
    const id = bus.snapshot().opportunities![0].id;
    expect(formatNarrativeTerminalView(undefined)).toContain("NO ACTIVE CONVERSATION");
    expect(start(bus, leadStory, id).ok).toBe(true);
    const projected = current(bus);
    const output = formatNarrativeTerminalView(projected);
    expect(output).toContain("NARRATIVE // Public incident");
    expect(output).toContain("story choose " + projected.id + " " + projected.choices[0].id);
    expect(output).not.toContain(bus.snapshot().opportunities![0].subjectActorId);
    expect(choose(bus, 1).ok).toBe(true);
    expect(formatNarrativeTerminalView(current(bus))).toContain("CONVERSATION CONCLUDED");
  });

  it("supports terminal commands that equal GUI semantic actions", () => {
    const world = publicLeadWorld();
    const id = world.opportunities![0].id;
    const a = new CommandBus(world);
    const b = new CommandBus(world);
    const parsed = parseTerminalCommand("story lead " + id);
    expect(parsed).toEqual({ ok: true, command: {
      type: "startNarrative", storyId: leadStory, refId: id,
    } });
    const gui = { type: "startNarrative" as const, storyId: leadStory, refId: id };
    expect(a.execute(gui)).toEqual(b.execute(parsed.ok ? parsed.command : gui));
    const scene = current(a);
    const chosen = parseTerminalCommand("story choose " + scene.id + " " + scene.choices[1].id);
    expect(chosen).toEqual({ ok: true, command: {
      type: "chooseNarrative", sceneId: scene.id, choiceId: scene.choices[1].id,
    } });
    const button = { type: "chooseNarrative" as const,
      sceneId: scene.id, choiceId: scene.choices[1].id };
    expect(a.execute(button)).toEqual(b.execute(chosen.ok ? chosen.command : button));
    expect(a.snapshot()).toEqual(b.snapshot());
    const actorId = world.underground.actors[0].id;
    expect(parseTerminalCommand("talk " + actorId)).toEqual({
      ok: true, command: { type: "startNarrative", storyId: npcStory, refId: actorId },
    });
  });

  it("does not expose Ink external write bindings; standalone compilation never mutates simulation", () => {
    const world = fixture();
    const initial = JSON.stringify(world);
    const frame = renderInkNarrative(npcStory, "npc");
    expect(frame.choices.length).toBe(2);
    expect(renderInkNarrative(leadStory, "mapped").choices).toHaveLength(4);
    expect(JSON.stringify(world)).toBe(initial);
    expect(() => renderInkNarrative(npcStory, "mapped")).toThrow("invalid narrative variant");
    expect(() => renderInkNarrative(leadStory, "mapped", 20)).toThrow("invalid authored choice");
  });
});

function chooseFromFinished(bus: CommandBus, choiceId: string): string | undefined {
  const scene = current(bus);
  return bus.execute({ type: "chooseNarrative", sceneId: scene.id, choiceId }).error;
}
