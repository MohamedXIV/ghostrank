"use client";

import { useRow, useTable } from "tinybase/ui-react";
import { Button } from "@/components/ui/button";
import { TruthMark } from "@/components/ui/truth-mark";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import {
  machineRoleMeta,
  type MachineRoleMeta,
} from "@/components/ui/semantic-state";
import {
  analyzeTargetFromGui,
  inspectMachineFromGui,
  openOperationFromGui,
  surveyTargetFromGui,
} from "@/game/computer/apps/target-actions";
import type { GameRuntime } from "@/game/runtime/game-runtime";

interface ReconTopologyProps {
  targetId: string;
  runtime: GameRuntime;
  onSelectTarget?: (targetId: string) => void;
}

export function ReconTopology({
  targetId,
  runtime,
}: ReconTopologyProps) {
  const target = useRow("targets", targetId, runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const machinesTable = useTable("machines", runtime.projection);
  const servicesTable = useTable("services", runtime.projection);
  const analysisClaimsTable = useTable("analysisClaims", runtime.projection);

  const operationTargetId = String(operation.targetId ?? "");
  const isActiveTarget = operationTargetId === targetId;
  const operationElsewhere = operationTargetId.length > 0 && !isActiveTarget;

  // Filter machines belonging to this target
  const targetMachines = Object.entries(machinesTable).filter(
    ([, machine]) => machine.targetId === targetId,
  );

  // Filter services belonging to this target
  const targetServices = Object.entries(servicesTable).filter(
    ([, service]) => service.targetId === targetId,
  );

  // Filter assistant claims for this target
  const targetClaims = Object.entries(analysisClaimsTable).filter(
    ([, claim]) => claim.targetId === targetId,
  );

  // Group machines by tier for topology presentation
  const gatewayMachines = targetMachines.filter(([, m]) => {
    const meta = machineRoleMeta(String(m.role ?? ""));
    return meta.tier === "gateway" || meta.tier === "ingress";
  });
  const coreMachines = targetMachines.filter(([, m]) => {
    const meta = machineRoleMeta(String(m.role ?? ""));
    return meta.tier === "core";
  });
  const storageMachines = targetMachines.filter(([, m]) => {
    const meta = machineRoleMeta(String(m.role ?? ""));
    return meta.tier === "vault" || meta.tier === "storage";
  });
  const otherMachines = targetMachines.filter(([, m]) => {
    const meta = machineRoleMeta(String(m.role ?? ""));
    return meta.tier === "general";
  });

  const handleActTarget = () => {
    if (isActiveTarget) {
      runtime.execute(surveyTargetFromGui(targetId));
    } else {
      runtime.execute(openOperationFromGui(targetId));
    }
  };

  const hasTargetRecord = Boolean(target && Object.keys(target).length > 0);

  return (
    <div className="recon-topology-container" aria-label="Infrastructure topology map">
      <div className="topology-header">
        <div className="topology-title">
          <span className="topology-glyph" aria-hidden="true">☲</span>
          <span className="panel-label">INFRASTRUCTURE TOPOLOGY</span>
        </div>
        <div className="topology-legend">
          <span className="legend-item">
            <span className="legend-swatch is-observed" /> Observed
          </span>
          <span className="legend-item">
            <span className="legend-swatch is-inferred" /> Inferred (AI)
          </span>
          <span className="legend-item">
            <span className="legend-swatch is-active" /> Active Op
          </span>
        </div>
      </div>

      <div className="topology-canvas">
        {/* Root Node: Target Ingress */}
        <div className="topology-root-section">
          <div
            className={`topology-node target-node ${isActiveTarget ? "is-active-target" : ""}`}
            data-target-id={targetId}
          >
            <div className="node-badge-row">
              <span className="node-kind-badge">TARGET INGRESS</span>
              <TruthMark level={hasTargetRecord ? "observed" : "unknown"} />
            </div>
            <div className="target-node-body">
              <span className="target-handle-title">
                {String(target.handle ?? targetId)}
              </span>
              <span className="target-rank-pill">
                RANK #{Number(target.rank ?? 0).toLocaleString("en-US")}
              </span>
            </div>
            <div className="node-actions">
              <Button
                size="sm"
                disabled={operationElsewhere || !hasTargetRecord}
                onClick={handleActTarget}
              >
                {isActiveTarget
                  ? "SURVEY HOSTS"
                  : operationElsewhere
                    ? "OP ACTIVE ELSEWHERE"
                    : "OPEN OPERATION"}
              </Button>
              {isActiveTarget && (
                <Button
                  size="sm"
                  variant="ghost"
                  title="Ask assistant to infer unmapped topology"
                  onClick={() => runtime.execute(analyzeTargetFromGui(targetId))}
                >
                  ANALYZE
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Causal / Structural Trunk Connector */}
        <div className="topology-trunk" aria-hidden="true">
          <div className="trunk-line" />
        </div>

        {/* Machine Tier Groups */}
        {targetMachines.length === 0 ? (
          <div className="topology-empty-state">
            <span className="topology-empty-glyph">◌</span>
            <p className="topology-empty-text">
              {isActiveTarget
                ? "No machine nodes discovered yet. Run SURVEY HOSTS to map perimeter topology."
                : "Target observed, but machine topology is unmapped. Open an operation and survey to reveal infrastructure."}
            </p>
          </div>
        ) : (
          <div className="topology-tiers">
            {/* Tier 1: Gateway / Ingress */}
            {gatewayMachines.length > 0 && (
              <TopologyTier
                title="PERIMETER & GATEWAYS"
                machines={gatewayMachines}
                allServices={targetServices}
                runtime={runtime}
                canInspect={isActiveTarget}
              />
            )}

            {/* Tier 2: Core Processing / Ops */}
            {coreMachines.length > 0 && (
              <TopologyTier
                title="CORE PROCESSING & OPERATIONS"
                machines={coreMachines}
                allServices={targetServices}
                runtime={runtime}
                canInspect={isActiveTarget}
              />
            )}

            {/* Tier 3: Vault / Storage */}
            {storageMachines.length > 0 && (
              <TopologyTier
                title="SECURE STORAGE & VAULTS"
                machines={storageMachines}
                allServices={targetServices}
                runtime={runtime}
                canInspect={isActiveTarget}
              />
            )}

            {/* Tier 4: General / Other */}
            {otherMachines.length > 0 && (
              <TopologyTier
                title="AUXILIARY HOSTS"
                machines={otherMachines}
                allServices={targetServices}
                runtime={runtime}
                canInspect={isActiveTarget}
              />
            )}
          </div>
        )}

        {/* Inferred Structure: Assistant Analytical Claims */}
        {targetClaims.length > 0 && (
          <div className="topology-inferred-section">
            <div className="inferred-section-header">
              <span className="panel-label">ASSISTANT PREDICTED TOPOLOGY</span>
              <TruthMark level="inferred" label="INFERRED / UNVERIFIED" />
            </div>
            <div className="inferred-nodes-grid">
              {targetClaims.map(([claimId, claim]) => {
                const kind = String(claim.kind ?? "");
                const assertion = String(claim.assertion ?? "");
                const subject = String(claim.subject ?? "");
                const confidence = String(claim.confidence ?? "low");
                const modelLabel = String(claim.modelLabel ?? "");

                return (
                  <div
                    key={claimId}
                    className="topology-node is-inferred-node"
                    data-confidence={confidence}
                  >
                    <div className="node-badge-row">
                      <span className="inferred-badge">
                        {kind === "service-kind" ? "SERVICE PREDICTION" : "HOST ROLE PREDICTION"}
                      </span>
                      <ConfidenceMeter confidence={confidence} />
                    </div>
                    <div className="inferred-node-body">
                      <div className="inferred-subject">
                        <span className="inferred-target-label">Subject:</span>{" "}
                        <strong>{subject}</strong>
                      </div>
                      <div className="inferred-assertion">
                        Likely: <strong>{assertion.toUpperCase()}</strong>
                      </div>
                    </div>
                    <div className="inferred-meta-footer">
                      <span>Model: {modelLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import type { Row } from "tinybase";

interface TopologyTierProps {
  title: string;
  machines: Array<[string, Row]>;
  allServices: Array<[string, Row]>;
  runtime: GameRuntime;
  canInspect: boolean;
}

function TopologyTier({
  title,
  machines,
  allServices,
  runtime,
  canInspect,
}: TopologyTierProps) {
  return (
    <div className="topology-tier">
      <div className="tier-header">
        <span className="tier-label">{title}</span>
        <span className="tier-count">({machines.length} host{machines.length === 1 ? "" : "s"})</span>
      </div>
      <div className="tier-nodes">
        {machines.map(([machineId, machine]) => {
          const role = String(machine.role ?? "unknown");
          const roleData: MachineRoleMeta = machineRoleMeta(role);
          const machineServices = allServices.filter(
            ([, s]) => s.machineId === machineId,
          );

          return (
            <div
              key={machineId}
              className="topology-node machine-node"
              data-machine-id={machineId}
            >
              <div className="node-badge-row">
                <span className="machine-role-badge">
                  <span className="role-glyph" aria-hidden="true">
                    {roleData.glyph}
                  </span>
                  <span>{roleData.label}</span>
                </span>
                <TruthMark level="observed" />
              </div>

              <div className="machine-node-body">
                <strong className="machine-label">
                  {String(machine.label ?? machineId)}
                </strong>
                <span className="machine-id-tag">{machineId}</span>
              </div>

              {/* Machine Services List */}
              <div className="machine-services-rack">
                <div className="rack-header">
                  <span>SERVICES ({machineServices.length})</span>
                </div>
                {machineServices.length === 0 ? (
                  <div className="services-empty-pill">
                    <span>No service evidence mapped</span>
                  </div>
                ) : (
                  <div className="services-list">
                    {machineServices.map(([serviceId, service]) => (
                      <div
                        key={serviceId}
                        className="topology-service-chip"
                        data-state={String(service.state ?? "active")}
                      >
                        <span className="service-glyph" aria-hidden="true">
                          {serviceKindGlyph(String(service.kind ?? ""))}
                        </span>
                        <span className="service-name">
                          {String(service.label ?? serviceId)}
                        </span>
                        <span className="service-state-tag">
                          {String(service.state ?? "active").toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="node-actions">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canInspect}
                  title={
                    canInspect
                      ? "Inspect host to uncover service endpoints"
                      : "Open an active operation to inspect host"
                  }
                  onClick={() =>
                    runtime.execute(inspectMachineFromGui(machineId))
                  }
                >
                  INSPECT HOST
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function serviceKindGlyph(kind: string): string {
  switch (kind.toLowerCase()) {
    case "web":
    case "portal":
      return "🌐";
    case "database":
    case "archive":
    case "storage":
      return "🗄";
    case "api":
    case "orders":
    case "clearing":
      return "🔌";
    case "auth":
    case "identity":
      return "🔑";
    case "signal":
    case "telemetry":
      return "📡";
    default:
      return "⚙";
  }
}
