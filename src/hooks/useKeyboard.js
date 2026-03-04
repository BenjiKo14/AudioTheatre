import { useEffect, useRef } from 'react';

const WHEEL_THROTTLE_MS = 120;

/**
 * useKeyboard — Handler clavier + molette global pour le mode représentation.
 * Attache des écouteurs `keydown` et `wheel` sur `window`.
 * Callbacks : onNext, onPrev, onPlay, onStop, onStopAll
 *
 * - ↓ (ArrowDown) / molette bas : avancer au cue suivant
 * - ↑ (ArrowUp)   / molette haut : reculer au cue précédent
 * - Espace (Space) : jouer le son du cue courant
 * - Échap (Escape) : arrêter le son du cue courant
 * - S : arrêt d'urgence (tous les sons)
 *
 * NFR2 : < 100ms — le dispatch est synchrone, aucune latence introduite.
 */
export function useKeyboard({ onNext, onPrev, onPlay, onStop, onStopAll }) {
  // Utilisation de refs pour que l'effect n'ait pas à se recréer à chaque render
  const handlers = useRef({ onNext, onPrev, onPlay, onStop, onStopAll });
  handlers.current = { onNext, onPrev, onPlay, onStop, onStopAll };

  const lastWheelRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(event) {
      // Ignorer si on est dans un input / textarea / select (mode config)
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const { onNext, onPrev, onPlay, onStop, onStopAll } = handlers.current;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onNext?.();
          break;

        case 'ArrowUp':
          event.preventDefault();
          onPrev?.();
          break;

        case ' ':
          event.preventDefault();
          onPlay?.();
          break;

        case 'Escape':
          event.preventDefault();
          onStop?.();
          break;

        case 's':
        case 'S':
          event.preventDefault();
          onStopAll?.();
          break;

        default:
          break;
      }
    }

    function handleWheel(event) {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // Ne pas intercepter le scroll dans la sidebar (CueList)
      if (event.target?.closest?.('.cue-list')) return;

      const now = Date.now();
      if (now - lastWheelRef.current < WHEEL_THROTTLE_MS) return;
      lastWheelRef.current = now;

      const { onNext, onPrev } = handlers.current;
      if (event.deltaY > 0) onNext?.();
      else if (event.deltaY < 0) onPrev?.();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []); // Pas de dépendances — les handlers sont dans la ref
}
