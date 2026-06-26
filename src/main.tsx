import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Add error boundary to catch and display errors
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (error: Error) => {
      setError(error);
    };

    window.addEventListener('error', (e) => handleError(e.error));
    window.addEventListener('unhandledrejection', (e) => handleError(e.reason));

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#ff000022', 
        color: 'white',
        fontSize: '14px',
        wordBreak: 'break-all'
      }}>
        <h2>❌ Error Detected:</h2>
        <p><strong>{error.message}</strong></p>
        <pre style={{ background: '#000', padding: '10px', marginTop: '10px' }}>
          {error.stack}
        </pre>
      </div>
    );
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </ErrorBoundary>
);
