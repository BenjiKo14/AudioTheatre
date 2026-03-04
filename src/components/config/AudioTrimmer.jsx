import { useState, useEffect, useRef } from 'react';
import './AudioTrimmer.css';

function formatTime(sec) {
  if (sec == null || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.round((sec % 1) * 10);
  return d > 0
    ? `${m}:${s.toString().padStart(2, '0')}.${d}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTime(str) {
  str = str.trim();
  const colonMatch = str.match(/^(\d+):(\d{1,2})(\.\d+)?$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseFloat(colonMatch[2] + (colonMatch[3] ?? ''));
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.max(0, num);
}

async function readAndDecode(filePath) {
  let arrayBuffer;
  try {
    const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const isAbsolute = /^[A-Za-z]:[\\\/]/.test(filePath) || filePath.startsWith('/');
    const opts = isAbsolute ? {} : { baseDir: BaseDirectory.Resource };
    const bytes = await readFile(filePath, opts);
    arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    const response = await fetch(`/${filePath}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    arrayBuffer = await response.arrayBuffer();
  }
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  return { ctx, buffer };
}

/**
 * AudioTrimmer — barre de sélection du début/fin + écoute de la sélection.
 *
 * Props :
 *   audioFile  {string}   chemin du fichier audio
 *   trimStart  {number}   début en secondes (null = 0)
 *   trimEnd    {number}   fin en secondes   (null = durée totale)
 *   onChange   {Function} appelé avec { trimStart, trimEnd } à chaque changement
 */
