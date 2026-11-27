import { invoke } from '@tauri-apps/api/core';
import type { Project } from './types';

type Values = Record<string, unknown>;

/** Thin typed wrapper over the generic CRUD commands in src-tauri/src/commands.rs. */
export const db = {
  list: <T>(table: string, filter?: Values, order?: string[]) => invoke<T[]>('db_list', { table, filter, order }),
  insert: <T>(table: string, values: Values) => invoke<T>('db_insert', { table, values }),
  update: <T>(table: string, id: number, values: Values) => invoke<T>('db_update', { table, id, values }),
  remove: (table: string, id: number) => invoke<void>('db_delete', { table, id }),
};

export const api = {
  listProjects: () => invoke<Project[]>('list_projects'),
  createProject: (values: Values, useTemplate: boolean) => invoke<Project>('create_project', { values, useTemplate }),
  applyTemplate: (projectId: number) => invoke<void>('apply_template', { projectId }),
  touchProject: (id: number) => invoke<void>('touch_project', { id }),
  getSetting: (key: string) => invoke<string | null>('get_setting', { key }),
  setSetting: (key: string, value: string) => invoke<void>('set_setting', { key, value }),
  dataLocation: () => invoke<string>('data_location'),
  /** Opens in the system browser. Adds https:// when the scheme is missing. */
  openUrl: (url: string) => invoke<void>('open_url', { url: normalizeUrl(url) }),
};

export function normalizeUrl(url: string): string {
  const u = url.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
}
