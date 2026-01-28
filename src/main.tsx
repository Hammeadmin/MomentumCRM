import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Error boundary to catch any rendering errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', backgroundColor: '#fef2f2', color: '#b91c1c', fontFamily: 'monospace' }}>
          <h1 style={{ marginBottom: '20px' }}>Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('[main.tsx] Starting application...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute - prevents aggressive refetching
      refetchOnWindowFocus: false, // Prevents flickering when switching tabs
    },
  },
});

console.log('[main.tsx] QueryClient created, attempting to render...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[main.tsx] FATAL: Could not find root element');
  document.body.innerHTML = '<pre style="color: red; padding: 20px;">FATAL: Could not find root element with id="root"</pre>';
} else {
  console.log('[main.tsx] Root element found, creating React root...');
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('[main.tsx] React render called successfully');
  } catch (err) {
    console.error('[main.tsx] Error during render:', err);
    rootElement.innerHTML = `<pre style="color: red; padding: 20px;">Render Error: ${err}</pre>`;
  }
}
