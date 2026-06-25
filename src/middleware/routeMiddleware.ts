/**
 * Route Middleware & Interceptors
 *
 * Provides a flexible middleware system for handling route transitions,
 * lifecycle events, and route change interception.
 *
 * This system allows you to:
 * - Execute code before/after route changes
 * - Intercept and potentially cancel route transitions
 * - Listen to route change events
 * - Manage route state transformations
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route transition event data
 */
export interface RouteTransitionEvent {
  from: string;
  to: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Middleware context passed to middleware functions
 */
export interface MiddlewareContext {
  from: string;
  to: string;
  metadata?: Record<string, any>;
  abort: () => void;
  proceed: () => void;
  isAborted: boolean;
  isProceedCalled: boolean;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (context: MiddlewareContext) => void | Promise<void>;

/**
 * Route change listener type
 */
export type RouteChangeListener = (event: RouteTransitionEvent) => void;

/**
 * Route State Transformer
 */
export type RouteStateTransformer = (state: any) => any;

/**
 * Route Lifecycle Hooks
 */
export interface RouteLifecycleHooks {
  onBeforeChange?: MiddlewareFunction;
  onAfterChange?: (event: RouteTransitionEvent) => void;
  onTransitionError?: (error: Error, event: RouteTransitionEvent) => void;
}

/**
 * Route Middleware Manager
 *
 * Central manager for all route middleware, listeners, and lifecycle hooks.
 * Provides a pub/sub pattern for route change events.
 */
export class RouteMiddlewareManager {
  private middlewares: MiddlewareFunction[] = [];
  private listeners: RouteChangeListener[] = [];
  private transformers: RouteStateTransformer[] = [];
  private history: RouteTransitionEvent[] = [];
  private maxHistorySize: number = 100;
  private isEnabled: boolean = true;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add a middleware function
   * Middleware is executed before route changes
   */
  use(middleware: MiddlewareFunction): void {
    this.middlewares.push(middleware);
  }

  /**
   * Remove a specific middleware
   */
  removeMiddleware(middleware: MiddlewareFunction): void {
    this.middlewares = this.middlewares.filter(m => m !== middleware);
  }

  /**
   * Clear all middlewares
   */
  clearMiddlewares(): void {
    this.middlewares = [];
  }

  /**
   * Subscribe to route change events
   * Returns unsubscribe function
   */
  subscribe(listener: RouteChangeListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Add a route state transformer
   * Transformers modify state during transitions
   */
  addTransformer(transformer: RouteStateTransformer): void {
    this.transformers.push(transformer);
  }

  /**
   * Execute middleware chain for route transition
   */
  async executeMiddleware(
    from: string,
    to: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isEnabled) return true;

    const context: MiddlewareContext = {
      from,
      to,
      metadata,
      abort: () => {
        context.isAborted = true;
      },
      proceed: () => {
        context.isProceedCalled = true;
      },
      isAborted: false,
      isProceedCalled: false,
    };

    // Execute each middleware
    for (const middleware of this.middlewares) {
      try {
        await middleware(context);
        
        if (context.isAborted) {
          return false; // Stop route transition
        }
      } catch (error) {
        console.error('Middleware error:', error);
        return false; // Abort on error
      }
    }

    return true; // Allow transition
  }

