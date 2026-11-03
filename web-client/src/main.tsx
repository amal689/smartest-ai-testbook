import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Configuration, DefaultApi } from './generated';
import './style.css';

type ConnectionState = 'loading' | 'checking' | 'connected' | 'unreachable' | 'configuration-error';

function App() {
  const [api, setApi] = useState<DefaultApi>();
  const [address, setAddress] = useState('');
  const [state, setState] = useState<ConnectionState>('loading');

  async function checkConnection(client: DefaultApi) {
    setState('checking');
    try {
      const health = await client.getHealth();
      if (health.status !== 'ok') throw new Error('Invalid health response');
      setState('connected');
    } catch {
      setState('unreachable');
    }
  }

  useEffect(() => {
    const configurationUrl = '/configuration.js';
    import(/* @vite-ignore */ configurationUrl).then(({ apiBaseUrl }) => {
      if (typeof apiBaseUrl !== 'string' || !['http:', 'https:'].includes(new URL(apiBaseUrl).protocol)) {
        throw new Error('Invalid backend URL');
      }
      const client = new DefaultApi(new Configuration({
        basePath: apiBaseUrl.replace(/\/+$/, ''),
        fetchApi: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      }));
      setAddress(apiBaseUrl);
      setApi(client);
      void checkConnection(client);
    }).catch(() => setState('configuration-error'));
  }, []);

  const messages: Record<ConnectionState, string> = {
    loading: 'Loading application configuration…',
    checking: 'Checking connection…',
    connected: 'Backend connected.',
    unreachable: 'Could not connect to the backend. Try again.',
    'configuration-error': 'Could not load a valid backend configuration.',
  };

  return <main>
    <p className="eyebrow">Smartest AI Testbook</p>
    <h1>Backend connection</h1>
    <p>Check the connection before starting your work.</p>
    <section aria-label="Connection status">
      {address && <p className="address">{address}</p>}
      <p role={state === 'configuration-error' || state === 'unreachable' ? 'alert' : 'status'}
        className={`status ${state}`}>{messages[state]}</p>
      {api && <button disabled={state === 'checking'} onClick={() => void checkConnection(api)}>
        Check connection
      </button>}
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
