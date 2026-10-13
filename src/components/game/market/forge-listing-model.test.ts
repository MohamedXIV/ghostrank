import {describe,it,expect} from "vitest";
import {WORKFLOW_SPEC_CATALOG} from "@/content/workflow-spec-catalog";
import {presentForgeSpec,presentForgeBuild,presentForgeOwned} from "./forge-listing-model";
function project(id:string) {
 const spec=WORKFLOW_SPEC_CATALOG.find(s=>s.id===id);
 if(!spec)throw Error("Missing workflow spec "+id);
 return {label:spec.label,steps:spec.steps.join("\n"),tests:spec.tests.join("\n"),
  estimatedMinutes:spec.complexityMinutes,vram:spec.footprint.vram,storage:spec.footprint.storage,
  replacesLabel:"Commercial Monitoring Suite"};
}
describe("Forge UI uses projected safe workflow IR only",()=>{
 it("keeps exact pipeline, testing plan, load and world minutes",()=>{
  const row=project("workflow-net-monitor");
  const p=presentForgeSpec("workflow-net-monitor",row);
  expect(p.steps).toHaveLength(4);
  expect(p.plannedTests).toHaveLength(3);
  expect(p.estimatedMinutes).toBe(120);expect(p.vram).toBe(1);expect(p.storage).toBe(1);
  expect(p.imageSrc).toBe("/visual-reboot/forge/workflow-net-monitor.svg");
  expect(p).not.toHaveProperty("passing");expect(p).not.toHaveProperty("successChance");
 });
 it("reflects projected paused state without imaginary percentage progress",()=>{
  const p=presentForgeBuild("build:1",{specLabel:"Homegrown Monitoring Loop",modelLabel:"Compact Class API",startedWorldMinute:12,dueWorldMinute:122,paused:true,vram:1,storage:1});
  expect(p.paused).toBe(true);expect(p.dueWorldMinute).toBe(122);
  expect(p).not.toHaveProperty("progress");
 });
 it("preserves delivered workflow outcome and never interprets tests as passing",()=>{
  const p=presentForgeOwned("workflow:1",{label:"Self-Built Analysis Pipeline",outcome:"defective",builtWithLabel:"Compact Class API",acquiredWorldMinute:300,tests:"plan preserves dependencies\ntrace coverage"});
  expect(p.tests).toEqual(["plan preserves dependencies","trace coverage"]);
  expect(p.outcome).toBe("defective");
  expect(p).not.toHaveProperty("testsPassed");
 });
 it("uses a neutral fallback for unknown specs",()=>{
  expect(presentForgeSpec("workflow-future",project("workflow-net-monitor")).imageSrc).toBe("/visual-reboot/forge/generic.svg");
 });
});
