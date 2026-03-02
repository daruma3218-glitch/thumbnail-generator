'use client';

import { useState, useCallback } from 'react';
import { PromptVariation, GeneratedThumbnail, ImageUsageType, GeminiModel } from '@/lib/types';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

export function useGeneration() {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(
    async (
      prompts: PromptVariation[],
      apiKeys: { geminiKey: string },
      referenceImages?: string[],
      imageUsageTypes?: ImageUsageType[],
      editOptions?: {
        sourceImage: string;
        editInstructions: string[];
      },
      geminiModel?: GeminiModel,
    ) => {
      setStatus('generating');
      setThumbnails([]);
      setError(null);

      try {
        // Build request body based on mode
        const bodyData: Record<string, unknown> = editOptions
          ? {
              // 画像編集モード
              editMode: true,
              sourceImage: editOptions.sourceImage,
              editInstructions: editOptions.editInstructions,
              promptVariations: prompts,
              referenceImages,
              imageUsageTypes,
              geminiModel,
            }
          : {
              // 通常生成モード
              prompts,
              referenceImages,
              imageUsageTypes,
              geminiModel,
            };

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-key': apiKeys.geminiKey,
          },
          body: JSON.stringify(bodyData),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setThumbnails(data.thumbnails);
        setStatus('done');
        return data.thumbnails as GeneratedThumbnail[];
      } catch (err) {
        setError((err as Error).message);
        setStatus('error');
        throw err;
      }
    },
    []
  );

  // For session restore: set thumbnails without API call
  const setThumbnailsDirectly = useCallback((thumbs: GeneratedThumbnail[]) => {
    setThumbnails(thumbs);
    setStatus('done');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setThumbnails([]);
    setError(null);
  }, []);

  return {
    generationStatus: status,
    thumbnails,
    generationError: error,
    generateImages,
    setThumbnailsDirectly,
    resetGeneration: reset,
  };
}
