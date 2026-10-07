"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  transitionDurationMs,
  transitionFrame,
  type DistroTransitionKind,
} from "@/presentation/distro-installation";
import { playDistroSound } from "@/presentation/distro-sound";
import { DISTRO_IDS, DISTRO_PROFILES, type DistroId } from "@/presentation/distros";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

interface ActiveTransition {
  distroId: DistroId;
  kind: DistroTransitionKind;
  startedAt: number;
  elapsedMs: number;
}

export function AppearanceApp() {
  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const installedDistroIds = usePresentationStore(
    (state) => state.installedDistroIds,
  );
  const soundEnabled = usePresentationStore((state) => state.soundEnabled);
  const completeDistroInstall = usePresentationStore(
    (state) => state.completeDistroInstall,
  );
  const activateInstalledDistro = usePresentationStore(
    (state) => state.activateInstalledDistro,
  );
  const setTheme = usePresentationStore((state) => state.setTheme);
  const setSoundEnabled = usePresentationStore(
    (state) => state.setSoundEnabled,
  );
  const hintsEnabled = useOnboardingStore((state) => state.hintsEnabled);
  const directivesEnabled = useOnboardingStore((state) => state.directivesEnabled);
  const setHintsEnabled = useOnboardingStore((state) => state.setHintsEnabled);
  const setDirectivesEnabled = useOnboardingStore((state) => state.setDirectivesEnabled);
  const resetAllHints = useOnboardingStore((state) => state.resetAllHints);
  const openOrientationModal = useOnboardingStore((state) => state.openOrientationModal);
  const openLegendModal = useOnboardingStore((state) => state.openLegendModal);
  const reducedMotion = useReducedMotion() !== false;
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  const lastStageId = useRef<string | null>(null);
  const activeProfile = DISTRO_PROFILES[distroId];
  const transitionDistroId = transition?.distroId ?? null;
  const transitionKind = transition?.kind ?? null;
  const transitionStartedAt = transition?.startedAt ?? null;

  const frame = useMemo(() => {
    if (!transition) {
      return null;
    }

    return transitionFrame(
      transition.distroId,
      transition.kind,
      transition.elapsedMs,
      reducedMotion,
    );
  }, [reducedMotion, transition]);

  useEffect(() => {
    if (
      transitionDistroId === null ||
      transitionKind === null ||
      transitionStartedAt === null
    ) {
      lastStageId.current = null;
      return;
    }

    const duration = transitionDurationMs(transitionKind, reducedMotion);
    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - transitionStartedAt;

      if (elapsedMs >= duration) {
        const targetProfile = DISTRO_PROFILES[transitionDistroId];

        if (transitionKind === "install") {
          completeDistroInstall(transitionDistroId);
        } else {
          activateInstalledDistro(transitionDistroId);
        }

        playDistroSound(targetProfile.sound, "complete", soundEnabled);
        setTransition(null);
        return;
      }

      setTransition((current) =>
        current
          ? {
              ...current,
              elapsedMs,
            }
          : current,
      );
    }, reducedMotion ? 90 : 50);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    activateInstalledDistro,
    completeDistroInstall,
    reducedMotion,
    soundEnabled,
    transitionDistroId,
    transitionKind,
    transitionStartedAt,
  ]);

  useEffect(() => {
    if (!transition || !frame || frame.stage.id === lastStageId.current) {
      return;
    }

    if (lastStageId.current !== null) {
      playDistroSound(
        DISTRO_PROFILES[transition.distroId].sound,
        "stage",
        soundEnabled,
      );
    }

    lastStageId.current = frame.stage.id;
  }, [frame, soundEnabled, transition]);

  const beginTransition = useCallback(
    (targetDistroId: DistroId, kind: DistroTransitionKind) => {
      if (transition) {
        return;
      }

      const targetProfile = DISTRO_PROFILES[targetDistroId];
      lastStageId.current = null;
      playDistroSound(targetProfile.sound, kind, soundEnabled);
      setTransition({
        distroId: targetDistroId,
        kind,
        startedAt: Date.now(),
        elapsedMs: 0,
      });
    },
    [soundEnabled, transition],
  );

  return (
    <div className="appearance-app">
      <section aria-labelledby="appearance-distro-heading">
        <div className="appearance-heading">
          <div>
            <span className="panel-label">OPERATING ENVIRONMENT</span>
            <h2 id="appearance-distro-heading">System distributions</h2>
          </div>
          <span className="appearance-current">
            {activeProfile.glyph} {activeProfile.label}
          </span>
        </div>

        <p className="appearance-copy">
          A distro is an installed operating environment, not a color switch.
          Installing or booting one changes presentation only: your run, rank,
          tools, evidence, economy, deadlines and command results are untouched.
        </p>

        <div className="distro-grid">
          {DISTRO_IDS.map((id) => {
            const profile = DISTRO_PROFILES[id];
            const active = id === distroId;
            const installed = installedDistroIds.includes(id);
            const busy = transition !== null;

            return (
              <article
                key={id}
                className="distro-card"
                data-selected={active ? "true" : "false"}
              >
                <div className="distro-card-topline">
                  <span className="distro-glyph" aria-hidden="true">
                    {profile.glyph}
                  </span>
                  <strong>{profile.shortLabel}</strong>
                  <span className="distro-installed">
                    {active ? "RUNNING" : installed ? "INSTALLED" : "AVAILABLE"}
                  </span>
                </div>

                <span className="distro-description">{profile.description}</span>

                <span className="distro-swatches" aria-hidden="true">
                  {profile.swatches.map((swatch) => (
                    <span key={swatch} style={{ backgroundColor: swatch }} />
                  ))}
                </span>

                <div className="distro-actions">
                  {active ? (
                    <span className="distro-current-note">CURRENT SESSION</span>
                  ) : installed ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => beginTransition(id, "boot")}
                    >
                      BOOT
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => beginTransition(id, "install")}
                    >
                      INSTALL
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="appearance-theme-heading">
        <span className="panel-label">THEME VARIANT // ACTIVE DISTRO</span>
        <h2 id="appearance-theme-heading">{activeProfile.label}</h2>
        <div className="theme-picker">
          {activeProfile.themes.map((theme) => {
            const selected = theme.id === themeId;

            return (
              <Button
                key={theme.id}
                variant={selected ? "default" : "ghost"}
                aria-pressed={selected}
                disabled={transition !== null}
                onClick={() => setTheme(theme.id)}
              >
                {theme.label}
              </Button>
            );
          })}
        </div>
        <p className="appearance-copy">
          {activeProfile.themes.find((theme) => theme.id === themeId)
            ?.description ?? ""}
        </p>
      </section>

      <section className="appearance-sound" aria-label="System sounds">
        <div>
          <span className="panel-label">DISTRO SOUND IDENTITY</span>
          <strong>{soundEnabled ? "UI SOUNDS ENABLED" : "UI SOUNDS MUTED"}</strong>
        </div>
        <Button
          variant={soundEnabled ? "default" : "ghost"}
          disabled={transition !== null}
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? "MUTE" : "ENABLE"}
        </Button>
      </section>

      <section className="appearance-guidance" aria-label="Operational guidance">
        <div className="appearance-heading">
          <div>
            <span className="panel-label">OPERATIONAL GUIDANCE</span>
            <h2>Onboarding &amp; discoverability</h2>
          </div>
        </div>
        <p className="appearance-copy">
          Configure contextual in-app guidance, progressive directives, or review system reference materials.
        </p>

        <div className="guidance-settings-grid">
          <div className="guidance-setting-row">
            <div>
              <strong>Contextual In-App Hints</strong>
              <span className="setting-subtext">Dismissible guidance banners across Recon, Market, and Terminal.</span>
            </div>
            <Button
              variant={hintsEnabled ? "default" : "ghost"}
              onClick={() => setHintsEnabled(!hintsEnabled)}
            >
              {hintsEnabled ? "ENABLED" : "MUTED"}
            </Button>
          </div>

          <div className="guidance-setting-row">
            <div>
              <strong>Progressive Field Directives</strong>
              <span className="setting-subtext">Desktop dock tracking initial investigative milestones.</span>
            </div>
            <Button
              variant={directivesEnabled ? "default" : "ghost"}
              onClick={() => setDirectivesEnabled(!directivesEnabled)}
            >
              {directivesEnabled ? "SHOWN" : "HIDDEN"}
            </Button>
          </div>

          <div className="guidance-setting-actions">
            <Button variant="ghost" size="sm" onClick={resetAllHints}>
              RESET DISMISSED HINTS
            </Button>
            <Button variant="ghost" size="sm" onClick={openOrientationModal}>
              OPEN ORIENTATION BRIEFING
            </Button>
            <Button variant="ghost" size="sm" onClick={openLegendModal}>
              OPEN SYSTEM GLOSSARY
            </Button>
          </div>
        </div>
      </section>

      <section className="appearance-accessibility-note" aria-label="Accessibility">
        <span className="panel-label">ACCESSIBILITY LAYER</span>
        <p>
          Reduced motion shortens the installer and removes decorative motion,
          but keeps the same textual stages. Sound is optional and never carries
          required information. Phase 9 P4 adds the remaining scale, contrast,
          transparency and interaction overrides above this profile layer.
        </p>
      </section>

      {transition && frame && (
        <div
          className="distro-installer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="distro-installer-title"
        >
          <div className="distro-installer-panel">
            <div className="distro-installer-brand" aria-hidden="true">
              {DISTRO_PROFILES[transition.distroId].glyph}
            </div>
            <span className="panel-label">
              {transition.kind === "install"
                ? "SYSTEM INSTALLER"
                : "SYSTEM HANDOVER"}
            </span>
            <h2 id="distro-installer-title">
              {transition.kind === "install" ? "Installing " : "Booting "}
              {DISTRO_PROFILES[transition.distroId].label}
            </h2>
            <p className="distro-installer-stage">{frame.stage.label}</p>

            <div
              className="distro-progress"
              role="progressbar"
              aria-label={frame.stage.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(frame.progress)}
            >
              <span
                style={
                  {
                    "--distro-progress": `${frame.progress}%`,
                  } as CSSProperties
                }
              />
            </div>

            <div className="distro-installer-meta">
              <span>{Math.round(frame.progress).toString().padStart(3, "0")}%</span>
              <span>
                {transition.kind === "install"
                  ? "RUN CLOCK UNCHANGED // PRESENTATION ONLY"
                  : "SESSION STATE PRESERVED"}
              </span>
            </div>

            {transition.kind === "install" && frame.progress < 90 && (
              <Button
                variant="ghost"
                onClick={() => setTransition(null)}
              >
                CANCEL INSTALL
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
