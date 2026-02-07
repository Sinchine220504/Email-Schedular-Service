"use client";

import React from 'react';
import { ScheduledEmailSchedule, SentEmail } from '@/types';
import { formatDate } from '@/lib/utils';

interface Props {
  type: 'scheduled' | 'sent';
  scheduledItems: ScheduledEmailSchedule[];
  sentItems: SentEmail[];
  loading?: boolean;
  onSelect?: (item: any) => void;
}

export const MessageList: React.FC<Props> = ({ type, scheduledItems, sentItems, loading = false, onSelect }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="text-gray-500">⏳ Loading...</span>
      </div>
    );
  }

  const items = type === 'scheduled' ? scheduledItems : sentItems;

  if (!items || items.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="text-gray-500">{type === 'scheduled' ? 'No scheduled emails. Create one to get started!' : 'No sent emails yet.'}</span>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {items.map((row: any) => (
          <li key={row.id} className="py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onSelect?.(row)}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {type === 'scheduled' ? row.subject : row.subject}
                  </div>
                  <div className="ml-2 text-xs text-gray-400 truncate">{type === 'scheduled' ? `(${row.totalCount} recipients)` : ''}</div>
                </div>

                <p className="text-sm text-gray-500 mt-1 truncate">
                  {type === 'scheduled'
                    ? `To ${row.totalCount} recipients — scheduled at ${formatDate(row.startTime)}`
                    : `To ${row.recipient} — ${row.subject}`}
                </p>
              </div>

              <div className="flex-shrink-0 ml-4 text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-orange-50 text-orange-700">
                  {type === 'scheduled' ? formatDate(row.startTime) : (row.sentTime ? formatDate(row.sentTime) : '—')}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MessageList;
