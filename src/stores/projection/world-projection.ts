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

  const contractRows = Object.fromEntries(
    projection.underground.contracts.map((contract) => [
      contract.id,
      {
        issuerHandle: contract.issuerHandle,
        targetId: contract.targetId,
        targetHandle: contract.targetHandle,
        objective: contract.objective,
        status: contract.status,
        expiresWorldMinute: contract.expiresWorldMinute,
        ...(contract.requiredServices === undefined
          ? {}
          : { requiredServices: contract.requiredServices }),
        ...(contract.dueWorldMinute === undefined
          ? {}
          : { dueWorldMinute: contract.dueWorldMinute }),
        ...(contract.resolvedWorldMinute === undefined
          ? {}
          : { resolvedWorldMinute: contract.resolvedWorldMinute }),
      },
    ]),
  );

  const retaliationRows = Object.fromEntries(
    projection.underground.retaliations.map((entry) => [
      entry.id,
      {
        actorHandle: entry.actorHandle,
        kind: entry.kind,
        worldMinute: entry.worldMinute,
      },
    ]),
  );

  const descriptorRows = Object.fromEntries(
    projection.descriptors.map((entry) => [
      entry.id,
      { label: entry.label, context: entry.context, basis: entry.basis },
    ]),
  );

  const forumRows = Object.fromEntries(
    projection.underground.forum.map((post) => [
      post.id,
      {
        board: post.board,
        authorHandle: post.authorHandle,
        worldMinute: post.worldMinute,
        subjectKind: post.subject.kind,
        ...(post.subject.kind === "incident"
          ? {
              actorHandle: post.subject.actorHandle,
              counterpartHandle: post.subject.counterpartHandle,
              outcome: post.subject.outcome,
            }
          : post.subject.kind === "unmasking"
            ? { unmaskerHandle: post.subject.unmaskerHandle }
            : { targetHandle: post.subject.targetHandle }),
      },
    ]),
  );

  const hardwareRows = Object.fromEntries(
    projection.economy.hardware.map((entry) => [
      entry.id,
      {
        catalogId: entry.catalogId,
        label: entry.label,
        category: entry.category,
        acquiredWorldMinute: entry.acquiredWorldMinute,
      },
    ]),
  );

  const catalogRows = Object.fromEntries(
    projection.economy.catalog.map((item) => [
      item.id,
      {
        label: item.label,
        category: item.category,
        cost: item.cost,
        compute: item.capability.compute,
        memory: item.capability.memory,
        vram: item.capability.vram,
        storage: item.capability.storage,
        network: item.capability.network,
        owned: item.owned,
      },
    ]),
  );

  const ledgerRows = Object.fromEntries(
    projection.economy.ledger.map((entry) => [
      entry.id,
      {
        worldMinute: entry.worldMinute,
        direction: entry.direction,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        causeKind: entry.causeKind,
        causeId: entry.causeId,
        counterparty: entry.counterparty,
      },
    ]),
  );

  const housingRows = Object.fromEntries(
    projection.economy.housing.map((listing) => [
      listing.id,
      {
        label: listing.label,
        dailyCost: listing.dailyCost,
        compute: listing.capability.compute,
        memory: listing.capability.memory,
        vram: listing.capability.vram,
        storage: listing.capability.storage,
        network: listing.capability.network,
        active: listing.active,
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
    store.setTable("contracts", contractRows);
    store.setTable("retaliations", retaliationRows);
    store.setTable("descriptors", descriptorRows);
    store.setTable("forum", forumRows);
    store.setTable("hardware", hardwareRows);
    store.setTable("catalog", catalogRows);
    store.setTable("ledger", ledgerRows);
    store.setTable("housing", housingRows);
    store.setCell("meta", "wallet", "credits", projection.economy.credits);
    store.setCell(
      "meta",
      "wallet",
      "dailyCost",
      projection.economy.dailyCost,
    );
    store.setCell(
      "meta",
      "wallet",
      "currentHousingId",
      projection.economy.currentHousingId ?? "",
    );
    store.setTable("rig", {
      capability: {
        compute: projection.economy.capability.compute,
        memory: projection.economy.capability.memory,
        vram: projection.economy.capability.vram,
        storage: projection.economy.capability.storage,
        network: projection.economy.capability.network,
      },
      actionMinutes: {
        survey: projection.economy.actionMinutes.survey,
        inspect: projection.economy.actionMinutes.inspect,
        escalate: projection.economy.actionMinutes.escalate,
        disengage: projection.economy.actionMinutes.disengage,
      },
      scale: {
        discoveryScope: projection.economy.discoveryScope,
      },
      lease: {
        compute: projection.economy.lease.compute,
        memory: projection.economy.lease.memory,
        vram: projection.economy.lease.vram,
        storage: projection.economy.lease.storage,
        network: projection.economy.lease.network,
      },
    });
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
