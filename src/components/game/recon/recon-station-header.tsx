import { Radar, Network, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReconStationHeaderProps {
  observedTargets: number;
  knownMachines: number;
  activeEvidence: number;
  activeOperation: boolean;
}

/** All counts are from the player-visible TinyBase projection; never a guess. */
export function ReconStationHeader({
  observedTargets, knownMachines, activeEvidence, activeOperation,
}: ReconStationHeaderProps) {
  return (
    <header className="recon-station-heading" aria-label="Recon control overview">
      <div className="recon-station-brand">
        <div className="recon-station-emblem" aria-hidden="true"><Radar size={31} strokeWidth={1.35} /></div>
        <div>
          <span className="panel-label">FIELD OPERATIONS / PLAYER-KNOWN INTEL</span>
          <h2>RECON CONTROL</h2>
          <p>Observe a profile, map real hosts, and verify services before committing.</p>
        </div>
      </div>
      <div className="recon-station-readouts" aria-label="Known intelligence summary">
        <Badge variant="outline" className="recon-known-badge">
          <RadioTower size={13} aria-hidden="true" /> Observed profiles
          <strong>{observedTargets}</strong>
        </Badge>
        <Badge variant="outline" className="recon-known-badge">
          <Network size={13} aria-hidden="true" /> Known hosts
          <strong>{knownMachines}</strong>
        </Badge>
        {activeOperation && (
          <Badge variant="secondary" className="recon-known-badge recon-live-badge">
            LIVE OPERATION · Active services <strong>{activeEvidence}</strong>
          </Badge>
        )}
      </div>
    </header>
  );
}
