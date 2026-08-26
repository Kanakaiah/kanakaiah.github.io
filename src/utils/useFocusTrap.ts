import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside an open overlay, and gives it back when the overlay closes.
 *
 * The fullscreen overlays got Escape, a dialog role and a scroll lock earlier, which
 * covers the loudest problems. This is the quieter half: without it, Tab walks straight
 * out of the dialog and into the page behind — which is still rendered, still full of
 * buttons, and completely invisible. A keyboard or screen-reader user ends up operating
 * controls they cannot see, with no way to tell they have left.
 *
 * Focus also has to go *somewhere* on open, or the first Tab starts from wherever the
 * page happened to be, and be restored on close, or it lands back at the top of the
 * document instead of the control that opened the dialog.
 *
 * Returns a ref to attach to the overlay's root element.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus in. The container itself is the fallback, so a dialog whose only
    // content is text still takes focus rather than leaving it behind on the page.
    const initial = root.querySelector<HTMLElement>(FOCUSABLE);
    if (initial) initial.focus();
    else {
      root.setAttribute('tabindex', '-1');
      root.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Queried per keystroke, not once: these dialogs swap their controls as they go
      // (reveal replaces a button with four grades), so a list captured on open would
      // be wrong almost immediately.
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); return; }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (current === first || !root.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !root.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // By the time this runs the overlay is usually already detached, which drops
      // focus to <body> — so "is focus still inside the dialog?" is the wrong question
      // and answers false exactly when restoring matters most. Restore whenever focus
      // is loose; if something else has deliberately claimed it, leave that alone.
      const active = document.activeElement as HTMLElement | null;
      const focusIsLoose = !active || active === document.body || root.contains(active);
      if (focusIsLoose && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active]);

  return ref;
}
