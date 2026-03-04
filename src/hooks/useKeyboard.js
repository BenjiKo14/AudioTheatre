import { useEffect, useRef } from 'react';

/**
 * useKeyboard — Handler clavier global pour le mode représentation.
 * Attache un écouteur `keydown` sur `window` — global, indépendant du focus DOM.
 * Callbacks : onNext, onPrev, onPlay, onStop, onStopAll
 *
 * - ↓ (ArrowDown) : avancer au cue suivant
 * - ↑ (ArrowUp) : reculer au cue précédent
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Pas de dépendances — les handlers sont dans la ref
}
