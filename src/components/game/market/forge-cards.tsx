"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardFooter } from "@/components/ui/card";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { ForgeSpecDisplay,ForgeQueueDisplay,ForgeOwnedDisplay } from "./forge-listing-model";

/** A real projected safe IR, never executable host code or fabricated build progress. */
export function ForgeSpecCard({item,assistantRunning,onBuild}:{
 readonly item:ForgeSpecDisplay;readonly assistantRunning:boolean;readonly onBuild:()=>void;
}){
 return <li className="forge-spec-listing" data-forge-id={item.id}>
  <Card className="forge-card">
   <div className="forge-art">
    <Image unoptimized src={item.imageSrc} width={400} height={240} alt="" aria-hidden="true"/>
    <span aria-hidden="true">SAFE IR / SPECIFICATION</span>
   </div>
   <CardContent className="forge-card-content">
    <div className="forge-badges"><Badge variant="outline">BUILD SPEC / IR</Badge><Badge variant="outline">NO CREDIT FEE</Badge></div>
    <h3>{item.label}</h3>
    <div className="forge-replaces"><span>Designed alternative to</span><strong>{item.replacesLabel}</strong></div>
    <div className="forge-sequence">
     <h4>Planned pipeline</h4>
     <ol>{item.steps.map((step,i)=><li key={i}><span className="forge-sequence-index">{String(i+1).padStart(2,"0")}</span><code>{step}</code></li>)}</ol>
    </div>
    <div className="forge-footprint" aria-label="Projected build footprint">
     <span>VRAM <strong>{item.vram}</strong></span><span>STORAGE <strong>{item.storage}</strong></span>
    </div>
    <div className="forge-qa"><span>Planned QA coverage</span><strong>{item.plannedTests.length} checks</strong></div>
   </CardContent>
   <CardFooter className="forge-card-footer">
    <div className="forge-cost"><strong>~{item.estimatedMinutes.toLocaleString("en-US")} min</strong><span>estimated world time · not credits</span></div>
    <div className="forge-action">
     {!assistantRunning&&<span>Run an assistant first</span>}
     <Button type="button" aria-label={`Build ${item.label}`} disabled={!assistantRunning}
       title={assistantRunning?"Build this workflow using the running assistant":"Run an AI model to commission a build"}
       onClick={onBuild}>BUILD</Button>
    </div>
   </CardFooter>
  </Card>
 </li>;
}

export function ForgeQueueCard({item,onAbort}:{readonly item:ForgeQueueDisplay;readonly onAbort:()=>void}){
 return <li className="forge-queue-listing" data-build-id={item.id}>
  <Card className="forge-queue-card">
   <CardContent className="forge-queue-content">
    <div className="forge-badges"><Badge variant={item.paused?"outline":"secondary"}>{item.paused?"PAUSED":"IN QUEUE"}</Badge></div>
    <h3>{item.specLabel}</h3>
    <p>Commissioned with <strong>{item.modelLabel}</strong></p>
    <div className="forge-footprint"><span>VRAM <strong>{item.vram}</strong></span><span>STORAGE <strong>{item.storage}</strong></span></div>
    <p>Started {formatWorldTime(item.startedWorldMinute)}</p>
    <p>{item.paused?"Work clock stopped":`Scheduled due ${formatWorldTime(item.dueWorldMinute)}`}</p>
   </CardContent>
   <CardFooter className="forge-queue-footer">
    <Button type="button" variant="ghost" aria-label={`Abort ${item.specLabel}`}
      title="Abort this build and release its queue occupancy" onClick={onAbort}>ABORT</Button>
   </CardFooter>
  </Card>
 </li>;
}

export function ForgeOwnedCard({item}:{readonly item:ForgeOwnedDisplay}){
 return <li className="forge-owned-listing" data-workflow-id={item.id}>
  <Card className="forge-queue-card forge-owned-card">
   <CardContent className="forge-queue-content">
    <div className="forge-badges">
     <Badge variant="secondary">SELF-AUTHORED</Badge>
     <Badge variant="outline">{item.outcome}</Badge>
    </div>
    <h3>{item.label}</h3>
    <p>Built with {item.builtWithLabel} · delivered {formatWorldTime(item.acquiredWorldMinute)}</p>
    <div className="forge-qa"><span>Specified test coverage</span><strong>{item.tests.length} checks</strong></div>
    <ul className="forge-test-list">{item.tests.map((test,i)=><li key={i}>{test}</li>)}</ul>
   </CardContent>
  </Card>
 </li>;
}
