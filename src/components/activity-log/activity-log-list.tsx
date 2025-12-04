'use client';

import type { ActivityLog } from '@/lib/types';
import { ActivityLogItem } from './activity-log-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityLogListProps {
  logs: ActivityLog[];
}

export function ActivityLogList({ logs }: ActivityLogListProps) {
  return (
    <Card className="mx-auto mt-4 max-w-4xl">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-6">
            {logs.map(log => (
              <ActivityLogItem key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">No recent activity found for the selected period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
