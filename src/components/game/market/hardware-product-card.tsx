"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { HardwareItemPresentation } from "@/components/game/market/hardware-item-model";

interface HardwareProductCardProps {
  item: HardwareItemPresentation;
  onBuy: () => void;
}

/** Deliberately a view: world authority and purchase rules remain in CommandBus. */
export function HardwareProductCard({ item, onBuy }: HardwareProductCardProps) {
  return (
    <li className="hardware-product" data-catalog-id={item.id}>
      <Card className="hardware-product-card">
        <div className="hardware-product-art">
          <Image
            unoptimized
            src={item.imageSrc}
            width={240}
            height={180}
            alt=""
            aria-hidden="true"
          />
        </div>
        <CardContent className="hardware-product-copy">
          <div className="hardware-product-kicker">
            <Badge variant="outline">{item.category}</Badge>
            {item.ownedCount > 0 && (
              <Badge variant="secondary">OWNED ×{item.ownedCount}</Badge>
            )}
          </div>
          <h3 className="hardware-product-name">{item.label}</h3>
          <div className="hardware-product-stats" aria-label="Capability gains">
            {item.stats.length ? item.stats.map((stat) => (
              <span key={stat.metric} className="hardware-stat" aria-label={`${stat.metric} +${stat.value}`}>
                <span>{stat.metric}</span>
                <strong>+{stat.value}</strong>
              </span>
            )) : <span className="hardware-stat">Baseline platform</span>}
          </div>
        </CardContent>
        <CardFooter className="hardware-product-footer">
          <strong className="hardware-product-price">
            {item.priceCr.toLocaleString("en-US")} cr
          </strong>
          <div className="hardware-buy-area">
            {!item.affordable && (
              <span className="hardware-buy-note">Not enough credits</span>
            )}
            <Button
              type="button"
              disabled={!item.affordable}
              title={item.affordable ? "Acquire this hardware" : "Not enough credits"}
              aria-label={`Buy ${item.label}`}
              onClick={onBuy}
            >
              BUY
            </Button>
          </div>
        </CardFooter>
      </Card>
    </li>
  );
}
