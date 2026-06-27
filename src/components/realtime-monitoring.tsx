/**
 * Real-time Monitoring Dashboard
 * Live tracking of analytics events, errors, and performance
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RealtimeEvent {
  id: string;
  type: 'page_view' | 'error' | 'custom_event' | 'performance';
  pathname?: string;
  message?: string;
  sessionId: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high';
}

interface LiveMetrics {
  activeUsers: number;
  eventsPerSecond: number;
  errorRate: number;
  avgResponseTime: number;
}

export function RealtimeMonitoringDashboard() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    activeUsers: 0,
    eventsPerSecond: 0,
    errorRate: 0,
    avgResponseTime: 0,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'errors' | 'page_views'>('all');

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchRealtimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      const data = await response.json();
      setEvents(data.events || []);
      setLiveMetrics(data.metrics || {});
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'page_view':
        return '📄';
      case 'error':
        return '⚠️';
      case 'custom_event':
        return '📊';
      case 'performance':
        return '⚡';
      default:
        return '📌';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Real-time Monitoring</h1>
          <p className="text-gray-600 mt-2">Live activity dashboard</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRealtimeData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg transition ${
              autoRefresh
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LiveMetricCard
          title="Active Users"
          value={liveMetrics.activeUsers}
          unit="users"
          icon="👥"
          trend={Math.floor(Math.random() * 10) - 5}
        />
        <LiveMetricCard
          title="Events/sec"
          value={liveMetrics.eventsPerSecond}
          unit="eps"
          icon="📊"
          trend={Math.floor(Math.random() * 10) - 5}
        />
        <LiveMetricCard
          title="Error Rate"
          value={liveMetrics.errorRate}
          unit="%"
          icon="⚠️"
          trend={Math.floor(Math.random() * 10) - 5}
          isAlert={liveMetrics.errorRate > 5}
        />
        <LiveMetricCard
          title="Avg Response Time"
          value={liveMetrics.avgResponseTime}
          unit="ms"
          icon="⚡"
          trend={Math.floor(Math.random() * 10) - 5}
        />
      </div>

      {/* Events Stream */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Event Stream</CardTitle>
              <CardDescription>Real-time activity feed</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('errors')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'errors'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Errors
              </button>
              <button
                onClick={() => setFilter('page_views')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'page_views'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Page Views
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No events to display</p>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 hover:bg-gray-100 transition"
                >
                  <span className="text-xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{event.type}</Badge>
                      {event.severity && (
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {event.pathname || event.message || 'Event triggered'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Session: {event.sessionId.slice(0, 12)}...
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Active Sessions</CardTitle>
            <CardDescription>Most active user sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-semibold">Session {i}</p>
                    <p className="text-xs text-gray-600">{Math.floor(Math.random() * 20) + 1} events</p>
                  </div>
                  <div className="w-24 bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
            <CardDescription>High-priority issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AlertItem
                title="High Error Rate"
                description="Error rate exceeded 10% threshold"
                severity="high"
              />
              <AlertItem
                title="Slow Route Detected"
                description="/dashboard taking 2000ms to load"
                severity="medium"
              />
              <AlertItem
                title="Session Drop"
                description="Active sessions decreased by 30%"
                severity="medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LiveMetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  isAlert,
}: {
  title: string;
  value: number;
  unit: string;
  icon: string;
  trend: number;
  isAlert?: boolean;
}) {
  return (
    <Card className={isAlert ? 'border-red-500 bg-red-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${isAlert ? 'text-red-600' : 'text-gray-600'}`}>{title}</p>
            <p className={`text-3xl font-bold mt-2 ${isAlert ? 'text-red-700' : ''}`}>
              {value.toFixed(1)}
              <span className="text-lg text-gray-600 ml-1">{unit}</span>
            </p>
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from 1h ago
            </p>
          </div>
          <div className={`text-4xl ${isAlert ? 'opacity-70' : ''}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}) {
  const bgColor =
    severity === 'high'
      ? 'bg-red-50 border-l-red-500'
      : severity === 'medium'
        ? 'bg-yellow-50 border-l-yellow-500'
        : 'bg-blue-50 border-l-blue-500';

  return (
    <div className={`${bgColor} border-l-4 p-3 rounded`}>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
      <button className="text-xs text-blue-600 hover:underline mt-2">View Details →</button>
    </div>
  );
}
