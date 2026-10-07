"use client";

import { useEffect, useRef } from "react";

export interface ModalFocusOptions {
  isOpen: boolean;
  onClose: () => void;
  autoFocusSelector?: string;
}

export function handleModalKeyDown(
  event: KeyboardEvent,
  container: HTMLElement,
  onClose: () => void,
): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onClose();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );

  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];

  const activeElement =
    typeof document !== "undefined" ? document.activeElement : null;

  if (event.shiftKey) {
    if (activeElement === firstElement || activeElement === container) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

export function useModalFocus<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  autoFocusSelector,
}: ModalFocusOptions) {
  const containerRef = useRef<T | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const target = autoFocusSelector
      ? (container.querySelector(autoFocusSelector) as HTMLElement | null)
      : (container.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? container);

    target?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      handleModalKeyDown(event, container, onClose);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, autoFocusSelector]);

  return containerRef;
}
