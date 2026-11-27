import { useEffect } from 'react';
import { api } from './lib/api';
import { useRoute } from './lib/router';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import { ProcessPage } from './pages/ProcessPage';
import { ResourcesPage } from './pages/Resources';
import { IdeasPage } from './pages/Ideas';
import { NotesPage } from './pages/Notes';

export default function App() {
  const { path, query } = useRoute();

  // Any plain http(s) link anywhere in the app opens in the system browser, never inside the app.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href') ?? '';
      if (/^(https?:|mailto:)/i.test(href)) { e.preventDefault(); void api.openUrl(href); }
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, []);

  const seg = path.split('/').filter(Boolean);
  let page;
  if (seg.length === 0) page = <Dashboard />;
  else if (seg[0] === 'projects' && seg[1]) page = <ProjectWorkspace key={seg[1]} id={Number(seg[1])} tab={seg[2]} />;
  else if (seg[0] === 'projects') page = <ProjectsPage openNew={query.get('new') === '1'} />;
  else if (seg[0] === 'process') page = <ProcessPage />;
  else if (seg[0] === 'resources') page = <ResourcesPage openNew={query.get('new') === '1'} />;
  else if (seg[0] === 'ideas') page = <IdeasPage />;
  else if (seg[0] === 'notes') page = <NotesPage activeId={seg[1] ? Number(seg[1]) : null} />;
  else page = <Dashboard />;

  return (
    <div className="app">
      <Sidebar path={path} />
      <main className="main">{page}</main>
    </div>
  );
}
