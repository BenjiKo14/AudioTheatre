import ProgressBar from './ProgressBar';
import './CueCard.css';

/**
 * CueCard — Carte du cue audio.
 * Bouton play/stop souris (onPlay / onStop).
 * prev2/next2 : compact horizontal sans bouton.
 * prev/next : bouton visible au hover.
 * current : bouton toujours visible.
 */
export default function CueCard({ cue, isPlaying, progress, variant = 'current', onPlay, onStop }) {
  const isMissing = cue?.audioMissing;

  const classes = [
    'cue-card',
    `cue-card--${variant}`,
    isMissing  ? 'cue-card--missing'  : '',
    isPlaying  ? 'cue-card--playing'  : '',
  ].filter(Boolean).join(' ');

  function handlePlayStop(e) {
    e.stopPropagation(); // ne pas déclencher le onClick du slot parent
    if (isPlaying) onStop?.();
    else           onPlay?.();
  }

  const showPlayBtn = !isMissing && (variant === 'current' || variant === 'prev' || variant === 'next');

  return (
    <article className={classes} aria-label={`Cue audio : ${cue.title}`}>

      {isMissing && (
        <div className="cue-card__missing-badge">⚠ Fichier manquant</div>
      )}

      <div className="cue-card__pictogram" role="img" aria-label={cue.pictogram || 'Son'}>
        {cue.pictogram || '🔊'}
      </div>

      <h2 className="cue-card__title">{cue.title}</h2>

      {cue.note && <p className="cue-card__note">{cue.note}</p>}

      {variant === 'current' && (
        <div className="cue-card__progress">
          <ProgressBar elapsed={progress?.elapsed ?? 0} duration={progress?.duration ?? 0} />
        </div>
      )}

      {showPlayBtn && (
        <button
          className={`cue-card__play-btn${isPlaying ? ' cue-card__play-btn--playing' : ''}`}
          onClick={handlePlayStop}
          title={isPlaying ? 'Arrêter' : 'Jouer'}
          aria-label={isPlaying ? 'Arrêter ce son' : 'Jouer ce son'}
        >
          {isPlaying ? '⏹' : '▶'}
        </button>
      )}

    </article>
  );
}
