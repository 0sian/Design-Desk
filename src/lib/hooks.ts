import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from './api';

/** Loads rows from a table; `reload()` refetches after a mutation. */
export function useRows<T>(table: string, filter?: Record<string, unknown>, order?: string[]) {
  const [rows, setRows] = useState<T[] | null>(null);
  const key = JSON.stringify([table, filter, order]);
  const reload = useCallback(async () => {
    setRows(await db.list<T>(table, filter, order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { void reload(); }, [reload]);
  return { rows, setRows, reload };
}

/**
 * Debounced autosave. Saves ~700ms after the last change, on blur (call flush),
 * and when the component unmounts, so nothing typed is ever lost.
 */
export function useAutosave<T>(value: T, saved: T, save: (v: T) => void | Promise<void>, delay = 700) {
  const latest = useRef({ value, saved, save });
  latest.current = { value, saved, save };
  const lastSaved = useRef(saved);

  const flush = useCallback(() => {
    const { value, save } = latest.current;
    if (JSON.stringify(value) !== JSON.stringify(lastSaved.current)) {
      lastSaved.current = value;
      void save(value);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(flush, delay);
    return () => clearTimeout(t);
  }, [value, delay, flush]);

  useEffect(() => () => flush(), [flush]);
  return flush;
}
