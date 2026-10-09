"use client";

import { useId } from "react";

import {
  PLAYER_HANDLE_HINT,
  describePlayerHandleRejection,
  type PlayerHandleRejection,
} from "@/game/identity/player-handle";

/**
 * The handle the player types before a run starts (Game-First G2, #78).
 *
 * Validation lives in the domain, not here: the parent holds the draft, asks
 * `validatePlayerHandle` for a verdict, and passes that verdict in. This field
 * only shows the rule and the reason for a refusal, and says nothing about the
 * world behind it.
 */
export function PlayerHandleField({
  value,
  rejection,
  onChange,
}: {
  value: string;
  rejection: PlayerHandleRejection | null;
  onChange: (value: string) => void;
}) {
  const hintId = useId();
  const errorId = useId();
  const typed = value.trim().length > 0;
  const showError = typed && rejection !== null;

  return (
    <div className="run-handle-field" data-valid={rejection === null ? "true" : "false"}>
      <label className="run-handle-label" htmlFor={`${hintId}-input`}>
        OPERATOR HANDLE
      </label>
      <input
        id={`${hintId}-input`}
        className="run-handle-input"
        type="text"
        name="player-handle"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
      />
      <span id={hintId} className="run-handle-hint">
        {PLAYER_HANDLE_HINT}
      </span>
      {showError && (
        <span id={errorId} className="run-handle-error" role="status">
          {describePlayerHandleRejection(rejection)}
        </span>
      )}
    </div>
  );
}
