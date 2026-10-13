import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import { ValueNetwork,ValueLedger } from "./value-network-panel";
import { presentValueFlow,presentLedgerLine } from "./value-network-model";
describe("shadcn financial network and transaction log",()=>{
 it("renders known peer edges and accurate in/out values",()=>{
  const node=presentValueFlow("nullbyte",{kind:"peer",received:10,paid:500,net:-490,
   interactions:2,firstWorldMinute:10,lastWorldMinute:21,causeKinds:"tool"});
  const html=renderToStaticMarkup(createElement(ValueNetwork,{nodes:[node],inflow:10,outflow:500,counterparties:1}));
  expect(html).toContain('data-slot="card"');expect(html).toContain('data-slot="badge"');
  expect(html).toContain('data-counterparty="nullbyte"');expect(html).toContain("OUT TO THEM");
  expect(html).toContain("500");expect(html).toContain("IN TO YOU");
  expect(html).toContain("width:100%");expect(html).not.toContain("trust score");
 });
 it("empty projection does not invent parties or transactions",()=>{
  const html=renderToStaticMarkup(createElement(ValueNetwork,{nodes:[],inflow:0,outflow:0,counterparties:0}));
  expect(html).toContain("No settled value yet");
  expect(html).not.toContain('data-counterparty=');
 });
 it("uses actual debit metadata and balance rather than a fabricated running total",()=>{
  const line=presentLedgerLine("tx:4",{worldMinute:99,direction:"debit",amount:50,balanceAfter:450,
   causeKind:"tool",causeId:"tool-map-stitcher",counterparty:"vesper"});
  const html=renderToStaticMarkup(createElement(ValueLedger,{lines:[line]}));
  expect(html).toContain("PAID");expect(html).toContain("vesper");
  expect(html).toContain("50 cr");expect(html).toContain("450 cr");
  expect(html).not.toContain("UNKNOWN");
 });
});
