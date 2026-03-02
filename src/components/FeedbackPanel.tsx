'use client';

import { useState, useRef } from 'react';
import {
  ReferenceImage,
  ImageUsageType,
  IMAGE_USAGE_OPTIONS,
  StructuredFeedback,
  QuickAction,
  SLIDER_CONFIG,
  QUICK_ACTION_OPTIONS,
} from '@/lib/types';
import { serializeFeedback, isFeedbackValid, createEmptyFeedback } from '@/lib/feedback-serializer';

const MAX_FEEDBACK_IMAGES = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

interface FeedbackPanelProps {
  /** 送信時のコールバック（シリアライズ済み文字列 + 画像 + 構造化データ） */
  onSubmit: (feedback: string, feedbackImages?: ReferenceImage[], structuredFeedback?: StructuredFeedback) => void;
  /** 最初にアップロードされた参考画像 */
  existingReferenceImages?: ReferenceImage[];
}

export function FeedbackPanel({
  onSubmit,
  existingReferenceImages = [],
}: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState<StructuredFeedback>(createEmptyFeedback());
  const [feedbackImages, setFeedbackImages] = useState<ReferenceImage[]>([]);
  const [useExistingImages, setUseExistingImages] = useState(true);
  const [showFreeText, setShowFreeText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid = isFeedbackValid(feedback);

  // === Slider handlers ===
  const updateSlider = (key: keyof StructuredFeedback['sliders'], value: number) => {
    setFeedback(prev => ({
      ...prev,
      sliders: { ...prev.sliders, [key]: value },
    }));
  };

  // === Quick action handlers ===
  const toggleQuickAction = (action: QuickAction) => {
    setFeedback(prev => ({
      ...prev,
      quickActions: prev.quickActions.includes(action)
        ? prev.quickActions.filter(a => a !== action)
        : [...prev.quickActions, action],
    }));
  };

  // === Image handlers ===
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_FEEDBACK_IMAGES - feedbackImages.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      if (file.size > MAX_IMAGE_SIZE) continue;
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFeedbackImages(prev => {
          if (prev.length >= MAX_FEEDBACK_IMAGES) return prev;
          return [...prev, { name: file.name, dataUrl, usage: 'character' as ImageUsageType }];
        });
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setFeedbackImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateImageUsage = (index: number, usage: ImageUsageType) => {
    setFeedbackImages(prev =>
      prev.map((img, i) => (i === index ? { ...img, usage } : img)),
    );
  };

  // === Submit ===
  const handleSubmit = () => {
    if (!isValid) return;
    const serialized = serializeFeedback(feedback);
    const allImages: ReferenceImage[] = [];
    if (useExistingImages && existingReferenceImages.length > 0) {
      allImages.push(...existingReferenceImages);
    }
    allImages.push(...feedbackImages);
    onSubmit(serialized, allImages.length > 0 ? allImages : undefined, feedback);
  };

  return (
    <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-5">
      {/* Section 1: Sliders */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
          <span>🎚️</span> ビジュアル調整
        </h3>
        <div className="space-y-3">
          {SLIDER_CONFIG.map(config => {
            const value = feedback.sliders[config.key];
            const isChanged = value !== 0;
            return (
              <div key={config.key} className="flex items-center gap-3">
                {/* Label */}
                <div className="w-24 flex-shrink-0">
                  <span className={`text-xs ${isChanged ? 'text-blue-300' : 'text-gray-500'}`}>
                    {config.label}
                  </span>
                </div>
                {/* Left label */}
                <span className="text-[10px] text-gray-500 w-14 text-right flex-shrink-0">
                  {config.leftEmoji} {config.leftLabel}
                </span>
                {/* Slider */}
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={1}
                    value={value}
                    onChange={e => updateSlider(config.key, parseInt(e.target.value))}
                    className="feedback-slider w-full"
                    style={{
                      // Dynamic accent color based on whether slider is changed
                      accentColor: isChanged ? '#3b82f6' : '#4b5563',
                    }}
                  />
                  {/* Tick marks */}
                  <div className="flex justify-between px-[6px] -mt-1 pointer-events-none">
                    {[-2, -1, 0, 1, 2].map(tick => (
                      <div
                        key={tick}
                        className={`w-1 h-1 rounded-full ${
                          tick === 0
                            ? 'bg-gray-500'
                            : tick === value
                              ? 'bg-blue-400'
                              : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {/* Right label */}
                <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">
                  {config.rightLabel} {config.rightEmoji}
                </span>
                {/* Reset button (show only if changed) */}
                {isChanged && (
                  <button
                    onClick={() => updateSlider(config.key, 0)}
                    className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
                    title="リセット"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Section 2: Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
          <span>🏷️</span> クイック指示
          <span className="text-[10px] text-gray-600 ml-1">（複数OK）</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTION_OPTIONS.map(option => {
            const isActive = feedback.quickActions.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleQuickAction(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-700'
                }`}
              >
                <span className="mr-1">{option.emoji}</span>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Section 3: Free Text (collapsible) */}
      <div>
        {!showFreeText ? (
          <button
            onClick={() => setShowFreeText(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <span>💬</span> 補足コメントを追加...
          </button>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <span>💬</span> 補足コメント
            </h3>
            <textarea
              value={feedback.freeText}
              onChange={e => setFeedback(prev => ({ ...prev, freeText: e.target.value }))}
              placeholder="具体的な変更指示があればここに書いてください..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Section 4: Image Attachment */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <span>📎</span> 参考画像を添付（任意）
          </p>
          {feedbackImages.length < MAX_FEEDBACK_IMAGES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              + 画像を追加
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAddImages}
          className="hidden"
        />

        {/* Existing reference images toggle */}
        {existingReferenceImages.length > 0 && (
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useExistingImages}
              onChange={e => setUseExistingImages(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-xs text-gray-400">
              最初にアップロードした参考画像も使う（{existingReferenceImages.length}枚）
            </span>
          </label>
        )}

        {/* Feedback images with usage selector */}
        {feedbackImages.length > 0 && (
          <div className="space-y-2 mt-2">
            {feedbackImages.map((img, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-800/50 rounded-lg p-2">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-14 h-10 object-cover rounded-lg border border-gray-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 truncate mb-1">{img.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {IMAGE_USAGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateImageUsage(i, opt.value)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                          img.usage === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => removeImage(i)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500">
          スライダー・クイック指示・コメントの組み合わせで改善します
        </p>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-6 py-2.5 font-medium rounded-lg transition-colors flex items-center gap-2 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isValid ? 'フィードバックを反映して改善する' : 'いずれかの操作をしてください'}
          <span>→</span>
        </button>
      </div>

      {/* Slider custom styles */}
      <style jsx>{`
        .feedback-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: #374151;
          outline: none;
          cursor: pointer;
        }
        .feedback-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6b7280;
          cursor: pointer;
          border: 2px solid #1f2937;
          transition: background 0.2s, transform 0.1s;
        }
        .feedback-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .feedback-slider:not([data-default])::-webkit-slider-thumb {
          background: #3b82f6;
        }
        .feedback-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6b7280;
          cursor: pointer;
          border: 2px solid #1f2937;
          transition: background 0.2s, transform 0.1s;
        }
        .feedback-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}
