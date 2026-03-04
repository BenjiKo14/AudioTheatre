import ProgressBar from './ProgressBar';
import './CueCard.css';

export default function CueCard({ cue, isPlaying, progress, variant = 'current', onPlay, onStop }) {
  const isMissing = cue?.audioMissing;
  const isCurrent = variant === 'current';

  const classes = [
    'cue-card',
    `cue-card--${variant}`,
    isMissing ? 'cue-card--missing' : '',
    isPlaying ? 'cue-card--playing' : '',
  ].filter(Boolean).join(' ');

  function handlePlayStop(e) {
    e.stopPropagation();
    if (isPlaying) onStop?.();
    else           onPlay?.();
  }

  const canPlay = !isMissing;

  return (
    <article className={classes} aria-label={`Cue audio : ${cue.title}`}>

      {/* Pictogramme — colonne gauche */}
      <div className="cue-card__pictogram" role="img" aria-label={cue.pictogram || 'Son'}>
        {cue.pictogram || '🔊'}
      </div>

      {/* Corps — colonne centrale */}
      <div className="cue-card__body">
        {isMissing && (
          <div className="cue-card__missing-badge">⚠ Fichier manquant</div>
        )}
        <h2 className="cue-card__title">{cue.title}</h2>
        {cue.note && <p className="cue-card__note">{cue.note}</p>}

        {/* Pour current : progress + play sur la même ligne */}
        {isCurrent && (
          <div className="cue-card__bottom">
            <div className="cue-card__progress">
              <ProgressBar elapsed={progress?.elapsed ?? 0} duration={progress?.duration ?? 0} />
            </div>
            {canPlay && (
              <button
                className={`cue-card__play-btn${isPlaying ? ' cue-card__play-btn--playing' : ''}`}
                onClick={handlePlayStop}
                title={isPlaying ? 'Arrêter' : 'Jouer'}
                aria-label={isPlaying ? 'Arrêter ce son' : 'Jouer ce son'}
              >
                {isPlaying ? '⏹' : '▶'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pour prev / next : play en dehors du body, centré verticalement */}
      {!isCurrent && canPlay && (variant === 'prev' || variant === 'next') && (
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
