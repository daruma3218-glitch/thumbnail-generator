'use client';

import { useState, useCallback } from 'react';
import { ExtractedParts } from '@/lib/types';

export type ExtractionStatus = 'idle' | 'extracting' | 'done' | 'error';

export function usePartsExtraction() {
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [extractedParts, setExtractedParts] = useState<ExtractedParts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(
    async (title: string, script: string, apiKeys: { anthropicKey: string }) => {
      setStatus('extracting');
      setExtractedParts(null);
      setError(null);

      try {
        const response = await fetch('/api/extract-parts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-anthropic-key': apiKeys.anthropicKey,
          },
          body: JSON.stringify({ title, script }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setExtractedParts(data.parts);
        setStatus('done');
        return data.parts as ExtractedParts;
      } catch (err) {
        setError((err as Error).message);
        setStatus('error');
        throw err;
      }
    },
    [],
  );

  const updateParts = useCallback((parts: ExtractedParts) => {
    setExtractedParts(parts);
  }, []);

  // For session restore: set parts without API call
  const setPartsDirectly = useCallback((parts: ExtractedParts) => {
    setExtractedParts(parts);
    setStatus('done');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setExtractedParts(null);
    setError(null);
  }, []);

  return {
    extractionStatus: status,
    extractedParts,
    extractionError: error,
    extract,
    updateParts,
    setPartsDirectly,
    reset,
  };
}
