import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import { AuthoredToolListingCard,OwnedAuthoredToolCard } from "./authored-tool-cards";
import { presentToolListing,presentOwnedTool } from "./authored-tool-model";
const row={
 label:"Paranoid Scraper",author:"nullbyte",cost:500,ownedCount:2,
 compute:0,memory:1,vram:0,storage:0,network:1,discountFactor:1,
};
describe("shadcn authored tool presentation",()=>{
 it("shows signed author, projected effect, one-time price and disabled BUY",()=>{
  const html=renderToStaticMarkup(createElement(AuthoredToolListingCard,{item:presentToolListing("tool-paranoid-scraper",row,5),onBuy:()=>{}}));
  expect(html).toContain('data-slot="card"');
  expect(html).toContain('data-slot="badge"');
  expect(html).toContain('data-slot="button"');
  expect(html).toContain("nullbyte");expect(html).toContain("500 cr");
  expect(html).toContain("OWNED ×2");
  expect(html).toContain('aria-label="Buy Paranoid Scraper"');
  expect(html).toContain('disabled=""');expect(html).toContain("NET");
 });
 it("retains owned tool provenance, historical paid value and actual sell action",()=>{
  const item=presentOwnedTool("owned:7",{
   ...row,catalogId:"tool-paranoid-scraper",paidCost:450,resaleValue:225,acquiredWorldMinute:91,
  });
  const html=renderToStaticMarkup(createElement(OwnedAuthoredToolCard,{item,onSell:()=>{}}));
  expect(html).toContain("OWNED COPY");expect(html).toContain("nullbyte");
  expect(html).toContain("225 cr");expect(html).toContain("paid 450 cr");
  expect(html).toContain('aria-label="Sell Paranoid Scraper"');
  expect(html).not.toContain("RARITY");expect(html).not.toContain("GUARANTEED");
 });
});
