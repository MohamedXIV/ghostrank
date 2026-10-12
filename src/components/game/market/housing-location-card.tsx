"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { HousingListing } from "@/components/game/market/housing-listing-model";

interface HousingLocationCardProps {
  readonly item: HousingListing;
  readonly onMoveIn: () => void;
  readonly onMoveOut: () => void;
}

/** Live location listings. No fictional safety score or hidden knowledge is implied. */
export function HousingLocationCard({ item, onMoveIn, onMoveOut }: HousingLocationCardProps) {
  const travel = item.travelMinutes;
  return (
    <li className="housing-listing" data-housing-id={item.id} data-lease-active={item.active}>
      <Card className="housing-location-card">
        <div className="housing-location-art">
          <Image unoptimized src={item.art} width={400} height={240} alt="" aria-hidden="true" />
          <span className="housing-location-art-caption" aria-hidden="true">LOCATION / LEASE</span>
        </div>
        <CardContent className="housing-location-content">
          <div className="housing-location-meta">
            <Badge variant="outline">{item.kind}</Badge>
            <Badge variant="outline">{item.anonymity} anonymity</Badge>
            {item.active && <Badge variant="secondary">CURRENT LEASE</Badge>}
          </div>
          <h3>{item.label}</h3>
          <div className="housing-location-travel">
            <span>{travel > 0 ? `${travel} world min travel` : "Same district · no travel"}</span>
            {item.active && travel > 0 && <span>Same duration to return</span>}
          </div>
          <div className="housing-location-capabilities" aria-label="Lease capability gain">
            {item.capabilities.length ? item.capabilities.map(stat => (
              <span key={stat.metric} className="housing-location-stat" aria-label={`${stat.metric} +${stat.value}`}>
                {stat.metric} <strong>+{stat.value}</strong>
              </span>
            )) : <span className="housing-location-stat">No capability lift</span>}
          </div>
        </CardContent>
        <CardFooter className="housing-location-footer">
          <div className="housing-location-rent">
            <strong>{item.dailyCostCr.toLocaleString("en-US")} cr</strong>
            <span>/ world day</span>
          </div>
          <Button
            type="button"
            variant={item.active ? "ghost" : "default"}
            aria-label={`${item.active ? "Move out of" : "Move into"} ${item.label}`}
            title={item.active
              ? (travel > 0 ? `Return to baseline: ${travel} world minutes` : "Return to free baseline")
              : (travel > 0 ? `Sign lease and travel ${travel} world minutes` : "Sign lease in the same district")}
            onClick={item.active ? onMoveOut : onMoveIn}
          >
            {item.active ? "MOVE OUT" : travel > 0 ? "TRAVEL & SIGN" : "MOVE IN"}
          </Button>
        </CardFooter>
      </Card>
    </li>
  );
}
