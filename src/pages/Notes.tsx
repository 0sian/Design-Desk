import { useEffect, useState } from 'react';
import { db } from '../lib/api';
import { useAutosave, useRows } from '../lib/hooks';
import { navigate } from '../lib/router';
import type { Note } from '../lib/types';
import { fmtDate } from '../lib/util';
import { ConfirmButton, Empty } from '../components/ui';

export function NotesPage({ activeId }: { activeId: number | null }) {
  const { rows, setRows, reload } = useRows<Note>('notes', undefined, ['-pinned', '-updated_at']);
  const [q, setQ] = useState('');

  const create = async () => {
    const n = await db.insert<Note>('notes', { title: '', body: '' });
    await reload();
    navigate(`/notes/${n.id}`);
  };

  // Open the most recent note by default.
  useEffect(() => {
    if (rows && rows.length && !activeId) navigate(`/notes/${rows[0].id}`, true);
  }, [rows, activeId]);

  const needle = q.toLowerCase();
  const shown = (rows ?? []).filter((n) => !needle || `${n.title} ${n.body} ${n.tags}`.toLowerCase().includes(needle));
  const active = rows?.find((n) => n.id === activeId);

  return (
    <div className="notes">
      <aside className="notes-list">
        <div className="notes-list-head">
          <input type="search" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn primary sm" onClick={create}>New</button>
        </div>
        <ul>
          {shown.map((n) => (
            <li key={n.id}>
              <a href={`#/notes/${n.id}`} className={n.id === activeId ? 'active' : ''}>
                <span className="row-title">{n.pinned ? '📌 ' : ''}{n.title || 'Untitled'}</span>
                <span className="muted small clamp1">{n.body.replace(/\s+/g, ' ').slice(0, 80) || 'No content'}</span>
                <span className="muted small">{fmtDate(n.updated_at)}</span>
              </a>
            </li>
          ))}
        </ul>
        {rows && shown.length === 0 && <p className="muted small pad">{rows.length ? 'No matches.' : 'No notes yet.'}</p>}
      </aside>
      <section className="note-pane">
        {active ? (
          <NoteEditor
            key={active.id}
            note={active}
            onSaved={(row) => setRows((rs) => (rs ?? []).map((r) => (r.id === row.id ? row : r)))}
            onChanged={() => void reload()}
            onDeleted={async () => { await db.remove('notes', active.id); navigate('/notes'); await reload(); }}
          />
        ) : (
          rows && <Empty title={rows.length ? 'Select a note' : 'Start writing'}>Observations, things you've learned, thoughts on your process.</Empty>
        )}
      </section>
    </div>
  );
}

function NoteEditor({ note, onSaved, onChanged, onDeleted }: {
  note: Note; onSaved: (n: Note) => void; onChanged: () => void; onDeleted: () => void;
}) {
  const [f, setF] = useState({ title: note.title, body: note.body, tags: note.tags });
  const flush = useAutosave(f, { title: note.title, body: note.body, tags: note.tags }, async (v) => onSaved(await db.update<Note>('notes', note.id, v)));
  const pin = async () => { onSaved(await db.update<Note>('notes', note.id, { pinned: !note.pinned })); onChanged(); };

  return (
    <div className="note-editor">
      <div className="note-top">
        <input className="note-title" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} onBlur={flush} />
        <button className="btn sm" onClick={pin}>{note.pinned ? 'Unpin' : 'Pin'}</button>
        <ConfirmButton onConfirm={onDeleted} />
      </div>
      <input className="note-tags" placeholder="Tags (comma separated)" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} onBlur={flush} />
      <textarea className="note-body" placeholder="Write something…" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} onBlur={flush} autoFocus={!note.body} />
      <div className="muted small">Created {fmtDate(note.created_at)} · Saves automatically</div>
    </div>
  );
}
