"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { PresentedModelListing } from "@/components/game/market/model-listing-model";

interface ModelLicenseCardProps {
  readonly item: PresentedModelListing;
  readonly onBuy: () => void;
  readonly onRun: () => void;
  readonly onStop: () => void;
}

/** A model listing is a command surface: no local-only purchase gates for cloud rentals. */
export function ModelLicenseCard({ item, onBuy, onRun, onStop }: ModelLicenseCardProps) {
  const cloud = item.source === "cloud";
  const local = item.source === "local";
  return (
    <li className="model-listing" data-model-id={item.id} data-source={item.source} data-running={item.running}>
      <Card className="model-market-card">
        <div className="model-market-art" aria-hidden="true">
          <Image unoptimized src={item.art} width={400} height={240} alt="" />
          <span className="model-art-overline">{cloud ? "REMOTE COMPUTE" : local ? "LOCAL WEIGHTS" : "UNCLASSIFIED"}</span>
        </div>
        <CardContent className="model-market-copy">
          <div className="model-market-badges">
            <Badge variant="outline">{cloud ? "CLOUD / DAILY" : local ? "LOCAL / OWNED" : "UNKNOWN SOURCE"}</Badge>
            {item.running && <Badge variant="secondary">RUNNING</Badge>}
            {!item.running && item.owned && <Badge variant="secondary">OWNED</Badge>}
          </div>
          <h3>{item.label}</h3>
          {item.author && <span className="model-market-author">by {item.author} · peer-authored</span>}
          <div className="model-market-effect">
            <span>Advertised action time</span>
            <strong>×{item.factor}</strong>
          </div>
          {local && (
            <>
              <div className="model-market-footprint" aria-label="Local rig requirements">
                <div><span>VRAM load</span><strong>{item.footprint.vram}</strong><span> / rig {item.rig.vram}</span></div>
                <div><span>Storage load</span><strong>{item.footprint.storage}</strong><span> / rig {item.rig.storage}</span></div>
              </div>
              <div className="model-market-delivery" data-contended={item.starved}>
                <span>{item.starved ? "Current rig delivers" : "Current rig estimate"}</span>
                <strong>×{item.deliveredFactor}</strong>
                {item.starved && <span className="model-market-note">Reduced by current rig contention</span>}
              </div>
            </>
          )}
          {cloud && <p className="model-market-note">No local VRAM/storage load. Subscription bills only at world-day boundaries.</p>}
        </CardContent>
        <CardFooter className="model-market-footer">
          <div className="model-market-price">
            <strong>{(cloud ? item.dailyCostCr : item.costCr).toLocaleString("en-US")} cr</strong>
            <span>{cloud ? "/ world day while running" : "one-time · runs free"}</span>
          </div>
          {item.action === "unavailable" ? (
            <Button disabled type="button">UNAVAILABLE</Button>
          ) : item.action === "stop" ? (
            <Button type="button" variant="ghost" aria-label={`Stop ${item.label}`}
              title="Stop this assistant and end its speed effect" onClick={onStop}>STOP</Button>
          ) : item.action === "run" ? (
            <Button type="button" aria-label={`Run ${item.label}`}
              title={cloud
                ? "Start this cloud subscription; no charge until the next world-day boundary"
                : "Run this owned local model; the current rig may reduce its shortcut"}
              onClick={onRun}>RUN</Button>
          ) : (
            <div className="model-market-buy">
              {!item.canBuy && <span>Not enough credits</span>}
              <Button type="button" disabled={!item.canBuy}
                aria-label={`Buy ${item.label}`} title={item.canBuy ? "Buy this local model once" : "Not enough credits"}
                onClick={onBuy}>BUY</Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </li>
  );
}
