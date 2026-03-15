'use client';

import { ThumbnailTypeId, THUMBNAIL_TYPES, THUMBNAIL_TYPE_LIST } from '@/lib/thumbnail-types';
import { TypeRecommendation } from '@/lib/type-recommender';

interface TypeSelectorProps {
  recommendation: TypeRecommendation;
  selectedTypes: ThumbnailTypeId[];
  onTypeSelect: (typeId: ThumbnailTypeId) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const TYPE_COLORS: Record<ThumbnailTypeId, { bg: string; border: string; badge: string }> = {
  T01: { bg: 'from-yellow-900/30 to-gray-900', border: 'border-yellow-700', badge: 'bg-yellow-500/20 text-yellow-300' },
  T02: { bg: 'from-red-900/30 to-gray-900', border: 'border-red-700', badge: 'bg-red-500/20 text-red-300' },
  T03: { bg: 'from-green-900/30 to-gray-900', border: 'border-green-700', badge: 'bg-green-500/20 text-green-300' },
  T04: { bg: 'from-blue-900/30 to-gray-900', border: 'border-blue-700', badge: 'bg-blue-500/20 text-blue-300' },
  T05: { bg: 'from-purple-900/30 to-gray-900', border: 'border-purple-700', badge: 'bg-purple-500/20 text-purple-300' },
  T06: { bg: 'from-gray-700/30 to-gray-900', border: 'border-gray-600', badge: 'bg-gray-500/20 text-gray-300' },
  T07: { bg: 'from-teal-900/30 to-gray-900', border: 'border-teal-700', badge: 'bg-teal-500/20 text-teal-300' },
  T08: { bg: 'from-orange-900/30 to-gray-900', border: 'border-orange-700', badge: 'bg-orange-500/20 text-orange-300' },
};

const TYPE_ICONS: Record<ThumbnailTypeId, string> = {
  T01: '🔢',
  T02: '⚠️',
  T03: '➡️',
  T04: '⚔️',
  T05: '📋',
  T06: '💬',
  T07: '❓',
  T08: '🏆',
};

function ScoreBar({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 8 ? 'bg-green-500' :
    score >= 6 ? 'bg-yellow-500' :
    score >= 4 ? 'bg-orange-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{score}</span>
    </div>
  );
}

const SELECTION_BADGES = ['❶', '❷', '❸'];

export function TypeSelector({
  recommendation,
  selectedTypes,
  onTypeSelect,
  onConfirm,
  onBack,
}: TypeSelectorProps) {
  // Sort: by score descending
  const sortedTypes = [...THUMBNAIL_TYPE_LIST].sort((a, b) => {
    const scoreA = recommendation.rankings.find(r => r.typeId === a.id)?.score ?? 0;
    const scoreB = recommendation.rankings.find(r => r.typeId === b.id)?.score ?? 0;
    return scoreB - scoreA;
  });

  // Top 3 from rankings
  const top3TypeIds = [...recommendation.rankings]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.typeId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* AI Recommendation Banner */}
      <div className="bg-cyan-950/40 border border-cyan-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-cyan-300 font-bold text-lg">
              AI推薦 TOP3:{' '}
              {top3TypeIds.map((typeId, i) => (
                <span key={typeId}>
                  {i > 0 && '、'}
                  {THUMBNAIL_TYPES[typeId].name}
                </span>
              ))}
            </h3>
            <p className="text-cyan-200/70 text-sm mt-1">{recommendation.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Type Grid */}
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-3">
          サムネイル型を3つ選択してください
          <span className="ml-2 text-cyan-400 font-bold">({selectedTypes.length}/3)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sortedTypes.map((type) => {
            const ranking = recommendation.rankings.find(r => r.typeId === type.id);
            const selectionIndex = selectedTypes.indexOf(type.id);
            const isSelected = selectionIndex !== -1;
            const isTopRecommended = top3TypeIds.includes(type.id);
            const colors = TYPE_COLORS[type.id];
            const isFull = selectedTypes.length >= 3;

            return (
              <button
                key={type.id}
                onClick={() => onTypeSelect(type.id)}
                disabled={!isSelected && isFull}
                className={`
                  relative text-left p-4 rounded-xl border-2 transition-all duration-200
                  bg-gradient-to-b ${colors.bg}
                  ${isSelected
                    ? `${colors.border} ring-2 ring-offset-1 ring-offset-gray-950 ring-white/20 scale-[1.02]`
                    : isFull
                      ? 'border-gray-800 opacity-40 cursor-not-allowed'
                      : 'border-gray-800 hover:border-gray-600 hover:scale-[1.01]'
                  }
                `}
              >
                {/* Selection order badge */}
                {isSelected && (
                  <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-cyan-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                    {SELECTION_BADGES[selectionIndex]}
                  </span>
                )}

                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-2">
                  {isTopRecommended && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full font-bold">
                      推薦
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${colors.badge}`}>
                    {type.id}
                  </span>
                </div>

                {/* Icon & Name */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{TYPE_ICONS[type.id]}</span>
                  <span className="text-sm font-bold text-white leading-tight">{type.name}</span>
                </div>

                {/* Short Description */}
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2 line-clamp-2">
                  {type.shortDescription}
                </p>

                {/* Score */}
                {ranking && <ScoreBar score={ranking.score} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Types Detail (3-column layout) */}
      {selectedTypes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedTypes.map((typeId, index) => {
            const spec = THUMBNAIL_TYPES[typeId];
            const colors = TYPE_COLORS[typeId];
            const ranking = recommendation.rankings.find(r => r.typeId === typeId);

            return (
              <div key={typeId} className={`bg-gradient-to-b ${colors.bg} border ${colors.border} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                    {SELECTION_BADGES[index]}
                  </span>
                  <span className="text-lg">{TYPE_ICONS[typeId]}</span>
                  <span className="text-white font-bold text-sm">{spec.name}</span>
                </div>

                <p className="text-[11px] text-gray-400 mb-3">{spec.shortDescription}</p>

                {/* Compact spec */}
                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-gray-500">構図:</span>
                    <span className="text-gray-400 ml-1">{spec.structure.layout}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">配色:</span>
                    <span className="text-gray-400 ml-1">{spec.colorRules.mood}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">テキスト:</span>
                    <span className="text-gray-400 ml-1">{spec.layoutRules.textPlacement}</span>
                  </div>
                </div>

                {/* Suitable For */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {spec.suitableFor.slice(0, 3).map((s, i) => (
                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* AI reasoning */}
                {ranking && (
                  <div className="mt-2 text-[10px] text-gray-500 italic line-clamp-2">
                    {ranking.reasoning}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: 3 - selectedTypes.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border-2 border-dashed border-gray-700 rounded-xl p-4 flex items-center justify-center min-h-[160px]"
            >
              <span className="text-gray-600 text-sm">型を選択してください</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          ← パーツ編集に戻る
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedTypes.length !== 3}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${
            selectedTypes.length === 3
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          この3型でサムネイルを生成する →
        </button>
      </div>
    </div>
  );
}
