import { useAppContext } from '../../context/AppContext';
import './CueListItem.css';

/**
 * CueListItem — Une ligne dans la sidebar de la setlist.
 * Audio → couleur ambre, Scène → couleur bleu.
 * Indique l'état audioMissing si applicable.
 */
export default function CueListItem({ cue, index, isActive, onClick }) {
  const typeClass = cue.type === 'audio' ? 'cue-list-item--audio' : 'cue-list-item--scene';
  const activeClass = isActive ? 'cue-list-item--active' : '';
  const missingClass = cue.audioMissing ? 'cue-list-item--missing' : '';

  return (
    <button
      className={`cue-list-item ${typeClass} ${activeClass} ${missingClass}`}
      onClick={() => onClick(index)}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`Cue ${index + 1}: ${cue.title}${cue.audioMissing ? ' — fichier manquant' : ''}`}
    >
      <span className="cue-list-item__index">{index + 1}</span>
      <span className="cue-list-item__pictogram">
        {cue.pictogram || (cue.type === 'audio' ? '🔊' : '📋')}
      </span>
      <span className="cue-list-item__title">{cue.title}</span>
      {cue.audioMissing && (
        <span className="cue-list-item__warning" title="Fichier audio manquant">⚠</span>
      )}
    </button>
  );
}
