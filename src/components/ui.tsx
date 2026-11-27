import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { readImage, splitTags } from '../lib/util';

export function ExtLink({ url, children, className }: { url: string; children?: ReactNode; className?: string }) {
  return (
    <a
      href={url}
      className={className ?? 'ext'}
      onClick={(e) => { e.preventDefault(); void api.openUrl(url).catch(() => {}); }}
      title={url}
    >
      {children ?? url}
    </a>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two-step delete so we never rely on native confirm dialogs. */
export function ConfirmButton({ onConfirm, label = 'Delete', className = '' }: { onConfirm: () => void; label?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`btn sm ${armed ? 'danger' : 'ghost'} ${className}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Click to confirm' : label}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: readonly string[]; className?: string }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {!options.includes(value) && value && <option value={value}>{value}</option>}
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={'badge' + (tone ? ` ${tone}` : '')}>{children}</span>;
}

export function statusTone(status: string) {
  return { Planning: 'planning', 'In Progress': 'progress', Completed: 'done', Archived: 'archived' }[status] ?? '';
}

export function Tags({ tags, onPick, active }: { tags: string; onPick?: (t: string) => void; active?: string }) {
  const list = splitTags(tags);
  if (!list.length) return null;
  return (
    <div className="tags">
      {list.map((t) =>
        onPick ? (
          <button key={t} className={'tag' + (active === t ? ' active' : '')} onClick={() => onPick(t)}>{t}</button>
        ) : (
          <span key={t} className="tag">{t}</span>
        ),
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function ImagePicker({ value, onChange, label = 'Image' }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="image-picker">
        {value && <img src={value} alt="" />}
        <button type="button" className="btn sm" onClick={() => ref.current?.click()}>{value ? 'Replace' : 'Choose image'}</button>
        {value && <button type="button" className="btn ghost sm" onClick={() => onChange(null)}>Remove</button>}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try { setErr(''); onChange(await readImage(f)); } catch (x) { setErr((x as Error).message); }
          }}
        />
      </div>
      {err && <span className="hint err">{err}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
