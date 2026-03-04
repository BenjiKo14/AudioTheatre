import { useAppContext } from '../../context/AppContext';
import './ConfigList.css';

/**
 * ConfigList — Liste de la setlist en mode configuration.
 * Chaque cue est cliquable pour l'édition.
 * Indicateur de type : ambre (audio) ou bleu (scène).
 * Note: drag & drop réservé Phase 2 (PRD). MVP utilise Monter/Descendre.
 */
export default function ConfigList({ selectedId, onSelect }) {
  const { state } = useAppContext();
  const { cues } = state;

  return (
    <div className="config-list" role="list" aria-label="Setlist en configuration">
      {cues.length === 0 && (
        <p className="config-list__empty">
          Aucun cue. Ajoutez un son ou une scène.
        </p>
      )}
      {cues.map((cue, index) => {
        const isSelected = cue.id === selectedId;
        const typeClass = cue.type === 'audio' ? 'config-list__item--audio' : 'config-list__item--scene';
        const selectedClass = isSelected ? 'config-list__item--selected' : '';

        return (
          <div key={cue.id} role="listitem">
          <button
            className={`config-list__item ${typeClass} ${selectedClass}`}
            onClick={() => onSelect(cue.id)}
            aria-selected={isSelected}
          >
            <span className="config-list__item-index">{index + 1}</span>
            <span className="config-list__item-icon">
              {cue.pictogram || (cue.type === 'audio' ? '🔊' : '📋')}
            </span>
            <div className="config-list__item-info">
              <span className="config-list__item-title">
                {cue.title || <em className="config-list__item-untitled">Sans titre</em>}
              </span>
              <span className="config-list__item-type">
                {cue.type === 'audio' ? 'Audio' : 'Scène'}
              </span>
            </div>
            {cue.audioMissing && (
              <span className="config-list__item-warning" title="Fichier audio manquant">⚠</span>
            )}
          </button>
          </div>
        );
      })}
    </div>
  );
}
