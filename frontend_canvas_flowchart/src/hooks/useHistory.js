import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Simple, dependency-free undo/redo stack.
 * We store snapshots; suitable for small/medium graphs.
 */

/**
 * PUBLIC_INTERFACE
 * @template T
 * @param {T} initialPresent
 * @param {{capacity?: number}} [options]
 * @returns {{
 *   state: T,
 *   set: (next: T | ((prev: T) => T), meta?: {skipHistory?: boolean}) => void,
 *   undo: () => void,
 *   redo: () => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   reset: (next: T) => void
 * }}
 */
export function useHistory(initialPresent, options = {}) {
  const capacity = options.capacity ?? 80;

  const [past, setPast] = useState([]);
  const [present, setPresent] = useState(initialPresent);
  const [future, setFuture] = useState([]);

  // Helps avoid pushing history for "internal" updates (e.g. hydration).
  const isSettingRef = useRef(false);

  const set = useCallback(
    (next, meta = {}) => {
      if (meta.skipHistory) {
        isSettingRef.current = true;
        setPresent((prev) => (typeof next === "function" ? next(prev) : next));
        queueMicrotask(() => {
          isSettingRef.current = false;
        });
        return;
      }

      setPast((prevPast) => {
        const capped = prevPast.length >= capacity ? prevPast.slice(1) : prevPast;
        return [...capped, present];
      });
      setPresent((prev) => (typeof next === "function" ? next(prev) : next));
      setFuture([]);
    },
    [capacity, present]
  );

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      setFuture((prevFuture) => [present, ...prevFuture]);
      setPresent(previous);
      return prevPast.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      setPast((prevPast) => {
        const capped = prevPast.length >= capacity ? prevPast.slice(1) : prevPast;
        return [...capped, present];
      });
      setPresent(next);
      return prevFuture.slice(1);
    });
  }, [capacity, present]);

  const reset = useCallback((next) => {
    setPast([]);
    setFuture([]);
    setPresent(next);
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return useMemo(
    () => ({
      state: present,
      set,
      undo,
      redo,
      canUndo,
      canRedo,
      reset,
      // Exposed only for debugging/advanced usage (not documented as public):
      _internal: { past, future, isSettingRef }
    }),
    [present, set, undo, redo, canUndo, canRedo, reset, past, future]
  );
}
