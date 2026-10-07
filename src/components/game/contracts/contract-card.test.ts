import { describe, expect, it } from "vitest";
import { contractObjectiveMeta, deriveDeadlineUrgency } from "@/components/ui/semantic-state";

describe("Contract visual presentation contracts", () => {
  it("maps contract objectives to distinctive visual families", () => {
    expect(contractObjectiveMeta("recon-report").familyLabel).toBe("RECONNAISSANCE");
    expect(contractObjectiveMeta("infrastructure-map").familyLabel).toBe("TOPOLOGY MAP");
    expect(contractObjectiveMeta("quiet-recon").familyLabel).toBe("SILENT PROBE");
    expect(contractObjectiveMeta("intrusion").familyLabel).toBe("INTRUSION");
  });

  it("calculates urgency bands correctly for contracts", () => {
    // 2 hours remaining -> urgent
    const urgent = deriveDeadlineUrgency({
      currentMinute: 1000,
      deadlineMinute: 1120,
      status: "accepted",
    });
    expect(urgent.urgency).toBe("urgent");
    expect(urgent.minutesRemaining).toBe(120);

    // 12 hours remaining -> closing
    const closing = deriveDeadlineUrgency({
      currentMinute: 1000,
      deadlineMinute: 1720,
      status: "accepted",
    });
    expect(closing.urgency).toBe("closing");
    expect(closing.minutesRemaining).toBe(720);

    // 48 hours remaining -> calm
    const calm = deriveDeadlineUrgency({
      currentMinute: 1000,
      deadlineMinute: 3880,
      status: "accepted",
    });
    expect(calm.urgency).toBe("calm");
  });
});
