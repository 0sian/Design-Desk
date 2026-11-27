import { useEffect, useState } from 'react';
import { api, db } from '../lib/api';
import { navigate } from '../lib/router';
import type { Project, Resource } from '../lib/types';
import { fmtDate } from '../lib/util';
import { AutoText } from '../components/AutoText';
import { NewProjectModal } from '../components/NewProjectModal';
import { Badge, Empty, ExtLink, PageHeader, statusTone } from '../components/ui';

const SECTIONS = [
  { to: '/projects', title: 'Projects', text: 'Workspaces for each piece of work' },
  { to: '/process', title: 'Design process', text: 'Your reusable checklist template' },
  { to: '/resources', title: 'Resource library', text: 'Tools, references and learning' },
  { to: '/ideas', title: 'Ideas', text: 'Things worth coming back to' },
  { to: '/notes', title: 'Notes', text: 'Writing and reflections' },
];

function ProjectRow({ p }: { p: Project }) {
  return (
    <li>
      <a className="row-link" href={`#/projects/${p.id}`}>
        <span className="grow">
          <span className="row-title">{p.name}</span>
          <span className="muted small">{p.category} · edited {fmtDate(p.updated_at)}</span>
        </span>
        {!!p.steps_total && <span className="muted small">{p.steps_done}/{p.steps_total} steps</span>}
        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
      </a>
    </li>
  );
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [starred, setStarred] = useState<Resource[]>([]);
  const [quick, setQuick] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false);

  useEffect(() => {
    void api.listProjects().then(setProjects);
    void db.list<Resource>('resources', { starred: 1 }, ['name']).then(setStarred);
    void api.getSetting('quick_notes').then((v) => setQuick(v ?? ''));
  }, []);

  const active = projects?.filter((p) => p.status === 'In Progress' || p.status === 'Planning') ?? [];
  const recent = (projects ?? [])
    .filter((p) => p.last_opened_at)
    .sort((a, b) => (b.last_opened_at! > a.last_opened_at! ? 1 : -1))
    .slice(0, 5);

  const newNote = async () => {
    const n = await db.insert<{ id: number }>('notes', { title: '', body: '' });
    navigate(`/notes/${n.id}`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Welcome back"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            <button className="btn primary" onClick={() => setNewProject(true)}>New project</button>
            <button className="btn" onClick={() => navigate('/ideas')}>Capture idea</button>
            <button className="btn" onClick={newNote}>New note</button>
            <button className="btn" onClick={() => navigate('/resources?new=1')}>Add resource</button>
          </>
        }
      />

      <div className="two-col">
        <div className="stack-lg">
          <section>
            <h2>Active projects</h2>
            {projects && active.length === 0 ? (
              <Empty title="Nothing in progress">Start a project to see it here.</Empty>
            ) : (
              <ul className="rows">{active.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
            )}
          </section>

          {recent.length > 0 && (
            <section>
              <h2>Recently opened</h2>
              <ul className="rows">{recent.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
            </section>
          )}

          <section>
            <h2>Sections</h2>
            <ul className="rows">
              {SECTIONS.map((s) => (
                <li key={s.to}>
                  <a className="row-link" href={`#${s.to}`}>
                    <span className="row-title">{s.title}</span>
                    <span className="muted small grow">{s.text}</span>
                    <span className="muted">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="stack-lg">
          <section>
            <h2>Quick notes</h2>
            {quick !== null && (
              <AutoText value={quick} onSave={(v) => api.setSetting('quick_notes', v)} minRows={7} placeholder="A scratchpad for thoughts you don't want to lose…" />
            )}
          </section>

          <section>
            <h2>Starred resources</h2>
            {starred.length === 0 ? (
              <p className="muted small">Star resources in the library to keep them within reach here.</p>
            ) : (
              <ul className="rows">
                {starred.slice(0, 8).map((r) => (
                  <li key={r.id} className="row-item">
                    <div className="grow">
                      <div className="row-title"><ExtLink url={r.url}>{r.name}</ExtLink></div>
                      <div className="muted small">{r.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {newProject && <NewProjectModal onClose={() => setNewProject(false)} />}
    </div>
  );
}
