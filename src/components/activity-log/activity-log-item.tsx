'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/lib/types';
import {
  FilePlus,
  FilePenLine,
  KeyRound,
  Archive,
  History,
} from 'lucide-react';

interface ActivityLogItemProps {
  log: ActivityLog;
}

const actionIcons: Record<string, React.ElementType> = {
  created: FilePlus,
  updated: FilePenLine,
  password_changed: KeyRound,
  archived: Archive,
  default: History,
};

const actionColors: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  password_changed: 'bg-yellow-500 text-yellow-900',
  archived: 'bg-red-500',
  default: 'bg-gray-500',
};

export function ActivityLogItem({ log }: ActivityLogItemProps) {
  const Icon = actionIcons[log.action] || actionIcons.default;
  const color = actionColors[log.action] || actionColors.default;

  const formattedTimestamp = log.timestamp
    ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })
    : 'Just now';

  const fullTimestamp = log.timestamp
    ? format(log.timestamp.toDate(), 'PPP p')
    : 'N/A';

  return (
    <div className="relative flex items-start gap-4 pl-10">
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full">
        <span className={cn('flex h-full w-full items-center justify-center rounded-full text-white', color)}>
           <Icon className="h-4 w-4" />
        </span>
      </span>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            <span className="font-bold">{log.itemName}</span>
            <span className="text-muted-foreground"> - {log.details}</span>
          </p>
          <p className="text-xs text-muted-foreground" title={fullTimestamp}>
            {formattedTimestamp}
          </p>
        </div>
      </div>
    </div>
  );
}
