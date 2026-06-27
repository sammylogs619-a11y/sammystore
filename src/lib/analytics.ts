/**
 * Analytics & Monitoring Module
 * Centralized analytics tracking for route changes, performance, and custom events
 */

export interface PageViewEvent {
  pathname: string;
  search?: string;
  referrer?: string;
  timestamp: number;
  sessionId: string;
}

export interface PerformanceMetrics {
  navigationStart: number;
  routeLoadTime: number;
  renderingTime: number;
  totalTime: number;
  route: string;
}

export interface ErrorEvent {
  type: 'route_error' | 'data_fetch_error' | 'render_error' | 'hydration_error' | 'not_found';
  message: string;
  route: string;
  statusCode?: number;
  timestamp: number;
  sessionId: string;
  stack?: string;
}

export interface CustomEvent {
  name: string;
  route: string;
  properties: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

class AnalyticsManager {
  private sessionId: string;
  private apiEndpoint: string;
  private enabled: boolean;
  private pageLoadTime: number = 0;
  private navigationStartTime: number = 0;
  private queue: (PageViewEvent | ErrorEvent | CustomEvent)[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(apiEndpoint: string = '/api/analytics', enabled: boolean = true) {
    this.sessionId = this.generateSessionId();
    this.apiEndpoint = apiEndpoint;
    this.enabled = enabled && this.canUseBeacon();
    this.pageLoadTime = performance.now();
    this.initializeBatchFlush();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('analytics_session_id');
      if (stored) return stored;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('analytics_session_id', id);
    }
    return id;
  }

  /**
   * Check if the browser supports sendBeacon (for reliability)
   */
  private canUseBeacon(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
  }

  /**
   * Track a page view / route change
   */
  trackPageView(pathname: string, search?: string): void {
    if (!this.enabled) return;

    const event: PageViewEvent = {
      pathname,
      search,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.queue.push(event);
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Track route performance metrics
   */
  trackRoutePerformance(route: string, metrics: Partial<PerformanceMetrics>): void {
    if (!this.enabled) return;

    const fullMetrics = {
      navigationStart: metrics.navigationStart || this.navigationStartTime,
      routeLoadTime: metrics.routeLoadTime || 0,
      renderingTime: metrics.renderingTime || 0,
      totalTime: metrics.totalTime || 0,
      route,
    };

    // Send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Route Performance:', fullMetrics);
    }

    // You can extend this to send metrics to a monitoring service (e.g., Datadog, New Relic)
    this.sendToMonitoringService('route_performance', fullMetrics);
  }

  /**
   * Track route-level errors
   */
  trackError(type: ErrorEvent['type'], message: string, route: string, statusCode?: number, stack?: string): void {
    if (!this.enabled) return;

    const event: ErrorEvent = {
      type,
      message,
      route,
      statusCode,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    };

    this.queue.push(event);
    console.error('[Analytics] Error tracked:', event);

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Track custom events
   */
  trackEvent(name: string, route: string, properties: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    const event: CustomEvent = {
      name,
      route,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.queue.push(event);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Custom Event:', event);
    }

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Initialize periodic batch flushing
   */
  private initializeBatchFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => {
        if (this.queue.length > 0) {
          this.flush();
        }
      }, this.FLUSH_INTERVAL_MS);

      // Flush on page unload (using sendBeacon for reliability)
      window.addEventListener('beforeunload', () => {
        this.flushWithBeacon();
      });
    }
  }

  /**
   * Flush queued events to the server
   */
  private flush(): void {
    if (this.queue.length === 0) return;

    const eventsToSend = this.queue.splice(0, this.BATCH_SIZE);

    if (typeof fetch !== 'undefined') {
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
        keepalive: true,
      }).catch((err) => {
        console.error('[Analytics] Failed to send events:', err);
        // Re-add failed events to queue for retry
        this.queue.unshift(...eventsToSend);
      });
    }
  }

  /**
   * Flush using sendBeacon (more reliable on page unload)
   */
  private flushWithBeacon(): void {
    if (this.queue.length === 0 || !this.canUseBeacon()) return;

    const eventsToSend = this.queue.splice(0, this.BATCH_SIZE);
    const payload = JSON.stringify({ events: eventsToSend });

    navigator.sendBeacon(this.apiEndpoint, payload);
  }

  /**
   * Send metrics to external monitoring service
   */
  private sendToMonitoringService(type: string, data: unknown): void {
    // Example: Send to Datadog, New Relic, or custom service
    if (typeof window !== 'undefined' && (window as any).__MONITORING__) {
      (window as any).__MONITORING__.track(type, data);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && this.canUseBeacon();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Create singleton instance
export const analyticsManager = new AnalyticsManager();
