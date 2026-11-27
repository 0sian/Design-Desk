import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { CATEGORIES, STATUSES, type Project } from '../lib/types';
import { fmtDate } from '../lib/util';
import { NewProjectModal } from '../components/NewProjectModal';
import { Badge, Empty, PageHeader, statusTone } from '../components/ui';

export function ProjectsPage({ openNew }: { openNew: boolean }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [status, setStatus] = useState('Open');
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(openNew);

  useEffect(() => { void api.listProjects().then(setProjects); }, []);
  useEffect(() => { if (openNew) navigate('/projects', true); }, [openNew]);

  const shown = (projects ?? []).filter((p) =>
    (status === 'All' ? true : status === 'Open' ? p.status !== 'Archived' : p.status === status) &&
    (category === 'All' || p.category === category) &&
    (!q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="page">
      <PageHeader title="Projects" actions={<button className="btn primary" onClick={() => setCreating(true)}>New project</button>} />
      <div className="toolbar">
        <input type="search" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Open">Not archived</option>
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {projects && shown.length === 0 && (
        <Empty title={projects.length ? 'No projects match' : 'No projects yet'}>
          {projects.length ? 'Try changing the filters.' : 'Create one to get a workspace for your brief, research, process, decisions and reflections.'}
        </Empty>
      )}

      <div className="project-grid">
        {shown.map((p) => (
          <a key={p.id} className="project-card" href={`#/projects/${p.id}`}>
            <div className="cover">{p.cover ? <img src={p.cover} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}</div>
            <div className="body">
              <div className="row-title">{p.name}</div>
              {p.description && <p className="clamp">{p.description}</p>}
              <div className="meta">
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                <span className="muted small">{p.category}</span>
              </div>
              <div className="muted small">
                {p.steps_total ? `${p.steps_done}/${p.steps_total} steps · ` : ''}edited {fmtDate(p.updated_at)}
              </div>
            </div>
          </a>
        ))}
      </div>
      {creating && <NewProjectModal onClose={() => setCreating(false)} />}
    </div>
  );
}
