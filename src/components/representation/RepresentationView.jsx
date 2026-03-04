import { useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAudio } from '../../hooks/useAudio';
import { useKeyboard } from '../../hooks/useKeyboard';
import CueList from './CueList';
import CueCard from './CueCard';
import SceneCard from './SceneCard';
import KeyboardBar from './KeyboardBar';
import './RepresentationView.css';

const OFFSETS = [-2, -1, 0, 1, 2];
const VARIANT  = { '-2': 'prev2', '-1': 'prev', '0': 'current', '1': 'next', '2': 'next2' };

export default function RepresentationView() {
  const { state, dispatch } = useAppContext();
  const { cues, currentIndex, playingIds } = state;
  const audio = useAudio(cues, dispatch);
  const currentCue = cues[currentIndex] ?? null;

  // ── Animation de transition ──────────────────────────────────
  const runwayRef    = useRef(null);
  const prevIdxRef   = useRef(currentIndex);

  useEffect(() => {
    if (currentIndex === prevIdxRef.current) return;
    const dir = currentIndex > prevIdxRef.current ? 'next' : 'prev';
    const el  = runwayRef.current;
    if (el) {
      el.classList.remove('rv-anim--next', 'rv-anim--prev');
      void el.offsetWidth; // reflow pour redéclencher l'animation
      el.classList.add(`rv-anim--${dir}`);
    }
    prevIdxRef.current = currentIndex;
  }, [currentIndex]);

  // ── Clavier ─────────────────────────────────────────────────
  useKeyboard({
    onNext: () => dispatch({ type: 'NEXT_CUE' }),
    onPrev: () => dispatch({ type: 'PREV_CUE' }),
    onPlay: () => {
      if (!currentCue || currentCue.type === 'scene' || currentCue.audioMissing) return;
      dispatch({ type: 'PLAY_CUE', payload: { id: currentCue.id } });
      audio.play(currentCue.id);
    },
    onStop: () => {
      if (!currentCue) return;
      dispatch({ type: 'STOP_CUE', payload: { id: currentCue.id } });
      audio.stop(currentCue.id);
    },
    onStopAll: () => { dispatch({ type: 'STOP_ALL' }); audio.stopAll(); },
  });

  // Pistes actives (tous les sons en cours)
  const activeTracks = playingIds
    .map(id => ({ cue: cues.find(c => c.id === id), progress: audio.getProgress(id) }))
    .filter(t => t.cue);

  return (
    <div className="representation-view">
      <CueList />

      <div className="representation-view__main">

        {/* ── Runway 5 slots ── */}
        <div className="representation-view__runway" ref={runwayRef}>
          {!currentCue ? (
            <div className="representation-view__empty">Setlist vide</div>
          ) : (
            OFFSETS.map(offset => {
              const idx     = currentIndex + offset;
              const cue     = idx >= 0 && idx < cues.length ? cues[idx] : null;
              const variant = VARIANT[String(offset)];
              const isPlaying = cue ? playingIds.includes(cue.id) : false;

              return (
                <div
                  key={offset}
                  className={`rv-slot rv-slot--${variant}${!cue ? ' rv-slot--empty' : ''}`}
                  onClick={offset !== 0 && cue ? () => dispatch({ type: 'SET_CURRENT_INDEX', payload: idx }) : undefined}
                >
                  {cue && (
                    cue.type === 'scene'
                      ? <SceneCard cue={cue} variant={variant} />
                      : <CueCard
                          cue={cue}
                          variant={variant}
                          isPlaying={isPlaying}
                          progress={{ elapsed: audio.getProgress(cue.id)?.elapsed ?? 0, duration: audio.getProgress(cue.id)?.duration ?? audio.getDuration(cue.id) }}
                          onPlay={() => {
                            if (offset !== 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: idx });
                            if (!cue.audioMissing) {
                              dispatch({ type: 'PLAY_CUE', payload: { id: cue.id } });
                              audio.play(cue.id);
                            }
                          }}
                          onStop={() => {
                            dispatch({ type: 'STOP_CUE', payload: { id: cue.id } });
                            audio.stop(cue.id);
                          }}
                        />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Bande pistes actives ── */}
        {activeTracks.length > 0 && (
          <div className="live-tracks">
            <div className="live-tracks__header">
              <span className="live-tracks__dot" />
              <span className="live-tracks__label">EN COURS</span>
              <span className="live-tracks__count">{activeTracks.length}</span>
            </div>
            <div className="live-tracks__list">
              {activeTracks.map(({ cue, progress }) => {
                const pct = progress?.duration > 0
                  ? Math.min((progress.elapsed / progress.duration) * 100, 100)
                  : 0;
                return (
                  <div key={cue.id} className="live-track">
                    <span className="live-track__icon">{cue.pictogram || '🔊'}</span>
                    <span className="live-track__title">{cue.title}</span>
                    <div className="live-track__bar">
                      <div className="live-track__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="live-track__time">
                      {progress ? `${fmt(progress.elapsed)} / ${fmt(progress.duration)}` : '—'}
                    </span>
                    <button
                      className="live-track__stop"
                      onClick={() => {
                        dispatch({ type: 'STOP_CUE', payload: { id: cue.id } });
                        audio.stop(cue.id);
                      }}
                      title="Arrêter ce son"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <KeyboardBar />
      </div>
    </div>
  );
}

function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
