import { useEffect, useMemo, useRef } from "react";

export const useDebouncedCallback = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo(() => {
    const flush = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;
      if (args) callbackRef.current(...args);
    };
    const schedule = (...args: Args) => {
      pendingArgsRef.current = args;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delayMs);
    };
    return Object.assign(schedule, { flush });
  }, [delayMs]);

  useEffect(() => () => debounced.flush(), [debounced]);

  return debounced;
};
