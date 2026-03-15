'use client';

import { ThumbnailTypeId, THUMBNAIL_TYPES, THUMBNAIL_TYPE_LIST } from '@/lib/thumbnail-types';
import { TypeRecommendation } from '@/lib/type-recommender';

interface TypeSelectorProps {
  recommendation: TypeRecommendation;
  selectedType: ThumbnailTypeId;
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

export function TypeSelector({
  recommendation,
  selectedType,
  onTypeSelect,
  onConfirm,
  onBack,
}: TypeSelectorProps) {
  // Sort: recommended first, then by score descending
  const sortedTypes = [...THUMBNAIL_TYPE_LIST].sort((a, b) => {
    if (a.id === recommendation.recommendedType) return -1;
    if (b.id === recommendation.recommendedType) return 1;
    const scoreA = recommendation.rankings.find(r => r.typeId === a.id)?.score ?? 0;
    const scoreB = recommendation.rankings.find(r => r.typeId === b.id)?.score ?? 0;
    return scoreB - scoreA;
  });

  const selectedSpec = THUMBNAIL_TYPES[selectedType];
  const selectedRanking = recommendation.rankings.find(r => r.typeId === selectedType);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* AI Recommendation Banner */}
      <div className="bg-cyan-950/40 border border-cyan-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-cyan-300 font-bold text-lg">AI推薦: {THUMBNAIL_TYPES[recommendation.recommendedType].name}</h3>
            <p className="text-cyan-200/70 text-sm mt-1">{recommendation.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Type Grid */}
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-3">サムネイル型を選択してください</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sortedTypes.map((type) => {
            const ranking = recommendation.rankings.find(r => r.typeId === type.id);
            const isSelected = type.id === selectedType;
            const isRecommended = type.id === recommendation.recommendedType;
            const colors = TYPE_COLORS[type.id];

            return (
              <button
                key={type.id}
                onClick={() => onTypeSelect(type.id)}
                className={`
                  relative text-left p-4 rounded-xl border-2 transition-all duration-200
                  bg-gradient-to-b ${colors.bg}
                  ${isSelected
                    ? `${colors.border} ring-2 ring-offset-1 ring-offset-gray-950 ring-white/20 scale-[1.02]`
                    : 'border-gray-800 hover:border-gray-600 hover:scale-[1.01]'
                  }
                `}
              >
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-2">
                  {isRecommended && (
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

      {/* Selected Type Detail */}
      {selectedSpec && (
        <div className={`bg-gradient-to-b ${TYPE_COLORS[selectedType].bg} border ${TYPE_COLORS[selectedType].border} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{TYPE_ICONS[selectedType]}</span>
            <div>
              <h3 className="text-white font-bold text-lg">{selectedSpec.name}</h3>
              <p className="text-gray-400 text-sm">{selectedSpec.shortDescription}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Structure */}
            <div className="bg-black/30 rounded-lg p-3">
              <h4 className="text-gray-300 font-bold mb-2">📐 構造</h4>
              <p className="text-gray-400 text-xs leading-relaxed">{selectedSpec.structure.layout}</p>
              <div className="mt-2 space-y-1">
                {selectedSpec.structure.sections.map((s, i) => (
                  <div key={i} className="text-[11px] text-gray-500">• {s}</div>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="bg-black/30 rounded-lg p-3">
              <h4 className="text-gray-300 font-bold mb-2">🎨 配色</h4>
              <div className="space-y-1 text-[11px] text-gray-400">
                <div>背景: {selectedSpec.colorRules.background}</div>
                <div>アクセント: {selectedSpec.colorRules.accent}</div>
                <div>テキスト: {selectedSpec.colorRules.textColor}</div>
                <div>ムード: {selectedSpec.colorRules.mood}</div>
              </div>
            </div>

            {/* Layout */}
            <div className="bg-black/30 rounded-lg p-3">
              <h4 className="text-gray-300 font-bold mb-2">📏 レイアウト</h4>
              <div className="space-y-1 text-[11px] text-gray-400">
                <div>{selectedSpec.layoutRules.composition}</div>
                <div>テキスト: {selectedSpec.layoutRules.textPlacement}</div>
              </div>
            </div>
          </div>

          {/* Suitable For */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedSpec.suitableFor.map((s, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[selectedType].badge}`}>
                {s}
              </span>
            ))}
          </div>

          {/* AI reasoning for this type */}
          {selectedRanking && (
            <div className="mt-3 text-xs text-gray-500 italic">
              💡 {selectedRanking.reasoning}
            </div>
          )}
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
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition-colors"
        >
          この型でサムネイルを生成する →
        </button>
      </div>
    </div>
  );
}
