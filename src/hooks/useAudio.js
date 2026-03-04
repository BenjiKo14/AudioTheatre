import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * useAudio — Moteur audio Web Audio API.
 * Singleton AudioContext + préchargement de tous les fichiers en mémoire.
 * Latence déclenchement < 20ms (NFR1 < 200ms ✅).
 * Cleanup automatique via AudioBufferSourceNode.onended (NFR5/NFR8).
 *
 * API exposée :
 *   play(id)       → joue le son du cue (id)
 *   stop(id)       → arrête le son du cue (id)
 *   stopAll()      → arrête tous les sons
 *   isPlaying(id)  → boolean
 *   getProgress(id)→ { elapsed, duration } | null
 *   missingFiles   → Set<id> des cues avec fichier manquant
 */
export function useAudio(cues, dispatch) {
  // AudioContext singleton
  const audioContextRef = useRef(null);

  // Map id → AudioBuffer (buffers décodés en mémoire)
  const audioBuffers = useRef(new Map());

  // Map id → [{ node, startTime, playDuration }]
  // playDuration = durée effective (après trim), utilisée pour la progress bar
  const activeNodes = useRef(new Map());

  // Ref sur les cues pour accéder à trimStart/trimEnd sans dépendance dans play()
  const cuesRef = useRef(cues);

  // Synchronise cuesRef à chaque rendu
  useEffect(() => { cuesRef.current = cues; }, [cues]);

  // Progress state : id → { elapsed, duration }
  const [progressMap, setProgressMap] = useState(new Map());

  // Set des ids avec fichier manquant
  const [missingFiles, setMissingFiles] = useState(new Set());

  // Interval pour progress bar (100ms)
  const progressInterval = useRef(null);

  /**
   * Initialise l'AudioContext singleton.
   */
  function getAudioContext() {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }

  /**
   * Charge et décode tous les fichiers audio référencés dans les cues.
   * Sons manquants → marqués dans missingFiles (pas d'erreur globale).
   */
  useEffect(() => {
    if (!cues || cues.length === 0) {
      audioBuffers.current.clear();
      return;
    }

    // Nettoyer les buffers des cues supprimés (évite les fuites mémoire)
    const currentIds = new Set(cues.map(c => c.id));
    for (const id of audioBuffers.current.keys()) {
      if (!currentIds.has(id)) audioBuffers.current.delete(id);
    }

    const audioCues = cues.filter(c => c.type === 'audio' && c.audioFile && !c.audioMissing);

    async function loadAll() {
      const ctx = getAudioContext();
      const missing = new Set();

      await Promise.all(
        audioCues.map(async (cue) => {
          if (audioBuffers.current.has(cue.id)) return; // déjà chargé
          try {
            const arrayBuffer = await readAudioFile(cue.audioFile);
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            audioBuffers.current.set(cue.id, audioBuffer);
          } catch {
            missing.add(cue.id);
          }
        })
      );

      if (missing.size > 0) {
        setMissingFiles(prev => new Set([...prev, ...missing]));
        // Synchroniser le store global pour que l'UI affiche le badge ⚠
        missing.forEach(id => dispatch?.({ type: 'MARK_AUDIO_MISSING', payload: { id } }));
      }
    }

    loadAll().catch(err => {
      console.error('[useAudio] Erreur critique lors du chargement audio :', err);
    });
  }, [cues]);

  /**
   * Démarre le progress interval si des sons jouent.
   */
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) return;
    progressInterval.current = setInterval(() => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      const newMap = new Map();

      activeNodes.current.forEach((nodeList, id) => {
        if (!nodeList || nodeList.length === 0) return;
        const latest = nodeList[nodeList.length - 1];
        const elapsed = now - latest.startTime;
        const duration = latest.playDuration ?? latest.node.buffer?.duration ?? 0;
        newMap.set(id, { elapsed: Math.min(elapsed, duration), duration });
      });

      setProgressMap(newMap);

      // Arrêter l'interval si plus de sons actifs
      if (activeNodes.current.size === 0) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        setProgressMap(new Map());
      }
    }, 100);
  }, []);

  /**
   * Joue le son du cue (id).
   * Crée un nouveau AudioBufferSourceNode (supporte plusieurs simultanés).
   */
  const play = useCallback((id) => {
    const buffer = audioBuffers.current.get(id);
    if (!buffer) return; // fichier manquant ou non chargé

    const ctx = getAudioContext();
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);

    // Récupère le trim du cue (trimStart/trimEnd en secondes)
    const cue = cuesRef.current.find(c => c.id === id);
    const offset = cue?.trimStart ?? 0;
    const trimEnd = cue?.trimEnd ?? null;
    const playDuration = trimEnd != null ? trimEnd - offset : buffer.duration - offset;
    const startTime = ctx.currentTime;

    // Cleanup automatique à la fin (NFR5 — pas de fuite mémoire)
    node.onended = () => {
      const list = activeNodes.current.get(id);
      if (list) {
        const filtered = list.filter(item => item.node !== node);
        if (filtered.length === 0) {
          activeNodes.current.delete(id);
          dispatch?.({ type: 'STOP_CUE', payload: { id } });
        } else {
          activeNodes.current.set(id, filtered);
        }
      }
    };

    // Ajouter à la liste des nodes actifs pour ce cue
    const existing = activeNodes.current.get(id) ?? [];
    activeNodes.current.set(id, [...existing, { node, startTime, playDuration }]);

    // start(when, offset, duration) — lecture depuis trimStart jusqu'à trimEnd
    node.start(0, offset, playDuration);
    startProgressTracking();
  }, [startProgressTracking]);

  /**
   * Arrête le son du cue (id) — arrête tous les nodes actifs pour ce cue.
   */
  const stop = useCallback((id) => {
    const list = activeNodes.current.get(id);
    if (!list || list.length === 0) return;

    list.forEach(({ node }) => {
      try { node.stop(); } catch { /* ignore si déjà arrêté */ }
    });
    activeNodes.current.delete(id);
  }, []);

  /**
   * Arrêt d'urgence — arrête tous les sons simultanément.
   */
  const stopAll = useCallback(() => {
    activeNodes.current.forEach((list) => {
      list.forEach(({ node }) => {
        try { node.stop(); } catch { /* ignore */ }
      });
    });
    activeNodes.current.clear();
    clearInterval(progressInterval.current);
    progressInterval.current = null;
    setProgressMap(new Map());
  }, []);

  /**
   * Retourne true si le cue (id) est en cours de lecture.
   */
  const isPlaying = useCallback((id) => {
    const list = activeNodes.current.get(id);
    return list && list.length > 0;
  }, []);

  /**
   * Retourne la durée effective du cue (id) depuis le buffer préchargé,
   * en tenant compte du trim. Retourne 0 si le buffer n'est pas encore chargé.
   */
  const getDuration = useCallback((id) => {
    const buffer = audioBuffers.current.get(id);
    if (!buffer) return 0;
    const cue = cuesRef.current.find(c => c.id === id);
    const offset = cue?.trimStart ?? 0;
    const trimEnd = cue?.trimEnd ?? null;
    return trimEnd != null ? trimEnd - offset : buffer.duration - offset;
  }, []);

  /**
   * Retourne la progression du cue (id) : { elapsed, duration } ou null.
   */
  const getProgress = useCallback((id) => {
    return progressMap.get(id) ?? null;
  }, [progressMap]);

  // Cleanup à la destruction du composant
  useEffect(() => {
    return () => {
      clearInterval(progressInterval.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { play, stop, stopAll, isPlaying, getProgress, getDuration, missingFiles };
}

/**
 * Lit un fichier audio et retourne son ArrayBuffer.
 * Utilise @tauri-apps/plugin-fs (même mécanisme que readDir/exists)
 * → évite le protocole asset:// non configuré en Tauri 2.x.
 * Fallback fetch pour les tests hors-Tauri (navigateur).
 */
async function readAudioFile(filePath) {
  try {
    const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const isAbsolute = /^[A-Za-z]:[\\\/]/.test(filePath) || filePath.startsWith('/');
    const opts = isAbsolute ? {} : { baseDir: BaseDirectory.Resource };
    const bytes = await readFile(filePath, opts);
    // Uint8Array → ArrayBuffer (copie pour éviter les problèmes de référence)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    // Fallback pour les tests hors-Tauri (navigateur)
    const response = await fetch(`/${filePath}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.arrayBuffer();
  }
}
