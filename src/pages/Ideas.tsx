import { useState } from 'react';
import { db } from '../lib/api';
import { useRows } from '../lib/hooks';
import type { Idea } from '../lib/types';
import { fmtDate, hostname, looksLikeUrl, splitTags } from '../lib/util';
import { ConfirmButton, Empty, ExtLink, Field, ImagePicker, Modal, PageHeader, Tags } from '../components/ui';

export function IdeasPage() {
  const { rows, reload } = useRows<Idea>('ideas', undefined, ['-created_at']);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState<Idea | null>(null);

  // Quick capture: type a thought and press Enter. A pasted link becomes the idea's URL.
  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    await db.insert('ideas', looksLikeUrl(t) ? { title: hostname(t), url: t } : { title: t });
    setDraft('');
    void reload();
  };

  const needle = q.toLowerCase();
  const shown = (rows ?? []).filter((i) =>
    (!tag || splitTags(i.tags).includes(tag)) &&
    (!needle || `${i.title} ${i.notes} ${i.tags} ${i.url}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="page">
      <PageHeader title="Ideas and inspiration" subtitle="Capture first, tidy later." />
      <form className="capture" onSubmit={capture}>
        <input autoFocus placeholder="Capture an idea or paste a link, then press Enter" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn primary" disabled={!draft.trim()}>Add</button>
      </form>
      <div className="toolbar">
        <input type="search" placeholder="Search ideas" value={q} onChange={(e) => setQ(e.target.value)} />
        {tag && <button className="tag active" onClick={() => setTag('')}>{tag} ✕</button>}
      </div>
      {rows && shown.length === 0 && <Empty title={rows.length ? 'Nothing matches' : 'No ideas yet'}>Anything worth revisiting goes here.</Empty>}
      <div className="idea-grid">
        {shown.map((i) => (
          <article key={i.id} className="idea" onClick={() => setEditing(i)}>
            {i.image && <img src={i.image} alt="" />}
            <div className="body">
              <div className="row-title">{i.title}</div>
              {i.notes && <p className="clamp">{i.notes}</p>}
              {i.url && <div className="small" onClick={(e) => e.stopPropagation()}><ExtLink url={i.url}>{hostname(i.url)}</ExtLink></div>}
              <div onClick={(e) => e.stopPropagation()}><Tags tags={i.tags} onPick={setTag} active={tag} /></div>
              <div className="muted small">{fmtDate(i.created_at)}</div>
            </div>
          </article>
        ))}
      </div>
      {editing && <IdeaModal idea={editing} onClose={() => setEditing(null)} onChanged={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}

function IdeaModal({ idea, onClose, onChanged }: { idea: Idea; onClose: () => void; onChanged: () => void }) {
  const [f, setF] = useState({ title: idea.title, notes: idea.notes, url: idea.url, tags: idea.tags, image: idea.image });
  return (
    <Modal title="Idea" onClose={onClose}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (!f.title.trim()) return; await db.update('ideas', idea.id, { ...f, title: f.title.trim() }); onChanged(); }}>
        <Field label="Title"><input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Notes"><textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <Field label="URL"><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
        <ImagePicker value={f.image} onChange={(image) => setF({ ...f, image })} />
        <Field label="Tags" hint="Comma separated"><input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        <div className="modal-foot">
          <ConfirmButton onConfirm={async () => { await db.remove('ideas', idea.id); onChanged(); }} />
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!f.title.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