  /**
   * Emit route change event to all listeners
   */
  private emit(event: RouteTransitionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Record a route transition
   */
  recordTransition(from: string, to: string, metadata?: Record<string, any>): void {
    const event: RouteTransitionEvent = {
      from,
      to,
      timestamp: new Date(),
      metadata,
    };

    this.history.push(event);
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.emit(event);
  }

  /**
   * Transform route state through all transformers
   */
  transformState(state: any): any {
    return this.transformers.reduce((transformed, transformer) => {
      try {
        return transformer(transformed);
      } catch (error) {
        console.error('Transformer error:', error);
        return transformed;
      }
    }, state);
  }

  /**
   * Get route transition history
   */
  getHistory(): RouteTransitionEvent[] {
    return [...this.history];
  }

  /**
   * Get last N transitions
   */
  getLastTransitions(count: number = 10): RouteTransitionEvent[] {
    return this.history.slice(-count);
  }

  /**
   * Get transitions between two specific routes
   */
  getTransitionsBetween(from: string, to: string): RouteTransitionEvent[] {
    return this.history.filter(event => event.from === from && event.to === to);
  }

  /**
   * Clear transition history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Enable/disable middleware execution
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get current status
   */
  isMiddlewareEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      middlewareCount: this.middlewares.length,
      listenerCount: this.listeners.length,
      transformerCount: this.transformers.length,
      historySize: this.history.length,
      isEnabled: this.isEnabled,
    };
  }
}

/**
 * Global middleware manager instance
 */
const globalMiddlewareManager = new RouteMiddlewareManager();

/**
 * Get the global middleware manager
 */
export function getMiddlewareManager(): RouteMiddlewareManager {
  return globalMiddlewareManager;
}

/**
 * Hook to use route middleware manager
 */
export function useRouteMiddleware() {
  const manager = useRef(getMiddlewareManager());

  const use = useCallback((middleware: MiddlewareFunction) => {
    manager.current.use(middleware);
  }, []);

  const subscribe = useCallback((listener: RouteChangeListener) => {
    return manager.current.subscribe(listener);
  }, []);

  const addTransformer = useCallback((transformer: RouteStateTransformer) => {
    manager.current.addTransformer(transformer);
  }, []);

  return {
    use,
    subscribe,
    addTransformer,
    manager: manager.current,
  };
}

/**
 * Hook to track route transitions
 * Usage: useRouteTransition(({ from, to }) => { console.log(...) })
 */
export function useRouteTransition(callback: RouteChangeListener) {
  const location = useLocation();
  const previousLocationRef = useRef<string>();
  const manager = getMiddlewareManager();

  useEffect(() => {
    if (previousLocationRef.current && previousLocationRef.current !== location.pathname) {
      callback({
        from: previousLocationRef.current,
        to: location.pathname,
        timestamp: new Date(),
      });
    }
    
    previousLocationRef.current = location.pathname;
  }, [location.pathname, callback]);
}

/**
 * Hook to add lifecycle hooks to routes
 * Usage: useRouteLifecycle({ onBeforeChange: ..., onAfterChange: ... })
 */
export function useRouteLifecycle(hooks: RouteLifecycleHooks) {
  const location = useLocation();
  const previousLocationRef = useRef<string>();
  const manager = getMiddlewareManager();

  // Add beforeChange middleware
  useEffect(() => {
    if (hooks.onBeforeChange) {
      manager.use(hooks.onBeforeChange);
      
      return () => {
        manager.removeMiddleware(hooks.onBeforeChange);
      };
    }
  }, [hooks.onBeforeChange, manager]);

  // Subscribe to route changes for afterChange
  useEffect(() => {
    if (hooks.onAfterChange) {
      const unsubscribe = manager.subscribe(hooks.onAfterChange);
      return unsubscribe;
    }
  }, [hooks.onAfterChange, manager]);

  // Handle transitions
  useEffect(() => {
    if (previousLocationRef.current && previousLocationRef.current !== location.pathname) {
      const event: RouteTransitionEvent = {
        from: previousLocationRef.current,
        to: location.pathname,
        timestamp: new Date(),
      };

      if (hooks.onAfterChange) {
        try {
          hooks.onAfterChange(event);
        } catch (error) {
          if (hooks.onTransitionError) {
            hooks.onTransitionError(error as Error, event);
          }
        }
      }
    }

    previousLocationRef.current = location.pathname;
  }, [location.pathname, hooks]);
}

/**
 * Hook to intercept route changes
 * Returns true to allow transition, false to block it
 */
export function useRouteInterceptor(predicate: (from: string, to: string) => Promise<boolean>) {
  const manager = getMiddlewareManager();

  useEffect(() => {
    const middleware: MiddlewareFunction = async (context) => {
      try {
        const allowed = await predicate(context.from, context.to);
        if (!allowed) {
          context.abort();
        }
      } catch (error) {
        console.error('Route interceptor error:', error);
        context.abort();
      }
    };

    manager.use(middleware);

    return () => {
      manager.removeMiddleware(middleware);
    };
  }, [manager, predicate]);
}

/**
 * Middleware: Block transitions to routes requiring auth when not authenticated
 */
export function createAuthGuardMiddleware(isAuthenticated: boolean, protectedRoutes: string[]) {
  return async (context: MiddlewareContext) => {
    const toIsProtected = protectedRoutes.some(route => 
      context.to.startsWith(route)
    );

    if (toIsProtected && !isAuthenticated) {
      console.warn(`Access denied to ${context.to} - authentication required`);
      context.abort();
    }
  };
}

/**
 * Middleware: Require confirmation before leaving unsaved changes
 */
export function createUnsavedChangesMiddleware(hasUnsavedChanges: boolean) {
  return async (context: MiddlewareContext) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you really want to leave?'
      );
      
      if (!confirmed) {
        context.abort();
      }
    }
  };
}

/**
 * Middleware: Log all route transitions
 */
