/** Visible TinyBase tool catalog/rack only; no hidden seller reputation or stock. */
export type ToolMetric="CPU"|"MEM"|"VRAM"|"STO"|"NET";
export interface ProjectedToolEffect {
 readonly compute:number;readonly memory:number;readonly vram:number;readonly storage:number;readonly network:number;
 readonly discountFactor:number;
}
export interface ProjectedToolListing extends ProjectedToolEffect {
 readonly label:string;readonly author:string;readonly cost:number;readonly ownedCount:number;
}
export interface ProjectedOwnedTool extends ProjectedToolEffect {
 readonly catalogId:string;readonly label:string;readonly author:string;readonly paidCost:number;
 readonly resaleValue:number;readonly acquiredWorldMinute:number;
}
export interface ToolEffectDisplay {
 readonly stats:ReadonlyArray<{metric:ToolMetric;value:number}>;
 readonly discountFactor:number|null;
}
interface BaseToolDisplay extends ToolEffectDisplay{
 readonly id:string;readonly label:string;readonly author:string;readonly art:string;
}
export interface ToolListingDisplay extends BaseToolDisplay{
 readonly costCr:number;readonly ownedCount:number;readonly affordable:boolean;
}
export interface OwnedToolDisplay extends BaseToolDisplay{
 readonly catalogId:string;readonly paidCostCr:number;readonly resaleCr:number;readonly acquiredWorldMinute:number;
}
const ART_IDS=new Set([
 "tool-paranoid-scraper","tool-ghost-loader","tool-silent-dedup",
 "tool-map-stitcher","tool-trace-comparator",
]);
export function authoredToolArt(catalogId:string):string {
 return "/visual-reboot/tools/"+(ART_IDS.has(catalogId)?catalogId:"generic")+".svg";
}
function effect(row:ProjectedToolEffect):ToolEffectDisplay {
 const stats=([
  ["CPU",row.compute],["MEM",row.memory],["VRAM",row.vram],
  ["STO",row.storage],["NET",row.network],
 ] as const).filter(([,v])=>Number.isFinite(v)&&v>0).map(([metric,value])=>({metric,value}));
 return { stats, discountFactor:Number.isFinite(row.discountFactor)&&row.discountFactor<1?row.discountFactor:null };
}
export function presentToolListing(id:string,row:Readonly<ProjectedToolListing>,credits:number):ToolListingDisplay {
 return {
  id,label:row.label,author:row.author,art:authoredToolArt(id),
  costCr:row.cost,ownedCount:row.ownedCount,affordable:credits>=row.cost,...effect(row),
 };
}
export function presentOwnedTool(id:string,row:Readonly<ProjectedOwnedTool>):OwnedToolDisplay {
 return {
  id,label:row.label,author:row.author,catalogId:row.catalogId,art:authoredToolArt(row.catalogId),
  paidCostCr:row.paidCost,resaleCr:row.resaleValue,acquiredWorldMinute:row.acquiredWorldMinute,
  ...effect(row),
 };
}
