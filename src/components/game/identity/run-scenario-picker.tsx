"use client";

import { useId } from "react";

import { SCENARIO_PRESENTATION } from "@/content/world-scenarios";
import {
  RUN_SCENARIOS,
  type RunScenario,
} from "@/game/simulation/state/run-scenario";

/**
 * The starting scene for a new run (Game-First G2, #78; D065).
 *
 * The parent holds the choice and passes it in. The field shows each scene's
 * editorial preview and nothing about the world behind it: which people exist
 * and how they are connected is decided by the seed, not by this control.
 */
export function RunScenarioPicker({
  value,
  onChange,
}: {
  value: RunScenario;
  onChange: (value: RunScenario) => void;
}) {
  const groupId = useId();

  return (
    <fieldset className="run-scenario-picker">
      <legend className="run-handle-label">STARTING SCENE</legend>
      {RUN_SCENARIOS.map((scenario) => {
        const presentation = SCENARIO_PRESENTATION[scenario];
        const inputId = `${groupId}-${scenario}`;
        const selected = value === scenario;

        return (
          <div
            key={scenario}
            className="run-scenario-option"
            data-scenario={scenario}
            data-selected={selected ? "true" : "false"}
          >
            <input
              id={inputId}
              type="radio"
              name="run-scenario"
              value={scenario}
              checked={selected}
              onChange={() => onChange(scenario)}
            />
            <label htmlFor={inputId} className="run-scenario-label">
              <span className="run-scenario-title">{presentation.label}</span>
              <span className="run-scenario-preview">{presentation.preview}</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
