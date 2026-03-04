import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import './CueEditor.css'; // styles partagés entre CueEditor et SceneEditor

/**
 * SceneEditor — Formulaire d'édition d'une annotation de scène.
 * ACs Story 3.3 :
 *  - Titre + description + watchFor (optionnel)
 *  - Sauvegarde via dispatch UPDATE_CUE
 *  - watchFor affiché en ambre en mode représentation
 *  - Boutons Monter / Descendre (Story 3.4)
 *  - Bouton Supprimer avec confirmation
 */
export default function SceneEditor({ cue, onUpdated, onDeleted }) {
  const { state, dispatch } = useAppContext();
  const { cues } = state;

  const [title, setTitle] = useState(cue.title ?? '');
  const [description, setDescription] = useState(cue.description ?? '');
  const [watchFor, setWatchFor] = useState(cue.watchFor ?? '');
  const [saved, setSaved] = useState(false);

  const canSave = title.trim().length > 0;
  const cueIndex = cues.findIndex(c => c.id === cue.id);
  const isFirst = cueIndex === 0;
  const isLast = cueIndex === cues.length - 1;

  function handleSave() {
    if (!canSave) return;
    dispatch({
      type: 'UPDATE_CUE',
      payload: { ...cue, title: title.trim(), description, watchFor },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onUpdated?.();
  }

  function handleDelete() {
    const ok = window.confirm(`Supprimer l'annotation "${cue.title || 'Sans titre'}" ?`);
    if (!ok) return;
    dispatch({ type: 'DELETE_CUE', payload: { id: cue.id } });
    onDeleted?.();
  }

  function handleMoveUp() {
    dispatch({ type: 'MOVE_CUE_UP', payload: { id: cue.id } });
  }

  function handleMoveDown() {
    dispatch({ type: 'MOVE_CUE_DOWN', payload: { id: cue.id } });
  }

  return (
    <div className="cue-editor">
      <div className="cue-editor__header">
        <span className="cue-editor__type-badge cue-editor__type-badge--scene">📋 Annotation de scène</span>
        <div className="cue-editor__move-buttons">
          <button
            className="cue-editor__btn cue-editor__btn--move"
            onClick={handleMoveUp}
            disabled={isFirst}
            title="Monter"
            aria-label="Monter l'annotation"
          >↑ Monter</button>
          <button
            className="cue-editor__btn cue-editor__btn--move"
            onClick={handleMoveDown}
            disabled={isLast}
            title="Descendre"
            aria-label="Descendre l'annotation"
          >↓ Descendre</button>
        </div>
      </div>

      <div className="cue-editor__fields">
        {/* Titre */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="scene-title">
            Titre <span className="cue-editor__required">*</span>
          </label>
          <input
            id="scene-title"
            className="cue-editor__input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nom de la scène..."
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="scene-description">
            Description
          </label>
          <textarea
            id="scene-description"
            className="cue-editor__textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ce qui se passe sur scène..."
            rows={4}
          />
        </div>

        {/* À surveiller */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="scene-watchfor">
            À surveiller <span className="cue-editor__optional">(optionnel)</span>
          </label>
          <textarea
            id="scene-watchfor"
            className="cue-editor__textarea"
            value={watchFor}
            onChange={e => setWatchFor(e.target.value)}
            placeholder="Ce qui peut varier ou surprendre..."
            rows={2}
          />
          {watchFor && (
            <p className="cue-editor__watchfor-preview">
              Affiché en <span style={{ color: 'var(--color-accent)' }}>ambre</span> en mode représentation
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="cue-editor__actions">
        <button
          className="cue-editor__btn cue-editor__btn--danger"
          onClick={handleDelete}
        >
          Supprimer
        </button>
        <button
          className="cue-editor__btn cue-editor__btn--primary"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
