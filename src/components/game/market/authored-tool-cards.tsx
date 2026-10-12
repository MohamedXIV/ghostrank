"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardFooter } from "@/components/ui/card";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { ToolEffectDisplay,ToolListingDisplay,OwnedToolDisplay } from "./authored-tool-model";

function ToolEffect({ item }:{readonly item:ToolEffectDisplay}){
 return <div className="authored-tool-effects" aria-label="Projected tool effects">
  {item.discountFactor!==null&&<span className="authored-tool-stat">ACTION TIME <strong>×{item.discountFactor}</strong></span>}
  {item.stats.map(stat=><span key={stat.metric} className="authored-tool-stat" aria-label={`${stat.metric} +${stat.value}`}>
    {stat.metric} <strong>+{stat.value}</strong>
  </span>)}
  {item.discountFactor===null&&item.stats.length===0&&<span className="authored-tool-stat">No projected lift</span>}
 </div>;
}
/** One-time peer-authored catalog copy. BUY delegates to existing CommandBus. */
export function AuthoredToolListingCard({item,onBuy}:{readonly item:ToolListingDisplay;readonly onBuy:()=>void}){
 return <li className="authored-tool-listing" data-tool-id={item.id}>
  <Card className="authored-tool-card">
   <div className="authored-tool-art">
    <Image unoptimized src={item.art} width={400} height={240} alt="" aria-hidden="true"/>
    <span aria-hidden="true">SIGNED SOFTWARE / EXCHANGE</span>
   </div>
   <CardContent className="authored-tool-content">
    <div className="authored-tool-labels">
     <Badge variant="outline">PEER AUTHORED</Badge>
     {item.ownedCount>0&&<Badge variant="secondary">OWNED ×{item.ownedCount}</Badge>}
    </div>
    <h3>{item.label}</h3>
    <p className="authored-tool-author">by <strong>{item.author}</strong></p>
    <ToolEffect item={item}/>
   </CardContent>
   <CardFooter className="authored-tool-footer">
    <div className="authored-tool-price"><strong>{item.costCr.toLocaleString("en-US")} cr</strong><span>one-time · no upkeep</span></div>
    <div className="authored-tool-buy">
     {!item.affordable&&<span>Not enough credits</span>}
     <Button type="button" aria-label={`Buy ${item.label}`} disabled={!item.affordable}
      title={item.affordable?"Buy this peer-authored copy outright":"Not enough credits"}
      onClick={onBuy}>BUY</Button>
    </div>
   </CardFooter>
  </Card>
 </li>;
}
/** Owned inventory uses the historic actually-paid cost and projected resale. */
export function OwnedAuthoredToolCard({item,onSell}:{readonly item:OwnedToolDisplay;readonly onSell:()=>void}){
 return <li className="authored-tool-listing" data-owned-tool-id={item.id}>
  <Card className="authored-tool-card authored-tool-owned">
   <div className="authored-tool-art">
    <Image unoptimized src={item.art} width={400} height={240} alt="" aria-hidden="true"/>
    <span aria-hidden="true">SIGNED SOFTWARE / YOUR LIBRARY</span>
   </div>
   <CardContent className="authored-tool-content">
    <div className="authored-tool-labels">
     <Badge variant="secondary">OWNED COPY</Badge>
     <Badge variant="outline">{item.catalogId}</Badge>
    </div>
    <h3>{item.label}</h3>
    <p className="authored-tool-author">by <strong>{item.author}</strong></p>
    <ToolEffect item={item}/>
    <p className="authored-tool-acquired">Acquired {formatWorldTime(item.acquiredWorldMinute)}</p>
   </CardContent>
   <CardFooter className="authored-tool-footer">
    <div className="authored-tool-price">
     <strong>{item.resaleCr.toLocaleString("en-US")} cr</strong>
     <span>resale · paid {item.paidCostCr.toLocaleString("en-US")} cr</span>
    </div>
    <Button type="button" variant="ghost" aria-label={`Sell ${item.label}`}
     title="Resell this owned copy to the fence" onClick={onSell}>SELL</Button>
   </CardFooter>
  </Card>
 </li>;
}
