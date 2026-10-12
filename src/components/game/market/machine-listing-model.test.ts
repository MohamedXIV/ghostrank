import { describe, expect, it } from "vitest";
import { MACHINE_CATALOG } from "@/content/machine-catalog";
import { presentMachineListing, presentOwnedMachine } from "@/components/game/market/machine-listing-model";
const row = (id: string) => {
 const item=MACHINE_CATALOG.find(x=>x.id===id);
 if(!item)throw Error("Missing catalog item");
 return {label:item.label,cost:item.cost,ownedCount:0,exotic:item.exotic??false,...item.capability};
};
describe("projection-backed illustrated machine items",()=>{
 it("uses the real burner price, specs and affordability rather than fake stock",()=>{
  const i=presentMachineListing("box-burner",row("box-burner"),599);
  expect(i.priceCr).toBe(600);expect(i.affordable).toBe(false);
  expect(i.stats).toEqual([{metric:"CPU",value:1},{metric:"MEM",value:1},{metric:"STO",value:1},{metric:"NET",value:1}]);
  expect(i.art).toBe("/visual-reboot/machines/box-burner.svg");
  expect(presentMachineListing("box-burner",row("box-burner"),600).affordable).toBe(true);
 });
 it("takes rarity only from currently exposed stock, never the catalog id",()=>{
  expect(presentMachineListing("box-annealing-rack",row("box-annealing-rack"),9999).exotic).toBe(true);
  expect(presentMachineListing("box-annealing-rack",{...row("box-annealing-rack"),exotic:false},9999).exotic).toBe(false);
 });
 it("uses the owned machine's actually-paid price, projected resale and user label",()=>{
  const o=presentOwnedMachine("machine:1",{label:"Nightbox",catalogId:"box-burner",paidCost:555,resaleValue:277,acquiredWorldMinute:42,compute:1,memory:1,vram:0,storage:1,network:1});
  expect(o.label).toBe("Nightbox");expect(o.paidCostCr).toBe(555);expect(o.resaleCr).toBe(277);
  expect(o.acquiredWorldMinute).toBe(42);
 });
 it("falls back for unknown catalog art and does not imply unauthorized owner knowledge",()=>{
  const i=presentMachineListing("box-unlisted",{...row("box-burner"),exotic:false},0);
  expect(i.art).toBe("/visual-reboot/machines/generic.svg");
  expect(i).not.toHaveProperty("vendor");expect(i).not.toHaveProperty("quality");
 });
});
