import { describe,expect,it } from "vitest";
import { presentValueFlow,presentLedgerLine } from "./value-network-model";
describe("projected financial topology",()=>{
 it("retains actual direction, provenance and signed net without invented trust links",()=>{
  const row=presentValueFlow("lattice",{
   kind:"peer",received:80,paid:200,net:-120,interactions:3,firstWorldMinute:40,
   lastWorldMinute:320,causeKinds:"model,tool",
  });
  expect(row.category).toBe("peer");expect(row.receivedShare).toBe(40);
  expect(row.paidShare).toBe(100);expect(row.causes).toEqual(["model","tool"]);
  expect(row.net).toBe(-120);expect(row).not.toHaveProperty("trust");
  expect(row).not.toHaveProperty("rank");expect(row).not.toHaveProperty("relationship");
 });
 it("distinguishes institutional roles and handles zero-volume gracefully",()=>{
  const row=presentValueFlow("market",{kind:"institution",received:0,paid:0,net:0,interactions:0,
   firstWorldMinute:0,lastWorldMinute:0,causeKinds:""});
  expect(row.category).toBe("institution");expect(row.receivedShare).toBe(0);
  expect(row.paidShare).toBe(0);expect(row.causes).toEqual([]);
 });
 it("preserves credited/debited ledger amounts and actual balances",()=>{
  const debit=presentLedgerLine("entry:1",{worldMinute:41,direction:"debit",amount:30,
   balanceAfter:170,causeKind:"housing",causeId:"housing-cowork-loft",counterparty:"landlord"});
  expect(debit.credit).toBe(false);expect(debit.balanceAfter).toBe(170);
  const credit=presentLedgerLine("entry:2",{...debit,direction:"credit",amount:12});
  expect(credit.credit).toBe(true);expect(credit.amount).toBe(12);
 });
});
