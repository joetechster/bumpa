import { useEffect, useState } from 'react';

/** The debounced value trails `value` by `delayMs`; the pending timer is
 *  cleared on every change and on unmount (no update-after-unmount). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
