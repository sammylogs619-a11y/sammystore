/**
 * Analytics Dashboard - Overview Page
 * Displays high-level metrics and KPIs
 */

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsSummary {
  pageViews: Array<{ pathname: string; views: number; unique_sessions: number }>;
  errors: Array<{ type: string; count: number; messages: string[] }>;
  performance: Array<{
    route: string;
    measurements: number;
    avg_rendering_time: number;
    max_rendering_time: number;
    avg_total_time: number;
  }>;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '7d', end: 'now' });

  useEffect(() => {
    fetchAnalyticsSummary();
  }, [dateRange]);

  const fetchAnalyticsSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/summary?startDate=7d&endDate=now');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold">Loading analytics...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-red-600">Failed to load analytics data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Last 7 days overview</p>
        </div>
        <button
          onClick={fetchAnalyticsSummary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page Views"
          value={summary.pageViews.reduce((sum, pv) => sum + pv.views, 0)}
          icon="📄"
        />
        <MetricCard
          title="Unique Sessions"
          value={summary.pageViews.reduce((sum, pv) => sum + pv.unique_sessions, 0)}
          icon="👥"
        />
        <MetricCard
          title="Total Errors"
          value={summary.errors.reduce((sum, e) => sum + e.count, 0)}
          icon="⚠️"
        />
        <MetricCard
          title="Tracked Routes"
          value={summary.performance.length}
          icon="🗺️"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pages">Page Views</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Page Views Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages by Views</CardTitle>
              <CardDescription>Most visited routes in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.pageViews.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pathname" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#3b82f6" name="Page Views" />
                  <Bar dataKey="unique_sessions" fill="#10b981" name="Unique Sessions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Page Views Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={summary.pageViews.slice(0, 5)}
                    dataKey="views"
                    nameKey="pathname"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {summary.pageViews.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Type</CardTitle>
              <CardDescription>Error distribution in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.errors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name="Error Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.errors.map((error, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 pl-4 py-2">
                    <h3 className="font-semibold text-red-700">{error.type}</h3>
                    <p className="text-sm text-gray-600">Count: {error.count}</p>
                    {error.messages.slice(0, 2).map((msg, i) => (
                      <p key={i} className="text-sm text-gray-500 italic">
                        "{msg}"
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Route Performance</CardTitle>
              <CardDescription>Average rendering time by route</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.performance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="route" angle={-45} textAnchor="end" height={80} />
                  <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_rendering_time" fill="#3b82f6" name="Avg Rendering Time" />
                  <Bar dataKey="max_rendering_time" fill="#f59e0b" name="Max Rendering Time" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Slowest Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.performance
                  .sort((a, b) => b.avg_rendering_time - a.avg_rendering_time)
                  .slice(0, 5)
                  .map((perf, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{perf.route}</p>
                        <p className="text-sm text-gray-600">{perf.measurements} measurements</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          {perf.avg_rendering_time.toFixed(2)}ms
                        </p>
                        <p className="text-sm text-gray-600">
                          Peak: {perf.max_rendering_time.toFixed(2)}ms
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
          </div>
          <div className="text-4xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
