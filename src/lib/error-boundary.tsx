/**
 * Error Boundary Component
 * Captures route-level errors and sends them to analytics
 */

import React, { ReactNode } from 'react';
import { analyticsManager } from './analytics';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error in analytics
    analyticsManager.trackError(
      'render_error',
      error.message,
      window.location.pathname,
      undefined,
      errorInfo.componentStack
    );

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.reset) || (
          <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
            <h1 className="text-2xl font-bold text-red-800 mb-4">Oops! Something went wrong</h1>
            <p className="text-red-600 mb-4">{this.state.error.message}</p>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling route-level errors
 */
export function useRouteError() {
  return (error: Error, route: string, statusCode?: number) => {
    analyticsManager.trackError(
      'route_error',
      error.message,
      route,
      statusCode,
      error.stack
    );
  };
}

/**
 * Hook for tracking 404 and not found errors
 */
export function useNotFoundTracking(route: string) {
  React.useEffect(() => {
    analyticsManager.trackError(
      'not_found',
      'Route not found',
      route,
      404
    );
  }, [route]);
}

/**
 * Hook for tracking data fetching errors
 */
export function useDataFetchErrorTracking(route: string) {
  return (error: Error) => {
    analyticsManager.trackError(
      'data_fetch_error',
      error.message,
      route,
      undefined,
      error.stack
    );
  };
}
