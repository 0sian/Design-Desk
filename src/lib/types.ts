export const STATUSES = ['Planning', 'In Progress', 'Completed', 'Archived'] as const;
export const CATEGORIES = ['Web Design', 'UX/UI', 'Development', 'Other'] as const;
export const RESOURCE_CATEGORIES = [
  'UX principles and learning',
  'Design inspiration',
  'UI patterns and components',
  'Typography',
  'Colour palettes',
  'Tools and software',
  'Articles and tutorials',
  'Accessibility',
] as const;
export const DECISION_AREAS = ['Layout', 'Colour', 'Typography', 'Interaction', 'Content', 'Other'] as const;
export const RESEARCH_LINK_TYPES = ['Inspiration', 'Competitor', 'Article', 'Reference', 'Other'] as const;
export const ASSET_TYPES = ['Figma', 'Prototype', 'Website', 'Document', 'Other'] as const;

/** Project workspace tabs. Everything except Overview can be hidden per project. */
export const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'research', label: 'Research' },
  { key: 'process', label: 'Design process' },
  { key: 'decisions', label: 'Design decisions' },
  { key: 'assets', label: 'Assets and references' },
  { key: 'reflection', label: 'Reflection' },
] as const;
export type SectionKey = (typeof SECTIONS)[number]['key'];

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  category: string;
  cover: string | null;
  hidden_sections: string;
  brief: string;
  problem: string;
  audience: string;
  goals: string;
  research_notes: string;
  competitor_analysis: string;
  reflect_well: string;
  reflect_not_well: string;
  reflect_change: string;
  reflect_learned: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  steps_total?: number;
  steps_done?: number;
}

export interface ProjectLink {
  id: number;
  project_id: number;
  kind: 'research' | 'asset';
  type: string;
  title: string;
  url: string;
  note: string;
  created_at: string;
}

export interface Stage { id: number; project_id: number | null; name: string; position: number }
export interface Item { id: number; stage_id: number; project_id: number | null; text: string; done: number; position: number }

export interface Decision {
  id: number;
  project_id: number;
  title: string;
  area: string;
  decision: string;
  rationale: string;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  name: string;
  url: string;
  category: string;
  description: string;
  notes: string;
  tags: string;
  starred: number;
  created_at: string;
}

export interface Idea {
  id: number;
  title: string;
  notes: string;
  url: string;
  image: string | null;
  tags: string;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  tags: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}
