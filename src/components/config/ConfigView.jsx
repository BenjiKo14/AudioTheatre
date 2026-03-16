import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { writeConfig, importConfig, checkAudioFiles } from '../../utils/configLoader';
import ConfigList from './ConfigList';
import CueEditor from './CueEditor';
import SceneEditor from './SceneEditor';
import './ConfigView.css';

/**
 * ConfigView — Vue principale du mode configuration.
 * Stories couvertes : 3.1, 3.2, 3.3, 3.4, 3.5
 */
export default function ConfigView() {
  const { state, dispatch } = useAppContext();
  const { cues, configDirty } = state;

  const [selectedId, setSelectedId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState('');

  const selectedCue = cues.find(c => c.id === selectedId) ?? null;

  // ── Story 3.1 : Bascule de mode ──────────────────────────────
  function handleSwitchToRepresentation() {
    if (configDirty) {
      const ok = window.confirm(
        'Des modifications non sauvegardées existent. Passer quand même en mode représentation ?'
      );
      if (!ok) return;
    }
    dispatch({ type: 'SWITCH_MODE', payload: 'representation' });
  }

  // ── Ajout de cues ──────────────────────────────────────────
  function handleAddAudio() {
    const newCue = {
      id: crypto.randomUUID(),
      type: 'audio',
      title: '',
      note: '',
      pictogram: '',
      audioFile: '',
    };
    dispatch({ type: 'ADD_CUE', payload: { ...newCue, afterId: selectedId } });
    setSelectedId(newCue.id);
  }

  function handleAddScene() {
    const newCue = {
      id: crypto.randomUUID(),
      type: 'scene',
      title: '',
      description: '',
      watchFor: '',
    };
    dispatch({ type: 'ADD_CUE', payload: { ...newCue, afterId: selectedId } });
    setSelectedId(newCue.id);
  }

  function handleSelectCue(id) {
    setSelectedId(id);
  }

  function handleCueDeleted() {
    setSelectedId(null);
  }

  // ── Story 3.5 : Sauvegarder ────────────────────────────────
  async function handleSave() {
    setSaveStatus('saving');
    setSaveError('');
    try {
      await writeConfig(cues);
      dispatch({ type: 'SAVE_CONFIG_SUCCESS' });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  // ── Story 3.5 : Importer JSON/CSV ─────────────────────────
  async function handleImport() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const filePath = await open({
        multiple: false,
        filters: [
          { name: 'Setlist', extensions: ['json', 'csv'] },
        ],
      });
      if (!filePath) return;

      const result = await importConfig(filePath);
      // Vérifier les fichiers audio avant de changer de mode (évite les sons silencieux)
      const checkedCues = await checkAudioFiles(result.cues);
      dispatch({ type: 'LOAD_CONFIG', payload: { cues: checkedCues } });
      dispatch({ type: 'SWITCH_MODE', payload: checkedCues.length > 0 ? 'representation' : 'config' });
      setSelectedId(null);
    } catch (err) {
      window.alert(`Format de fichier invalide :\n${err.message}`);
    }
  }

  return (
    <div className="config-view">
      {/* ── En-tête ── */}
      <div className="config-view__header">
        <h1 className="config-view__title">AudioTheatre — Configuration</h1>
        <div className="config-view__actions">
          {configDirty && (
            <span className="config-view__dirty-indicator">● Non sauvegardé</span>
          )}
          {saveStatus === 'error' && (
            <span className="config-view__error-indicator" title={saveError}>⚠ Erreur de sauvegarde</span>
          )}
          <button
            className="config-view__btn config-view__btn--import"
            onClick={handleImport}
          >
            Importer (JSON/CSV)
          </button>
          <button
            className="config-view__btn config-view__btn--save"
            onClick={handleSave}
            disabled={!configDirty || saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Sauvegarde…' : saveStatus === 'saved' ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
          <button
            className="config-view__btn config-view__btn--preview"
            onClick={handleSwitchToRepresentation}
          >
            Mode Représentation
          </button>
        </div>
      </div>

      {/* ── Corps deux panneaux ── */}
      <div className="config-view__body">
        {/* Panneau gauche */}
        <div className="config-view__left">
          <div className="config-view__add-buttons">
            <button className="config-view__btn config-view__btn--add" onClick={handleAddAudio}>
              + Ajouter un son
            </button>
            <button className="config-view__btn config-view__btn--add-scene" onClick={handleAddScene}>
              + Ajouter une scène
            </button>
          </div>
          <ConfigList selectedId={selectedId} onSelect={handleSelectCue} />
        </div>

        {/* Panneau droit — éditeur */}
        <div className="config-view__right">
          {selectedCue ? (
            selectedCue.type === 'audio' ? (
              <CueEditor
                key={selectedCue.id}
                cue={selectedCue}
                onDeleted={handleCueDeleted}
              />
            ) : (
              <SceneEditor
                key={selectedCue.id}
                cue={selectedCue}
                onDeleted={handleCueDeleted}
              />
            )
          ) : (
            <div className="config-view__empty-editor">
              <p>Sélectionnez un cue ou ajoutez-en un nouveau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
