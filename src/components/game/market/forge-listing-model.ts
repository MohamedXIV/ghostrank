/** Software Forge presentation reads projected IR and runtime state only. */
export interface ProjectedForgeSpec {
 readonly label:string;readonly steps:string;readonly tests:string;readonly estimatedMinutes:number;
 readonly vram:number;readonly storage:number;readonly replacesLabel:string;
}
export interface ProjectedForgeBuild {
 readonly specLabel:string;readonly modelLabel:string;readonly startedWorldMinute:number;
 readonly dueWorldMinute:number;readonly paused:boolean;readonly vram:number;readonly storage:number;
}
export interface ProjectedForgeOwned {
 readonly label:string;readonly outcome:string;readonly builtWithLabel:string;
 readonly acquiredWorldMinute:number;readonly tests:string;
}
export interface ForgeSpecDisplay {
 readonly id:string;readonly label:string;readonly imageSrc:string;readonly steps:readonly string[];
 readonly plannedTests:readonly string[];readonly estimatedMinutes:number;readonly vram:number;
 readonly storage:number;readonly replacesLabel:string;
}
export interface ForgeQueueDisplay extends ProjectedForgeBuild{readonly id:string;}
export interface ForgeOwnedDisplay {
 readonly id:string;readonly label:string;readonly outcome:string;readonly builtWithLabel:string;
 readonly acquiredWorldMinute:number;readonly tests:readonly string[];
}
const SPEC_ART=new Set(["workflow-net-monitor","workflow-auto-recon","workflow-analysis-pipeline","workflow-storage-index","workflow-batch-scheduler"]);
export function forgeSpecArt(id:string):string {
 return "/visual-reboot/forge/"+(SPEC_ART.has(id)?id:"generic")+".svg";
}
function lines(text:string):string[]{
 return text.split("\n").map(x=>x.trim()).filter(Boolean);
}
export function presentForgeSpec(id:string,row:Readonly<ProjectedForgeSpec>):ForgeSpecDisplay{
 return {id,label:row.label,imageSrc:forgeSpecArt(id),steps:lines(row.steps),plannedTests:lines(row.tests),
   estimatedMinutes:row.estimatedMinutes,vram:row.vram,storage:row.storage,replacesLabel:row.replacesLabel};
}
export function presentForgeBuild(id:string,row:Readonly<ProjectedForgeBuild>):ForgeQueueDisplay{
 return {id,...row};
}
export function presentForgeOwned(id:string,row:Readonly<ProjectedForgeOwned>):ForgeOwnedDisplay{
 return {id,label:row.label,outcome:row.outcome,builtWithLabel:row.builtWithLabel,
   acquiredWorldMinute:row.acquiredWorldMinute,tests:lines(row.tests)};
}
