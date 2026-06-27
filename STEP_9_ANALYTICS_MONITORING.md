# Step 9: Route Analytics & Monitoring

## Overview

This step implements comprehensive route analytics and monitoring for your TanStack Start application. It tracks user navigation patterns, route performance, errors, and custom events—providing visibility into how users interact with your application.

---

## What's Implemented

### 1. **Database Schema** (`supabase/migrations/step9_analytics_tables.sql`)

Five new tables for analytics:

- **`page_views`** - Tracks every route navigation with pathname, search params, and referrer
- **`error_events`** - Captures route-level errors (404s, data fetching failures, render errors)
- **`custom_events`** - Stores user interaction events (CTA clicks, form submissions, etc.)
- **`route_performance_metrics`** - Measures navigation time, render time, and total load time
- **`analytics_aggregates`** - Pre-aggregated daily metrics for faster dashboard queries

**Features:**
- Row-level security (RLS) enabled
- Indexed for fast queries
- Automatic daily aggregation via stored procedure
- Supports batch inserts and conflict handling

---

### 2. **Client-Side Analytics Manager** (`src/lib/analytics.ts`)

Core module for tracking analytics events on the client.

**Key Features:**
- **Session tracking** - Unique session ID per user session
- **Event batching** - Groups events before sending (batch size: 10 events)
- **Auto-flush** - Sends batched events every 5 seconds
- **sendBeacon support** - Reliable event delivery on page unload
- **Development logging** - Console output in dev mode

**Public API:**
```typescript
// Track page views
analyticsManager.trackPageView(pathname, search);

// Track errors
analyticsManager.trackError(type, message, route, statusCode, stack);

// Track custom events
analyticsManager.trackEvent(name, route, properties);

// Track route performance
analyticsManager.trackRoutePerformance(route, metrics);

// Get session ID
analyticsManager.getSessionId();
```

---

### 3. **Route Monitoring Component** (`src/lib/route-monitor.tsx`)

React hooks and components for TanStack Router integration.

**Components & Hooks:**

#### `useRouteAnalytics()` Hook
Tracks all route changes and measures rendering performance.

```typescript
export function MyComponent() {
  const { measureRoutePerformance } = useRouteAnalytics();

  useEffect(() => {
    const stopMeasuring = measureRoutePerformance('my-route');
    // ... component logic
    return stopMeasuring; // Call when component is done rendering
  }, []);

  return <div>My Component</div>;
}
```

#### `RouteMonitor` Component
Provider component to wrap your app and enable automatic route tracking.

```typescript
// In your root layout or app shell
import { RouteMonitor } from '@/lib/route-monitor';

export default function App() {
  return (
    <RouteMonitor>
      <YourAppRoutes />
    </RouteMonitor>
  );
}
```

#### `withRouteAnalytics()` HOC
Higher-order component to wrap individual route components.

```typescript
const MyRoute = withRouteAnalytics(MyRouteComponent, 'my-route-name');
```

---

### 4. **Error Boundary & Error Tracking** (`src/lib/error-boundary.tsx`)

Error boundary component and hooks for error tracking.

**Components & Hooks:**

#### `ErrorBoundary` Component
Catches render errors and sends them to analytics.

```typescript
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

#### Error Tracking Hooks

```typescript
// Track route errors
const trackRouteError = useRouteError();
trackRouteError(error, '/my-route', 404);

// Track 404 errors
useNotFoundTracking('/not-found-route');

// Track data fetching errors
const trackFetchError = useDataFetchErrorTracking('/dashboard');
try {
  const data = await fetch('/api/data');
} catch (error) {
  trackFetchError(error);
}
```

---

### 5. **Server-Side Analytics API** (`server/analytics-api.ts`)

Express endpoints to receive and store analytics events.

**Endpoints:**

#### `POST /api/analytics`
Receives batched analytics events from the client.

```typescript
// Request body
{
  events: [
    {
      type: 'page_view',
      pathname: '/dashboard',
      search: '?tab=overview',
      timestamp: Date.now(),
      sessionId: '...'
    },
    // ... more events
  ]
}

// Response
{ success: true, processed: 5 }
```

#### `GET /api/analytics/summary`
Get analytics summary for a date range.

```typescript
// Query parameters
?startDate=2026-06-01&endDate=2026-06-30

// Response
{
  pageViews: [
    { pathname: '/dashboard', views: 150, unique_sessions: 45 },
    { pathname: '/products', views: 120, unique_sessions: 38 }
  ],
  errors: [
    { type: 'not_found', count: 5, messages: ['Route not found'] }
  ],
  performance: [
    { route: '/dashboard', avg_rendering_time: 245.5, max_rendering_time: 1200 }
  ]
}
```

#### `GET /api/analytics/session/:sessionId`
Get all analytics events for a specific user session.

---

## How to Use

### 1. Run Database Migration

Apply the migration to your Supabase database:

```bash
# If using Supabase CLI
supabase db push supabase/migrations/step9_analytics_tables.sql

