'use client';

import { useState, useRef } from 'react';
import { ReferenceImage, ImageUsageType, IMAGE_USAGE_OPTIONS } from '@/lib/types';

const MAX_IMAGES = 5;
const MAX_SINGLE_SIZE = 10 * 1024 * 1024; // 10MB per image

interface InputFormProps {
  onSubmit: (title: string, script: string, referenceImages?: ReferenceImage[]) => void;
  disabled: boolean;
}

export function InputForm({ onSubmit, disabled }: InputFormProps) {
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && script.trim() && !disabled) {
      onSubmit(
        title.trim(),
        script.trim(),
        referenceImages.length > 0 ? referenceImages : undefined,
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - referenceImages.length;
    if (remaining <= 0) {
      alert(`画像は最大${MAX_IMAGES}枚までです`);
      return;
    }

    const filesToProcess = files.slice(0, remaining);

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}: 画像ファイルを選択してください`);
        continue;
      }
      if (file.size > MAX_SINGLE_SIZE) {
        alert(`${file.name}: 10MB以下の画像を選択してください`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, { name: file.name, dataUrl: reader.result as string, usage: 'character' as ImageUsageType }];
        });
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateImageUsage = (index: number, usage: ImageUsageType) => {
    setReferenceImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, usage } : img)),
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Thumbnail Generator
        </h1>
        <p className="text-gray-400 text-lg">
          原稿からサムネの重要パーツを抽出し、3つの対立する方向性でサムネイルを設計します
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Video Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            動画タイトル
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：【衝撃】ChatGPTの最新機能が凄すぎた..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled}
          />
        </div>

        {/* Script/Manuscript */}
        <div>
          <label htmlFor="script" className="block text-sm font-medium text-gray-300 mb-2">
            原稿・台本
          </label>
          <p className="text-xs text-gray-500 mb-2">
            原稿テキストを貼り付けてください。ここからサムネの重要パーツを自動抽出します。
          </p>
          <textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="原稿のテキストをここに貼り付け..."
            className="w-full h-64 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
            disabled={disabled}
          />
          <p className="text-xs text-gray-600 mt-1 text-right">
            {script.length > 0 && `${script.length}文字`}
          </p>
        </div>

        {/* Reference Images Upload (Multiple) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            参考画像（任意・最大{MAX_IMAGES}枚）
          </label>
          <p className="text-xs text-gray-500 mb-2">
            画像をアップロードして、それぞれの「使い方」を選んでください
          </p>

          {/* Image list with usage selector */}
          {referenceImages.length > 0 && (
            <div className="space-y-3 mb-3">
              {referenceImages.map((img, i) => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate mb-2">{img.name}</p>
                      {/* Usage selector - pill buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {IMAGE_USAGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateImageUsage(i, opt.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                              img.usage === opt.value
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300'
                            }`}
                          >
                            <span className="mr-1">{opt.emoji}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        {IMAGE_USAGE_OPTIONS.find(o => o.value === img.usage)?.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {referenceImages.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-full py-3 px-4 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl text-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">
                  {referenceImages.length === 0 ? '画像をアップロード' : '画像を追加'}
                  {referenceImages.length > 0 && ` (${referenceImages.length}/${MAX_IMAGES})`}
                </span>
              </div>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !title.trim() || !script.trim()}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200"
        >
          {disabled ? '処理中...' : 'パーツを抽出する'}
        </button>
      </form>
    </div>
  );
}
