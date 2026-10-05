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

  // Phase 6 P1 — authority case files. The file row carries only the band, and
  // its evidence is flattened into its own table keyed by signal id, so the
  // surface reads a list of noticed things rather than a number: `progress`,
  // `sourceIds`, and the opening minute stay in the simulation.
  const investigationRows = Object.fromEntries(
    projection.investigations.map((investigation) => [
      investigation.id,
      {
        targetId: investigation.targetId,
        stage: investigation.stage,
      },
    ]),
  );

  const signalRows = Object.fromEntries(
    projection.investigations.flatMap((investigation) =>
      investigation.signals.map((signal) => [
        signal.id,
        {
          investigationId: investigation.id,
          targetId: investigation.targetId,
          targetHandle: signal.targetHandle,
          kind: signal.kind,
          worldMinute: signal.worldMinute,
        },
      ]),
    ),
  );

  // Phase 6 P2 — rival probes. Rows are the leaked tells only: a kind and a
  // minute. The prober's id and whether their read landed exist in the
  // simulation, are not observable, and must not reach the store even by
  // accident — a test greps this table's JSON for exactly those absences.
  const probeRows = Object.fromEntries(
    projection.probes.map((probe) => [
      probe.id,
      {
        artifactKind: probe.artifactKind,
        worldMinute: probe.worldMinute,
      },
    ]),
  );

  // P3 — physical evidence only. Actor, source probe, investigation
  // provenance, outage end, and property impact never enter TinyBase.
  const physicalSignalRows = Object.fromEntries(
    projection.physicalSignals.map((signal) => [
      signal.id,
      {
        kind: signal.kind,
        worldMinute: signal.worldMinute,
        atCurrentLocation: signal.atCurrentLocation,
      },
    ]),
  );

  // P4 — condition name and minute only. P5 owns causal explanation; threat,
  // probe, investigation, and location ids stay out of TinyBase during the run.
  const compromiseRows = Object.fromEntries(
    projection.compromises.map((record) => [
      record.id,
      {
        kind: record.kind,
        label: record.label,
        worldMinute: record.worldMinute,
      },
    ]),
  );

  // P5 — safe causal read only. The chain row carries attribution state and
  // display text; steps carry no raw threat/probe/investigation/location ids.
  const postmortemRows = Object.fromEntries(
    projection.postmortems.map((postmortem) => [
      postmortem.compromiseId,
      {
        compromiseKind: postmortem.compromiseKind,
        compromiseLabel: postmortem.compromiseLabel,
        worldMinute: postmortem.worldMinute,
        attribution: postmortem.attribution,
        note: postmortem.note,
        stepCount: postmortem.steps.length,
      },
    ]),
  );

  const postmortemStepRows = Object.fromEntries(
    projection.postmortems.flatMap((postmortem) =>
      postmortem.steps.map((step) => [
        step.id,
        {
          compromiseId: postmortem.compromiseId,
          kind: step.kind,
          worldMinute: step.worldMinute,
          text: step.text,
        },
      ]),
    ),
  );

  const retirementRows: Record<
    string,
    Record<string, string | number | boolean>
  > = projection.retirement
    ? {
        current: {
          status: projection.retirement.status,
          blockers: projection.retirement.blockers.join(","),
          startedWorldMinute: projection.retirement.startedWorldMinute,
          committedWorldMinute: projection.retirement.committedWorldMinute ?? 0,
          readyWorldMinute: projection.retirement.readyWorldMinute ?? 0,
        },
      }
    : {};

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
        // Phase 6 P0: the price of *getting* there, shown before the player
        // commits. Names for kind/anonymity — never numbers.
        travelMinutes: listing.travelMinutes,
        kind: listing.kind,
        anonymity: listing.anonymity,
      },
    ]),
  );

  const softwareRows = Object.fromEntries(
    projection.economy.softwareListings.map((listing) => [
      listing.id,
      {
        label: listing.label,
        dailyCost: listing.dailyCost,
        compute: listing.capability?.compute ?? 0,
        memory: listing.capability?.memory ?? 0,
        vram: listing.capability?.vram ?? 0,
        storage: listing.capability?.storage ?? 0,
        network: listing.capability?.network ?? 0,
        discountFactor: listing.discountFactor ?? 1,
        active: listing.active,
      },
    ]),
  );

  const ownedToolRows = Object.fromEntries(
    projection.economy.ownedTools.map((owned) => [
      owned.id,
      {
        catalogId: owned.catalogId,
        label: owned.label,
        author: owned.author,
        paidCost: owned.paidCost,
        resaleValue: owned.resaleValue,
        acquiredWorldMinute: owned.acquiredWorldMinute,
        compute: owned.capability?.compute ?? 0,
        memory: owned.capability?.memory ?? 0,
        vram: owned.capability?.vram ?? 0,
        storage: owned.capability?.storage ?? 0,
        network: owned.capability?.network ?? 0,
        discountFactor: owned.discountFactor ?? 1,
      },
    ]),
  );

  const toolListingRows = Object.fromEntries(
    projection.economy.toolListings.map((listing) => [
      listing.id,
      {
        label: listing.label,
        author: listing.author,
        cost: listing.cost,
        ownedCount: listing.ownedCount,
        compute: listing.capability?.compute ?? 0,
        memory: listing.capability?.memory ?? 0,
        vram: listing.capability?.vram ?? 0,
        storage: listing.capability?.storage ?? 0,
        network: listing.capability?.network ?? 0,
        discountFactor: listing.discountFactor ?? 1,
      },
    ]),
  );

  const ownedMachineRows = Object.fromEntries(
    projection.economy.ownedMachines.map((owned) => [
      owned.id,
      {
        catalogId: owned.catalogId,
        label: owned.label,
        paidCost: owned.paidCost,
        resaleValue: owned.resaleValue,
        acquiredWorldMinute: owned.acquiredWorldMinute,
        compute: owned.capability?.compute ?? 0,
        memory: owned.capability?.memory ?? 0,
        vram: owned.capability?.vram ?? 0,
        storage: owned.capability?.storage ?? 0,
        network: owned.capability?.network ?? 0,
      },
    ]),
  );

  const machineListingRows = Object.fromEntries(
    projection.economy.machineListings.map((listing) => [
      listing.id,
      {
        label: listing.label,
        cost: listing.cost,
        ownedCount: listing.ownedCount,
        compute: listing.capability.compute,
        memory: listing.capability.memory,
        vram: listing.capability.vram,
        storage: listing.capability.storage,
        network: listing.capability.network,
      },
    ]),
  );

  const modelListingRows = Object.fromEntries(
    projection.economy.modelListings.map((listing) => [
      listing.id,
      {
        label: listing.label,
        source: listing.source,
        cost: listing.cost,
        dailyCost: listing.dailyCost,
        factor: listing.factor,
        deliveredFactor: listing.deliveredFactor,
        vram: listing.footprint.vram,
        storage: listing.footprint.storage,
        author: listing.author ?? "",
        owned: listing.owned,
        running: listing.running,
      },
    ]),
  );

  // Phase 5 P4: which peers run which assistant. Names only — the lift a model
  // gives a peer lives inside the simulation roll and never crosses here.
  const assistantRows = Object.fromEntries(
    projection.underground.assistants.map((entry) => [
      entry.actorId,
      {
        handle: entry.handle,
        modelLabel: entry.modelLabel,
        modelAuthor: entry.modelAuthor ?? "",
      },
    ]),
  );

  const analysisClaimRows = Object.fromEntries(
    projection.analysis.flatMap((record) =>
      record.claims.map((claim, index) => [
        `${record.targetId}:${index}`,
        {
          targetId: record.targetId,
          modelLabel: record.modelLabel,
          worldMinute: record.worldMinute,
          kind: claim.kind,
          assertion: claim.assertion,
          subject: claim.subject,
          confidence: claim.confidence,
        },
      ]),
    ),
  );

  const forgeSpecRows = Object.fromEntries(
    projection.economy.workflowSpecs.map((spec) => [
      spec.id,
      {
        label: spec.label,
        steps: spec.steps.join("\n"),
        tests: spec.tests.join("\n"),
        estimatedMinutes: spec.estimatedMinutes,
        vram: spec.footprint.vram,
        storage: spec.footprint.storage,
        replacesLabel: spec.replacesLabel,
      },
    ]),
  );

  // The queue rows carry no outcome: the projection never contains one.
  const buildQueueRows = Object.fromEntries(
    projection.economy.builds.map((build) => [
      build.id,
      {
        specLabel: build.specLabel,
        modelLabel: build.modelLabel,
        startedWorldMinute: build.startedWorldMinute,
        dueWorldMinute: build.dueWorldMinute,
        paused: build.paused,
        vram: build.footprint.vram,
        storage: build.footprint.storage,
      },
    ]),
  );

  const ownedWorkflowRows = Object.fromEntries(
    projection.economy.ownedWorkflows.map((workflow) => [
      workflow.id,
      {
        label: workflow.label,
        outcome: workflow.outcome,
        builtWithLabel: workflow.builtWithLabel,
        acquiredWorldMinute: workflow.acquiredWorldMinute,
        tests: workflow.tests.join("\n"),
      },
    ]),
  );

  const valueNodeRows = Object.fromEntries(
    projection.economy.valueGraph.nodes.map((node) => [
      node.id,
      {
        kind: node.kind,
        received: node.received,
        paid: node.paid,
        net: node.net,
        interactions: node.interactions,
        firstWorldMinute: node.firstWorldMinute,
        lastWorldMinute: node.lastWorldMinute,
        causeKinds: node.causeKinds.join(","),
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
    store.setTable("investigations", investigationRows);
    store.setTable("investigationSignals", signalRows);
    store.setTable("probes", probeRows);
    store.setTable("physicalSignals", physicalSignalRows);
    store.setTable("compromises", compromiseRows);
    store.setTable("postmortems", postmortemRows);
    store.setTable("postmortemSteps", postmortemStepRows);
    store.setTable("retirement", retirementRows);
    store.setTable("board", boardRows);
    store.setTable("feed", feedRows);
    store.setTable("stances", stanceRows);
    store.setTable("inbox", inboxRows);
    store.setTable("contracts", contractRows);
    store.setTable("retaliations", retaliationRows);
    store.setTable("descriptors", descriptorRows);
    store.setTable("forum", forumRows);
    store.setTable("assistants", assistantRows);
    store.setTable("hardware", hardwareRows);
    store.setTable("catalog", catalogRows);
    store.setTable("ledger", ledgerRows);
    store.setTable("housing", housingRows);
    store.setTable("software", softwareRows);
    store.setTable("ownedTools", ownedToolRows);
    store.setTable("toolListings", toolListingRows);
    store.setTable("ownedMachines", ownedMachineRows);
    store.setTable("machineListings", machineListingRows);
    store.setTable("modelListings", modelListingRows);
    store.setTable("analysisClaims", analysisClaimRows);
    store.setTable("forgeSpecs", forgeSpecRows);
    store.setTable("buildQueue", buildQueueRows);
    store.setTable("ownedWorkflows", ownedWorkflowRows);
    store.setTable("valueNodes", valueNodeRows);
    store.setCell("meta", "wallet", "credits", projection.economy.credits);
    store.setCell(
      "meta",
      "wallet",
      "valueInflow",
      projection.economy.valueGraph.totalInflow,
    );
    store.setCell(
      "meta",
      "wallet",
      "valueOutflow",
      projection.economy.valueGraph.totalOutflow,
    );
    store.setCell(
      "meta",
      "wallet",
      "valueCounterparties",
      projection.economy.valueGraph.counterparties,
    );
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
      softwareLift: {
        compute: projection.economy.software.compute,
        memory: projection.economy.software.memory,
        vram: projection.economy.software.vram,
        storage: projection.economy.software.storage,
        network: projection.economy.software.network,
      },
      playerToolLift: {
        compute: projection.economy.playerTools.compute,
        memory: projection.economy.playerTools.memory,
        vram: projection.economy.playerTools.vram,
        storage: projection.economy.playerTools.storage,
        network: projection.economy.playerTools.network,
      },
      machineLift: {
        compute: projection.economy.ownedMachineCapability.compute,
        memory: projection.economy.ownedMachineCapability.memory,
        vram: projection.economy.ownedMachineCapability.vram,
        storage: projection.economy.ownedMachineCapability.storage,
        network: projection.economy.ownedMachineCapability.network,
      },
      // The rig's running AI assistant: which model, and the *combined*
      // duration shortcut it shares with licenses and tools (1 = no lift).
      assistant: {
        modelId: projection.economy.activeModelId ?? "",
        factor: projection.economy.actionDurationFactor,
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
    store.setCell(
      "meta",
      "run",
      "ended",
      projection.ending !== null,
    );
    store.setCell(
      "meta",
      "run",
      "status",
      projection.ending?.status ?? "",
    );
    store.setCell(
      "meta",
      "run",
      "label",
      projection.ending?.label ?? "",
    );
    store.setCell(
      "meta",
      "run",
      "worldMinute",
      projection.ending?.worldMinute ?? 0,
    );
    store.setCell(
      "meta",
      "run",
      "variant",
      projection.ending?.variant ?? "",
    );
    store.setCell(
      "meta",
      "run",
      "detail",
      projection.ending?.detail ?? "",
    );

    // Phase 6 P0 — physical presence. A dedicated cell because its consumer is
    // the room surface, which reads the store rather than the core state.
    // `anonymity` ships here as a name, never a number, and it is read by P3.
    store.setTable("presence", {
      current: {
        locationId: projection.presence.locationId,
        label: projection.presence.label,
        kind: projection.presence.kind,
        anonymity: projection.presence.anonymity,
        leased: projection.presence.leased,
        dailyCost: projection.presence.dailyCost,
        distanceMinutes: projection.presence.distanceMinutes,
      },
    });
  });
}
