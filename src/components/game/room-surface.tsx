"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCell, useRow, useTable } from "tinybase/ui-react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import { physicalIntentToCommand, presentRoom } from "@/game/phaser/bridge";
import type { VisiblePresence } from "@/game/simulation/projection/project-world";
import { derivePresence } from "@/game/simulation/systems/location";
import type { GameRuntime } from "@/game/runtime/game-runtime";

/**
 * The un-leased room, taken from the catalog's own baseline through the same
 * derivation the simulation uses. A renderer fallback must not invent a place
 * the world does not know, so this component contains no location literal.
 */
const BASELINE_PRESENCE: VisiblePresence = derivePresence(null);

/**
 * The anonymity band, rendered as fiction. A band is deliberately coarse, so the
 * scene gets an atmosphere line rather than a number to optimise — and P0 gives
 * it nothing else to read, since `anonymity` only becomes a threat input in P3.
 */
const ANONYMITY_FLAVOR: Record<VisiblePresence["anonymity"], string> = {
  public: "anyone on the street could name this room",
  quiet: "few notices, but the district still remembers faces",
  hidden: "nobody here knows the handle on the screen",
};

function physicalRoomCue(kind: string): string {
  switch (kind) {
    case "strange-vehicle":
      return "same car outside again";
    case "door-camera-motion":
      return "motion at the door, nobody there";
    case "outage":
      return "power out, block still lit";
    case "unusual-connectivity":
      return "local link behaving wrong";
    case "nearby-activity":
      return "too much quiet movement nearby";
    default:
      return "something outside feels wrong";
  }
}

interface RoomSurfaceProps {
  runtime: GameRuntime;
  onUseDesk: () => void;
}

