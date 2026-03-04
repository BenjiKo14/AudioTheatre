# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**On Windows, `cargo` is not in the default shell PATH. Always prefix Tauri commands with:**
```bash
export PATH="$PATH:/c/Users/kofb/.cargo/bin"
```

```bash
# Dev (Tauri window + hot reload)
export PATH="$PATH:/c/Users/kofb/.cargo/bin" && npm run tauri dev

# Production build (generates .msi + .exe NSIS installer)
export PATH="$PATH:/c/Users/kofb/.cargo/bin" && npm run tauri build

# Vite only (browser, no Tauri APIs)
npm run dev
```

Build outputs:
- `src-tauri/target/release/audio-theatre.exe` — standalone
- `src-tauri/target/release/bundle/nsis/AudioTheatre_0.1.0_x64-setup.exe` — NSIS installer
- `src-tauri/target/release/bundle/msi/AudioTheatre_0.1.0_x64_en-US.msi` — MSI

There are no tests.

## Architecture

AudioTheatre is a desktop soundboard for theater performers. It has two modes that the app switches between:
- **`config`** — edit/reorder/import cues
- **`representation`** — live performance playback with keyboard control

### State Management

Global state lives in a single `useReducer` instance in `src/main.jsx` (the `Root` component), exposed via `AppContext`. All components consume state through `useAppContext()` — never via props.

```
src/main.jsx (Root)
  └─ useReducer(appReducer, initialState)  ← src/context/appReducer.js
  └─ AppContext.Provider { state, dispatch }
       └─ App.jsx
            ├─ RepresentationView  (mode === 'representation')
            └─ ConfigView          (mode === 'config')
```

**State shape** (`appReducer.js`):
- `mode` — `'config'` | `'representation'`
- `cues[]` — flat array of all cues (no scene nesting)
- `currentIndex` — active cue index in representation
- `playingIds[]` — ids of cues currently playing
- `configDirty` — unsaved changes flag
- `error` / `isLoading` — startup state

### Audio Engine (`src/hooks/useAudio.js`)

Single `AudioContext` singleton. All audio files are preloaded and decoded into `AudioBuffer`s on mount (or when cues change). Playback creates a new `AudioBufferSourceNode` per trigger — supports simultaneous playback of multiple cues. Supports `trimStart`/`trimEnd` per cue (in seconds). Progress is polled every 100ms via `setInterval`.

`audioMissing: true` is a runtime-only flag (never persisted to `config.json`).

### File Access (`src/utils/configLoader.js`)

**This is the only module that calls Tauri FS APIs.** No component should import `@tauri-apps/plugin-fs` directly.

- `readConfig()` — reads `config.json` from `BaseDirectory.Resource`, validates schema
- `writeConfig(cues)` — writes back to `BaseDirectory.Resource`, strips runtime fields
- `checkAudioFiles(cues)` — checks existence of each audio file, marks missing ones
- `importConfig(path)` — imports JSON or CSV from an absolute path (via Tauri file dialog)

Audio files: absolute paths (from the Tauri file picker) are read directly; relative paths use `BaseDirectory.Resource`.

### Keyboard/Wheel (`src/hooks/useKeyboard.js`)

Attached globally on `window` in representation mode only. Handlers are stored in refs so the effect never re-registers. Wheel events are throttled at 120ms. Ignored when focus is in `input`/`textarea`/`select` or inside `.cue-list`.

| Key | Action |
|-----|--------|
| `↑` / wheel up | Previous cue |
| `↓` / wheel down | Next cue |
| `Space` | Play current cue |
| `Escape` | Stop current cue |
| `S` | Stop all (emergency) |

### `config.json` Schema

```json
{
  "version": 1,
  "cues": [
    {
      "id": "uuid",
      "type": "audio",
      "title": "Ambiance acte 1",
      "note": "",
      "audioFile": "absolute/path/to/file.mp3",
      "pictogram": "",
      "description": "",
      "watchFor": "",
      "trimStart": 2.5,
      "trimEnd": 45.0
    },
    {
      "id": "uuid",
      "type": "scene",
      "title": "Scène 2"
    }
  ]
}
```

`trimStart`/`trimEnd` are optional. `audioMissing` is never written to disk.

### Tauri Permissions (`src-tauri/capabilities/default.json`)

Uses Tauri 2.x format: `core:default`, `fs:default`, `fs:read-all`, `fs:write-all`, `dialog:allow-open`. FS scope allows `$RESOURCE/**` (app install dir) and `?:/**` (all absolute drive paths on Windows).

## Conventions

- JavaScript only — no TypeScript
- Components: `PascalCase.jsx` with a co-located `PascalCase.css`
- Hooks/utils: `camelCase.js`
- Reducer actions: `SCREAMING_SNAKE_CASE` strings
- CSS: always `var(--token-name)` — all design tokens in `src/styles/tokens.css`
- `dispatch` always via `useAppContext()`, never passed as prop
