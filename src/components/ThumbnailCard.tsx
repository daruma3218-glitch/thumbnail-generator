'use client';

import { GeneratedThumbnail } from '@/lib/types';

interface ThumbnailCardProps {
  thumbnail: GeneratedThumbnail;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThumbnailCard({ thumbnail, isSelected, onSelect }: ThumbnailCardProps) {
  const imageSrc = thumbnail.dataUrl || thumbnail.localPath;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = thumbnail.dataUrl || thumbnail.localPath || '';
    link.download = `thumbnail-${thumbnail.id}.png`;
    link.click();
  };

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/30 scale-[1.02]'
          : 'border-gray-700 hover:border-gray-500'
      }`}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="aspect-video bg-gray-800 relative">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={thumbnail.promptVariation.directionSummaryJa}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            画像なし
          </div>
        )}

        {/* Selection overlay — top-right */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Download button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-3 bg-gray-900">
        <p className="text-sm font-medium text-white truncate">
          {thumbnail.promptVariation.creativeAngle}
        </p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
          {thumbnail.promptVariation.directionSummaryJa}
        </p>
      </div>
    </div>
  );
}
