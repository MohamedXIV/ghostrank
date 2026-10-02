"use client";

import { useEffect, useRef } from "react";
import { useCell } from "tinybase/ui-react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import type { GameRuntime } from "@/game/runtime/game-runtime";

interface RoomSurfaceProps {
  runtime: GameRuntime;
  onUseDesk: () => void;
}

export function RoomSurface({ runtime, onUseDesk }: RoomSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldMinute = Number(
    useCell("meta", "world", "worldMinute", runtime.projection) ?? 0,
  );

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
          <strong>SHORT-TERM ROOM // UNIT 04</strong>
        </div>
        <div>
          <span className="panel-label">WORLD TIME</span>
          <strong>{formatWorldTime(worldMinute)}</strong>
        </div>
      </div>

      <div ref={containerRef} className="phaser-room" />

      <div className="room-caption">
        <span>fan hum // distant traffic // something red outside the window</span>
        <button type="button" onClick={onUseDesk}>
          USE WORKSTATION
        </button>
      </div>
    </section>
  );
}
