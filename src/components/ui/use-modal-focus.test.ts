import { describe, expect, it, vi } from "vitest";

import { handleModalKeyDown } from "@/components/ui/use-modal-focus";

describe("handleModalKeyDown", () => {
  it("triggers onClose and prevents default when Escape is pressed", () => {
    const onClose = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    const event = {
      key: "Escape",
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent;

    const container = {} as HTMLElement;

    handleModalKeyDown(event, container, onClose);

    expect(onClose).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it("traps focus between first and last focusable elements on Tab and Shift+Tab", () => {
    const onClose = vi.fn();
    const btn1 = { focus: vi.fn() } as unknown as HTMLElement;
    const btn2 = { focus: vi.fn() } as unknown as HTMLElement;

    const container = {
      querySelectorAll: vi.fn().mockReturnValue([btn1, btn2]),
    } as unknown as HTMLElement;

    // Simulate global active element as btn2
    const originalDocument = (globalThis as Record<string, unknown>).document;
    (globalThis as Record<string, unknown>).document = {
      activeElement: btn2,
    };

    const tabEvent = {
      key: "Tab",
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handleModalKeyDown(tabEvent, container, onClose);

    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(btn1.focus).toHaveBeenCalled();

    // Simulate global active element as btn1
    (globalThis as Record<string, unknown>).document = {
      activeElement: btn1,
    };

    const shiftTabEvent = {
      key: "Tab",
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handleModalKeyDown(shiftTabEvent, container, onClose);

    expect(shiftTabEvent.preventDefault).toHaveBeenCalled();
    expect(btn2.focus).toHaveBeenCalled();

    (globalThis as Record<string, unknown>).document = originalDocument;
  });
});
