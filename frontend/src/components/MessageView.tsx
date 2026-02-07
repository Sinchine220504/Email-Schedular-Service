"use client";

import React from 'react';
import { formatDate } from '@/lib/utils';

interface Props {
  item: any;
}

export const MessageView: React.FC<Props> = ({ item }) => {
  if (!item) return null;

  const isScheduled = !!item.totalCount;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{item.subject}</h3>
          <div className="text-sm text-gray-500">{isScheduled ? `${item.totalCount} recipients` : item.recipient}</div>
        </div>
        <div className="text-sm text-gray-500">{isScheduled ? formatDate(item.startTime) : (item.sentTime ? formatDate(item.sentTime) : '—')}</div>
      </div>

      <div className="prose max-w-none mb-6">
        {/* If body exists show it, otherwise placeholder */}
        {item.body ? (
          <div dangerouslySetInnerHTML={{ __html: item.body }} />
        ) : (
          <p className="text-gray-600">No message body available.</p>
        )}
      </div>

      {item.attachments && item.attachments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Attachments</h4>
          <div className="flex gap-3 flex-wrap">
            {item.attachments.map((att: any, idx: number) => (
              <div key={idx} className="w-32 border rounded p-2 bg-gray-50">
                {att.contentType?.startsWith('image/') ? (
                  <img src={att.contentBase64} alt={att.filename} className="w-full h-20 object-cover rounded" />
                ) : (
                  <div className="text-sm text-gray-700">{att.filename}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">{att.contentType}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageView;
