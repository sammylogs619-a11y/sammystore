/**
 * Route Monitor Component & Hook
 * Integrates with TanStack Router to track all route changes and performance
 */

import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import { analyticsManager } from './analytics';

export function useRouteAnalytics() {
  const router = useRouter();
  const previousPathRef = useRef<string>('');
  const navigationStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!router) return;

    // Subscribe to router events
    const unsubscribe = router.subscribe((state) => {
      // Track page view on location change
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      if (currentPath !== previousPathRef.current) {
        // Page view tracking
        analyticsManager.trackPageView(currentPath, currentSearch);
        previousPathRef.current = currentPath;

        // Log navigation event
        console.log('[Route Monitor] Navigation to:', currentPath);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  /**
   * Hook to measure route rendering performance
   */
  const measureRoutePerformance = (routeName: string) => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderingTime = endTime - startTime;

      analyticsManager.trackRoutePerformance(routeName, {
        renderingTime,
        totalTime: renderingTime,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Route Monitor] ${routeName} rendered in ${renderingTime.toFixed(2)}ms`);
      }
    };
  };

  return { measureRoutePerformance };
}

/**
 * Route Monitor Provider Component
 * Wrap your app with this to enable route analytics
 */
export function RouteMonitor({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!router) return;

    // Track initial page view
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    analyticsManager.trackPageView(currentPath, currentSearch);

    // Subscribe to route changes
    const unsubscribe = router.subscribe((state) => {
      const path = window.location.pathname;
      const search = window.location.search;

      analyticsManager.trackPageView(path, search);
    });

    // Handle router errors
    const handleError = (error: Error) => {
      analyticsManager.trackError(
        'route_error',
        error.message,
        window.location.pathname,
        undefined,
        error.stack
      );
    };

    // Note: Router error handling depends on your TanStack Router setup
    // You may need to add additional error boundary logic

    return () => {
      unsubscribe();
      analyticsManager.destroy();
    };
  }, [router]);

  return <>{children}</>;
}

/**
 * Higher-order component to wrap individual route components with performance tracking
 */
export function withRouteAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string
) {
  return function AnalyticsWrappedComponent(props: P) {
    const startTime = useRef(performance.now());

    useEffect(() => {
      const endTime = performance.now();
      const renderingTime = endTime - startTime.current;

      analyticsManager.trackRoutePerformance(routeName, {
        renderingTime,
        totalTime: renderingTime,
      });
    }, []);

    return <Component {...props} />;
  };
}
