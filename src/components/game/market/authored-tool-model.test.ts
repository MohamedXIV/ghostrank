import { describe,expect,it } from "vitest";
import { PLAYER_TOOL_CATALOG } from "@/content/player-tool-catalog";
import { presentToolListing,presentOwnedTool } from "./authored-tool-model";
function catalog(id:string){
 const item=PLAYER_TOOL_CATALOG.find(x=>x.id===id);
 if(!item) throw Error("Missing tool "+id);
 return {
  label:item.label,author:item.author,cost:item.cost,ownedCount:0,
  compute:item.effect.kind==="capability"?item.effect.capability.compute:0,
  memory:item.effect.kind==="capability"?item.effect.capability.memory:0,
  vram:item.effect.kind==="capability"?item.effect.capability.vram:0,
  storage:item.effect.kind==="capability"?item.effect.capability.storage:0,
  network:item.effect.kind==="capability"?item.effect.capability.network:0,
  discountFactor:item.effect.kind==="modifier"?item.effect.discount.factor:1,
 };
}
describe("authored tools use only public projected data",()=>{
 it("shows catalog author and real scraper cost, capability and affordability",()=>{
  const a=presentToolListing("tool-paranoid-scraper",catalog("tool-paranoid-scraper"),499);
  expect(a.author).toBe("nullbyte");
  expect(a.costCr).toBe(500);expect(a.affordable).toBe(false);
  expect(a.stats).toEqual([{metric:"MEM",value:1},{metric:"NET",value:1}]);
  expect(a.art).toBe("/visual-reboot/tools/tool-paranoid-scraper.svg");
  expect(presentToolListing("tool-paranoid-scraper",catalog("tool-paranoid-scraper"),500).affordable).toBe(true);
 });
 it("uses real time modifier instead of inventing capability",()=>{
  const a=presentToolListing("tool-silent-dedup",catalog("tool-silent-dedup"),900);
  expect(a.discountFactor).toBe(0.9);
  expect(a.stats).toEqual([]);
  expect(a.author).toBe("cipher-priest");
 });
 it("preserves paid historical cost and actual projected resale, not recalculate via listing",()=>{
  const a=presentOwnedTool("owned:5",{
   ...catalog("tool-ghost-loader"),catalogId:"tool-ghost-loader",
   paidCost:1111,resaleValue:555,acquiredWorldMinute:370,
  });
  expect(a.resaleCr).toBe(555);expect(a.paidCostCr).toBe(1111);
  expect(a.acquiredWorldMinute).toBe(370);expect(a.author).toBe("hexwidow");
 });
 it("fallback art but no fictional rarity/safety/vendor",()=>{
  const a=presentToolListing("tool-new",{...catalog("tool-ghost-loader"),label:"Experimental"},0);
  expect(a.art).toBe("/visual-reboot/tools/generic.svg");
  expect(a).not.toHaveProperty("rarity");expect(a).not.toHaveProperty("sellerRating");expect(a).not.toHaveProperty("availability");
 });
});
