"use client";

import { useState } from "react";
import { useCell, useRowIds, useTable } from "tinybase/ui-react";
import { deriveOpeningReconCue, type PublicOpeningContract } from "@/game/onboarding/opening-recon-cue";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

export interface DirectiveItem {
  id: string;
  title: string;
  description: string;
  commandCue: string;
  isComplete: boolean;
}

export interface DirectivesProjectionSnapshot {
  targetIds: string[];
  machineIds: string[];
  services: Record<string, unknown>;
  contracts: Record<string, PublicOpeningContract>;
  worldMinute?: number;
  activeOperationTargetId?: string;
}

export function evaluateDirectivesProgress(snapshot: DirectivesProjectionSnapshot): {
  items: DirectiveItem[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
} {
  const hasObservedTarget = snapshot.targetIds.length > 0;
  const opening = deriveOpeningReconCue({
    contracts: snapshot.contracts,
    observedTargetIds: snapshot.targetIds,
    worldMinute: snapshot.worldMinute ?? 0,
  });
  const knownTargetId = snapshot.targetIds[0];
  const offeredId = opening?.contractId &&
    snapshot.contracts[opening.contractId]?.status === "offered"
      ? opening.contractId : null;
  const hasMappedMachine = snapshot.machineIds.length > 0;
  const hasDiscoveredService = Object.keys(snapshot.services).length > 0;
  const hasEngagedContracts = Object.values(snapshot.contracts).some(
    (contract) =>
      contract.status === "accepted" || contract.status === "completed",
  );

  const items: DirectiveItem[] = [
    {
      id: "observe-target",
      title: "1. Resolve Target Lead",
      description: opening
        ? `Passive observation of ${opening.label}, sourced from ${opening.source === "contract"
          ? "a visible commission" : "your existing observations"}; never a guessed target.`
        : "No actionable public target is available yet. Check Underground Index for offers.",
      commandCue: opening ? `observe ${opening.targetId}` : "Index (Alt+3)",
      isComplete: hasObservedTarget,
    },
    {
      id: "survey-perimeter",
      title: "2. Survey Network Perimeter",
      description: "Open an observed target's operation, then survey its network perimeter.",
      commandCue: knownTargetId
        ? snapshot.activeOperationTargetId === knownTargetId
          ? `survey ${knownTargetId}`
          : `op open ${knownTargetId}`
        : "Observe a public target first",
      isComplete: hasMappedMachine,
    },
    {
      id: "inspect-services",
      title: "3. Inspect Host Services",
      description: "Map active ports and service endpoints on a machine.",
      commandCue: snapshot.machineIds[0]
        ? `inspect ${snapshot.machineIds[0]}` : "inspect <machine>",
      isComplete: hasDiscoveredService,
    },
    {
      id: "contract-syndicate",
      title: "4. Accept Syndicate Contract",
      description: "Accept a commission in Underground that matches the evidence you can gather.",
      commandCue: offeredId
        ? `contract accept ${offeredId}` : "contract accept <id>",
      isComplete: hasEngagedContracts,
    },
  ];

  const completedCount = items.filter((item) => item.isComplete).length;
  const totalCount = items.length;
  const allCompleted = completedCount === totalCount;

  return { items, completedCount, totalCount, allCompleted };
}

export function useDirectivesProgress(runtime: GameRuntime): {
  items: DirectiveItem[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
} {
  const targetIds = useRowIds("targets", runtime.projection);
  const machineIds = useRowIds("machines", runtime.projection);
  const services = useTable("services", runtime.projection);
  const contractsTable = useTable("contracts", runtime.projection);
  const worldMinute = Number(useCell("meta", "world", "worldMinute", runtime.projection) ?? 0);
  const operation = useTable("operation", runtime.projection);

  return evaluateDirectivesProgress({
    targetIds,
    machineIds,
    services,
    contracts: contractsTable as Record<string, PublicOpeningContract>,
    worldMinute,
    activeOperationTargetId: String(operation.active?.targetId ?? ""),
  });
}

export function FieldDirectives({ runtime }: { runtime: GameRuntime }) {
  const directivesEnabled = useOnboardingStore((state) => state.directivesEnabled);
  const setDirectivesEnabled = useOnboardingStore(
    (state) => state.setDirectivesEnabled,
  );
  const [minimized, setMinimized] = useState(false);

  const { items, completedCount, totalCount, allCompleted } =
    useDirectivesProgress(runtime);

  if (!directivesEnabled) {
    return null;
  }

  if (minimized) {
    return (
      <div className="field-directives-minimized">
        <button
          type="button"
          className="field-directives-restore-btn"
          onClick={() => setMinimized(false)}
          title="Expand field directives"
          aria-label={`Field directives: ${completedCount} of ${totalCount} completed`}
        >
          <span className="directives-icon" aria-hidden="true">
            {allCompleted ? "✓" : "◎"}
          </span>
          <span>DIRECTIVES: {completedCount}/{totalCount}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`field-directives-panel ${allCompleted ? "is-all-completed" : ""}`}
      aria-label="Progressive operational directives"
    >
      <header className="field-directives-header">
        <div className="directives-heading">
          <span className="directives-glyph" aria-hidden="true">
            {allCompleted ? "✓" : "◎"}
          </span>
          <div className="directives-title-block">
            <span className="panel-label">PROGRESSIVE GUIDANCE</span>
            <strong>FIELD DIRECTIVES ({completedCount}/{totalCount})</strong>
          </div>
        </div>

        <div className="directives-header-controls">
          <button
            type="button"
            className="directives-ctrl-btn"
            onClick={() => setMinimized(true)}
            title="Minimize directives dock"
            aria-label="Minimize directives"
          >
            _
          </button>
          <button
            type="button"
            className="directives-ctrl-btn"
            onClick={() => setDirectivesEnabled(false)}
            title="Dismiss directives dock"
            aria-label="Close field directives"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="field-directives-list">
        {items.map((item) => (
          <div
            key={item.id}
            className={`directive-card ${item.isComplete ? "is-complete" : "is-pending"}`}
            data-directive-id={item.id}
            data-complete={item.isComplete ? "true" : "false"}
          >
            <div className="directive-status-glyph" aria-hidden="true">
              {item.isComplete ? "✓" : "○"}
            </div>
            <div className="directive-card-body">
              <strong className="directive-card-title">{item.title}</strong>
              <p className="directive-card-desc">{item.description}</p>
              {!item.isComplete && (
                <div className="directive-command-cue">
                  <span className="cue-label">ACTION:</span>
                  <code>{item.commandCue}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className="directives-congratulations">
          <span>ALL OPERATIONAL BASICS ESTABLISHED</span>
        </div>
      )}
    </aside>
  );
}
