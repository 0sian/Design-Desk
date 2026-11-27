import { useEffect, useState } from 'react';
import { db } from '../lib/api';
import { useRows } from '../lib/hooks';
import { navigate } from '../lib/router';
import { RESOURCE_CATEGORIES, type Resource } from '../lib/types';
import { Empty, ExtLink, Field, Modal, PageHeader, Select, Tags, ConfirmButton } from '../components/ui';

type Draft = Partial<Resource>;

export function ResourcesPage({ openNew }: { openNew: boolean }) {
  const { rows, reload } = useRows<Resource>('resources', undefined, ['name']);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Draft | null>(openNew ? { category: RESOURCE_CATEGORIES[0] } : null);

  useEffect(() => { if (openNew) navigate('/resources', true); }, [openNew]);

  const all = rows ?? [];
  const needle = q.toLowerCase();
  const shown = all.filter((r) =>
    (cat === 'All' || (cat === '★' ? r.starred : r.category === cat)) &&
    (!needle || `${r.name} ${r.url} ${r.description} ${r.notes} ${r.tags} ${r.category}`.toLowerCase().includes(needle)),
  );
  const count = (c: string) => all.filter((r) => (c === 'All' ? true : c === '★' ? r.starred : r.category === c)).length;

  return (
    <div className="page">
      <PageHeader title="Resource library" actions={<button className="btn primary" onClick={() => setEditing({ category: cat !== 'All' && cat !== '★' ? cat : RESOURCE_CATEGORIES[0] })}>Add resource</button>} />
      <div className="split">
        <aside className="filters">
          {['All', '★', ...RESOURCE_CATEGORIES].map((c) => (
            <button key={c} className={c === cat ? 'active' : ''} onClick={() => setCat(c)}>
              <span>{c === '★' ? 'Starred' : c === 'All' ? 'All resources' : c}</span>
              <span className="muted small">{count(c)}</span>
            </button>
          ))}
        </aside>
        <div className="stack">
          <input type="search" placeholder="Search name, notes, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
          {rows && shown.length === 0 && <Empty title={all.length ? 'No matching resources' : 'The library is empty'} />}
          <ul className="rows">
            {shown.map((r) => (
              <li key={r.id} className="row-item top">
                <button className={'star' + (r.starred ? ' on' : '')} aria-label={r.starred ? 'Unstar' : 'Star'} title="Star to show on the dashboard"
                  onClick={async () => { await db.update('resources', r.id, { starred: !r.starred }); void reload(); }}>
                  {r.starred ? '★' : '☆'}
                </button>
                <div className="grow">
                  <div className="row-title">
                    {r.url ? <ExtLink url={r.url}>{r.name}</ExtLink> : r.name}
                    <span className="muted small">{r.category}</span>
                  </div>
                  {r.description && <p>{r.description}</p>}
                  {r.notes && <p className="note"><strong>Why it's useful: </strong>{r.notes}</p>}
                  <Tags tags={r.tags} onPick={(t) => setQ(t)} />
                </div>
                <button className="btn ghost sm" onClick={() => setEditing(r)}>Edit</button>
                <ConfirmButton onConfirm={async () => { await db.remove('resources', r.id); void reload(); }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {editing && <ResourceModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}

function ResourceModal({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial.name ?? '', url: initial.url ?? '', category: initial.category ?? RESOURCE_CATEGORIES[0] as string,
    description: initial.description ?? '', notes: initial.notes ?? '', tags: initial.tags ?? '', starred: !!initial.starred,
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={initial.id ? 'Edit resource' : 'Add resource'} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        const values = { ...f, name: f.name.trim(), url: f.url.trim() };
        if (initial.id) await db.update('resources', initial.id, values); else await db.insert('resources', values);
        onSaved();
      }}>
        <Field label="Name"><input autoFocus value={f.name} onChange={(e) => set('name')(e.target.value)} /></Field>
        <Field label="URL"><input value={f.url} onChange={(e) => set('url')(e.target.value)} placeholder="https://" /></Field>
        <Field label="Category"><Select value={f.category} onChange={set('category')} options={RESOURCE_CATEGORIES} /></Field>
        <Field label="Short description"><input value={f.description} onChange={(e) => set('description')(e.target.value)} /></Field>
        <Field label="Why it's useful"><textarea rows={3} value={f.notes} onChange={(e) => set('notes')(e.target.value)} /></Field>
        <Field label="Tags" hint="Comma separated, optional"><input value={f.tags} onChange={(e) => set('tags')(e.target.value)} /></Field>
        <label className="check"><input type="checkbox" checked={f.starred} onChange={(e) => setF({ ...f, starred: e.target.checked })} /><span>Star (show on dashboard)</span></label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!f.name.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
