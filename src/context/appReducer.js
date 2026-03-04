/**
 * AudioTheatre — App Reducer
 * State global géré par useReducer + Context
 * Actions : SCREAMING_SNAKE_CASE
 */

export const initialState = {
  mode: 'config',          // 'representation' | 'config'
  cues: [],                // setlist complète
  currentIndex: 0,         // index du cue courant en mode représentation
  playingIds: [],          // ids des sons actuellement en lecture
  configDirty: false,      // modifications non sauvegardées
  error: null,             // message d'erreur global
  isLoading: false,        // état de chargement au démarrage
};

export function appReducer(state, action) {
  switch (action.type) {

    case 'LOAD_CONFIG': {
      const cues = action.payload?.cues ?? [];
      return {
        ...state,
        cues,
        currentIndex: 0,
        playingIds: [],
        configDirty: false,
        error: null,
        isLoading: false,
      };
    }

    case 'SWITCH_MODE': {
      const mode = action.payload; // 'representation' | 'config'
      return {
        ...state,
        mode,
        // Réinitialiser currentIndex en entrant en représentation
        currentIndex: mode === 'representation' ? 0 : state.currentIndex,
        playingIds: [],
      };
    }

    case 'NEXT_CUE': {
      const maxIndex = state.cues.length - 1;
      const nextIndex = Math.min(state.currentIndex + 1, maxIndex);
      return {
        ...state,
        currentIndex: nextIndex,
      };
    }

    case 'PREV_CUE': {
      const prevIndex = Math.max(state.currentIndex - 1, 0);
      return {
        ...state,
        currentIndex: prevIndex,
      };
    }

    case 'SET_CURRENT_INDEX': {
      const index = Math.max(0, Math.min(action.payload, state.cues.length - 1));
      return {
        ...state,
        currentIndex: index,
      };
    }

    case 'PLAY_CUE': {
      const { id } = action.payload;
      if (state.playingIds.includes(id)) {
        return state; // déjà en cours — le moteur audio crée un nouveau node
      }
      return {
        ...state,
        playingIds: [...state.playingIds, id],
      };
    }

    case 'STOP_CUE': {
      const { id } = action.payload;
      return {
        ...state,
        playingIds: state.playingIds.filter(pid => pid !== id),
      };
    }

    case 'STOP_ALL': {
      return {
        ...state,
        playingIds: [],
      };
    }

    case 'ADD_CUE': {
      const newCue = action.payload;
      return {
        ...state,
        cues: [...state.cues, newCue],
        configDirty: true,
      };
    }

    case 'UPDATE_CUE': {
      const updatedCue = action.payload;
      return {
        ...state,
        cues: state.cues.map(c => c.id === updatedCue.id ? updatedCue : c),
        configDirty: true,
      };
    }

    case 'DELETE_CUE': {
      const { id } = action.payload;
      return {
        ...state,
        cues: state.cues.filter(c => c.id !== id),
        configDirty: true,
      };
    }

    case 'MOVE_CUE_UP': {
      const { id } = action.payload;
      const idx = state.cues.findIndex(c => c.id === id);
      if (idx <= 0) return state;
      const newCues = [...state.cues];
      [newCues[idx - 1], newCues[idx]] = [newCues[idx], newCues[idx - 1]];
      return {
        ...state,
        cues: newCues,
        configDirty: true,
      };
    }

    case 'MOVE_CUE_DOWN': {
      const { id } = action.payload;
      const idx = state.cues.findIndex(c => c.id === id);
      if (idx < 0 || idx >= state.cues.length - 1) return state;
      const newCues = [...state.cues];
      [newCues[idx], newCues[idx + 1]] = [newCues[idx + 1], newCues[idx]];
      return {
        ...state,
        cues: newCues,
        configDirty: true,
      };
    }

    case 'MARK_AUDIO_MISSING': {
      const { id } = action.payload;
      return {
        ...state,
        cues: state.cues.map(c =>
          c.id === id ? { ...c, audioMissing: true } : c
        ),
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    }

    case 'CLEAR_ERROR': {
      return {
        ...state,
        error: null,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'SAVE_CONFIG_SUCCESS': {
      return {
        ...state,
        configDirty: false,
      };
    }

    default:
      return state;
  }
}
