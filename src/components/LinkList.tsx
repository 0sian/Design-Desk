import { useState } from 'react';
import { db } from '../lib/api';
import { useRows } from '../lib/hooks';
import type { ProjectLink } from '../lib/types';
import { Badge, ConfirmButton, Empty, ExtLink, Select } from './ui';

function LinkForm({ initial, types, onSubmit, onCancel, submitLabel }: {
  initial: Pick<ProjectLink, 'type' | 'title' | 'url' | 'note'>;
  types: readonly string[]; onSubmit: (v: Pick<ProjectLink, 'type' | 'title' | 'url' | 'note'>) => void;
  onCancel?: () => void; submitLabel: string;
}) {
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = f.url.trim() || f.title.trim();
  return (
    <form
      className="link-form"
      onSubmit={(e) => { e.preventDefault(); if (ok) { onSubmit({ ...f, title: f.title.trim() || f.url.trim() }); if (!onCancel) setF(initial); } }}
    >
      <Select value={f.type || types[0]} onChange={set('type')} options={types} />
      <input placeholder="Title" value={f.title} onChange={(e) => set('title')(e.target.value)} />
      <input placeholder="URL" value={f.url} onChange={(e) => set('url')(e.target.value)} />
      <input className="grow" placeholder="Note (optional)" value={f.note} onChange={(e) => set('note')(e.target.value)} />
      <button className="btn primary sm" disabled={!ok}>{submitLabel}</button>
      {onCancel && <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>}
    </form>
  );
}

/** Links with notes, used for both research references and project assets. */
export function LinkList({ projectId, kind, types, empty }: {
  projectId: number; kind: 'research' | 'asset'; types: readonly string[]; empty: string;
}) {
  const { rows, reload } = useRows<ProjectLink>('project_links', { project_id: projectId, kind }, ['-created_at']);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="stack">
      <LinkForm
        initial={{ type: types[0], title: '', url: '', note: '' }}
        types={types}
        submitLabel="Add"
        onSubmit={async (v) => { await db.insert('project_links', { ...v, project_id: projectId, kind }); void reload(); }}
      />
      {rows && rows.length === 0 && <Empty title={empty} />}
      <ul className="rows">
        {rows?.map((l) =>
          editing === l.id ? (
            <li key={l.id}>
              <LinkForm
                initial={l} types={types} submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSubmit={async (v) => { await db.update('project_links', l.id, v); setEditing(null); void reload(); }}
              />
            </li>
          ) : (
            <li key={l.id} className="row-item">
              <div className="grow">
                <div className="row-title">
                  {l.url ? <ExtLink url={l.url}>{l.title}</ExtLink> : l.title}
                  {l.type && <Badge>{l.type}</Badge>}
                </div>
                {l.url && l.title !== l.url && <div className="muted small">{l.url}</div>}
                {l.note && <p className="note">{l.note}</p>}
              </div>
              <button className="btn ghost sm" onClick={() => setEditing(l.id)}>Edit</button>
              <ConfirmButton onConfirm={async () => { await db.remove('project_links', l.id); void reload(); }} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
