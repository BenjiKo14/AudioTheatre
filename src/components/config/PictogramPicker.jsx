import './PictogramPicker.css';

// Grille 4×N d'emojis pour les cues audio
const PICTOGRAMS = [
  '🔊', '🎵', '🎶', '🎤',
  '🎼', '🎹', '🥁', '🎸',
  '🎺', '🎻', '🪗', '🪘',
  '🔔', '🔕', '📣', '📢',
  '🌧️', '⛈️', '🌊', '💨',
  '🏙️', '🌆', '🌃', '🌉',
  '🚗', '🚂', '✈️', '🚢',
  '🔫', '💥', '🪖', '⚡',
  '🌙', '☀️', '🌺', '🍂',
  '👣', '🚪', '📞', '⏰',
  '🎭', '🎬', '🎩', '🎪',
  '❤️', '💔', '😭', '😱',
  '🔥', '💧', '🌪️', '🌈',
  '🎊', '🎉', '🥂', '🍾',
  '🐦', '🦅', '🐺', '🦁',
  '🌿', '🌲', '🍃', '🌸',
];

/**
 * PictogramPicker — Grille 4×N d'emojis sélectionnables.
 * Sélection → amber border + amber background.
 * Bouton "Effacer" pour supprimer le pictogramme courant.
 */
export default function PictogramPicker({ value, onChange }) {
  return (
    <div className="pictogram-picker">
      {value && (
        <button
          className="pictogram-picker__clear"
          onClick={() => onChange('')}
          title="Effacer le pictogramme"
        >
          ✕ Effacer
        </button>
      )}
      <div className="pictogram-picker__grid" role="listbox" aria-label="Choisir un pictogramme">
        {PICTOGRAMS.map(emoji => {
          const isSelected = value === emoji;
          return (
            <button
              key={emoji}
              role="option"
              aria-selected={isSelected}
              className={`pictogram-picker__item ${isSelected ? 'pictogram-picker__item--selected' : ''}`}
              onClick={() => onChange(emoji)}
              title={emoji}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
