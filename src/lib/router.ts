import { useEffect, useState } from 'react';

/** Minimal hash router: "#/projects/3/research?x=1" */
function read() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path, query: new URLSearchParams(qs ?? '') };
}

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string, replace = false) {
  if (replace) window.history.replaceState(null, '', `#${to}`);
  else window.location.hash = to;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
