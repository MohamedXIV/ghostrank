"use client";

import { DISTRO_IDS, DISTRO_PROFILES } from "@/presentation/distros";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { Button } from "@/components/ui/button";

export function AppearanceApp() {
  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const setDistro = usePresentationStore((state) => state.setDistro);
  const setTheme = usePresentationStore((state) => state.setTheme);
  const activeProfile = DISTRO_PROFILES[distroId];

  return (
    <div className="appearance-app">
      <section aria-labelledby="appearance-distro-heading">
        <div className="appearance-heading">
          <div>
            <span className="panel-label">OPERATING ENVIRONMENT</span>
            <h2 id="appearance-distro-heading">Choose a distro</h2>
          </div>
          <span className="appearance-current">
            {activeProfile.glyph} {activeProfile.label}
          </span>
        </div>

        <p className="appearance-copy">
          Distros change presentation only. Your run, rank, tools, evidence,
          economy and command results stay exactly the same.
        </p>

        <div className="distro-grid">
          {DISTRO_IDS.map((id) => {
            const profile = DISTRO_PROFILES[id];
            const selected = id === distroId;

            return (
              <button
                type="button"
                key={id}
                className="distro-card"
                data-selected={selected ? "true" : "false"}
                aria-pressed={selected}
                onClick={() => setDistro(id)}
              >
                <span className="distro-card-topline">
                  <span className="distro-glyph" aria-hidden="true">
                    {profile.glyph}
                  </span>
                  <strong>{profile.shortLabel}</strong>
                  {selected && <span className="distro-installed">ACTIVE</span>}
                </span>

                <span className="distro-description">{profile.description}</span>

                <span className="distro-swatches" aria-hidden="true">
                  {profile.swatches.map((swatch) => (
                    <span key={swatch} style={{ backgroundColor: swatch }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="appearance-theme-heading">
        <span className="panel-label">THEME VARIANT</span>
        <h2 id="appearance-theme-heading">{activeProfile.label}</h2>
        <div className="theme-picker">
          {activeProfile.themes.map((theme) => {
            const selected = theme.id === themeId;

            return (
              <Button
                key={theme.id}
                variant={selected ? "default" : "ghost"}
                aria-pressed={selected}
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

      <section className="appearance-accessibility-note" aria-label="Accessibility">
        <span className="panel-label">ACCESSIBILITY LAYER</span>
        <p>
          System reduced-motion is already honored above every distro. Phase 9
          P4 adds the explicit scale, contrast, transparency and interaction
          overrides on top of this same profile layer.
        </p>
      </section>
    </div>
  );
}
