/**
 * Session Replay Component
 * View detailed user session journeys and interactions
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SessionEvent {
  id: string;
  type: 'page_view' | 'error' | 'custom_event' | 'performance';
  pathname?: string;
  message?: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  duration?: number;
}

interface SessionDetail {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalEvents: number;
  errors: number;
  uniquePages: number;
  pageViews: string[];
  events: SessionEvent[];
}

export function SessionReplayComponent({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/session/${sessionId}`);
      const data = await response.json();

      // Process events into a session detail structure
      const events = data.events || [];
      const pageViews = events
        .filter((e: SessionEvent) => e.type === 'page_view')
        .map((e: SessionEvent) => e.pathname)
        .filter(Boolean);

      const sessionDetail: SessionDetail = {
        sessionId,
        startTime: events[0]?.timestamp || 0,
        endTime: events[events.length - 1]?.timestamp || 0,
        duration: Math.floor(
          (events[events.length - 1]?.timestamp - events[0]?.timestamp) / 1000
        ),
        totalEvents: events.length,
        errors: events.filter((e: SessionEvent) => e.type === 'error').length,
        uniquePages: new Set(pageViews).size,
        pageViews,
        events,
      };

      setSession(sessionDetail);
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-red-600">Failed to load session</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Session Replay</h1>
        <p className="text-gray-600 mt-2">Session ID: {sessionId}</p>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SessionStatCard
          label="Duration"
          value={formatDuration(session.duration)}
          icon="⏱️"
        />
        <SessionStatCard
          label="Total Events"
          value={session.totalEvents.toString()}
          icon="📊"
        />
        <SessionStatCard
          label="Pages Visited"
          value={session.uniquePages.toString()}
          icon="📄"
        />
        <SessionStatCard
          label="Errors"
          value={session.errors.toString()}
          icon="⚠️"
          isAlert={session.errors > 0}
        />
      </div>

      {/* Session Timeline and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Session Timeline</CardTitle>
              <CardDescription>User journey and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {session.events.map((event, index) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer transition hover:bg-gray-50 ${
                        event.type === 'error'
                          ? 'border-l-red-500 bg-red-50'
                          : event.type === 'page_view'
                            ? 'border-l-blue-500'
                            : 'border-l-green-500'
                      } ${selectedEvent?.id === event.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline">{event.type}</Badge>
                            <span className="text-xs text-gray-500">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold mt-2">
                            {event.pathname || event.message || `Event ${index + 1}`}
                          </p>
                          {event.duration && (
                            <p className="text-xs text-gray-600 mt-1">
                              Duration: {event.duration}ms
                            </p>
                          )}
                        </div>
                        <span className="text-2xl">
                          {event.type === 'page_view'
                            ? '📄'
                            : event.type === 'error'
                              ? '⚠️'
                              : event.type === 'custom_event'
                                ? '📊'
                                : '⚡'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Event Details Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                {selectedEvent ? 'Click an event to view details' : 'No event selected'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <Badge className="mt-1">{selectedEvent.type}</Badge>
                  </div>

                  {selectedEvent.pathname && (
                    <div>
                      <p className="text-sm text-gray-600">Path</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1">
                        {selectedEvent.pathname}
                      </p>
                    </div>
                  )}

                  {selectedEvent.message && (
                    <div>
                      <p className="text-sm text-gray-600">Message</p>
                      <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                        {selectedEvent.message}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Timestamp</p>
                    <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1">
                      {new Date(selectedEvent.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {selectedEvent.duration && (
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="text-sm font-bold">{selectedEvent.duration}ms</p>
                    </div>
                  )}

                  {selectedEvent.properties && Object.keys(selectedEvent.properties).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Properties</p>
                      <div className="space-y-2">
                        {Object.entries(selectedEvent.properties).map(([key, value]) => (
                          <div key={key} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-semibold text-gray-700">{key}</p>
                            <p className="text-gray-600">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Select an event from the timeline to view details
                </p>
              )}
            </CardContent>
          </Card>

          {/* Session Summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Pages Visited</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(new Set(session.pageViews)).map((page, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600">→</span>
                    <span className="font-mono">{page}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SessionStatCard({
  label,
  value,
  icon,
  isAlert,
}: {
  label: string;
  value: string;
  icon: string;
  isAlert?: boolean;
}) {
  return (
    <Card className={isAlert ? 'border-red-500 bg-red-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${isAlert ? 'text-red-600' : 'text-gray-600'}`}>{label}</p>
            <p className={`text-2xl font-bold mt-2 ${isAlert ? 'text-red-700' : ''}`}>
              {value}
            </p>
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}
