import { useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import CueListItem from './CueListItem';
import './CueList.css';

/**
 * CueList — Sidebar gauche scrollable avec auto-scroll sur le cue courant.
 * Largeur fixe 240px définie par tokens.
 */
export default function CueList() {
  const { state, dispatch } = useAppContext();
  const { cues, currentIndex } = state;
  const activeRef = useRef(null);

  // Auto-scroll vers le cue actif
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentIndex]);

  function handleClick(index) {
    dispatch({ type: 'SET_CURRENT_INDEX', payload: index });
  }

  function handleConfigMode() {
    dispatch({ type: 'SWITCH_MODE', payload: 'config' });
  }

  return (
    <nav className="cue-list" aria-label="Setlist">
      <div className="cue-list__header">
        <span className="cue-list__title">Setlist</span>
        <span className="cue-list__count">{cues.length} cues</span>
      </div>
      <button className="cue-list__config-btn" onClick={handleConfigMode} title="Retour à la configuration">
        ← Config
      </button>
      <div className="cue-list__items" role="list">
        {cues.map((cue, index) => (
          <div
            key={cue.id}
            role="listitem"
            ref={index === currentIndex ? activeRef : null}
          >
            <CueListItem
              cue={cue}
              index={index}
              isActive={index === currentIndex}
              onClick={handleClick}
            />
          </div>
        ))}
        {cues.length === 0 && (
          <p className="cue-list__empty">Setlist vide</p>
        )}
      </div>
    </nav>
  );
}
