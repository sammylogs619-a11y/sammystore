/**
 * Analytics API Endpoints
 * Handles incoming analytics events and stores them for monitoring and analysis
 */

import express, { Request, Response } from 'express';
import { pool } from './db';

const router = express.Router();

interface AnalyticsEvent {
  type: 'page_view' | 'error' | 'custom_event' | 'route_performance';
  pathname?: string;
  search?: string;
  referrer?: string;
  timestamp: number;
  sessionId: string;
  message?: string;
  statusCode?: number;
  stack?: string;
  name?: string;
  route?: string;
  properties?: Record<string, unknown>;
  navigationStart?: number;
  routeLoadTime?: number;
  renderingTime?: number;
  totalTime?: number;
}

/**
 * POST /api/analytics
 * Receive and store analytics events
 */
router.post('/api/analytics', express.json(), async (req: Request, res: Response) => {
  try {
    const { events } = req.body as { events: AnalyticsEvent[] };

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid events format' });
    }

    if (!pool) {
      console.warn('[Analytics API] Database not configured');
      return res.status(503).json({ error: 'Analytics service temporarily unavailable' });
    }

    const client = await pool.connect();

    try {
      for (const event of events) {
        // Determine event type and process accordingly
        if (event.type === 'page_view') {
          await insertPageView(client, event);
        } else if (event.type === 'error') {
          await insertErrorEvent(client, event);
        } else if (event.type === 'custom_event') {
          await insertCustomEvent(client, event);
        } else if (event.type === 'route_performance') {
          await insertPerformanceMetric(client, event);
        }
      }

      res.json({ success: true, processed: events.length });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics API] Error processing analytics:', error);
    res.status(500).json({ error: 'Failed to process analytics' });
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary for a given date range
 */
router.get('/api/analytics/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!pool) {
      return res.status(503).json({ error: 'Analytics service temporarily unavailable' });
    }

    const client = await pool.connect();

    try {
      // Page views summary
      const pageViewsQuery = `
        SELECT 
          pathname,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY pathname
        ORDER BY views DESC
        LIMIT 20
      `;

      const pageViews = await client.query(pageViewsQuery, [startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate || new Date()]);

      // Errors summary
      const errorsQuery = `
        SELECT 
          type,
          COUNT(*) as count,
          array_agg(DISTINCT message) as messages
        FROM error_events
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY type
      `;

      const errors = await client.query(errorsQuery, [startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate || new Date()]);

      // Performance metrics
      const performanceQuery = `
        SELECT 
          route,
          COUNT(*) as measurements,
          AVG(rendering_time) as avg_rendering_time,
          MAX(rendering_time) as max_rendering_time,
          AVG(total_time) as avg_total_time
        FROM route_performance_metrics
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY route
        ORDER BY avg_total_time DESC
      `;

      const performance = await client.query(performanceQuery, [startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate || new Date()]);

      res.json({
        pageViews: pageViews.rows,
        errors: errors.rows,
        performance: performance.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics API] Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

/**
 * GET /api/analytics/session/:sessionId
 * Get all analytics events for a specific session
 */
router.get('/api/analytics/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Analytics service temporarily unavailable' });
    }

    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM page_views WHERE session_id = $1
        UNION ALL
        SELECT * FROM error_events WHERE session_id = $1
        UNION ALL
        SELECT * FROM custom_events WHERE session_id = $1
        ORDER BY created_at ASC
      `;

      const result = await client.query(query, [sessionId]);
      res.json({ events: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics API] Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session analytics' });
  }
});

// Helper functions for inserting analytics events

async function insertPageView(client: any, event: AnalyticsEvent) {
  const query = `
    INSERT INTO page_views (session_id, pathname, search, referrer, created_at)
    VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
    ON CONFLICT DO NOTHING
  `;

  await client.query(query, [
    event.sessionId,
    event.pathname,
    event.search,
    event.referrer,
    event.timestamp,
  ]);
}

async function insertErrorEvent(client: any, event: AnalyticsEvent) {
  const query = `
    INSERT INTO error_events (session_id, type, message, route, status_code, stack, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
    ON CONFLICT DO NOTHING
  `;

  await client.query(query, [
    event.sessionId,
    event.type,
    event.message,
    event.route,
    event.statusCode,
    event.stack,
    event.timestamp,
  ]);
}

async function insertCustomEvent(client: any, event: AnalyticsEvent) {
  const query = `
    INSERT INTO custom_events (session_id, name, route, properties, created_at)
    VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
    ON CONFLICT DO NOTHING
  `;

  await client.query(query, [
    event.sessionId,
    event.name,
    event.route,
    JSON.stringify(event.properties),
    event.timestamp,
  ]);
}

async function insertPerformanceMetric(client: any, event: AnalyticsEvent) {
  const query = `
    INSERT INTO route_performance_metrics (route, navigation_start, route_load_time, rendering_time, total_time, created_at)
    VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))
    ON CONFLICT DO NOTHING
  `;

  await client.query(query, [
    event.route,
    event.navigationStart,
    event.routeLoadTime,
    event.renderingTime,
    event.totalTime,
    event.timestamp,
  ]);
}

export default router;
