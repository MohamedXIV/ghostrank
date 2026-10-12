import { describe, expect, it } from "vitest";
import { MODEL_CATALOG } from "@/content/model-catalog";
import { presentModelListing } from "@/components/game/market/model-listing-model";

function projection(id: string, owned=false, running=false) {
  const item=MODEL_CATALOG.find(m=>m.id===id);
  if (!item) throw Error("No model: "+id);
  const factor=item.effect.kind==="modifier" ? item.effect.discount.factor : 1;
  return {
    label:item.label, source:item.source, dailyCost:item.dailyCost, cost:item.cost,
    factor, deliveredFactor:factor, vram:item.footprint.vram, storage:item.footprint.storage,
    author:item.author??"", owned, running,
  };
}
const rig = {vram:1,storage:1};

describe("AI model listings are source-projected, not fabricated",()=>{
  it("distinguishes zero-upfront cloud rent from local purchase and allows cloud at zero credits",()=>{
    const cloud=presentModelListing("model-cloud-compact",projection("model-cloud-compact"),0,rig);
    expect(cloud.source).toBe("cloud"); expect(cloud.action).toBe("run");
    expect(cloud.dailyCostCr).toBe(40); expect(cloud.costCr).toBe(0);
    expect(cloud.footprint).toEqual({vram:0,storage:0});
    const local=presentModelListing("model-local-workhorse",projection("model-local-workhorse"),0,rig);
    expect(local.source).toBe("local"); expect(local.action).toBe("buy");
    expect(local.canBuy).toBe(false); expect(local.costCr).toBe(900);
    expect(local.dailyCostCr).toBe(0); expect(local.footprint).toEqual({vram:2,storage:1});
  });
  it("uses the current projected delivered shortcut under rig contention",()=>{
    const p={...projection("model-local-tuned",true),deliveredFactor:0.94};
    const m=presentModelListing("model-local-tuned",p,0,rig);
    expect(m.factor).toBe(0.8); expect(m.deliveredFactor).toBe(0.94);
    expect(m.starved).toBe(true); expect(m.action).toBe("run");
    expect(presentModelListing("model-local-tuned",{...p,running:true},0,rig).action).toBe("stop");
  });
  it("preserves authored peer provenance, but not unprojected model properties",()=>{
    const p=presentModelListing("model-local-salvage",projection("model-local-salvage"),600,rig);
    expect(p.author).toBe("moebius"); expect(p.canBuy).toBe(true);
    expect(p).not.toHaveProperty("reasoning");
    expect(p).not.toHaveProperty("reliability");
    expect(p).not.toHaveProperty("risk");
  });
  it("unknown projected source disables ungrounded actions and unknown catalog art uses fallback",()=>{
    const p=presentModelListing("future-model",{...projection("model-cloud-compact"),source:"unrecognized"},0,rig);
    expect(p.source).toBe("unknown"); expect(p.action).toBe("unavailable");
    expect(p.art).toBe("/visual-reboot/models/generic.svg");
  });
});
