'use client';

import { IterationRound } from '@/lib/types';

interface IterationHistoryProps {
  iterations: IterationRound[];
}

export function IterationHistory({ iterations }: IterationHistoryProps) {
  if (iterations.length <= 1) return null;

  return (
    <div className="max-w-6xl mx-auto mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3">イテレーション履歴</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {iterations.slice(0, -1).map((iter, i) => {
          const selectedThumb = iter.thumbnails.find(
            (t) => t.id === iter.selectedThumbnailId
          );
          return (
            <div
              key={i}
              className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-lg p-2"
            >
              <div className="text-xs text-gray-500 mb-1">Round {i + 1}</div>
              <div className="flex gap-1">
                {iter.thumbnails.map((thumb) => {
                  const isSelected = thumb.id === iter.selectedThumbnailId;
                  const src = thumb.dataUrl || thumb.localPath;
                  return (
                    <div
                      key={thumb.id}
                      className={`w-16 h-9 rounded overflow-hidden border ${
                        isSelected ? 'border-blue-500' : 'border-gray-700'
                      }`}
                    >
                      {src && (
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedThumb && (
                <div className="text-xs text-blue-400 mt-1 truncate max-w-[300px]">
                  選択: {selectedThumb.promptVariation.creativeAngle}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
