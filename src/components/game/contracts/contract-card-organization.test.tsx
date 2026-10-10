import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ContractCard } from "@/components/game/contracts/contract-card";

/**
 * A contract shows its issuer's public organization when there is one (D066),
 * and no organization line otherwise, so an independent offer reads as before.
 */
function render(issuerOrganization?: string) {
  return renderToStaticMarkup(
    React.createElement(ContractCard, {
      contract: {
        id: "contract:1",
        issuerHandle: "Night_Wren",
        ...(issuerOrganization === undefined ? {} : { issuerOrganization }),
        targetId: "gen-1",
        targetHandle: "Halo Wick",
        objective: "recon-report",
        status: "offered",
        expiresWorldMinute: 1440,
        requiredServices: 1,
        currentKnownMachines: 0,
        currentKnownServices: 0,
      },
      currentWorldMinute: 0,
      onAction: () => undefined,
    }),
  );
}

describe("contract card issuer line (D066)", () => {
  it("names the issuer's organization when it has one", () => {
    expect(render("Ferrous Syndicate")).toContain("Ferrous Syndicate");
  });

  it("shows no organization for an independent issuer", () => {
    const html = render();
    expect(html).toContain("from Night_Wren");
    expect(html).not.toContain("//");
  });
});