export function createLoggingMiddleware(verbose: boolean = false) {
  return async (context: MiddlewareContext) => {
    if (verbose) {
      console.log(`🔀 Route transition: ${context.from} → ${context.to}`);
      if (context.metadata) {
        console.log('   Metadata:', context.metadata);
      }
    }
  };
}

/**
 * Middleware: Enforce rate limiting on route changes
 */
export function createRateLimitMiddleware(maxChangesPerSecond: number = 10) {
  let lastChangeTime = 0;
  let changeCount = 0;

  return async (context: MiddlewareContext) => {
    const now = Date.now();
    
    if (now - lastChangeTime >= 1000) {
      lastChangeTime = now;
      changeCount = 1;
    } else {
      changeCount++;
    }

    if (changeCount > maxChangesPerSecond) {
      console.warn('Route change rate limit exceeded');
      context.abort();
    }
  };
}

/**
 * Middleware: Scroll to top on route change
 */
export function createScrollToTopMiddleware() {
  return async (context: MiddlewareContext) => {
    // This will be called after middleware validation
    // Actual scroll happens in a listener
  };
}

/**
 * Hook to automatically scroll to top on route change
 */
export function useScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
}

/**
 * Middleware: Validate route exists before transitioning
 */
export function createRouteValidationMiddleware(validRoutes: string[]) {
  return async (context: MiddlewareContext) => {
    const isValid = validRoutes.some(route => 
      context.to === route || 
      context.to.startsWith(route + '/') ||
      route === '*'
    );

    if (!isValid) {
      console.warn(`Attempted transition to invalid route: ${context.to}`);
      context.abort();
    }
  };
}

/**
 * Listener: Track route analytics
 */
export function createAnalyticsListener(trackingFn: (event: RouteTransitionEvent) => void) {
  return (event: RouteTransitionEvent) => {
    trackingFn(event);
  };
}

/**
 * Listener: Track route performance
 */
export function createPerformanceListener() {
  return (event: RouteTransitionEvent) => {
    const transitionTime = event.timestamp.getTime();
    console.log(`📊 Route transition recorded at ${transitionTime}ms`);
  };
}

/**
 * Transformer: Add metadata to state
 */
export function createMetadataTransformer(metadata: Record<string, any>) {
  return (state: any) => ({
    ...state,
    _routeMetadata: metadata,
    _transitionTime: new Date().toISOString(),
  });
}

/**
 * Transformer: Sanitize state
 */
export function createStateSanitizer(forbiddenKeys: string[]) {
  return (state: any) => {
    if (!state) return state;

    const sanitized = { ...state };
    forbiddenKeys.forEach(key => {
      delete sanitized[key];
    });

    return sanitized;
  };
}

/**
 * Hook: Setup comprehensive route middleware
 * Usage in app initialization
 */
export function useRouteMiddlewareSetup(config: {
  enableLogging?: boolean;
  enableAuth?: boolean;
  isAuthenticated?: boolean;
  protectedRoutes?: string[];
  enableRateLimit?: boolean;
  enableScrollTop?: boolean;
  enablePerformanceTracking?: boolean;
}) {
  const manager = getMiddlewareManager();

  useEffect(() => {
    // Add logging middleware
    if (config.enableLogging) {
      manager.use(createLoggingMiddleware(true));
    }

    // Add auth guard middleware
    if (config.enableAuth && config.isAuthenticated !== undefined) {
      manager.use(
        createAuthGuardMiddleware(config.isAuthenticated, config.protectedRoutes || [])
      );
    }

    // Add rate limiting middleware
    if (config.enableRateLimit) {
      manager.use(createRateLimitMiddleware());
    }

    // Add performance tracking listener
    if (config.enablePerformanceTracking) {
      manager.subscribe(createPerformanceListener());
    }

    // Add scroll to top listener
    if (config.enableScrollTop) {
      manager.subscribe((event) => {
        window.scrollTo(0, 0);
      });
    }
  }, [manager, config]);
}

export default {
  RouteMiddlewareManager,
  getMiddlewareManager,
  useRouteMiddleware,
  useRouteTransition,
  useRouteLifecycle,
  useRouteInterceptor,
  useScrollToTop,
  useRouteMiddlewareSetup,
  createAuthGuardMiddleware,
  createUnsavedChangesMiddleware,
  createLoggingMiddleware,
  createRateLimitMiddleware,
  createScrollToTopMiddleware,
  createRouteValidationMiddleware,
  createAnalyticsListener,
  createPerformanceListener,
  createMetadataTransformer,
  createStateSanitizer,
};
