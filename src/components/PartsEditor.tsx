'use client';

import { useState } from 'react';
import { ExtractedParts, TextElement, VisualElement } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface PartsEditorProps {
  parts: ExtractedParts;
  title: string;
  onConfirm: (editedParts: ExtractedParts) => void;
  onReExtract: () => void;
  disabled?: boolean;
}

const PRIORITY_COLORS = {
  high: 'bg-red-900/50 text-red-300 border-red-700',
  medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  low: 'bg-gray-800 text-gray-400 border-gray-600',
};

const TEXT_TYPE_LABELS: Record<string, string> = {
  catchphrase: 'キャッチコピー',
  number: '数字',
  power_word: 'パワーワード',
  question: '疑問文',
  cta: 'CTA',
};

const VISUAL_TYPE_LABELS: Record<string, string> = {
  person_expression: '人物の表情',
  background: '背景',
  color_scheme: '配色',
  layout: 'レイアウト',
  object: 'オブジェクト',
  icon: 'アイコン',
};

export function PartsEditor({ parts, title, onConfirm, onReExtract, disabled }: PartsEditorProps) {
  const [editedParts, setEditedParts] = useState<ExtractedParts>(parts);

  const updateField = <K extends keyof ExtractedParts>(field: K, value: ExtractedParts[K]) => {
    setEditedParts((prev) => ({ ...prev, [field]: value }));
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setEditedParts((prev) => ({
      ...prev,
      textElements: prev.textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  };

  const removeTextElement = (id: string) => {
    setEditedParts((prev) => ({
      ...prev,
      textElements: prev.textElements.filter((el) => el.id !== id),
    }));
  };

  const addTextElement = () => {
    setEditedParts((prev) => ({
      ...prev,
      textElements: [
        ...prev.textElements,
        { id: `t-${uuidv4().slice(0, 8)}`, type: 'catchphrase', content: '', reasoning: '', priority: 'medium' },
      ],
    }));
  };

  const updateVisualElement = (id: string, updates: Partial<VisualElement>) => {
    setEditedParts((prev) => ({
      ...prev,
      visualElements: prev.visualElements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  };

  const removeVisualElement = (id: string) => {
    setEditedParts((prev) => ({
      ...prev,
      visualElements: prev.visualElements.filter((el) => el.id !== id),
    }));
  };

  const addVisualElement = () => {
    setEditedParts((prev) => ({
      ...prev,
      visualElements: [
        ...prev.visualElements,
        { id: `v-${uuidv4().slice(0, 8)}`, type: 'background', description: '', reasoning: '', priority: 'medium' },
      ],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">抽出されたパーツ</h2>
          <p className="text-sm text-gray-500">
            「{title}」から抽出されたサムネイル要素です。編集・削除・追加できます。
          </p>
        </div>

        {/* Hook & Target Emotion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-amber-400 mb-1">フック（注目ポイント）</label>
            <input
              type="text"
              value={editedParts.hook}
              onChange={(e) => updateField('hook', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-400 mb-1">ターゲット感情</label>
            <input
              type="text"
              value={editedParts.targetEmotion}
              onChange={(e) => updateField('targetEmotion', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Text Elements */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <span>テキスト要素</span>
            <span className="text-xs text-gray-500">({editedParts.textElements.length}個)</span>
          </h3>
          <div className="space-y-2">
            {editedParts.textElements.map((el) => (
              <div key={el.id} className="flex items-start gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <select
                  value={el.priority}
                  onChange={(e) => updateTextElement(el.id, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                  className={`px-2 py-1 rounded text-xs border ${PRIORITY_COLORS[el.priority]} bg-transparent cursor-pointer`}
                >
                  <option value="high">HIGH</option>
                  <option value="medium">MED</option>
                  <option value="low">LOW</option>
                </select>
                <span className="px-2 py-1 bg-blue-900/40 text-blue-300 rounded text-xs whitespace-nowrap">
                  {TEXT_TYPE_LABELS[el.type] || el.type}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={el.content}
                    onChange={(e) => updateTextElement(el.id, { content: e.target.value })}
                    placeholder="テキスト内容"
                    className="w-full bg-transparent text-white text-sm focus:outline-none"
                  />
                  <input
                    type="text"
                    value={el.reasoning}
                    onChange={(e) => updateTextElement(el.id, { reasoning: e.target.value })}
                    placeholder="理由"
                    className="w-full bg-transparent text-gray-500 text-xs mt-1 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeTextElement(el.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addTextElement}
            className="mt-2 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-gray-700 hover:border-blue-600 rounded-lg transition-colors"
          >
            + テキスト要素を追加
          </button>
        </div>

        {/* Visual Elements */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span>ビジュアル要素</span>
            <span className="text-xs text-gray-500">({editedParts.visualElements.length}個)</span>
          </h3>
          <div className="space-y-2">
            {editedParts.visualElements.map((el) => (
              <div key={el.id} className="flex items-start gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <select
                  value={el.priority}
                  onChange={(e) => updateVisualElement(el.id, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                  className={`px-2 py-1 rounded text-xs border ${PRIORITY_COLORS[el.priority]} bg-transparent cursor-pointer`}
                >
                  <option value="high">HIGH</option>
                  <option value="medium">MED</option>
                  <option value="low">LOW</option>
                </select>
                <span className="px-2 py-1 bg-purple-900/40 text-purple-300 rounded text-xs whitespace-nowrap">
                  {VISUAL_TYPE_LABELS[el.type] || el.type}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={el.description}
                    onChange={(e) => updateVisualElement(el.id, { description: e.target.value })}
                    placeholder="ビジュアル要素の説明"
                    className="w-full bg-transparent text-white text-sm focus:outline-none"
                  />
                  <input
                    type="text"
                    value={el.reasoning}
                    onChange={(e) => updateVisualElement(el.id, { reasoning: e.target.value })}
                    placeholder="理由"
                    className="w-full bg-transparent text-gray-500 text-xs mt-1 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeVisualElement(el.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addVisualElement}
            className="mt-2 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 border border-dashed border-gray-700 hover:border-purple-600 rounded-lg transition-colors"
          >
            + ビジュアル要素を追加
          </button>
        </div>

        {/* Suggested Direction */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-green-400 mb-1">提案方向性</label>
          <textarea
            value={editedParts.suggestedDirection}
            onChange={(e) => updateField('suggestedDirection', e.target.value)}
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onReExtract}
            disabled={disabled}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl text-sm transition-colors border border-gray-700"
          >
            再抽出する
          </button>
          <button
            onClick={() => onConfirm(editedParts)}
            disabled={disabled}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            この内容で方向性を設計
          </button>
        </div>
      </div>
    </div>
  );
}
