import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => setError(e.error);
    const handleRejection = (e: PromiseRejectionEvent) => setError(e.reason);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#ff000022', color: 'white', fontSize: '14px', wordBreak: 'break-all' }}>
        <h2>❌ Error Detected:</h2>
        <p><strong>{error.message}</strong></p>
        <pre style={{ background: '#000', padding: '10px', marginTop: '10px' }}>{error.stack}</pre>
      </div>
    );
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
