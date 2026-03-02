'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY_ANTHROPIC = 'thumbnail-gen-anthropic-key';
const STORAGE_KEY_GEMINI = 'thumbnail-gen-gemini-key';
const STORAGE_KEY_STYLE = 'thumbnail-style-principles';

interface ApiKeySettingsProps {
  onKeysReady: (keys: { anthropicKey: string; geminiKey: string; stylePrinciples: string }) => void;
}

export function ApiKeySettings({ onKeysReady }: ApiKeySettingsProps) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [stylePrinciples, setStylePrinciples] = useState('');
  const [saved, setSaved] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  useEffect(() => {
    const storedAnthropic = localStorage.getItem(STORAGE_KEY_ANTHROPIC) || '';
    const storedGemini = localStorage.getItem(STORAGE_KEY_GEMINI) || '';
    const storedStyle = localStorage.getItem(STORAGE_KEY_STYLE) || '';
    setAnthropicKey(storedAnthropic);
    setGeminiKey(storedGemini);
    setStylePrinciples(storedStyle);
    if (storedAnthropic && storedGemini) {
      setSaved(true);
      onKeysReady({ anthropicKey: storedAnthropic, geminiKey: storedGemini, stylePrinciples: storedStyle });
    }
  }, [onKeysReady]);

  const handleSave = () => {
    if (!anthropicKey.trim() || !geminiKey.trim()) return;
    localStorage.setItem(STORAGE_KEY_ANTHROPIC, anthropicKey.trim());
    localStorage.setItem(STORAGE_KEY_GEMINI, geminiKey.trim());
    localStorage.setItem(STORAGE_KEY_STYLE, stylePrinciples.trim());
    setSaved(true);
    onKeysReady({ anthropicKey: anthropicKey.trim(), geminiKey: geminiKey.trim(), stylePrinciples: stylePrinciples.trim() });
  };

  const handleEdit = () => {
    setSaved(false);
  };

  if (saved) {
    return (
      <div className="max-w-3xl mx-auto mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-400">
              API設定済み (Anthropic: ...{anthropicKey.slice(-4)}, Gemini: ...{geminiKey.slice(-4)})
              {stylePrinciples && ' | スタイル傾向設定済み'}
            </span>
          </div>
          <button
            onClick={handleEdit}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            編集
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">APIキー設定</h2>
        <p className="text-sm text-gray-500 mb-4">
          キーはブラウザのlocalStorageに保存され、サーバーには各リクエスト時のみ送信されます。
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Style Principles Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowStyle(!showStyle)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showStyle ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              サムネスタイル傾向（任意）
            </button>

            {showStyle && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">
                  NotebookLMなどで分析したサムネイルの傾向テキストを貼り付けてください。
                  エージェントの基本原則として全ての議論に反映されます。
                </p>
                <textarea
                  value={stylePrinciples}
                  onChange={(e) => setStylePrinciples(e.target.value)}
                  placeholder="例: 明るい色使いを基調とし、人物の表情を大きく配置。テキストは最大3語で黄色のアウトライン付き..."
                  className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!anthropicKey.trim() || !geminiKey.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
          >
            保存して開始
          </button>
        </div>
      </div>
    </div>
  );
}

export function getStoredKeys(): { anthropicKey: string; geminiKey: string; stylePrinciples: string } | null {
  if (typeof window === 'undefined') return null;
  const anthropicKey = localStorage.getItem(STORAGE_KEY_ANTHROPIC);
  const geminiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  const stylePrinciples = localStorage.getItem(STORAGE_KEY_STYLE) || '';
  if (!anthropicKey || !geminiKey) return null;
  return { anthropicKey, geminiKey, stylePrinciples };
}
