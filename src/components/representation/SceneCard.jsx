import './SceneCard.css';

/**
 * SceneCard — Carte d'annotation de scène dans la zone téléprompter.
 * Badge bleu "Annotation de scène", titre, description, watchFor en ambre.
 * Hint "↓ pour avancer" affiché en bas.
 */
export default function SceneCard({ cue, variant = 'current' }) {
  const variantClass = `scene-card--${variant}`;

  return (
    <article
      className={`scene-card ${variantClass}`}
      aria-label={`Annotation de scène : ${cue.title}`}
    >
      <div className="scene-card__badge">Annotation de scène</div>

      <h2 className="scene-card__title">{cue.title}</h2>

      {cue.description && (
        <p className="scene-card__description">{cue.description}</p>
      )}

      {cue.watchFor && (
        <div className="scene-card__watch-for">
          <span className="scene-card__watch-for-label">À surveiller :</span>
          <span className="scene-card__watch-for-text">{cue.watchFor}</span>
        </div>
      )}

      {variant === 'current' && (
        <p className="scene-card__hint">↓ pour avancer</p>
      )}
    </article>
  );
}
