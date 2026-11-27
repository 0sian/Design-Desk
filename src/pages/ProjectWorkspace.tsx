import { useEffect, useRef, useState } from 'react';
import { api, db } from '../lib/api';
import { navigate } from '../lib/router';
import { useRows } from '../lib/hooks';
import {
  ASSET_TYPES, CATEGORIES, DECISION_AREAS, RESEARCH_LINK_TYPES, SECTIONS, STATUSES,
  type Decision, type Project,
} from '../lib/types';
import { fmtDate, readImage } from '../lib/util';
import { AutoLine, AutoText } from '../components/AutoText';
import { LinkList } from '../components/LinkList';
import { ProcessEditor } from '../components/ProcessEditor';
import { Badge, ConfirmButton, Empty, Field, Modal, Select } from '../components/ui';

export function ProjectWorkspace({ id, tab }: { id: number; tab?: string }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void db.list<Project>('projects', { id }).then((r) => setProject(r[0] ?? null));
    void api.touchProject(id);
  }, [id]);

  if (project === undefined) return <div className="page" />;
  if (project === null) {
    return <div className="page"><Empty title="Project not found"><a href="#/projects">Back to projects</a></Empty></div>;
  }

  const save = async (values: Record<string, unknown>) => {
    const row = await db.update<Project>('projects', id, values);
    setProject((p) => (p ? { ...p, ...row } : p));
  };
  const field = (key: keyof Project) => ({ value: String(project[key] ?? ''), onSave: (v: string) => void save({ [key]: v }) });

  const hidden = project.hidden_sections.split(',').filter(Boolean);
  const visible = SECTIONS.filter((s) => s.key === 'overview' || !hidden.includes(s.key));
  const current = visible.find((s) => s.key === tab)?.key ?? 'overview';
  const toggleSection = (key: string) =>
    void save({ hidden_sections: (hidden.includes(key) ? hidden.filter((h) => h !== key) : [...hidden, key]).join(',') });

  return (
    <div className="page">
      <a className="back" href="#/projects">← Projects</a>
      <header className="project-head">
        <div className="cover-edit">
          {project.cover ? <img src={project.cover} alt="" /> : <span>{project.name.slice(0, 1).toUpperCase()}</span>}
          <div className="cover-actions">
            <button className="btn ghost sm" onClick={() => coverInput.current?.click()}>{project.cover ? 'Change' : 'Add cover'}</button>
            {project.cover && <button className="btn ghost sm" onClick={() => void save({ cover: null })}>Remove</button>}
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (f) void save({ cover: await readImage(f) });
            }} />
          </div>
        </div>
        <div className="grow">
          <AutoLine className="title-input" value={project.name} onSave={(name) => void save({ name })} />
          <AutoLine className="desc-input" value={project.description} placeholder="Add a short description" onSave={(description) => void save({ description })} />
          <div className="meta-row">
            <Select value={project.status} onChange={(status) => void save({ status })} options={STATUSES} />
            <Select value={project.category} onChange={(category) => void save({ category })} options={CATEGORIES} />
            <span className="muted small">Created {fmtDate(project.created_at)} · Modified {fmtDate(project.updated_at)}</span>
            <span className="spacer" />
            <details className="menu">
              <summary className="btn sm">Sections</summary>
              <div className="menu-pop">
                <p className="hint">Hide the parts this project doesn't need.</p>
                {SECTIONS.filter((s) => s.key !== 'overview').map((s) => (
                  <label key={s.key} className="check">
                    <input type="checkbox" checked={!hidden.includes(s.key)} onChange={() => toggleSection(s.key)} />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </details>
            <ConfirmButton label="Delete project" onConfirm={async () => { await db.remove('projects', id); navigate('/projects'); }} />
          </div>
        </div>
      </header>

      <nav className="tabs">
        {visible.map((s) => (
          <a key={s.key} href={`#/projects/${id}/${s.key}`} className={s.key === current ? 'active' : ''}>{s.label}</a>
        ))}
      </nav>

      <div className="tab-body">
        {current === 'overview' && (
          <div className="stack-lg">
            <AutoText key="brief" label="Project brief" minRows={4} {...field('brief')} />
            <AutoText key="problem" label="Problem being solved" {...field('problem')} />
            <AutoText key="audience" label="Target audience" {...field('audience')} />
            <AutoText key="goals" label="Goals and objectives" {...field('goals')} />
          </div>
        )}

        {current === 'research' && (
          <div className="stack-lg">
            <AutoText label="Research notes" minRows={6} {...field('research_notes')} />
            <AutoText label="Competitor analysis" minRows={6} hint="Who else solves this? What do they do well or badly?" {...field('competitor_analysis')} />
            <section>
              <h2>Inspiration, references and links</h2>
              <LinkList projectId={id} kind="research" types={RESEARCH_LINK_TYPES} empty="No references yet" />
            </section>
          </div>
        )}

        {current === 'process' && <ProcessEditor projectId={id} />}

        {current === 'decisions' && <Decisions projectId={id} />}

        {current === 'assets' && (
          <section>
            <p className="muted">Figma files, prototypes, live sites and anything else worth finding again.</p>
            <LinkList projectId={id} kind="asset" types={ASSET_TYPES} empty="No assets yet" />
          </section>
        )}

        {current === 'reflection' && (
          <div className="stack-lg">
            <AutoText label="What went well?" {...field('reflect_well')} />
            <AutoText label="What didn't work?" {...field('reflect_not_well')} />
            <AutoText label="What would I change?" {...field('reflect_change')} />
            <AutoText label="What did I learn?" {...field('reflect_learned')} />
          </div>
        )}
      </div>
    </div>
  );
}

function Decisions({ projectId }: { projectId: number }) {
  const { rows, reload } = useRows<Decision>('decisions', { project_id: projectId }, ['-created_at']);
  const [editing, setEditing] = useState<Partial<Decision> | null>(null);

  return (
    <div className="stack">
      <div className="row-inline">
        <p className="muted grow">Record what you decided and, more importantly, why.</p>
        <button className="btn primary" onClick={() => setEditing({ area: DECISION_AREAS[0], title: '', decision: '', rationale: '' })}>Record decision</button>
      </div>
      {rows && rows.length === 0 && <Empty title="No decisions recorded yet">Layouts, colours, type choices, interaction patterns, anything you'd want to explain later.</Empty>}
      <ul className="timeline">
        {rows?.map((d) => (
          <li key={d.id}>
            <div className="row-title">
              {d.title || 'Untitled decision'} <Badge>{d.area}</Badge>
              <span className="muted small">{fmtDate(d.created_at)}</span>
            </div>
            {d.decision && <p>{d.decision}</p>}
            {d.rationale && <p className="why"><strong>Why: </strong>{d.rationale}</p>}
            <div className="row-inline">
              <button className="btn ghost sm" onClick={() => setEditing(d)}>Edit</button>
              <ConfirmButton onConfirm={async () => { await db.remove('decisions', d.id); void reload(); }} />
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <DecisionModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            if (editing.id) await db.update('decisions', editing.id, v);
            else await db.insert('decisions', { ...v, project_id: projectId });
            setEditing(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function DecisionModal({ initial, onSave, onClose }: {
  initial: Partial<Decision>; onSave: (v: { title: string; area: string; decision: string; rationale: string }) => void; onClose: () => void;
}) {
  const [f, setF] = useState({ title: initial.title ?? '', area: initial.area ?? DECISION_AREAS[0] as string, decision: initial.decision ?? '', rationale: initial.rationale ?? '' });
  return (
    <Modal title={initial.id ? 'Edit decision' : 'Record decision'} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (f.title.trim() || f.decision.trim()) onSave(f); }}>
        <div className="row">
          <Field label="Title"><input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Single-column layout on mobile" /></Field>
          <Field label="Area"><Select value={f.area} onChange={(area) => setF({ ...f, area })} options={DECISION_AREAS} /></Field>
        </div>
        <Field label="What was decided"><textarea rows={3} value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })} /></Field>
        <Field label="Why" hint="The reasoning, the alternatives you rejected, what you were optimising for."><textarea rows={4} value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} /></Field>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!f.title.trim() && !f.decision.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
