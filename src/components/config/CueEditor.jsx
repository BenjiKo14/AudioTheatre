import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import PictogramPicker from './PictogramPicker';
import AudioTrimmer from './AudioTrimmer';
import './CueEditor.css';

/**
 * CueEditor — Formulaire d'édition d'un cue audio.
 * ACs Story 3.2 :
 *  - Sauvegarde via dispatch UPDATE_CUE
 *  - PictogramPicker intégré
 *  - Sélecteur de fichier audio via Tauri dialog
 *  - Bouton "Enregistrer" désactivé si titre vide
 *  - Bouton "Supprimer" avec confirmation
 *  - Bouton "Monter / Descendre" (Story 3.4)
 */
export default function CueEditor({ cue, onUpdated, onDeleted }) {
  const { state, dispatch } = useAppContext();
  const { cues } = state;

  const [title, setTitle] = useState(cue.title ?? '');
  const [note, setNote] = useState(cue.note ?? '');
  const [pictogram, setPictogram] = useState(cue.pictogram ?? '');
  const [audioFile, setAudioFile] = useState(cue.audioFile ?? '');
  const [trimStart, setTrimStart] = useState(cue.trimStart ?? null);
  const [trimEnd, setTrimEnd] = useState(cue.trimEnd ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [soundsList, setSoundsList] = useState([]); // 'sounds/intro.mp3', ...

  useEffect(() => {
    async function loadSounds() {
      try {
        const { readDir, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir('sounds', { baseDir: BaseDirectory.Resource });
        const audioExts = ['mp3', 'wav', 'ogg', 'flac'];
        const files = entries
          .filter(e => audioExts.some(ext => e.name?.toLowerCase().endsWith('.' + ext)))
          .map(e => `sounds/${e.name}`)
          .sort();
        setSoundsList(files);
      } catch {
        setSoundsList([]);
      }
    }
    loadSounds();
  }, []);

  const canSave = title.trim().length > 0;
  const cueIndex = cues.findIndex(c => c.id === cue.id);
  const isFirst = cueIndex === 0;
  const isLast = cueIndex === cues.length - 1;

  function handleSave() {
    if (!canSave) return;
    dispatch({
      type: 'UPDATE_CUE',
      payload: { ...cue, title: title.trim(), note, pictogram, audioFile, trimStart, trimEnd },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onUpdated?.();
  }

  function handleDelete() {
    const ok = window.confirm(`Supprimer le cue "${cue.title || 'Sans titre'}" ?`);
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

  async function handleSelectChange(e) {
    const val = e.target.value;
    if (val === '__other__') {
      await handlePickAudioFile();
    } else {
      setAudioFile(val);
      setTrimStart(null);
      setTrimEnd(null);
    }
  }

  async function handlePickAudioFile() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }],
      });
      if (selected) {
        // Rendre le chemin relatif au dossier du .exe si le fichier est dedans
        try {
          const { resourceDir } = await import('@tauri-apps/api/path');
          const base = (await resourceDir()).replace(/\\/g, '/').replace(/\/$/, '');
          const normalized = selected.replace(/\\/g, '/');
          setAudioFile(
            normalized.startsWith(base + '/')
              ? normalized.slice(base.length + 1)
              : selected
          );
        } catch {
          setAudioFile(selected);
        }
        setTrimStart(null);
        setTrimEnd(null);
      }
    } catch {
      // Hors-Tauri (dev navigateur) : ignorer
    }
  }

  return (
    <div className="cue-editor">
      <div className="cue-editor__header">
        <span className="cue-editor__type-badge cue-editor__type-badge--audio">🔊 Son audio</span>
        <div className="cue-editor__move-buttons">
          <button
            className="cue-editor__btn cue-editor__btn--move"
            onClick={handleMoveUp}
            disabled={isFirst}
            title="Monter"
            aria-label="Monter le cue"
          >↑ Monter</button>
          <button
            className="cue-editor__btn cue-editor__btn--move"
            onClick={handleMoveDown}
            disabled={isLast}
            title="Descendre"
            aria-label="Descendre le cue"
          >↓ Descendre</button>
        </div>
      </div>

      <div className="cue-editor__fields">
        {/* Titre */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="cue-title">
            Titre <span className="cue-editor__required">*</span>
          </label>
          <input
            id="cue-title"
            className="cue-editor__input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nom du son..."
            autoFocus
          />
        </div>

        {/* Note de contexte */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="cue-note">
            Note de contexte
          </label>
          <textarea
            id="cue-note"
            className="cue-editor__textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Quand jouer ce son..."
            rows={3}
          />
        </div>

        {/* Pictogramme */}
        <div className="cue-editor__field">
          <label className="cue-editor__label">Pictogramme</label>
          <button
            className="cue-editor__btn cue-editor__btn--secondary"
            onClick={() => setShowPicker(p => !p)}
          >
            {pictogram || '—'} {showPicker ? 'Fermer' : 'Choisir'}
          </button>
          {showPicker && (
            <PictogramPicker
              value={pictogram}
              onChange={v => { setPictogram(v); setShowPicker(false); }}
            />
          )}
        </div>

        {/* Fichier audio */}
        <div className="cue-editor__field">
          <label className="cue-editor__label" htmlFor="cue-audio">
            Fichier audio
          </label>
          <select
            id="cue-audio"
            className="cue-editor__select"
            value={soundsList.includes(audioFile) ? audioFile : (audioFile ? '__other__' : '')}
            onChange={handleSelectChange}
          >
            <option value="">— Aucun fichier —</option>
            {soundsList.map(f => (
              <option key={f} value={f}>{f.replace('sounds/', '')}</option>
            ))}
            {soundsList.length === 0 && (
              <option disabled>Dossier sounds/ vide ou introuvable</option>
            )}
            <option value="__other__">Choisir un autre fichier…</option>
          </select>
          {audioFile && !soundsList.includes(audioFile) && (
            <span className="cue-editor__audio-external">{audioFile}</span>
          )}
        </div>

        {/* Découpage audio */}
        {audioFile && (
          <AudioTrimmer
            audioFile={audioFile}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onChange={({ trimStart: s, trimEnd: e }) => {
              setTrimStart(s);
              setTrimEnd(e);
            }}
          />
        )}
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
