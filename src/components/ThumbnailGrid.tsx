'use client';

import { GeneratedThumbnail, ReferenceImage, StructuredFeedback } from '@/lib/types';
import { ThumbnailCard } from './ThumbnailCard';
import { FeedbackPanel } from './FeedbackPanel';

interface ThumbnailGridProps {
  thumbnails: GeneratedThumbnail[];
  selectedId: string | null;
  onSelect: (thumbnail: GeneratedThumbnail) => void;
  onRefine: (feedback: string, feedbackImages?: ReferenceImage[], structuredFeedback?: StructuredFeedback) => void;
  existingReferenceImages?: ReferenceImage[];
  isRefinement?: boolean;
  totalRequested?: number;
}

export function ThumbnailGrid({
  thumbnails,
  selectedId,
  onSelect,
  onRefine,
  existingReferenceImages = [],
  isRefinement = false,
  totalRequested = 3,
}: ThumbnailGridProps) {
  const failedCount = totalRequested - thumbnails.length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          {isRefinement ? '改善サムネイル' : '生成されたサムネイル'} ({thumbnails.length}枚)
        </h2>
      </div>

      {failedCount > 0 && (
        <p className="text-sm text-yellow-500 mb-3">
          {failedCount}枚の生成に失敗しました。表示されているサムネイルからお選びください。
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {thumbnails.map((thumb) => (
          <ThumbnailCard
            key={thumb.id}
            thumbnail={thumb}
            isSelected={selectedId === thumb.id}
            onSelect={() => onSelect(thumb)}
          />
        ))}
      </div>

      {!selectedId && thumbnails.length > 0 && (
        <p className="text-center text-gray-500 mt-4 text-sm">
          気に入ったサムネイルをクリックして選択してください
        </p>
      )}

      {/* Structured Feedback Panel */}
      {selectedId && (
        <FeedbackPanel
          onSubmit={onRefine}
          existingReferenceImages={existingReferenceImages}
        />
      )}
    </div>
  );
}
