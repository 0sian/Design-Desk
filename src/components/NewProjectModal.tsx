import { useState } from 'react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { CATEGORIES, STATUSES } from '../lib/types';
import { Field, ImagePicker, Modal, Select } from './ui';

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [status, setStatus] = useState<string>(STATUSES[0]);
  const [cover, setCover] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const p = await api.createProject({ name: name.trim(), description: description.trim(), category, status, cover }, useTemplate);
    onClose();
    navigate(`/projects/${p.id}`);
  };

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Portfolio redesign" /></Field>
        <Field label="Short description"><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="row">
          <Field label="Category"><Select value={category} onChange={setCategory} options={CATEGORIES} /></Field>
          <Field label="Status"><Select value={status} onChange={setStatus} options={STATUSES} /></Field>
        </div>
        <ImagePicker label="Cover image (optional)" value={cover} onChange={setCover} />
        <label className="check">
          <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} />
          <span>
            Start with the design process template
            <span className="hint"> You can add, edit and remove steps afterwards, and change the template itself under Design process.</span>
          </span>
        </label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!name.trim() || busy}>Create project</button>
        </div>
      </form>
    </Modal>
  );
}
