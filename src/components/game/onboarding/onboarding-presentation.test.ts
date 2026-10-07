import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { ContextualHint } from "@/components/ui/contextual-hint";
import {
  OrientationModal,
  type OrientationModalProps,
} from "@/components/game/onboarding/orientation-modal";
import {
  SystemLegendModal,
  type SystemLegendModalProps,
} from "@/components/game/onboarding/system-legend-modal";
import {
  CommandDiscovery,
  DISCOVERABLE_COMMANDS,
} from "@/components/game/terminal/command-discovery";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

describe("Onboarding and Discoverability UI components", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetAllHints();
    useOnboardingStore.setState({
      hintsEnabled: true,
      directivesEnabled: true,
      orientationDismissed: false,
      orientationModalOpen: false,
      legendModalOpen: false,
      dismissedHintIds: [],
    });
  });

  describe("ContextualHint", () => {
    it("renders hint banner when hint is active and not dismissed", () => {
      const html = renderToStaticMarkup(
        React.createElement(ContextualHint, {
          id: "hint:test-recon",
          title: "PASSIVE RECON",
          description: "Observe targets safely.",
          commandSuggestion: "observe nightshade",
        }),
      );

      expect(html).toContain("contextual-hint-banner");
      expect(html).toContain("PASSIVE RECON");
      expect(html).toContain("Observe targets safely.");
      expect(html).toContain("observe nightshade");
    });

    it("renders nothing when hint is in dismissedHintIds", () => {
      const html = renderToStaticMarkup(
        React.createElement(ContextualHint, {
          id: "hint:test-recon",
          title: "PASSIVE RECON",
          description: "Observe targets safely.",
          isDismissed: true,
        }),
      );

      expect(html).toBe("");
    });

    it("renders nothing when hintsEnabled is globally false", () => {
      const html = renderToStaticMarkup(
        React.createElement(ContextualHint, {
          id: "hint:test-recon",
          title: "PASSIVE RECON",
          description: "Observe targets safely.",
          isEnabled: false,
        }),
      );

      expect(html).toBe("");
    });
  });

  describe("OrientationModal", () => {
    it("renders nothing when orientationModalOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement<OrientationModalProps>(OrientationModal, {
          isOpen: false,
        }),
      );
      expect(html).toBe("");
    });

    it("renders operational pillars and start button when modal is open", () => {
      const html = renderToStaticMarkup(
        React.createElement<OrientationModalProps>(OrientationModal, {
          isOpen: true,
        }),
      );
      expect(html).toContain("orientation-panel");
      expect(html).toContain("Welcome to Ghostrank");
      expect(html).toContain("1. INVESTIGATE");
      expect(html).toContain("2. FULFILL CONTRACTS");
      expect(html).toContain("3. EXPAND YOUR RIG");
      expect(html).toContain("4. SURVIVE CONSEQUENCE");
      expect(html).toContain("EXPERT MODE");
    });
  });

  describe("SystemLegendModal", () => {
    it("renders nothing when legendModalOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement<SystemLegendModalProps>(SystemLegendModal, {
          isOpen: false,
        }),
      );
      expect(html).toBe("");
    });

    it("renders epistemic vocabulary, confidence pips, and relationship signatures when open", () => {
      const html = renderToStaticMarkup(
        React.createElement<SystemLegendModalProps>(SystemLegendModal, {
          isOpen: true,
        }),
      );
      expect(html).toContain("system-legend-panel");
      expect(html).toContain("Epistemic Truth Vocabulary");
      expect(html).toContain("AI Analytical Confidence");
      expect(html).toContain("Social &amp; Rival Signatures");
      expect(html).toContain("Contract Urgency &amp; Network Tiers");
    });
  });

  describe("CommandDiscovery", () => {
    it("renders command discovery container and category chips", () => {
      const html = renderToStaticMarkup(
        React.createElement(CommandDiscovery, {
          onSelectCommand: () => {},
        }),
      );

      expect(html).toContain("command-discovery-container");
      expect(html).toContain("COMMAND DISCOVERY");
      expect(html).toContain("observe &lt;target&gt;");
      expect(html).toContain("survey &lt;target&gt;");
      expect(html).toContain("inspect &lt;machine&gt;");
      expect(html).toContain("contract accept &lt;id&gt;");
    });

    it("covers all 4 categories in discoverable commands", () => {
      const categories = new Set(DISCOVERABLE_COMMANDS.map((c) => c.category));
      expect(categories.has("recon")).toBe(true);
      expect(categories.has("rig")).toBe(true);
      expect(categories.has("underground")).toBe(true);
      expect(categories.has("system")).toBe(true);
    });
  });
});
