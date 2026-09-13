import { useEffect, useRef } from "react";

// Shared stack prevents nested dialogs from competing for focus or unlocking
// page scroll while another dialog is still open.
const dialogStack = [];
let previousBodyOverflow = "";
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const visibleFocusable = (container) => Array.from(container.querySelectorAll(focusableSelector)).filter((element) => {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  for (let current = element; current && current !== container.parentElement; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
});

/**
 * Focus behavior only: attach the returned ref to the existing dialog panel.
 * Does not create UI, alter backdrop click behavior, or submit/cancel work.
 */
export function useDialogFocus(isOpen, onClose, initialFocusRef) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const panel = dialogRef.current;
    if (!isOpen || !panel) return undefined;
    const trigger = document.activeElement;
    const entry = { panel };
    if (dialogStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialogStack.push(entry);
    const isTopDialog = () => dialogStack.at(-1) === entry;
    const initial = initialFocusRef?.current || visibleFocusable(panel)[0] || panel;
    initial.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (!isTopDialog()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
      } else if (event.key === "Tab") {
        const candidates = visibleFocusable(panel);
        const first = candidates[0];
        const last = candidates.at(-1);
        if (!first) {
          event.preventDefault();
          panel.focus();
        } else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const index = dialogStack.indexOf(entry);
      if (index >= 0) dialogStack.splice(index, 1);
      if (dialogStack.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected && (!dialogStack.length || dialogStack.at(-1).panel.contains(trigger))) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [isOpen, initialFocusRef]);

  return dialogRef;
}
