import { createStore, type Store } from "tinybase";

import type { WorldProjection } from "@/game/simulation/projection/project-world";

export type WorldProjectionStore = Store;

export function createWorldProjectionStore(): WorldProjectionStore {
  return createStore();
}

export function syncWorldProjection(
  store: WorldProjectionStore,
  projection: WorldProjection,
): void {
  const targetRows = Object.fromEntries(
    projection.targets.map((target) => [
      target.id,
      {
        handle: target.handle,
        rank: target.rank,
        known: target.known,
      },
    ]),
  );

  const machineRows = Object.fromEntries(
    projection.machines.map((machine) => [
      machine.id,
      {
        targetId: machine.targetId,
        label: machine.label,
        role: machine.role,
      },
    ]),
  );

  const serviceRows = Object.fromEntries(
    projection.services.map((service) => [
      service.id,
      {
        targetId: service.targetId,
        machineId: service.machineId,
        label: service.label,
        kind: service.kind,
        state: service.state,
      },
    ]),
  );

  const reactionRows = Object.fromEntries(
    projection.reactions.map((reaction) => [
      reaction.id,
      {
        targetId: reaction.targetId,
        kind: reaction.kind,
        status: reaction.status,
        sourceTraceIds: reaction.sourceTraceIds.join(","),
        footprintScore: reaction.footprintScore,
        triggeredWorldMinute: reaction.triggeredWorldMinute,
      },
    ]),
  );

  const boardRows = Object.fromEntries(
    projection.underground.board.map((entry) => [
      entry.id,
      {
        handle: entry.handle,
        rank: entry.rank,
        isPlayer: entry.isPlayer,
      },
    ]),
  );

  const feedRows = Object.fromEntries(
    projection.underground.feed.map((entry) => [
      entry.id,
      {
        actorHandle: entry.actorHandle,
        counterpartHandle: entry.counterpartHandle,
        outcome: entry.outcome,
        worldMinute: entry.worldMinute,
      },
    ]),
  );

  const stanceRows = Object.fromEntries(
    projection.underground.stances.map((entry) => [
      entry.actorId,
      {
        handle: entry.handle,
        stance: entry.stance,
      },
    ]),
  );

  const inboxRows = Object.fromEntries(
    projection.underground.inbox.messages.map((message) => [
      message.id,
      {
        fromHandle: message.fromHandle,
        claimActorHandle: message.claimActorHandle,
        claimCounterpartHandle: message.claimCounterpartHandle,
        claimOutcome: message.claimOutcome,
        worldMinute: message.worldMinute,
        read: message.read,
      },
    ]),
  );

  store.transaction(() => {
    store.setTable("player", {
      current: {
        handle: projection.player.handle,
        rank: projection.player.rank,
      },
    });
    store.setTable("targets", targetRows);
    store.setTable("machines", machineRows);
    store.setTable("services", serviceRows);
    store.setTable("reactions", reactionRows);
    store.setTable("board", boardRows);
    store.setTable("feed", feedRows);
    store.setTable("stances", stanceRows);
    store.setTable("inbox", inboxRows);
    store.setCell(
      "meta",
      "inbox",
      "unread",
      projection.underground.inbox.unread,
    );

    if (projection.operation) {
      store.setTable("operation", {
        active: {
          targetId: projection.operation.targetId,
          stage: projection.operation.stage,
          openedWorldMinute: projection.operation.openedWorldMinute,
          ...(projection.operation.escalatedWorldMinute === undefined
            ? {}
            : {
                escalatedWorldMinute:
                  projection.operation.escalatedWorldMinute,
              }),
        },
      });
    } else {
      store.setTable("operation", {});
    }

    store.setTable("footprint", {
      current: {
        score: projection.footprint.score,
        level: projection.footprint.level,
        traceCount: projection.footprint.traceCount,
      },
    });

    store.setCell("meta", "world", "worldMinute", projection.worldMinute);
  });
}