export default function AudioTrimmer({ audioFile, trimStart, trimEnd, onChange }) {
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(null);
  const [startInput, setStartInput] = useState('0:00');
  const [endInput, setEndInput] = useState('');

  // Preview playback
  const [playing, setPlaying] = useState(false);
  const [previewElapsed, setPreviewElapsed] = useState(0);

  // Refs drag
  const barRef = useRef(null);
  const startRef = useRef(0);
  const endRef = useRef(null);
  const durationRef = useRef(null);

  // Refs audio
  const audioCtxRef = useRef(null);
  const audioBufferRef = useRef(null);
  const previewNodeRef = useRef(null);
  const previewStartCtxTimeRef = useRef(null);
  const previewIntervalRef = useRef(null);

  // Charge (et décode) le fichier audio quand il change
  useEffect(() => {
    if (!audioFile) {
      setDuration(null);
      durationRef.current = null;
      audioBufferRef.current = null;
      return;
    }

    stopPreview();
    // Ferme l'ancien contexte
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setLoading(true);
    readAndDecode(audioFile)
      .then(({ ctx, buffer }) => {
        audioCtxRef.current = ctx;
        audioBufferRef.current = buffer;
        durationRef.current = buffer.duration;
        setDuration(buffer.duration);

        const s = trimStart ?? 0;
        const e = trimEnd ?? buffer.duration;
        startRef.current = s;
        endRef.current = e;
        setStart(s);
        setEnd(e);
        setStartInput(formatTime(s));
        setEndInput(formatTime(e));
      })
      .catch(() => {
        setDuration(null);
        durationRef.current = null;
        audioBufferRef.current = null;
      })
      .finally(() => setLoading(false));

    return () => { /* cleanup géré dans l'effet unmount */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile]);

  // Sync si les props changent (changement de cue sélectionné)
  useEffect(() => {
    if (durationRef.current == null) return;
    const s = trimStart ?? 0;
    const e = trimEnd ?? durationRef.current;
    startRef.current = s;
    endRef.current = e;
    setStart(s);
    setEnd(e);
    setStartInput(formatTime(s));
    setEndInput(formatTime(e));
  }, [trimStart, trimEnd]);

  // Cleanup à la destruction
  useEffect(() => {
    return () => {
      stopPreview();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ── Preview audio ──────────────────────────────────────────────

  function stopPreview(callStop = true) {
    if (callStop && previewNodeRef.current) {
      try { previewNodeRef.current.stop(); } catch { /* déjà arrêté */ }
    }
    previewNodeRef.current = null;
    clearInterval(previewIntervalRef.current);
    previewIntervalRef.current = null;
    setPlaying(false);
    setPreviewElapsed(0);
  }

  function handlePlay() {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;

    stopPreview();

    // Resume le contexte si suspendu (politique autoplay navigateur)
    if (ctx.state === 'suspended') ctx.resume();

    const offset = startRef.current;
    const playDuration = endRef.current - startRef.current;

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    previewNodeRef.current = node;
    previewStartCtxTimeRef.current = ctx.currentTime;

    node.onended = () => stopPreview(false);

    node.start(0, offset, playDuration);
    setPlaying(true);
    setPreviewElapsed(0);

    previewIntervalRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - previewStartCtxTimeRef.current;
      setPreviewElapsed(Math.min(elapsed, playDuration));
      if (elapsed >= playDuration) {
        clearInterval(previewIntervalRef.current);
      }
    }, 50);
  }

  // ── Drag ───────────────────────────────────────────────────────

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function notify(s, e) { onChange?.({ trimStart: s, trimEnd: e }); }

  function handleBarMouseDown(e, handle) {
    e.preventDefault();
    stopPreview();
    const bar = barRef.current;
    if (!bar || durationRef.current == null) return;

    function onMouseMove(ev) {
      const rect = bar.getBoundingClientRect();
      const ratio = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const time = ratio * durationRef.current;

      if (handle === 'start') {
        const newStart = clamp(time, 0, endRef.current - 0.5);
        startRef.current = newStart;
        setStart(newStart);
        setStartInput(formatTime(newStart));
        notify(newStart, endRef.current);
      } else {
        const newEnd = clamp(time, startRef.current + 0.5, durationRef.current);
        endRef.current = newEnd;
        setEnd(newEnd);
        setEndInput(formatTime(newEnd));
        notify(startRef.current, newEnd);
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // ── Inputs ─────────────────────────────────────────────────────

  function commitStart(val) {
    const parsed = parseTime(val);
    if (parsed != null && parsed >= 0 && parsed < endRef.current - 0.1) {
      startRef.current = parsed;
      setStart(parsed);
      setStartInput(formatTime(parsed));
      notify(parsed, endRef.current);
    } else {
      setStartInput(formatTime(startRef.current));
    }
  }

  function commitEnd(val) {
    const parsed = parseTime(val);
    if (parsed != null && parsed > startRef.current + 0.1 && parsed <= durationRef.current) {
      endRef.current = parsed;
      setEnd(parsed);
      setEndInput(formatTime(parsed));
      notify(startRef.current, parsed);
    } else {
      setEndInput(formatTime(endRef.current ?? durationRef.current));
    }
  }

  function handleReset() {
    stopPreview();
    const s = 0;
    const e = durationRef.current;
    startRef.current = s;
    endRef.current = e;
    setStart(s);
    setEnd(e);
    setStartInput(formatTime(s));
    setEndInput(formatTime(e));
    onChange?.({ trimStart: null, trimEnd: null });
  }

  // ── Rendu ──────────────────────────────────────────────────────

  if (!audioFile) return null;
  if (loading) return <div className="audio-trimmer audio-trimmer--loading">Chargement de l'audio…</div>;
  if (duration == null) return null;

  const startRatio = start / duration;
  const endVal = end ?? duration;
  const endRatio = endVal / duration;
  const isFullDuration = start <= 0.05 && Math.abs(endVal - duration) < 0.05;
  const playDuration = endVal - start;

  // Curseur de lecture : position dans la zone active
  const cursorRatio = playing
    ? startRatio + (previewElapsed / playDuration) * (endRatio - startRatio)
    : null;

  return (
    <div className="audio-trimmer">
      <div className="audio-trimmer__header">
        <span className="audio-trimmer__label">Découpage audio</span>
        <div className="audio-trimmer__header-actions">
          {!isFullDuration && (
            <button className="audio-trimmer__reset" onClick={handleReset}>
              Réinitialiser
            </button>
          )}
          <button
            className={`audio-trimmer__play-btn${playing ? ' audio-trimmer__play-btn--playing' : ''}`}
            onClick={playing ? () => stopPreview() : handlePlay}
            title={playing ? 'Arrêter l\'écoute' : 'Écouter la sélection'}
          >
            {playing ? '■ Arrêter' : '▶ Écouter'}
          </button>
        </div>
      </div>

      <div className="audio-trimmer__bar-area">
        <div className="audio-trimmer__bar" ref={barRef}>
          {/* Zone inactive gauche */}
          <div
            className="audio-trimmer__region audio-trimmer__region--inactive"
            style={{ left: 0, width: `${startRatio * 100}%` }}
          />
          {/* Zone active */}
          <div
            className="audio-trimmer__region audio-trimmer__region--active"
            style={{ left: `${startRatio * 100}%`, width: `${(endRatio - startRatio) * 100}%` }}
          />
          {/* Zone inactive droite */}
          <div
            className="audio-trimmer__region audio-trimmer__region--inactive"
            style={{ left: `${endRatio * 100}%`, width: `${(1 - endRatio) * 100}%` }}
          />
          {/* Curseur de lecture */}
          {cursorRatio != null && (
            <div
              className="audio-trimmer__cursor"
              style={{ left: `${cursorRatio * 100}%` }}
            />
          )}
          {/* Handle début */}
          <div
            className="audio-trimmer__handle audio-trimmer__handle--start"
            style={{ left: `${startRatio * 100}%` }}
            onMouseDown={e => handleBarMouseDown(e, 'start')}
            title="Glisser pour choisir le début"
          />
          {/* Handle fin */}
          <div
            className="audio-trimmer__handle audio-trimmer__handle--end"
            style={{ left: `${endRatio * 100}%` }}
            onMouseDown={e => handleBarMouseDown(e, 'end')}
            title="Glisser pour choisir la fin"
          />
        </div>
      </div>

      <div className="audio-trimmer__inputs">
        <div className="audio-trimmer__time-field">
          <label className="audio-trimmer__time-label" htmlFor="trim-start">Début</label>
          <input
            id="trim-start"
            className="audio-trimmer__time-input"
            type="text"
            value={startInput}
            onChange={e => setStartInput(e.target.value)}
            onBlur={e => commitStart(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitStart(e.target.value)}
          />
        </div>

        <div className="audio-trimmer__total">
          {playing
            ? <span className="audio-trimmer__elapsed">{formatTime(previewElapsed)} / {formatTime(playDuration)}</span>
            : <>durée totale&nbsp;: {formatTime(duration)}</>
          }
        </div>

        <div className="audio-trimmer__time-field audio-trimmer__time-field--end">
          <label className="audio-trimmer__time-label" htmlFor="trim-end">Fin</label>
          <input
            id="trim-end"
            className="audio-trimmer__time-input"
            type="text"
            value={endInput}
            onChange={e => setEndInput(e.target.value)}
            onBlur={e => commitEnd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitEnd(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
