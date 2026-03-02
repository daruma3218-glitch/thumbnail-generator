'use client';

import { useState } from 'react';
import { SessionListItem } from '@/lib/types';

interface SessionHistoryProps {
  sessions: SessionListItem[];
  currentSessionId: string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function SessionHistory({
  sessions,
  currentSessionId,
  onLoad,
  onDelete,
  onClose,
}: SessionHistoryProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">過去のセッション</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">まだセッションが保存されていません</p>
              <p className="text-xs mt-1">サムネイルを生成すると自動保存されます</p>
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                session.id === currentSessionId
                  ? 'border-green-600/50 bg-green-900/20'
                  : 'border-gray-800 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              {/* Preview thumbnail */}
              <div className="flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-gray-700">
                {session.previewThumbnailDataUrl ? (
                  <img
                    src={session.previewThumbnailDataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    No image
                  </div>
                )}
              </div>

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.title || '無題'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {formatDate(session.updatedAt)}
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">
                    {session.iterationCount}回生成
                  </span>
                  {session.id === currentSessionId && (
                    <span className="px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                      現在
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => onLoad(session.id)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs transition-colors"
                >
                  読み込む
                </button>
                {confirmDeleteId === session.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDelete(session.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(session.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">
            セッションはブラウザのIndexedDBに保存されています
          </p>
        </div>
      </div>
    </div>
  );
}
