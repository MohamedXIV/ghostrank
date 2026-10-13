/** Presentation-only financial provenance; projection is already the authoritative ledger aggregate. */
export interface ProjectedValueNode {
 readonly kind:string;readonly received:number;readonly paid:number;readonly net:number;
 readonly interactions:number;readonly firstWorldMinute:number;readonly lastWorldMinute:number;
 readonly causeKinds:string;
}
export interface ProjectedLedgerEntry {
 readonly worldMinute:number;readonly direction:string;readonly amount:number;
 readonly balanceAfter:number;readonly causeKind:string;readonly causeId:string;readonly counterparty:string;
}
export interface ValueFlowNode extends ProjectedValueNode {
 readonly id:string;readonly category:"peer"|"institution";
 readonly receivedShare:number;readonly paidShare:number;
 readonly causes:readonly string[];
}
export interface ValueLedgerLine extends ProjectedLedgerEntry {
 readonly id:string;readonly credit:boolean;
}
export function presentValueFlow(id:string,row:Readonly<ProjectedValueNode>):ValueFlowNode{
 const category=row.kind==="institution"?"institution":"peer";
 const volume=Math.max(row.received,row.paid,1);
 return {...row,id,category,
  receivedShare:Math.max(0,Math.min(100,(row.received/volume)*100)),
  paidShare:Math.max(0,Math.min(100,(row.paid/volume)*100)),
  causes:row.causeKinds.split(",").map(x=>x.trim()).filter(Boolean),
 };
}
export function presentLedgerLine(id:string,row:Readonly<ProjectedLedgerEntry>):ValueLedgerLine {
 return {...row,id,credit:row.direction==="credit"};
}
