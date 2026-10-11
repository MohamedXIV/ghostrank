import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

describe("source-owned shadcn foundations", () => {
  it("keeps legacy GUI button types/variants and forward refs compatible", () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: "danger", size: "sm" }, "DISENGAGE"));
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("ui-button-danger");
    expect(html).toContain("DISENGAGE");
  });

  it("provides shadcn-style composable slots with accessibility-safe markup", () => {
    const html = renderToStaticMarkup(
      createElement(Card, { "aria-label": "Item details" },
        createElement(CardHeader, null, createElement(CardTitle, null, "Memory")),
        createElement(CardContent, null,
          createElement(Badge, { variant: "secondary" }, "OWNED"),
          createElement(Input, { "aria-label": "Search hardware", type: "search" }),
        ),
      ),
    );
    for (const slot of ["card", "card-header", "card-title", "card-content", "badge", "input"]) {
      expect(html).toContain(`data-slot="${slot}"`);
    }
    expect(html).toContain('aria-label="Search hardware"');
    expect(html).toContain("OWNED");
  });
});
