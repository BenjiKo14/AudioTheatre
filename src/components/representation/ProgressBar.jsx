import './ProgressBar.css';

/**
 * ProgressBar — Barre de progression audio.
 * Affiche elapsed / duration en mm:ss et une barre de remplissage.
 * Mise à jour pilotée par le parent (useAudio) toutes les 100ms.
 */
export default function ProgressBar({ elapsed = 0, duration = 0 }) {
  const percent = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={elapsed} aria-valuemax={duration}>
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="progress-bar__time">
        <span className="progress-bar__elapsed">{formatTime(elapsed)}</span>
        <span className="progress-bar__separator">/</span>
        <span className="progress-bar__duration">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
