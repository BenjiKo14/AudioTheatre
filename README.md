# AudioTheatre

A desktop soundboard application built for theater performances. Manage audio cues, scenes, and playback from a single interface.

## Features

- **Scene management** — organize sounds by scenes
- **Cue system** — trigger audio cues with keyboard shortcuts
- **Audio trimming** — set in/out points per cue
- **Configuration** — import/export setups via JSON or CSV
- **Dark theme** — optimized for low-light backstage use

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / next cue |
| `→` | Next cue |
| `←` | Previous cue |
| `S` | Stop all |
| `Escape` | Emergency stop |

## Tech Stack

- [Tauri 2](https://tauri.app/) — desktop shell (Rust)
- [React 18](https://react.dev/) — UI
- [Vite 6](https://vitejs.dev/) — build tool
- Web Audio API — audio engine

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)

### Install & Run

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

The `.exe` will be in `src-tauri/target/release/`.

## Audio Files

Audio files are **not included** in the repository. Place your `.mp3`/`.wav` files in a `sounds/` folder next to the app, then configure cues via the config view.

## Configuration

The app uses a `config.json` file to store scenes and cues. You can import from CSV or edit directly in the UI.

```json
{
  "scenes": [
    {
      "id": "scene-1",
      "name": "Act 1",
      "cues": [
        {
          "id": "cue-1",
          "label": "Ambiance",
          "file": "sounds/ambiance.mp3",
          "volume": 0.8,
          "loop": true
        }
      ]
    }
  ]
}
```

## License

MIT
