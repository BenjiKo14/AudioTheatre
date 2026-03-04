import './KeyboardBar.css';

/**
 * KeyboardBar — Barre fixe en bas affichant les raccourcis clavier.
 * Toujours visible en mode représentation.
 * Touche Stop en rouge (danger), touche d'urgence aussi.
 */
export default function KeyboardBar() {
  return (
    <div className="keyboard-bar" role="complementary" aria-label="Raccourcis clavier">
      <div className="keyboard-bar__shortcuts">
        <ShortcutKey keyLabel="↑" action="Précédent" />
        <ShortcutKey keyLabel="↓" action="Suivant" />
        <ShortcutKey keyLabel="Espace" action="Jouer" />
        <ShortcutKey keyLabel="Échap" action="Arrêter" variant="danger" />
        <ShortcutKey keyLabel="S" action="Arrêt d'urgence" variant="danger" />
      </div>
    </div>
  );
}

function ShortcutKey({ keyLabel, action, variant }) {
  const variantClass = variant ? `keyboard-bar__key--${variant}` : '';
  return (
    <div className="keyboard-bar__shortcut">
      <kbd className={`keyboard-bar__key ${variantClass}`}>{keyLabel}</kbd>
      <span className="keyboard-bar__action">{action}</span>
    </div>
  );
}
