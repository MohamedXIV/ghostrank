"use client";
import { Badge } from "@/components/ui/badge";
import { Card,CardContent } from "@/components/ui/card";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { ValueFlowNode,ValueLedgerLine } from "./value-network-model";

function SignedAmount({value}:{readonly value:number}){
 return <>{value>=0?"+":"−"}{Math.abs(value).toLocaleString("en-US")}</>;
}

/** Financial edges represent actual named counterparties, never hypothetical social ties. */
export function ValueNetwork({nodes,inflow,outflow,counterparties}:{
 readonly nodes:readonly ValueFlowNode[];
 readonly inflow:number;readonly outflow:number;readonly counterparties:number;
}){
 return <section aria-label="Value graph" className="value-network-panel">
  <div className="value-network-heading">
   <div><span className="panel-label">TRANSACTION NETWORK / SETTLED VALUE</span>
    <h2>Value network</h2>
    <p>Money connects you to actual counterparties. These edges summarize your known ledger, not friendship or trust.</p>
   </div>
   <span className="value-network-count">{counterparties} counterparties</span>
  </div>
  <Card className="value-network-hub">
   <CardContent className="value-network-hub-content">
    <div className="value-network-hub-title"><Badge variant="outline">PLAYER / LEDGER</Badge><strong>YOUR WALLET</strong></div>
    <div className="value-network-sums">
     <div><span>IN TO YOU</span><strong className="value-income">+{inflow.toLocaleString("en-US")} cr</strong></div>
     <div><span>OUT FROM YOU</span><strong className="value-spent">−{outflow.toLocaleString("en-US")} cr</strong></div>
     <div><span>LIFETIME NET</span><strong><SignedAmount value={inflow-outflow}/> cr</strong></div>
    </div>
   </CardContent>
  </Card>
  {nodes.length===0 ? <p className="value-network-empty">No settled value yet. Transactions will appear here when credits actually change hands.</p>
  : <ul className="value-network-list" aria-label="Known value counterparties">
   {nodes.map(node=><li key={node.id} className="value-network-edge" data-counterparty={node.id}>
    <Card className="value-network-node">
     <CardContent className="value-network-node-content">
      <div className="value-network-node-head">
       <div><Badge variant="outline">{node.category==="institution"?"INSTITUTION":"PEER"}</Badge><h3>{node.id}</h3></div>
       <strong className="value-network-net"><SignedAmount value={node.net}/> cr</strong>
      </div>
      <div className="value-network-flows" aria-label={`Real cash flow with ${node.id}`}>
       <div className="value-flow-row">
        <span>← IN TO YOU</span><div className="value-flow-track"><span className="value-flow-in" style={{width:node.receivedShare+"%"}} /></div>
        <strong>+{node.received.toLocaleString("en-US")}</strong>
       </div>
       <div className="value-flow-row">
        <span>→ OUT TO THEM</span><div className="value-flow-track"><span className="value-flow-out" style={{width:node.paidShare+"%"}} /></div>
        <strong>−{node.paid.toLocaleString("en-US")}</strong>
       </div>
      </div>
      <p className="value-network-causes">{node.causes.length?node.causes.join(" · "):"Unclassified in visible ledger"}</p>
      <p className="value-network-time">{node.interactions} transfers · first {formatWorldTime(node.firstWorldMinute)} · last {formatWorldTime(node.lastWorldMinute)}</p>
     </CardContent>
    </Card>
   </li>)}
  </ul>}
  <p className="market-hint">Line lengths are relative to the larger direction for each counterparty, not a ranking across people. IN means credits they gave you; OUT means credits you paid them. Named peers and institutional roles stay distinct.</p>
 </section>;
}

export function ValueLedger({lines}:{readonly lines:readonly ValueLedgerLine[]}){
 return <section aria-label="Ledger" className="value-ledger-panel">
  <div className="value-ledger-heading"><span className="panel-label">VALUE LEDGER / EVENT PROVENANCE</span><h2>Transaction log</h2></div>
  {lines.length===0 ? <p className="value-network-empty">No recorded transfers yet.</p>
  : <ol className="value-ledger-list" aria-label="Recorded financial transfers">
    {lines.map(line=><li key={line.id} className="value-ledger-record">
     <Card className="value-ledger-card"><CardContent className="value-ledger-card-content">
      <div className="value-ledger-main">
       <Badge variant="outline">{line.credit?"RECEIVED":"PAID"}</Badge>
       <strong className={line.credit?"value-income":"value-spent"}>{line.credit?"+":"−"}{line.amount.toLocaleString("en-US")} cr</strong>
       <span className="value-ledger-peer">{line.counterparty}</span>
      </div>
      <div className="value-ledger-details"><span>{line.causeKind}</span><span>{formatWorldTime(line.worldMinute)}</span><span>Balance after: {line.balanceAfter.toLocaleString("en-US")} cr</span></div>
     </CardContent></Card>
    </li>)}
   </ol>}
 </section>;
}
