import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/process', label: 'Design process' },
  { to: '/resources', label: 'Resource library' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/notes', label: 'Notes' },
];

export function Sidebar({ path }: { path: string }) {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light');
  const [where, setWhere] = useState('');
  useEffect(() => { void api.dataLocation().then(setWhere); }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const active = (to: string) => (to === '/' ? path === '/' : path === to || path.startsWith(to + '/'));

  return (
    <aside className="sidebar">
      <div className="brand">Design Desk</div>
      <nav>
        {NAV.map((n) => (
          <a key={n.to} href={`#${n.to}`} className={active(n.to) ? 'active' : ''}>{n.label}</a>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button className="btn ghost sm" onClick={toggle}>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
        <span className="hint" title={where}>Data stays on this computer</span>
      </div>
    </aside>
  );
}
