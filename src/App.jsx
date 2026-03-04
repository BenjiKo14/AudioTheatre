import { useAppContext } from './context/AppContext';
import RepresentationView from './components/representation/RepresentationView';
import ConfigView from './components/config/ConfigView';
import './App.css';

export default function App() {
  const { state } = useAppContext();

  if (state.isLoading) {
    return (
      <div className="app-loading">
        <span className="app-loading__text">Chargement…</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="app-error">
        <h1 className="app-error__title">Erreur de configuration</h1>
        <p className="app-error__message">{state.error}</p>
        <p className="app-error__hint">
          Vérifiez le fichier <code>config.json</code> et relancez l'application.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      {state.mode === 'representation'
        ? <RepresentationView />
        : <ConfigView />
      }
    </div>
  );
}
