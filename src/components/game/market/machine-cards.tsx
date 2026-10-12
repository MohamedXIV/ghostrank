"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { MachineListingDisplay, OwnedMachineDisplay, MachineStat } from "@/components/game/market/machine-listing-model";

function MachineStats({ stats }: { readonly stats: ReadonlyArray<MachineStat> }) {
  return <div className="machine-card-stats" aria-label="Machine capabilities">
    {stats.length ? stats.map(stat => (
      <span key={stat.metric} className="machine-card-stat" aria-label={`${stat.metric} +${stat.value}`}>
        {stat.metric} <strong>+{stat.value}</strong>
      </span>
    )) : <span className="machine-card-stat">No capability lift</span>}
  </div>;
}

/** The stock list is a view of real buyable projected items, not a mocked store. */
export function MachineListingCard({ item, onBuy }: {
  readonly item: MachineListingDisplay; readonly onBuy: () => void;
}) {
  return <li className="machine-listing" data-machine-catalog-id={item.id}>
    <Card className="machine-product-card">
      <div className="machine-card-art">
        <Image unoptimized src={item.art} width={400} height={240} alt="" aria-hidden="true" />
      </div>
      <CardContent className="machine-card-content">
        <div className="machine-card-badges">
          <Badge variant="outline">ONE-TIME / OWNED</Badge>
          {item.exotic && <Badge variant="secondary">EXOTIC STOCK</Badge>}
          {item.ownedCount > 0 && <Badge variant="outline">OWNED ×{item.ownedCount}</Badge>}
        </div>
        <h3>{item.label}</h3>
        <MachineStats stats={item.stats} />
        {item.exotic && <span className="machine-card-detail">One-shot off-market stock</span>}
      </CardContent>
      <CardFooter className="machine-card-footer">
        <div className="machine-card-price"><strong>{item.priceCr.toLocaleString("en-US")} cr</strong><span>one-time</span></div>
        <div className="machine-card-action">
          {!item.affordable && <span>Not enough credits</span>}
          <Button type="button" disabled={!item.affordable}
            aria-label={`Buy ${item.label}`}
            title={item.affordable ? "Buy this machine outright; no daily upkeep" : "Not enough credits"}
            onClick={onBuy}>BUY</Button>
        </div>
      </CardFooter>
    </Card>
  </li>;
}

/** Rack ownership and actual resale value come from an acquired machine row. */
export function OwnedMachineCard({ item, renameControl, onSell }: {
  readonly item: OwnedMachineDisplay;
  readonly renameControl: ReactNode;
  readonly onSell: () => void;
}) {
  return <li className="machine-listing is-owned" data-owned-machine-id={item.id}>
    <Card className="machine-product-card machine-owned-card">
      <div className="machine-card-art">
        <Image unoptimized src={item.art} width={400} height={240} alt="" aria-hidden="true" />
      </div>
      <CardContent className="machine-card-content">
        <div className="machine-card-badges">
          <Badge variant="secondary">IN RACK</Badge>
          <Badge variant="outline">{item.catalogId}</Badge>
        </div>
        <h3>{item.label}</h3>
        <MachineStats stats={item.stats} />
        <span className="machine-card-detail">Acquired {formatWorldTime(item.acquiredWorldMinute)}</span>
        {renameControl}
      </CardContent>
      <CardFooter className="machine-card-footer">
        <div className="machine-card-price">
          <strong>{item.resaleCr.toLocaleString("en-US")} cr</strong>
          <span>resale · paid {item.paidCostCr.toLocaleString("en-US")} cr</span>
        </div>
        <Button type="button" variant="ghost" title="Resell this owned machine to the fence"
          aria-label={`Sell ${item.label}`} onClick={onSell}>SELL</Button>
      </CardFooter>
    </Card>
  </li>;
}
