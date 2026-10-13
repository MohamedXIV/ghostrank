import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {describe,it,expect} from "vitest";
import { ForgeSpecCard,ForgeQueueCard,ForgeOwnedCard } from "./forge-cards";
import { presentForgeSpec,presentForgeBuild,presentForgeOwned } from "./forge-listing-model";
const spec=presentForgeSpec("workflow-net-monitor",{
 label:"Homegrown Monitoring Loop",steps:"discover(target) → enumerate hosts\npoll(host, port) → sample liveness",
 tests:"poll returns\nconnection recovered",estimatedMinutes:120,vram:1,storage:1,replacesLabel:"Commercial Monitoring Suite",
});
describe("shadcn Software Forge cards",()=>{
 it("renders true IR and disabled BUILD without assistant",()=>{
  const s=renderToStaticMarkup(createElement(ForgeSpecCard,{item:spec,assistantRunning:false,onBuild:()=>{}}));
  expect(s).toContain('data-slot="card"');expect(s).toContain('data-slot="badge"');expect(s).toContain('data-slot="button"');
  expect(s).toContain("Commercial Monitoring Suite");expect(s).toContain("120 min");
  expect(s).toContain("Planned QA coverage");expect(s).toContain("2 checks");
  expect(s).toContain('aria-label="Build Homegrown Monitoring Loop"');expect(s).toContain('disabled=""');
  expect(s).not.toContain("TEST PASS");
 });
 it("enables BUILD when model is running",()=>{
  const s=renderToStaticMarkup(createElement(ForgeSpecCard,{item:spec,assistantRunning:true,onBuild:()=>{}}));
  expect(s).not.toContain('disabled=""');
 });
 it("renders genuine queue pause and action",()=>{
  const item=presentForgeBuild("build:5",{specLabel:"Homegrown Monitoring Loop",modelLabel:"Compact Class API",paused:true,startedWorldMinute:0,dueWorldMinute:120,vram:1,storage:1});
  const s=renderToStaticMarkup(createElement(ForgeQueueCard,{item,onAbort:()=>{}}));
  expect(s).toContain("PAUSED");expect(s).toContain("Work clock stopped");expect(s).toContain('aria-label="Abort Homegrown Monitoring Loop"');
 });
 it("retains defective output and coverage labels, no fake tests passed",()=>{
  const item=presentForgeOwned("workflow:2",{label:"Homegrown Monitoring Loop",outcome:"defective",builtWithLabel:"Compact Class API",acquiredWorldMinute:310,tests:"poll returns\nconnection recovered"});
  const s=renderToStaticMarkup(createElement(ForgeOwnedCard,{item}));
  expect(s).toContain("defective");expect(s).toContain("Specified test coverage");
  expect(s).not.toContain("2 passed");
 });
});
