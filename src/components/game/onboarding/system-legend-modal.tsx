"use client";

import { useClockHold } from "@/components/game/clock-context";
import { Button } from "@/components/ui/button";
import { TruthMark } from "@/components/ui/truth-mark";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { RelationshipBadge } from "@/components/game/social/relationship-badge";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

export interface SystemLegendModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SystemLegendModal({
  isOpen,
  onClose,
}: SystemLegendModalProps = {}) {
  const storeIsOpen = useOnboardingStore((state) => state.legendModalOpen);
  const storeClose = useOnboardingStore((state) => state.closeLegendModal);

  const activeIsOpen = isOpen ?? storeIsOpen;
  const activeClose = onClose ?? storeClose;

  const modalRef = useModalFocus<HTMLDivElement>({
    isOpen: activeIsOpen,
    onClose: activeClose,
    autoFocusSelector: ".system-modal-close",
  });
  // A blocking glossary holds the clock while it is open (D062).
  useClockHold(activeIsOpen);

  if (!activeIsOpen) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="system-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-legend-title"
      tabIndex={-1}
    >
      <div className="system-legend-panel">
        <header className="system-legend-header">
          <div>
            <span className="panel-label">SYSTEM REFERENCE</span>
            <h2 id="system-legend-title">OS Glossary &amp; Symbols</h2>
          </div>
          <button
            type="button"
            className="system-modal-close"
            onClick={activeClose}
            aria-label="Close system glossary"
          >
            ✕
          </button>
        </header>

        <div className="system-legend-content">
          {/* Epistemic Truth Vocabulary */}
          <section className="legend-section" aria-labelledby="legend-truth-heading">
            <h3 id="legend-truth-heading" className="legend-section-title">
              <span className="legend-section-glyph">◉</span> Epistemic Truth Vocabulary
            </h3>
            <p className="legend-section-intro">
              Ghostrank never invents synthetic certainty. Every piece of intelligence reflects its actual investigative provenance.
            </p>
            <div className="legend-grid">
              <div className="legend-item">
                <TruthMark level="confirmed" label="CONFIRMED" />
                <p className="legend-desc">Authoritative direct fact from verified telemetry or completed execution.</p>
              </div>
              <div className="legend-item">
                <TruthMark level="observed" label="OBSERVED" />
                <p className="legend-desc">Firsthand intelligence discovered directly through network survey or inspection.</p>
              </div>
              <div className="legend-item">
                <TruthMark level="inferred" label="INFERRED" />
                <p className="legend-desc">Assistant AI hypothesis. Plausible but unverified against real hardware.</p>
              </div>
              <div className="legend-item">
                <TruthMark level="rumored" label="RUMORED" />
                <p className="legend-desc">Social forum leak or underground whisper. Subject to intentional deception.</p>
              </div>
              <div className="legend-item">
                <TruthMark level="stale" label="STALE" />
                <p className="legend-desc">Outdated intelligence. Target services or topology may have shifted.</p>
              </div>
              <div className="legend-item">
                <TruthMark level="unknown" label="UNKNOWN" />
                <p className="legend-desc">Unresolved entity or unmapped network boundary.</p>
              </div>
            </div>
          </section>

          {/* Assistant Inference Confidence */}
          <section className="legend-section" aria-labelledby="legend-confidence-heading">
            <h3 id="legend-confidence-heading" className="legend-section-title">
              <span className="legend-section-glyph">◇</span> AI Analytical Confidence
            </h3>
            <p className="legend-section-intro">
              Machine learning models infer hidden structure from partial clues. Segmented pips indicate confidence.
            </p>
            <div className="legend-grid">
              <div className="legend-item">
                <ConfidenceMeter confidence="low" showLabel />
                <p className="legend-desc">Initial speculative prediction based on common target architecture patterns.</p>
              </div>
              <div className="legend-item">
                <ConfidenceMeter confidence="medium" showLabel />
                <p className="legend-desc">Corroborated hypothesis supported by multiple observed perimeter ports.</p>
              </div>
              <div className="legend-item">
                <ConfidenceMeter confidence="high" showLabel />
                <p className="legend-desc">High-probability convergence across naming conventions and network routes.</p>
              </div>
            </div>
          </section>

          {/* Relationship Signatures */}
          <section className="legend-section" aria-labelledby="legend-relationships-heading">
            <h3 id="legend-relationships-heading" className="legend-section-title">
              <span className="legend-section-glyph">◈</span> Social &amp; Rival Signatures
            </h3>
            <p className="legend-section-intro">
              Underworld handles develop visual signatures derived from active operations, shared commissions, and retaliatory heat.
            </p>
            <div className="legend-grid">
              <div className="legend-item">
                <RelationshipBadge isPlayer />
                <p className="legend-desc">Your operational identity and registered handle.</p>
              </div>
              <div className="legend-item">
                <RelationshipBadge stance="trusted" />
                <p className="legend-desc">Established syndicate patron or cooperative peer.</p>
              </div>
              <div className="legend-item">
                <RelationshipBadge stance="neutral" />
                <p className="legend-desc">Unaffiliated underground actor with no active entanglements.</p>
              </div>
              <div className="legend-item">
                <RelationshipBadge stance="wary" />
                <p className="legend-desc">Cautious observer alert to potential intrusive reconnaissance.</p>
              </div>
              <div className="legend-item">
                <RelationshipBadge stance="hostile" />
                <p className="legend-desc">Actively defensive target deploying counter-intelligence and alarms.</p>
              </div>
              <div className="legend-item">
                <RelationshipBadge stance="hostile" hasHeat heatKind="retaliation" />
                <p className="legend-desc">Direct antagonist. Actively staging counter-probes against your rig.</p>
              </div>
            </div>
          </section>

          {/* Contract Urgency & Topology */}
          <section className="legend-section" aria-labelledby="legend-urgency-heading">
            <h3 id="legend-urgency-heading" className="legend-section-title">
              <span className="legend-section-glyph">⏱</span> Contract Urgency &amp; Network Tiers
            </h3>
            <div className="legend-grid">
              <div className="legend-item">
                <strong className="legend-label">ON SCHEDULE</strong>
                <p className="legend-desc">Comfortable operational window. Gather evidence methodically.</p>
              </div>
              <div className="legend-item">
                <strong className="legend-label">CLOSING</strong>
                <p className="legend-desc">Under 24 hours remaining. Conclude inspections and prepare delivery.</p>
              </div>
              <div className="legend-item">
                <strong className="legend-label">EXPIRING SOON</strong>
                <p className="legend-desc">Under 6 hours. Imminent deadline default causing syndicate reputation loss.</p>
              </div>
              <div className="legend-item">
                <strong className="legend-label">INGRESS / PERIMETER</strong>
                <p className="legend-desc">External relays, public firewalls, and front-facing reverse proxies.</p>
              </div>
              <div className="legend-item">
                <strong className="legend-label">CORE PROCESSING</strong>
                <p className="legend-desc">Internal application servers, scheduler queues, and analysis workers.</p>
              </div>
              <div className="legend-item">
                <strong className="legend-label">SECURE VAULT</strong>
                <p className="legend-desc">High-value encrypted ledgers, credentials, and persistent data stores.</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="system-legend-footer">
          <Button onClick={activeClose}>CLOSE GLOSSARY</Button>
        </footer>
      </div>
    </div>
  );
}