export function RoomSurface({ runtime, onUseDesk }: RoomSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldMinute = Number(
    useCell("meta", "world", "worldMinute", runtime.projection) ?? 0,
  );
  // Phase 6 P0: the room reads where the player *is* from the projection
  // instead of naming a place in a string. Presence is derived from the held
  // lease, so this cannot disagree with an eviction or a relocation. The
  // fallback is the catalog's own baseline dwelling, not a local literal, so
  // the renderer cannot invent a place the simulation does not know.
  const presenceRow = useRow("presence", "current", runtime.projection);
  const presence: VisiblePresence = presenceRow
    ? {
        locationId: String(presenceRow.locationId),
        label: String(presenceRow.label),
        kind: presenceRow.kind as VisiblePresence["kind"],
        anonymity: presenceRow.anonymity as VisiblePresence["anonymity"],
        leased: presenceRow.leased === true,
        dailyCost: Number(presenceRow.dailyCost ?? 0),
        distanceMinutes: Number(presenceRow.distanceMinutes ?? 0),
      }
    : BASELINE_PRESENCE;
  const presentation = presentRoom(presence, worldMinute);

  // Relocation controls read the *same* housing table the Market panel does, so
  // the room can offer nothing the lease commands do not already accept, and the
  // journey shown here is the journey the projection already priced.
  const destinations = useTable("housing", runtime.projection);
  const physicalSignals = useTable("physicalSignals", runtime.projection);
  const latestPhysicalSignal = useMemo(
    () =>
      Object.entries(physicalSignals)
        .sort(
          ([idA, a], [idB, b]) =>
            Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
            idB.localeCompare(idA, undefined, { numeric: true }),
        )
        .at(0)?.[1],
    [physicalSignals],
  );
  const [destination, setDestination] = useState("");
  const relocationOptions = useMemo(() => {
    const rows: { id: string; label: string }[] = [];
    for (const [id, entry] of Object.entries(destinations ?? {})) {
      if (entry.active === true) {
        continue;
      }
      const travel = Number(entry.travelMinutes ?? 0);
      rows.push({
        id,
        label: `${String(entry.label ?? id)} · ${
          travel === 0 ? "same district" : `${travel}m trip`
        }`,
      });
    }
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  }, [destinations]);

  const onRelocate = useCallback(() => {
    if (destination.length === 0) {
      return;
    }
    runtime.execute(
      physicalIntentToCommand({ type: "moveTo", housingId: destination }),
    );
    // The chosen dwelling becomes the active lease, which drops it from the
    // list, so the selection resets rather than pointing at a removed option.
    setDestination("");
  }, [destination, runtime]);

  const onLeave = useCallback(() => {
    runtime.execute(physicalIntentToCommand({ type: "leave" }));
  }, [runtime]);

  useEffect(() => {
    let disposed = false;
    let game: import("phaser").Game | null = null;

    void import("phaser").then(({ default: Phaser }) => {
      if (disposed || !containerRef.current) {
        return;
      }

      class RoomScene extends Phaser.Scene {
        constructor() {
          super("room");
        }

        create() {
          const camera = this.cameras.main;
          camera.setBackgroundColor("#05090d");

          this.add
            .polygon(
              480,
              305,
              [0, -190, 345, 0, 0, 190, -345, 0],
              0x121a20,
            )
            .setStrokeStyle(2, 0x2b3c46, 0.9);

          this.add
            .polygon(
              307,
              210,
              [0, -95, 173, 0, 173, 190, 0, 95],
              0x0b1116,
            )
            .setStrokeStyle(2, 0x20303a, 0.8);

          this.add
            .polygon(
              653,
              210,
              [0, -95, -173, 0, -173, 190, 0, 95],
              0x0a0f13,
            )
            .setStrokeStyle(2, 0x20303a, 0.8);

          const windowGlow = this.add
            .rectangle(635, 180, 88, 78, 0x6d2331, 0.08)
            .setStrokeStyle(2, 0x3f5965, 0.7);

          this.tweens.add({
            targets: windowGlow,
            alpha: { from: 0.08, to: 0.34 },
            duration: 2_400,
            yoyo: true,
            repeat: -1,
            repeatDelay: 1_900,
          });

          this.add
            .rectangle(480, 220, 190, 60, 0x1a2025, 1)
            .setStrokeStyle(2, 0x50616a, 0.85);

          this.add
            .rectangle(480, 185, 92, 58, 0x09161a, 1)
            .setStrokeStyle(2, 0x7bbba1, 0.6);

          this.add.rectangle(480, 185, 72, 40, 0x3f8b70, 0.12);

          this.add
            .ellipse(480, 334, 44, 58, 0x080b0e)
            .setStrokeStyle(2, 0x29333a, 1);
          this.add.circle(480, 300, 18, 0x0b0e10);
          this.add
            .triangle(480, 304, -24, 19, 0, -24, 24, 19, 0x0e1215)
            .setStrokeStyle(1, 0x34414a, 1);

          this.add
            .text(618, 126, "window // street?", {
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#7f929b",
            })
            .setOrigin(0.5);

          this.add
            .text(480, 148, "WORKSTATION", {
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#91cdb3",
            })
            .setOrigin(0.5);

          const deskHit = this.add
            .rectangle(480, 215, 230, 120, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true });

          deskHit.on("pointerover", () => {
            camera.setZoom(1.015);
          });
          deskHit.on("pointerout", () => {
            camera.setZoom(1);
          });
          deskHit.on("pointerdown", onUseDesk);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 960,
        height: 540,
        backgroundColor: "#05090d",
        scene: [RoomScene],
        render: {
          antialias: true,
          pixelArt: false,
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [onUseDesk]);

  return (
    <section className="room-surface" aria-label="Physical room">
      <div className="room-hud">
        <div>
          <span className="panel-label">LOCATION</span>
          <strong>{presentation.label.toUpperCase()}</strong>
        </div>
        <div>
          <span className="panel-label">WORLD TIME</span>
          <strong>{formatWorldTime(worldMinute)}</strong>
        </div>
      </div>

      <div ref={containerRef} className="phaser-room" />

      <div className="room-caption">
        <span>
          {`fan hum // ${ANONYMITY_FLAVOR[presentation.anonymity]}`}
          {presentation.distant ? " // the trip here cost hours" : ""}
          {presentation.leased ? "" : " // no keys in this room"}
          {latestPhysicalSignal
            ? ` // OUTSIDE: ${physicalRoomCue(String(latestPhysicalSignal.kind ?? ""))}`
            : ""}
        </span>
        <div className="room-relocation">
          <label className="panel-label">
            RELOCATE
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              <option value="">—</option>
              {relocationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={destination.length === 0}
            title={
              destination.length === 0
                ? "Choose a dwelling"
                : "Sign this lease and travel there"
            }
            onClick={onRelocate}
          >
            MOVE
          </button>
          {presentation.leased ? (
            <button
              type="button"
              title="Break the lease and pay the trip back to the baseline room"
              onClick={onLeave}
            >
              PACK UP
            </button>
          ) : null}
          <button type="button" onClick={onUseDesk}>
            USE WORKSTATION
          </button>
        </div>
      </div>
    </section>
  );
}
