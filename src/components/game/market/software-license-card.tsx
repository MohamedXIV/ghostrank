"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { SoftwareListing } from "@/components/game/market/software-listing-model";

interface SoftwareLicenseCardProps {
  readonly item: SoftwareListing;
  readonly onToggle: () => void;
}

/** A license listing, not a shop simulator: toggles go to the authoritative GUI command. */
export function SoftwareLicenseCard({ item, onToggle }: SoftwareLicenseCardProps) {
  return (
    <li className="software-listing" data-software-id={item.id}>
      <Card className="software-license-card">
        <div className="software-license-art" aria-hidden="true">
          <Image unoptimized src={item.art} width={100} height={100} alt="" />
        </div>
        <CardContent className="software-license-content">
          <div className="software-license-state">
            <Badge variant="outline">LICENSE / DAILY</Badge>
            {item.active && <Badge variant="secondary">RUNNING</Badge>}
          </div>
          <h3>{item.label}</h3>
          <div className="software-license-effects" aria-label="Software effects">
            {item.efficiency ? (
              <span className="software-license-effect">{item.efficiency}</span>
            ) : item.capabilities.length ? item.capabilities.map(stat => (
              <span key={stat.metric} className="software-license-effect" aria-label={`${stat.metric} +${stat.value}`}>
                {stat.metric} <strong>+{stat.value}</strong>
              </span>
            )) : <span className="software-license-effect">No capability lift</span>}
          </div>
        </CardContent>
        <CardFooter className="software-license-footer">
          <div className="software-license-price">
            <strong>{item.dailyCostCr.toLocaleString("en-US")} cr</strong>
            <span>/ world day</span>
          </div>
          <Button
            size="sm"
            variant={item.active ? "ghost" : "default"}
            aria-label={`${item.active ? "Stop" : "Run"} ${item.label}`}
            title={item.active ? "Stop this license (fee stops with it)" : "Run this license (fee starts at the next day)"}
            onClick={onToggle}
          >
            {item.active ? "STOP" : "RUN"}
          </Button>
        </CardFooter>
      </Card>
    </li>
  );
}
