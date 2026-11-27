import { useState } from 'react';
import { api, db } from '../lib/api';
import { useRows } from '../lib/hooks';
import type { Item, Stage } from '../lib/types';
import { nextPosition } from '../lib/util';
import { AutoLine } from './AutoText';
import { ConfirmButton, Empty } from './ui';

/**
 * Stage/step checklist. With projectId=null it edits the reusable template (no checkboxes);
 * with a project id it's that project's own checklist.
 */
export function ProcessEditor({ projectId }: { projectId: number | null }) {
  const filter = { project_id: projectId };
  const stagesQ = useRows<Stage>('process_stages', filter, ['position']);
  const itemsQ = useRows<Item>('process_items', filter, ['position']);
  const [newStage, setNewStage] = useState('');
  const isProject = projectId !== null;

  const stages = stagesQ.rows ?? [];
  const items = itemsQ.rows ?? [];
  const reload = () => { void stagesQ.reload(); void itemsQ.reload(); };

  const addStage = async () => {
    if (!newStage.trim()) return;
    await db.insert('process_stages', { project_id: projectId, name: newStage.trim(), position: nextPosition(stages) });
    setNewStage('');
    reload();
  };

  if (stagesQ.rows && stages.length === 0 && isProject) {
    return (
      <div className="stack">
        <Empty title="No checklist yet">Start from your design process template, or build one stage by stage.</Empty>
        <div className="row-inline">
          <button className="btn primary" onClick={async () => { await api.applyTemplate(projectId!); reload(); }}>Start from template</button>
        </div>
        <AddStage value={newStage} onChange={setNewStage} onAdd={addStage} />
      </div>
    );
  }

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  return (
    <div className="stack">
      {isProject && stages.length > 0 && (
        <>
          <div className="summary-line">
            <strong>{done} of {total}</strong> steps done
          </div>
          <div className="stepper">
            {stages.map((s) => {
              const its = items.filter((i) => i.stage_id === s.id);
              const d = its.filter((i) => i.done).length;
              const pct = its.length ? (d / its.length) * 100 : 0;
              return (
                <div key={s.id} className={'step' + (its.length && d === its.length ? ' complete' : '')}>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                  <span>{s.name}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {stages.map((s) => {
        const its = items.filter((i) => i.stage_id === s.id);
        const d = its.filter((i) => i.done).length;
        return (
          <section key={s.id} className="stage">
            <div className="stage-head">
              <AutoLine className="stage-name" value={s.name} onSave={async (name) => { await db.update('process_stages', s.id, { name }); void stagesQ.reload(); }} />
              {isProject && <span className="muted small">{d}/{its.length}</span>}
              <ConfirmButton label="Remove stage" onConfirm={async () => { await db.remove('process_stages', s.id); reload(); }} />
            </div>
            <ul className="checklist">
              {its.map((i) => (
                <li key={i.id} className={i.done ? 'done' : ''}>
                  {isProject && (
                    <input
                      type="checkbox"
                      checked={!!i.done}
                      onChange={async (e) => {
                        itemsQ.setRows(items.map((x) => (x.id === i.id ? { ...x, done: e.target.checked ? 1 : 0 } : x)));
                        await db.update('process_items', i.id, { done: e.target.checked });
                      }}
                    />
                  )}
                  <AutoLine className="item-text" value={i.text} onSave={async (text) => { await db.update('process_items', i.id, { text }); void itemsQ.reload(); }} />
                  <button className="btn ghost sm icon" aria-label="Remove step" title="Remove step" onClick={async () => { await db.remove('process_items', i.id); void itemsQ.reload(); }}>✕</button>
                </li>
              ))}
            </ul>
            <AddItem onAdd={async (text) => {
              await db.insert('process_items', { stage_id: s.id, project_id: projectId, text, position: nextPosition(its) });
              void itemsQ.reload();
            }} />
          </section>
        );
      })}
      <AddStage value={newStage} onChange={setNewStage} onAdd={addStage} />
    </div>
  );
}

function AddItem({ onAdd }: { onAdd: (text: string) => void }) {
  const [t, setT] = useState('');
  return (
    <form className="add-line" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT(''); } }}>
      <input placeholder="Add a step…" value={t} onChange={(e) => setT(e.target.value)} />
    </form>
  );
}

function AddStage({ value, onChange, onAdd }: { value: string; onChange: (v: string) => void; onAdd: () => void }) {
  return (
    <form className="link-form" onSubmit={(e) => { e.preventDefault(); onAdd(); }}>
      <input className="grow" placeholder="New stage name" value={value} onChange={(e) => onChange(e.target.value)} />
      <button className="btn sm" disabled={!value.trim()}>Add stage</button>
    </form>
  );
}
