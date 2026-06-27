-- Step 9: Analytics & Monitoring Tables
-- Tracks route analytics, performance metrics, and errors

-- Page Views Table
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  pathname TEXT NOT NULL,
  search TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_page_views_session UNIQUE (session_id, pathname, created_at)
);

CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_pathname ON page_views(pathname);
CREATE INDEX idx_page_views_created_at ON page_views(created_at);

-- Error Events Table
CREATE TABLE IF NOT EXISTS error_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('route_error', 'data_fetch_error', 'render_error', 'hydration_error', 'not_found')),
  message TEXT NOT NULL,
  route TEXT,
  status_code INTEGER,
  stack TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_error_events_session UNIQUE (session_id, message, created_at)
);

CREATE INDEX idx_error_events_session_id ON error_events(session_id);
CREATE INDEX idx_error_events_type ON error_events(type);
CREATE INDEX idx_error_events_route ON error_events(route);
CREATE INDEX idx_error_events_created_at ON error_events(created_at);

-- Custom Events Table
CREATE TABLE IF NOT EXISTS custom_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  route TEXT,
  properties JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_custom_events_session UNIQUE (session_id, name, created_at)
);

CREATE INDEX idx_custom_events_session_id ON custom_events(session_id);
CREATE INDEX idx_custom_events_name ON custom_events(name);
CREATE INDEX idx_custom_events_route ON custom_events(route);
CREATE INDEX idx_custom_events_created_at ON custom_events(created_at);

-- Route Performance Metrics Table
CREATE TABLE IF NOT EXISTS route_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  route TEXT NOT NULL,
  navigation_start BIGINT,
  route_load_time REAL,
  rendering_time REAL NOT NULL,
  total_time REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_route_performance_metrics_route ON route_performance_metrics(route);
CREATE INDEX idx_route_performance_metrics_created_at ON route_performance_metrics(created_at);

-- Aggregated Analytics Table (for faster dashboards)
CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('daily_views', 'daily_errors', 'daily_performance')),
  metric_date DATE NOT NULL,
  route_or_type TEXT,
  count INTEGER,
  avg_value REAL,
  max_value REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_aggregate UNIQUE (metric_type, metric_date, route_or_type)
);

CREATE INDEX idx_analytics_aggregates_date ON analytics_aggregates(metric_date);
CREATE INDEX idx_analytics_aggregates_metric_type ON analytics_aggregates(metric_type);

-- Enable RLS on all analytics tables
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow users to read only their own session data (optional, adjust as needed)
CREATE POLICY "Allow read access to page_views" ON page_views
  FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to error_events" ON error_events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to custom_events" ON custom_events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to route_performance_metrics" ON route_performance_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to analytics_aggregates" ON analytics_aggregates
  FOR SELECT
  USING (true);

-- Stored Procedure to Aggregate Analytics Daily
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void AS $$
BEGIN
  -- Aggregate daily page views
  INSERT INTO analytics_aggregates (metric_type, metric_date, route_or_type, count, created_at)
  SELECT 'daily_views', CURRENT_DATE, pathname, COUNT(*), now()
  FROM page_views
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY pathname
  ON CONFLICT (metric_type, metric_date, route_or_type) DO UPDATE
  SET count = EXCLUDED.count;

  -- Aggregate daily errors
  INSERT INTO analytics_aggregates (metric_type, metric_date, route_or_type, count, created_at)
  SELECT 'daily_errors', CURRENT_DATE, type, COUNT(*), now()
  FROM error_events
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY type
  ON CONFLICT (metric_type, metric_date, route_or_type) DO UPDATE
  SET count = EXCLUDED.count;

  -- Aggregate daily performance metrics
  INSERT INTO analytics_aggregates (metric_type, metric_date, route_or_type, avg_value, max_value, created_at)
  SELECT 'daily_performance', CURRENT_DATE, route, AVG(rendering_time), MAX(rendering_time), now()
  FROM route_performance_metrics
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY route
  ON CONFLICT (metric_type, metric_date, route_or_type) DO UPDATE
  SET avg_value = EXCLUDED.avg_value, max_value = EXCLUDED.max_value;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT ON page_views TO authenticated;
GRANT SELECT, INSERT ON error_events TO authenticated;
GRANT SELECT, INSERT ON custom_events TO authenticated;
GRANT SELECT, INSERT ON route_performance_metrics TO authenticated;
GRANT SELECT ON analytics_aggregates TO authenticated;
