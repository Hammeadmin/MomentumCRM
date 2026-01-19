import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    this.props.onReset?.();
    window.location.reload();
  };

  handleGoHome = () => {
    this.props.onReset?.();
    window.location.href = '/';
  };

  handleTryAgain = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            {/* Error Illustration */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Något gick fel
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Ett oväntat fel inträffade. Vi ber om ursäkt för besväret.
              </p>
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  Teknisk information:
                </h3>
                <pre className="text-xs text-red-700 dark:text-red-400 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleTryAgain}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Försök igen
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Home className="w-5 h-5 mr-2" />
                Gå till startsidan
              </button>
            </div>

            {/* Support Contact */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Behöver du hjälp?
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Om problemet kvarstår, kontakta vår support på{' '}
                    <a
                      href="mailto:support@momentum.se"
                      className="font-medium underline hover:no-underline"
                    >
                      support@momentum.se
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Error ID for Support */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Fel-ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * A simpler error fallback for individual route components
 * Shows an inline error message instead of full page
 */
export function RouteErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Kunde inte ladda sidan
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-sm">
        Ett fel inträffade. Du kan fortfarande använda andra delar av appen.
      </p>
      {process.env.NODE_ENV === 'development' && error && (
        <pre className="text-xs text-red-600 dark:text-red-400 mb-4 max-w-md overflow-auto p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error.message}
        </pre>
      )}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Försök igen
        </button>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Home className="w-4 h-4 mr-2" />
          Startsida
        </a>
      </div>
    </div>
  );
}

/**
 * Route-specific error boundary that can be reset
 * Use this to wrap individual route components
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;