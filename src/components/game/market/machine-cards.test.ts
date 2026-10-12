import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MachineListingCard, OwnedMachineCard } from "@/components/game/market/machine-cards";
import { presentMachineListing, presentOwnedMachine } from "@/components/game/market/machine-listing-model";
const row={label:"Burner Laptop",cost:600,ownedCount:1,exotic:false,compute:1,memory:1,vram:0,storage:1,network:1};
describe("Machine Market shadcn cards",()=>{
 it("shows projected one-time cost, owned copies, stats and disabled BUY",()=>{
  const html=renderToStaticMarkup(createElement(MachineListingCard,{
   item:presentMachineListing("box-burner",row,50),onBuy:()=>{}
  }));
  expect(html).toContain('data-slot="card"');
  expect(html).toContain('data-slot="badge"');
  expect(html).toContain('data-slot="button"');
  expect(html).toContain("OWNED ×1");expect(html).toContain("600 cr");expect(html).toContain("CPU");
  expect(html).toContain("Not enough credits");expect(html).toContain('disabled=""');
  expect(html).toContain('aria-label="Buy Burner Laptop"');
 });
 it("renders actual rack resale and user rename control, never fabricated health",()=>{
  const item=presentOwnedMachine("machine:2",{...row,catalogId:"box-burner",label:"Nightbox",paidCost:555,resaleValue:277,acquiredWorldMinute:42});
  const html=renderToStaticMarkup(createElement(OwnedMachineCard,{item,renameControl:createElement("span",{}, "Rename control"),onSell:()=>{}}));
  expect(html).toContain("IN RACK");expect(html).toContain("Nightbox");expect(html).toContain("277 cr");
  expect(html).toContain("paid 555 cr");expect(html).toContain("Rename control");expect(html).toContain('aria-label="Sell Nightbox"');
  expect(html).not.toContain("condition");expect(html).not.toContain("rarity");
 });
});
