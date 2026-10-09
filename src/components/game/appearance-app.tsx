"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useClockHold } from "@/components/game/clock-context";
import { Button } from "@/components/ui/button";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useEffectiveReducedMotion } from "@/components/game/window-motion";
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
  const textScale = usePresentationStore((state) => state.textScale);
  const motionMode = usePresentationStore((state) => state.motionMode);
  const transparencyMode = usePresentationStore(
    (state) => state.transparencyMode,
  );
  const densityMode = usePresentationStore((state) => state.densityMode);
  const contrastMode = usePresentationStore((state) => state.contrastMode);

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
  const setTextScale = usePresentationStore((state) => state.setTextScale);
  const setMotionMode = usePresentationStore((state) => state.setMotionMode);
  const setTransparencyMode = usePresentationStore(
    (state) => state.setTransparencyMode,
  );
  const setDensityMode = usePresentationStore((state) => state.setDensityMode);
  const setContrastMode = usePresentationStore(
    (state) => state.setContrastMode,
  );

  const hintsEnabled = useOnboardingStore((state) => state.hintsEnabled);
  const directivesEnabled = useOnboardingStore((state) => state.directivesEnabled);
  const setHintsEnabled = useOnboardingStore((state) => state.setHintsEnabled);
  const setDirectivesEnabled = useOnboardingStore((state) => state.setDirectivesEnabled);
  const resetAllHints = useOnboardingStore((state) => state.resetAllHints);
  const openOrientationModal = useOnboardingStore((state) => state.openOrientationModal);
  const openLegendModal = useOnboardingStore((state) => state.openLegendModal);
  const reducedMotion = useEffectiveReducedMotion();
  const ignoreInstallerEscape = useCallback(() => {}, []);
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  const installerPanelRef = useModalFocus<HTMLDivElement>({
    isOpen: transition !== null,
    onClose: ignoreInstallerEscape,
  });
  // The installer is a blocking dialog, so the clock holds while it runs (D062).
  useClockHold(transition !== null);
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

      <section className="appearance-accessibility" aria-labelledby="appearance-a11y-heading">
        <div className="appearance-heading">
          <div>
            <span className="panel-label">ACCESSIBILITY &amp; COMFORT</span>
            <h2 id="appearance-a11y-heading">Interaction overrides</h2>
          </div>
        </div>
        <p className="appearance-copy">
          Presentation overrides are strictly client-side presentation preferences.
          They never alter simulation mechanics, deadlines, economy, target access, or truth certainty.
        </p>

        <div className="a11y-settings-grid">
          {/* Text & Interface Scale */}
          <div className="a11y-setting-row">
            <div>
              <strong>Interface &amp; Text Scale</strong>
              <span className="setting-subtext">Scales typography, terminal lines, and panel layouts.</span>
            </div>
            <div className="a11y-button-group" role="group" aria-label="Text scale options">
              <Button
                variant={textScale === "normal" ? "default" : "ghost"}
                size="sm"
                aria-pressed={textScale === "normal"}
                onClick={() => setTextScale("normal")}
              >
                100% (NORMAL)
              </Button>
              <Button
                variant={textScale === "large" ? "default" : "ghost"}
                size="sm"
                aria-pressed={textScale === "large"}
                onClick={() => setTextScale("large")}
              >
                115% (LARGE)
              </Button>
              <Button
                variant={textScale === "extra-large" ? "default" : "ghost"}
                size="sm"
                aria-pressed={textScale === "extra-large"}
                onClick={() => setTextScale("extra-large")}
              >
                130% (EXTRA LARGE)
              </Button>
            </div>
          </div>

          {/* Motion Mode */}
          <div className="a11y-setting-row">
            <div>
              <strong>Motion &amp; Animations</strong>
              <span className="setting-subtext">Override system motion preference for window transitions.</span>
            </div>
            <div className="a11y-button-group" role="group" aria-label="Motion options">
              <Button
                variant={motionMode === "system" ? "default" : "ghost"}
                size="sm"
                aria-pressed={motionMode === "system"}
                onClick={() => setMotionMode("system")}
              >
                SYSTEM
              </Button>
              <Button
                variant={motionMode === "reduce" ? "default" : "ghost"}
                size="sm"
                aria-pressed={motionMode === "reduce"}
                onClick={() => setMotionMode("reduce")}
              >
                REDUCED
              </Button>
              <Button
                variant={motionMode === "standard" ? "default" : "ghost"}
                size="sm"
                aria-pressed={motionMode === "standard"}
                onClick={() => setMotionMode("standard")}
              >
                STANDARD
              </Button>
            </div>
          </div>

          {/* Transparency & Blur */}
          <div className="a11y-setting-row">
            <div>
              <strong>Surface Transparency &amp; Blur</strong>
              <span className="setting-subtext">Remove frosted blurs in favor of solid high-legibility backgrounds.</span>
            </div>
            <div className="a11y-button-group" role="group" aria-label="Transparency options">
              <Button
                variant={transparencyMode === "default" ? "default" : "ghost"}
                size="sm"
                aria-pressed={transparencyMode === "default"}
                onClick={() => setTransparencyMode("default")}
              >
                TRANSLUCENT
              </Button>
              <Button
                variant={transparencyMode === "opaque" ? "default" : "ghost"}
                size="sm"
                aria-pressed={transparencyMode === "opaque"}
                onClick={() => setTransparencyMode("opaque")}
              >
                OPAQUE (SOLID)
              </Button>
            </div>
          </div>

          {/* Information Density */}
          <div className="a11y-setting-row">
            <div>
              <strong>Information Density</strong>
              <span className="setting-subtext">Toggle between dense compact data and relaxed comfortable spacing.</span>
            </div>
            <div className="a11y-button-group" role="group" aria-label="Information density options">
              <Button
                variant={densityMode === "compact" ? "default" : "ghost"}
                size="sm"
                aria-pressed={densityMode === "compact"}
                onClick={() => setDensityMode("compact")}
              >
                COMPACT
              </Button>
              <Button
                variant={densityMode === "comfortable" ? "default" : "ghost"}
                size="sm"
                aria-pressed={densityMode === "comfortable"}
                onClick={() => setDensityMode("comfortable")}
              >
                COMFORTABLE
              </Button>
            </div>
          </div>

          {/* Contrast Mode */}
          <div className="a11y-setting-row">
            <div>
              <strong>Contrast Level</strong>
              <span className="setting-subtext">Enhance element boundaries, text luminance, and focus indicators.</span>
            </div>
            <div className="a11y-button-group" role="group" aria-label="Contrast options">
              <Button
                variant={contrastMode === "normal" ? "default" : "ghost"}
                size="sm"
                aria-pressed={contrastMode === "normal"}
                onClick={() => setContrastMode("normal")}
              >
                BALANCED
              </Button>
              <Button
                variant={contrastMode === "high" ? "default" : "ghost"}
                size="sm"
                aria-pressed={contrastMode === "high"}
                onClick={() => setContrastMode("high")}
              >
                HIGH CONTRAST
              </Button>
            </div>
          </div>
        </div>
      </section>

      {transition && frame && (
        <div
          className="distro-installer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="distro-installer-title"
        >
          <div
            ref={installerPanelRef}
            className="distro-installer-panel"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();

                if (
                  transition.kind === "install" &&
                  frame.progress < 90
                ) {
                  setTransition(null);
                }
                return;
              }

              // Do not let OS-level shortcuts act behind an aria-modal installer.
              if (event.key === "F1" || event.altKey) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
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
