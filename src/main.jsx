import React, { useReducer, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppContext } from './context/AppContext';
import { appReducer, initialState } from './context/appReducer';
import { readConfig, checkAudioFiles } from './utils/configLoader';
import App from './App';
import './styles/tokens.css';

/**
 * Root component — charge la config au démarrage et initialise le state global.
 * AC Story 1.2 :
 *   - config.json valide → LOAD_CONFIG + SWITCH_MODE 'representation'
 *   - config.json absent → LOAD_CONFIG cues:[] + SWITCH_MODE 'config'
 *   - config.json invalide → SET_ERROR (message explicite)
 *   - cue avec audioFile manquant → audioMissing:true via checkAudioFiles
 *   - 100% offline — aucun appel réseau
 */
function Root() {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    isLoading: true,
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const result = await readConfig();
        const cues = result.cues;

        // Vérifier l'existence des fichiers audio pour chaque cue
        const processedCues = await checkAudioFiles(cues);

        dispatch({ type: 'LOAD_CONFIG', payload: { cues: processedCues } });

        // Routing au démarrage
        if (processedCues.length > 0) {
          dispatch({ type: 'SWITCH_MODE', payload: 'representation' });
        } else {
          dispatch({ type: 'SWITCH_MODE', payload: 'config' });
        }
      } catch (err) {
        if (err.code === 'NOT_FOUND') {
          // config.json absent — mode config avec setlist vide
          dispatch({ type: 'LOAD_CONFIG', payload: { cues: [] } });
          dispatch({ type: 'SWITCH_MODE', payload: 'config' });
        } else {
          // config.json invalide ou erreur de schema
          dispatch({
            type: 'SET_ERROR',
            payload: err.message || 'Erreur de lecture de config.json',
          });
        }
      }
    }

    loadConfig();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <App />
    </AppContext.Provider>
  );
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
