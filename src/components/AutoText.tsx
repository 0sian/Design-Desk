import { useLayoutEffect, useRef, useState } from 'react';
import { useAutosave } from '../lib/hooks';

/** Auto-growing textarea that saves itself. Give it a `key` tied to the record. */
export function AutoText({
  label, hint, value, onSave, placeholder, minRows = 3, className = '',
}: {
  label?: string; hint?: string; value: string; onSave: (v: string) => void;
  placeholder?: string; minRows?: number; className?: string;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  const flush = useAutosave(v, value, onSave);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [v]);

  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {hint && <span className="hint top">{hint}</span>}
      <textarea ref={ref} rows={minRows} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={flush} />
    </label>
  );
}

/** Single-line text that saves on blur/Enter and debounces while typing. */
export function AutoLine({ value, onSave, className = '', placeholder }: { value: string; onSave: (v: string) => void; className?: string; placeholder?: string }) {
  const [v, setV] = useState(value);
  const flush = useAutosave(v, value, (x) => { if (x.trim()) onSave(x.trim()); });
  return (
    <input
      className={className}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={flush}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