# Or manually in Supabase SQL Editor, copy and paste the migration content
```

### 2. Integrate Route Monitoring

Wrap your root component with `RouteMonitor`:

```typescript
// src/routes/__root.tsx
import { RouteMonitor } from '@/lib/route-monitor';

export const Route = createRootRoute({
  component: () => (
    <RouteMonitor>
      <div className="min-h-screen">
        <Outlet />
      </div>
    </RouteMonitor>
  ),
});
```

### 3. Add Error Boundary

Wrap route components with `ErrorBoundary`:

```typescript
// src/routes/dashboard.tsx
import { ErrorBoundary } from '@/lib/error-boundary';

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  ),
});
```

### 4. Track Custom Events

Track user interactions in your components:

```typescript
import { analyticsManager } from '@/lib/analytics';

export function ProductCard({ productId }) {
  const handleAddToCart = () => {
    analyticsManager.trackEvent('add_to_cart', '/products', {
      productId,
      price: product.price,
    });
    // ... add to cart logic
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

### 5. Track Performance Metrics

Measure route-specific performance:

```typescript
import { useRouteAnalytics } from '@/lib/route-monitor';

export function ExpensiveComponent() {
  const { measureRoutePerformance } = useRouteAnalytics();

  useEffect(() => {
    const stop = measureRoutePerformance('expensive-component');
    // ... expensive operations
    return stop;
  }, []);

  return <div>...</div>;
}
```

### 6. Integrate Server Analytics

Update `server/api.ts` to use the analytics router:

```typescript
import analyticsRouter from './analytics-api';

const app = express();
app.use(analyticsRouter);
```

---

## Analytics Events Reference

### Page View Event
```typescript
{
  type: 'page_view',
  pathname: '/dashboard',
  search: '?tab=overview',
  referrer: 'https://google.com',
  timestamp: 1234567890,
  sessionId: 'session-123'
}
```

### Error Event
```typescript
{
  type: 'error',
  errorType: 'route_error',
  message: 'Failed to load route',
  route: '/dashboard',
  statusCode: 500,
  stack: '...',
  timestamp: 1234567890,
  sessionId: 'session-123'
}
```

### Custom Event
```typescript
{
  type: 'custom_event',
  name: 'add_to_cart',
  route: '/products',
  properties: {
    productId: '123',
    price: 29.99
  },
  timestamp: 1234567890,
  sessionId: 'session-123'
}
```

### Performance Metric
```typescript
{
  type: 'route_performance',
  route: '/dashboard',
  navigationStart: 1234567890,
  routeLoadTime: 250,
  renderingTime: 150,
  totalTime: 400,
  timestamp: 1234567890,
  sessionId: 'session-123'
}
```

---

## Querying Analytics Data

### Get Top Routes by Views (Last 7 Days)
```sql
SELECT pathname, COUNT(*) as views
FROM page_views
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY pathname
ORDER BY views DESC
LIMIT 10;
```

### Get Error Rates by Type
```sql
SELECT type, COUNT(*) as count
FROM error_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY count DESC;
```

### Get Slowest Routes
```sql
SELECT route, AVG(rendering_time) as avg_time, MAX(rendering_time) as max_time
FROM route_performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route
ORDER BY avg_time DESC
LIMIT 10;
```

### Get User Session Journey
```sql
SELECT * FROM page_views
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY created_at ASC;
```

---

## Privacy Considerations

⚠️ **Important:**
- Do not track sensitive parameters (passwords, API keys, PII)
- Sanitize route parameters before logging
- Implement consent checking for analytics (GDPR/CCPA)
- Consider adding a privacy toggle in user settings

---

## Performance Tips

1. **Batch Events** - Events are batched automatically, but you can increase batch size if needed
2. **Indexed Queries** - All tables have appropriate indexes for fast querying
3. **Daily Aggregation** - Use `analytics_aggregates` for dashboard queries instead of raw tables
4. **Archive Old Data** - Implement a data retention policy to clean up old analytics

---

## Next Steps

- **Step 10**: Set up monitoring dashboards (Grafana, Metabase, or custom)
- **Step 11**: Implement alerting for errors and performance thresholds
- **Step 12**: Add user session replay for deeper debugging

---

## Troubleshooting

**Analytics not showing up?**
- Check browser console for errors
- Verify `/api/analytics` endpoint is reachable
- Ensure database migration was applied
- Check server logs for failed inserts

**Performance metrics missing?**
- Call `measureRoutePerformance()` and `stop()` the measurement
- Ensure components unmount cleanly
- Check for console errors in React DevTools

**Events not persisting?**
- Verify database connection in `server/api.ts`
- Check RLS policies allow inserts
- Review server logs for SQL errors

