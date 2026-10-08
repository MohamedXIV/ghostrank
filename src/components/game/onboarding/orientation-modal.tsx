"use client";

import { useClockHold } from "@/components/game/clock-context";
import { Button } from "@/components/ui/button";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

export interface OrientationModalProps {
  isOpen?: boolean;
  onDismiss?: () => void;
  onExpertMode?: () => void;
  onClose?: () => void;
}

export function OrientationModal({
  isOpen,
  onDismiss,
  onExpertMode,
  onClose,
}: OrientationModalProps = {}) {
  const storeIsOpen = useOnboardingStore(
    (state) => state.orientationModalOpen,
  );
  const storeDismiss = useOnboardingStore(
    (state) => state.dismissOrientation,
  );
  const storeExpert = useOnboardingStore((state) => state.setExpertMode);
  const storeClose = useOnboardingStore(
    (state) => state.closeOrientationModal,
  );

  const activeIsOpen = isOpen ?? storeIsOpen;
  const activeDismiss = onDismiss ?? storeDismiss;
  const activeExpert = onExpertMode ?? storeExpert;
  const activeClose = onClose ?? storeClose;

  const modalRef = useModalFocus<HTMLDivElement>({
    isOpen: activeIsOpen,
    onClose: activeClose,
    autoFocusSelector: ".orientation-start-btn",
  });
  // A blocking briefing holds the clock while it is open (D062).
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
      aria-labelledby="orientation-modal-title"
      tabIndex={-1}
    >
      <div className="orientation-panel">
        <header className="orientation-header">
          <div>
            <span className="panel-label">SYSTEM INITIALIZATION // KERNEL 0.9</span>
            <h2 id="orientation-modal-title">Welcome to Ghostrank</h2>
          </div>
          <button
            type="button"
            className="system-modal-close"
            onClick={activeClose}
            aria-label="Close orientation"
          >
            ✕
          </button>
        </header>

        <div className="orientation-content">
          <p className="orientation-lead">
            Ghostrank is an inhabited simulated computer environment. Every terminal command and graphical interface operates through the same underlying simulation rules.
          </p>

          <div className="orientation-pillars">
            <article className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-glyph" aria-hidden="true">◎</span>
                <strong>1. INVESTIGATE</strong>
              </div>
              <p>
                Passive reconnaissance is safe. Use <code>observe &lt;target&gt;</code> to map ingress points, survey host machines, and inspect open service endpoints.
              </p>
            </article>

            <article className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-glyph" aria-hidden="true">⏱</span>
                <strong>2. FULFILL CONTRACTS</strong>
              </div>
              <p>
                Browse syndicate commissions in Underground. Match your verified evidence against contract objectives and deliver before the deadline window closes.
              </p>
            </article>

            <article className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-glyph" aria-hidden="true">⌸</span>
                <strong>3. EXPAND YOUR RIG</strong>
              </div>
              <p>
                Acquire modular compute hardware and AI assistant models in Market. Lease safehouses to protect your physical anonymity from retaliatory raids.
              </p>
            </article>

            <article className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-glyph" aria-hidden="true">⚡</span>
                <strong>4. SURVIVE CONSEQUENCE</strong>
              </div>
              <p>
                Escalating into intrusive operations accumulates trace footprints. Opponents will deploy counter-probes. Disengage operations before you are unmasked.
              </p>
            </article>
          </div>
        </div>

        <footer className="orientation-footer">
          <Button
            className="orientation-start-btn"
            onClick={activeDismiss}
          >
            ENTER SYSTEM // START
          </Button>

          <Button
            variant="ghost"
            className="orientation-expert-btn"
            onClick={activeExpert}
            title="Silence all hints and directives for a clean expert experience"
          >
            EXPERT MODE (SILENCE ALL HINTS)
          </Button>
        </footer>
      </div>
    </div>
  );
}
