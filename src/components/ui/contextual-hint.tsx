"use client";

import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

export interface ContextualHintProps {
  id: string;
  title: string;
  description: string;
  commandSuggestion?: string;
  onRunCommand?: (command: string) => void;
  className?: string;
  isEnabled?: boolean;
  isDismissed?: boolean;
  onDismiss?: (id: string) => void;
}

export function ContextualHint({
  id,
  title,
  description,
  commandSuggestion,
  onRunCommand,
  className = "",
  isEnabled,
  isDismissed,
  onDismiss,
}: ContextualHintProps) {
  const storeHintsEnabled = useOnboardingStore((state) => state.hintsEnabled);
  const storeDismissedHintIds = useOnboardingStore((state) => state.dismissedHintIds);
  const storeDismissHint = useOnboardingStore((state) => state.dismissHint);

  const activeEnabled = isEnabled ?? storeHintsEnabled;
  const activeDismissed = isDismissed ?? storeDismissedHintIds.includes(id);
  const activeDismiss = onDismiss ?? storeDismissHint;

  if (!activeEnabled || activeDismissed) {
    return null;
  }

  return (
    <aside
      className={`contextual-hint-banner ${className}`}
      data-hint-id={id}
      role="note"
      aria-label={`Guidance: ${title}`}
    >
      <div className="hint-glyph-column" aria-hidden="true">
        <span className="hint-glyph">✦</span>
      </div>

      <div className="hint-body">
        <div className="hint-header">
          <strong className="hint-title">{title}</strong>
          <button
            type="button"
            className="hint-dismiss-button"
            onClick={() => activeDismiss(id)}
            aria-label={`Dismiss ${title} guidance`}
            title="Dismiss this tip"
          >
            ✕
          </button>
        </div>

        <p className="hint-description">{description}</p>

        {commandSuggestion && (
          <div className="hint-command-row">
            <span className="hint-command-label">COMMAND:</span>
            <code className="hint-command-code">{commandSuggestion}</code>
            {onRunCommand && (
              <button
                type="button"
                className="hint-run-button"
                onClick={() => onRunCommand(commandSuggestion)}
                title={`Execute '${commandSuggestion}'`}
              >
                RUN
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
