'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import { InputForm } from '@/components/InputForm';
import { PartsEditor } from '@/components/PartsEditor';
import { ThumbnailGrid } from '@/components/ThumbnailGrid';
import { IterationHistory } from '@/components/IterationHistory';
import { SessionHistory } from '@/components/SessionHistory';
import { GeneratingLoader, DesigningLoader, ExtractingLoader, CopywritingLoader, RecommendingTypeLoader, ErrorBanner } from '@/components/LoadingStates';
import { TypeSelector } from '@/components/TypeSelector';
import { ThumbnailTypeId } from '@/lib/thumbnail-types';
import { TypeRecommendation } from '@/lib/type-recommender';
import { useGeneration } from '@/hooks/useGeneration';
import { usePartsExtraction } from '@/hooks/usePartsExtraction';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { buildConceptFromParts } from '@/lib/format-parts';
import { CopywriterOutput } from '@/lib/copywriter';
import { serializeFeedbackForGeminiEdit } from '@/lib/feedback-serializer';
import {
  AppStep,
  CreativeDirection,
  DirectionsResult,
  ExtractedParts,
  GeminiModel,
  GEMINI_MODELS,
  GeneratedThumbnail,
  ImageUsageType,
  IterationRound,
  PromptVariation,
  ReferenceImage,
  RefinementDirection,
  RefinementResult,
  SavedSession,
  StructuredFeedback,
} from '@/lib/types';

// ハイブリッドモード: Round 4以降は画像編集モードに自動切替
const EDIT_MODE_THRESHOLD = 3;

interface ApiKeys {
  anthropicKey: string;
  geminiKey: string;
  stylePrinciples: string;
}

// === Helper: Convert CreativeDirection → PromptVariation ===
function directionToPrompt(d: CreativeDirection): PromptVariation {
  return {
    id: d.id,
    promptEn: d.promptEn,
    directionSummaryJa: d.conceptSummary,
    creativeAngle: d.approach,
  };
}

function refinementToPrompt(d: RefinementDirection): PromptVariation {
  return {
    id: d.id,
    promptEn: d.promptEn,
    directionSummaryJa: d.conceptSummary,
    creativeAngle: d.refinementAxis,
  };
}

// === DirectionsPreview Component (inline) ===
function DirectionsPreview({
  result,
  onGenerate,
  onBack,
  isRefinement,
  copywriterOutput,
}: {
  result: DirectionsResult | RefinementResult;
  onGenerate: () => void;
  onBack: () => void;
  isRefinement: boolean;
  copywriterOutput?: CopywriterOutput | null;
}) {
  const isCreative = (d: CreativeDirection | RefinementDirection): d is CreativeDirection =>
    'approach' in d;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-2">
          {isRefinement ? '改善バリエーション' : '3つの対立する方向性'}
        </h2>
        <p className="text-sm text-gray-400 mb-4">{result.reasoning}</p>

        {/* Show copywriter output if available */}
        {copywriterOutput && (
          <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-xs text-pink-400 font-medium mb-1.5">
              コピーライター提案テキスト
            </p>
            <div className="flex flex-wrap gap-2">
              {copywriterOutput.mainCopies.map((c, i) => (
                <span key={i} className="px-2 py-1 bg-pink-900/30 text-pink-200 rounded text-xs">
                  「{c.text}」<span className="text-pink-400/60 ml-1">{c.trigger}</span>
                </span>
              ))}
            </div>
            {copywriterOutput.subTexts.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                補助: {copywriterOutput.subTexts.join(' / ')}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {result.directions.map((d) => (
            <div
              key={d.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded text-xs font-medium">
                  {isCreative(d) ? d.approach : d.refinementAxis}
                </span>
              </div>
              <p className="text-sm text-white font-medium mb-2">
                {d.conceptSummary}
              </p>
              {isCreative(d) && (
                <>
                  <p className="text-xs text-gray-400 mb-2">{d.psychologicalAngle}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.keyVisualElements.map((v, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-400">{d.expectedImpact}</p>
                </>
              )}
              {!isCreative(d) && (
                <>
                  <p className="text-xs text-gray-400 mb-2">{d.changeSummary}</p>
                  <div className="flex flex-wrap gap-1">
                    {d.keyChanges.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors border border-gray-700"
          >
            戻る
          </button>
          <button
            onClick={onGenerate}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            この3方向でサムネイルを生成する
          </button>
        </div>
      </div>
    </div>
  );
}

// === Main Page ===
export default function HomePage() {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [step, setStep] = useState<AppStep>('input');
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [originalConcept, setOriginalConcept] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [iterations, setIterations] = useState<IterationRound[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<GeneratedThumbnail | null>(null);
  const [isRefinementResult, setIsRefinementResult] = useState(false);

  // Directions results
  const [directionsResult, setDirectionsResult] = useState<DirectionsResult | null>(null);
  const [refinementResult, setRefinementResult] = useState<RefinementResult | null>(null);
  const [designError, setDesignError] = useState<string | null>(null);

  // ③ Copywriter output (cascade pipeline)
  const [copywriterOutput, setCopywriterOutput] = useState<CopywriterOutput | null>(null);

  // Gemini model selection
  const [geminiModel, setGeminiModel] = useState<GeminiModel>('flash');

  // 型選択
  const [typeRecommendation, setTypeRecommendation] = useState<TypeRecommendation | null>(null);
  const [selectedType, setSelectedType] = useState<ThumbnailTypeId | null>(null);

  // ⑤ Feedback history for iteration director
  const [feedbackHistory, setFeedbackHistory] = useState<string[]>([]);

  const generation = useGeneration();
  const partsExtraction = usePartsExtraction();
  const sessionHistory = useSessionHistory();
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const handleKeysReady = useCallback((keys: ApiKeys) => {
    setApiKeys(keys);
  }, []);

  // Auto-save session when iterations change
  const autoSaveSession = useCallback(
    (updatedIterations: IterationRound[]) => {
      if (!title || updatedIterations.length === 0) return;

      const id = sessionIdRef.current || uuidv4();
      if (!sessionIdRef.current) {
        sessionIdRef.current = id;
        sessionHistory.setCurrentSessionId(id);
      }

      const session: SavedSession = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title,
        script,
        originalConcept,
        extractedParts: partsExtraction.extractedParts || null,
        referenceImages,
        iterations: updatedIterations,
        selectedType: selectedType || undefined,
      };

      sessionHistory.save(session);
    },
    [title, script, originalConcept, referenceImages, partsExtraction.extractedParts, sessionHistory, selectedType],
  );

  // Handle loading a session from history
  const handleLoadSession = useCallback(
    async (id: string) => {
      const session = await sessionHistory.load(id);
      if (!session) return;

      setTitle(session.title);
      setScript(session.script);
      setOriginalConcept(session.originalConcept);
      setReferenceImages(session.referenceImages || []);
      setIterations(session.iterations || []);
      setSelectedThumbnail(null);
      setIsRefinementResult(false);
      setDirectionsResult(null);
      setRefinementResult(null);
      setDesignError(null);
      setCopywriterOutput(null);
      setFeedbackHistory([]);
      setTypeRecommendation(null);
      setSelectedType((session.selectedType as ThumbnailTypeId) || null);
      sessionIdRef.current = session.id;

      if (session.iterations && session.iterations.length > 0) {
        const lastIteration = session.iterations[session.iterations.length - 1];
        if (lastIteration.thumbnails && lastIteration.thumbnails.length > 0) {
          generation.setThumbnailsDirectly(lastIteration.thumbnails);
          setStep('selecting');
        } else {
          setStep('confirming_parts');
        }
      } else {
        generation.resetGeneration();
        setStep('input');
      }

      if (session.extractedParts) {
        partsExtraction.setPartsDirectly(session.extractedParts);
      }

      setShowSessionHistory(false);
    },
    [sessionHistory, generation, partsExtraction],
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await sessionHistory.remove(id);
    },
    [sessionHistory],
  );

  // Step 1: User submits title + script → extract parts
  const handleInputSubmit = useCallback(
    async (inputTitle: string, inputScript: string, refImages?: ReferenceImage[]) => {
      if (!apiKeys) return;
      setTitle(inputTitle);
      setScript(inputScript);
      setReferenceImages(refImages || []);
      setStep('extracting');
      setIterations([]);
      setSelectedThumbnail(null);
      setIsRefinementResult(false);
      setDirectionsResult(null);
      setRefinementResult(null);
      setDesignError(null);
      setCopywriterOutput(null);
      setFeedbackHistory([]);
      setTypeRecommendation(null);
      setSelectedType(null);
      generation.resetGeneration();
      partsExtraction.reset();

      try {
        await partsExtraction.extract(inputTitle, inputScript, {
          anthropicKey: apiKeys.anthropicKey,
        });
        setStep('confirming_parts');
      } catch {
        setStep('confirming_parts');
      }
    },
    [apiKeys, generation, partsExtraction],
  );

  // Step 2b: Re-extract parts
  const handleReExtract = useCallback(async () => {
    if (!apiKeys || !title || !script) return;
    setStep('extracting');
    partsExtraction.reset();

    try {
      await partsExtraction.extract(title, script, {
        anthropicKey: apiKeys.anthropicKey,
      });
      setStep('confirming_parts');
    } catch {
      setStep('confirming_parts');
    }
  }, [apiKeys, title, script, partsExtraction]);

  // カスケードパイプライン: コピーライター → 方向性設計
  const runCascadePipeline = useCallback(
    async (concept: string) => {
      if (!apiKeys) return;

      // ③ コピーライター
      setStep('copywriting');
      let copyOutput: CopywriterOutput | null = null;
      try {
        const copyResponse = await fetch('/api/copywrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-anthropic-key': apiKeys.anthropicKey,
          },
          body: JSON.stringify({ title, parts: partsExtraction.extractedParts, selectedType: selectedType || undefined }),
        });

        if (copyResponse.ok) {
          copyOutput = await copyResponse.json();
          setCopywriterOutput(copyOutput);
        } else {
          console.warn('[cascade] Copywriter failed, continuing without it');
        }
      } catch (err) {
        console.warn('[cascade] Copywriter error:', (err as Error).message);
      }

      // ④ プロンプト・エンジニア（方向性設計）
      setStep('designing');
      const usageTypes = referenceImages.length > 0
        ? referenceImages.map(img => img.usage)
        : undefined;
      try {
        const response = await fetch('/api/directions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-anthropic-key': apiKeys.anthropicKey,
          },
          body: JSON.stringify({
            concept,
            stylePrinciples: apiKeys.stylePrinciples,
            hasReferenceImages: referenceImages.length > 0,
            copywriterOutput: copyOutput,
            imageUsageTypes: usageTypes,
            selectedType: selectedType || undefined,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || `HTTP ${response.status}`);
        }

        const result: DirectionsResult = await response.json();
        setDirectionsResult(result);
        setStep('previewing');
      } catch (err) {
        setDesignError((err as Error).message);
        setStep('confirming_parts');
      }
    },
    [apiKeys, title, referenceImages, selectedType, partsExtraction.extractedParts],
  );

  // 型選択確定ハンドラ
  const handleTypeConfirmed = useCallback(async () => {
    await runCascadePipeline(originalConcept);
  }, [runCascadePipeline, originalConcept]);

  // Step 3: パーツ確定 → 型推薦
  const handlePartsConfirmed = useCallback(
    async (editedParts: ExtractedParts) => {
      if (!apiKeys) return;

      const concept = buildConceptFromParts(title, editedParts);
      setOriginalConcept(concept);
      setDesignError(null);

      // 型推薦を実行
      setStep('recommending_type');
      try {
        const response = await fetch('/api/recommend-type', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-anthropic-key': apiKeys.anthropicKey,
          },
          body: JSON.stringify({ title, parts: editedParts }),
        });

        if (response.ok) {
          const recommendation: TypeRecommendation = await response.json();
          setTypeRecommendation(recommendation);
          setSelectedType(recommendation.recommendedType);
          setStep('selecting_type');
        } else {
          // 型推薦失敗時はスキップしてコピーライティングへ
          console.warn('[cascade] Type recommendation failed, skipping');
          await runCascadePipeline(concept);
        }
      } catch (err) {
        console.warn('[cascade] Type recommender error:', (err as Error).message);
        await runCascadePipeline(concept);
      }
    },
    [apiKeys, title, runCascadePipeline],
  );

  // Step 4: Generate from directions preview
  const handleGenerateFromDirections = useCallback(async () => {
    if (!directionsResult || !apiKeys) return;

    const prompts = directionsResult.directions.map(directionToPrompt);
    setStep('generating');

    try {
      const refDataUrls = referenceImages.length > 0 ? referenceImages.map(img => img.dataUrl) : undefined;
      const usageTypes = referenceImages.length > 0 ? referenceImages.map(img => img.usage) : undefined;
      const thumbnails = await generation.generateImages(
        prompts,
        { geminiKey: apiKeys.geminiKey },
        refDataUrls,
        usageTypes,
        undefined,
        geminiModel,
      );
      setStep('selecting');

      setIterations((prev) => {
        const updated = [
          ...prev,
          {
            roundNumber: prev.length + 1,
            concept: originalConcept,
            directions: directionsResult.directions,
            thumbnails: thumbnails || [],
          },
        ];
        autoSaveSession(updated);
        return updated;
      });
    } catch {
      setStep('selecting');
    }
  }, [directionsResult, generation, apiKeys, referenceImages, originalConcept, autoSaveSession, geminiModel]);

  // Step 4b: Generate from refinement preview
  const handleGenerateFromRefinement = useCallback(async () => {
    if (!refinementResult || !apiKeys) return;

    const prompts = refinementResult.directions.map(refinementToPrompt);
    setStep('generating');

    try {
      const refDataUrls = referenceImages.length > 0 ? referenceImages.map(img => img.dataUrl) : undefined;
      const usageTypes = referenceImages.length > 0 ? referenceImages.map(img => img.usage) : undefined;
      const thumbnails = await generation.generateImages(
        prompts,
        { geminiKey: apiKeys.geminiKey },
        refDataUrls,
        usageTypes,
        undefined,
        geminiModel,
      );
      setStep('selecting');

      setIterations((prev) => {
        const updated = [
          ...prev,
          {
            roundNumber: prev.length + 1,
            concept: originalConcept,
            directions: refinementResult.directions,
            thumbnails: thumbnails || [],
          },
        ];
        autoSaveSession(updated);
        return updated;
      });
    } catch {
      setStep('selecting');
    }
  }, [refinementResult, generation, apiKeys, referenceImages, originalConcept, autoSaveSession, geminiModel]);

  // Select thumbnail
  const handleSelectThumbnail = useCallback((thumbnail: GeneratedThumbnail) => {
    setSelectedThumbnail((prev) => (prev?.id === thumbnail.id ? null : thumbnail));
  }, []);

  // Refine: ハイブリッドモード対応
  // Round 1-3: feedback → ⑤ Iteration Director → preview → ゼロ生成
  // Round 4+:  feedback → serializeFeedbackForGeminiEdit() → 直接Gemini画像編集
  // ※コピーライターは初回の出力を再利用（API節約＆レート制限回避）
  const handleRefine = useCallback(
    async (feedback: string, feedbackImages?: ReferenceImage[], structuredFeedback?: StructuredFeedback) => {
      if (!selectedThumbnail || !apiKeys || !feedback.trim()) return;

      if (feedbackImages && feedbackImages.length > 0) {
        setReferenceImages(feedbackImages);
      }

      // Add this feedback to history, but keep only the last 5 entries
      const MAX_FB_HISTORY = 5;
      const updatedFeedbackHistory = [...feedbackHistory, feedback];
      const trimmedHistory = updatedFeedbackHistory.length > MAX_FB_HISTORY
        ? updatedFeedbackHistory.slice(-MAX_FB_HISTORY)
        : updatedFeedbackHistory;
      setFeedbackHistory(updatedFeedbackHistory);

      // Mark the selected thumbnail in the current iteration
      setIterations((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            selectedThumbnailId: selectedThumbnail.id,
          };
        }
        return updated;
      });

      setIsRefinementResult(true);
      setDesignError(null);

      const selectedDirection = {
        id: selectedThumbnail.promptVariation.id,
        promptEn: selectedThumbnail.promptVariation.promptEn,
        approach: selectedThumbnail.promptVariation.creativeAngle,
        conceptSummary: selectedThumbnail.promptVariation.directionSummaryJa,
      };

      // ハイブリッド判定: Round 4+ → 画像編集モード
      const isEditMode = iterations.length >= EDIT_MODE_THRESHOLD;

      // --- Round 4+: 画像編集モード (Claude APIスキップ) ---
      if (isEditMode && structuredFeedback && selectedThumbnail.dataUrl) {
        const sourceImage = selectedThumbnail.dataUrl;
        const editInstruction = serializeFeedbackForGeminiEdit(structuredFeedback);

        // 3つのバリエーション: 同じ編集指示 + 微妙に異なるアプローチ
        const editInstructions = [
          editInstruction,
          editInstruction + ' Focus especially on improving text readability and visual hierarchy.',
          editInstruction + ' Pay special attention to color balance and overall mood.',
        ];

        const promptVariations: PromptVariation[] = editInstructions.map((_, i) => ({
          id: `edit-${iterations.length + 1}-${i + 1}`,
          promptEn: selectedDirection.promptEn,
          directionSummaryJa: i === 0 ? 'メイン編集' : i === 1 ? 'テキスト重視' : '色彩重視',
          creativeAngle: '画像編集',
        }));

        setSelectedThumbnail(null);
        setStep('generating');

        try {
          const currentRefImages = feedbackImages && feedbackImages.length > 0 ? feedbackImages : referenceImages;
          const refDataUrls = currentRefImages.length > 0 ? currentRefImages.map(img => img.dataUrl) : undefined;
          const usageTypes = currentRefImages.length > 0 ? currentRefImages.map(img => img.usage) : undefined;

          const thumbnails = await generation.generateImages(
            promptVariations,
            { geminiKey: apiKeys.geminiKey },
            refDataUrls,
            usageTypes,
            {
              sourceImage,
              editInstructions,
            },
            geminiModel,
          );
          setStep('selecting');

          setIterations((prev) => {
            const updated = [
              ...prev,
              {
                roundNumber: prev.length + 1,
                concept: originalConcept,
                directions: promptVariations.map((pv, i) => ({
                  id: pv.id,
                  refinementAxis: '画像編集',
                  changeSummary: editInstructions[i],
                  conceptSummary: pv.directionSummaryJa,
                  promptEn: pv.promptEn,
                  editInstructionEn: editInstructions[i],
                  keyChanges: ['画像編集モード'],
                } as RefinementDirection)),
                thumbnails: thumbnails || [],
                mode: 'edit' as const,
              },
            ];
            autoSaveSession(updated);
            return updated;
          });
        } catch {
          setStep('selecting');
        }
        return;
      }

      // --- Round 1-3: 従来のプロンプト改善モード ---
      setSelectedThumbnail(null);
      const currentCopyOutput = copywriterOutput;
      setStep('refining');

      const currentRefImages = feedbackImages && feedbackImages.length > 0 ? feedbackImages : referenceImages;
      const refUsageTypes = currentRefImages.length > 0 ? currentRefImages.map(img => img.usage) : undefined;

      // Retry logic for API errors (rate limits etc.)
      const MAX_RETRIES = 2;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }

          const response = await fetch('/api/refine', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-anthropic-key': apiKeys.anthropicKey,
            },
            body: JSON.stringify({
              originalConcept,
              selectedDirection,
              userFeedback: feedback,
              stylePrinciples: apiKeys.stylePrinciples,
              hasReferenceImages: referenceImages.length > 0 || (feedbackImages && feedbackImages.length > 0),
              imageUsageTypes: refUsageTypes,
              copywriterOutput: currentCopyOutput,
              previousFeedbacks: trimmedHistory.length > 0 ? trimmedHistory : undefined,
              selectedType: selectedType || undefined,
            }),
          });

          if (!response.ok) {
            const errorBody = await response.json();
            const errMsg = errorBody.error || `HTTP ${response.status}`;
            if (response.status === 429 && attempt < MAX_RETRIES) {
              lastError = new Error(errMsg);
              continue;
            }
            throw new Error(errMsg);
          }

          const result: RefinementResult = await response.json();
          setRefinementResult(result);
          setStep('refine_previewing');
          return;
        } catch (err) {
          lastError = err as Error;
          if (attempt < MAX_RETRIES) continue;
        }
      }

      const friendlyMessage = lastError?.message?.includes('rate')
        || lastError?.message?.includes('429')
        || lastError?.message?.includes('overloaded')
        ? 'APIの利用回数が上限に達しました。少し待ってから再試行してください。'
        : lastError?.message || '改善処理中にエラーが発生しました';
      setDesignError(friendlyMessage);
      setStep('selecting');
    },
    [selectedThumbnail, originalConcept, apiKeys, feedbackHistory, copywriterOutput, referenceImages, iterations, generation, autoSaveSession, geminiModel, selectedType],
  );

  // Start over
  const handleStartOver = useCallback(() => {
    setStep('input');
    setTitle('');
    setScript('');
    setOriginalConcept('');
    setReferenceImages([]);
    setIterations([]);
    setSelectedThumbnail(null);
    setIsRefinementResult(false);
    setDirectionsResult(null);
    setRefinementResult(null);
    setDesignError(null);
    setCopywriterOutput(null);
    setFeedbackHistory([]);
    setTypeRecommendation(null);
    setSelectedType(null);
    sessionIdRef.current = null;
    sessionHistory.setCurrentSessionId(null);
    generation.resetGeneration();
    partsExtraction.reset();
  }, [generation, partsExtraction, sessionHistory]);

  const isGenerating = generation.generationStatus === 'generating';

  return (
    <main className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      {/* API Key Settings */}
      <ApiKeySettings onKeysReady={handleKeysReady} />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Thumbnail Generator</h1>
          {step !== 'input' && title && (
            <p className="text-sm text-gray-500 mt-1 max-w-lg truncate">
              {title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Gemini Model Selector */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {(Object.keys(GEMINI_MODELS) as GeminiModel[]).map((key) => (
              <button
                key={key}
                onClick={() => setGeminiModel(key)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  geminiModel === key
                    ? key === 'pro'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {GEMINI_MODELS[key].label}
                <span className="ml-1 text-[10px] opacity-70">{GEMINI_MODELS[key].description}</span>
              </button>
            ))}
          </div>
          {sessionHistory.sessions.length > 0 && (
            <button
              onClick={() => setShowSessionHistory(true)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              履歴
            </button>
          )}
          {step !== 'input' && (
            <button
              onClick={handleStartOver}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              最初からやり直す
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Status (show active agents + mode indicator) */}
      {(step === 'recommending_type' || step === 'selecting_type' || step === 'copywriting' || step === 'designing' || step === 'refining') && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-gray-600">② 分析</span>
            <span className="text-gray-700">→</span>
            <span className={step === 'recommending_type' || step === 'selecting_type' ? 'text-cyan-400' : 'text-gray-600'}>型選択</span>
            <span className="text-gray-700">→</span>
            <span className={step === 'copywriting' ? 'text-pink-400' : 'text-gray-600'}>③ コピー</span>
            <span className="text-gray-700">→</span>
            <span className={step === 'designing' || step === 'refining' ? 'text-green-400' : 'text-gray-600'}>
              {step === 'refining' ? '⑤ 再構築' : '④ 方向性設計'}
            </span>
            <span className="text-gray-700">→</span>
            <span className="text-gray-600">生成</span>
          </div>
        </div>
      )}

      {/* Edit Mode Indicator */}
      {step === 'generating' && iterations.length >= EDIT_MODE_THRESHOLD && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/30 border border-purple-800/50 rounded-lg">
            <span className="text-sm">🖼️</span>
            <span className="text-xs text-purple-300">
              画像編集モード — 選択したサムネイルをベースに微調整しています
            </span>
          </div>
        </div>
      )}

      {/* Iteration History */}
      {iterations.length > 1 && <IterationHistory iterations={iterations} />}

      <div className="space-y-8">
        {/* Step 1: Input */}
        {step === 'input' && (
          <InputForm onSubmit={handleInputSubmit} disabled={!apiKeys} />
        )}

        {/* Step 2: Extracting parts */}
        {step === 'extracting' && (
          <ExtractingLoader />
        )}

        {/* Step 2b: Confirming/editing parts */}
        {step === 'confirming_parts' && partsExtraction.extractedParts && (
          <PartsEditor
            parts={partsExtraction.extractedParts}
            title={title}
            onConfirm={handlePartsConfirmed}
            onReExtract={handleReExtract}
          />
        )}

        {/* Extraction error */}
        {step === 'confirming_parts' && partsExtraction.extractionStatus === 'error' && (
          <ErrorBanner
            message={partsExtraction.extractionError || 'パーツ抽出中にエラーが発生しました'}
            onRetry={handleReExtract}
          />
        )}

        {/* Step: Recommending type */}
        {step === 'recommending_type' && (
          <RecommendingTypeLoader />
        )}

        {/* Step: Selecting type */}
        {step === 'selecting_type' && typeRecommendation && selectedType && (
          <TypeSelector
            recommendation={typeRecommendation}
            selectedType={selectedType}
            onTypeSelect={setSelectedType}
            onConfirm={handleTypeConfirmed}
            onBack={() => setStep('confirming_parts')}
          />
        )}

        {/* Step 3a: Copywriting */}
        {step === 'copywriting' && (
          <CopywritingLoader />
        )}

        {/* Step 3b: Designing directions / refining */}
        {(step === 'designing' || step === 'refining') && (
          <DesigningLoader />
        )}

        {/* Step 3c: Previewing directions */}
        {step === 'previewing' && directionsResult && (
          <DirectionsPreview
            result={directionsResult}
            onGenerate={handleGenerateFromDirections}
            onBack={() => setStep('confirming_parts')}
            isRefinement={false}
            copywriterOutput={copywriterOutput}
          />
        )}

        {/* Step 3d: Previewing refinement */}
        {step === 'refine_previewing' && refinementResult && (
          <DirectionsPreview
            result={refinementResult}
            onGenerate={handleGenerateFromRefinement}
            onBack={() => setStep('selecting')}
            isRefinement={true}
            copywriterOutput={copywriterOutput}
          />
        )}

        {/* Step 4: Generating */}
        {step === 'generating' && isGenerating && (
          <GeneratingLoader />
        )}

        {/* Step 5: Selecting */}
        {step === 'selecting' && generation.generationStatus === 'done' && (
          <>
            {/* Mode indicator for next round */}
            {iterations.length >= EDIT_MODE_THRESHOLD && (
              <div className="max-w-6xl mx-auto mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                  <span className="text-sm">🖼️</span>
                  <span className="text-xs text-purple-300">
                    画像編集モード — 次の改善は選択したサムネイルを直接編集します（高速・低コスト）
                  </span>
                </div>
              </div>
            )}
            {iterations.length > 0 && iterations.length < EDIT_MODE_THRESHOLD && (
              <div className="max-w-6xl mx-auto mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <span className="text-sm">📝</span>
                  <span className="text-xs text-blue-300">
                    プロンプト改善モード — 大きな方向転換が可能です（Round {EDIT_MODE_THRESHOLD + 1} から画像編集モードに切替）
                  </span>
                </div>
              </div>
            )}
            <ThumbnailGrid
              thumbnails={generation.thumbnails}
              selectedId={selectedThumbnail?.id || null}
              onSelect={handleSelectThumbnail}
              onRefine={handleRefine}
              existingReferenceImages={referenceImages}
              isRefinement={isRefinementResult}
            />
          </>
        )}

        {/* Error states */}
        {designError && (
          <ErrorBanner
            message={designError}
            onRetry={() => {
              setDesignError(null);
              if (step === 'selecting' || step === 'refine_previewing') {
                setStep('selecting');
              } else {
                setStep('confirming_parts');
              }
            }}
          />
        )}

        {generation.generationStatus === 'error' && (
          <ErrorBanner
            message={generation.generationError || '画像生成中にエラーが発生しました'}
            onRetry={() => {
              if (refinementResult) {
                handleGenerateFromRefinement();
              } else if (directionsResult) {
                handleGenerateFromDirections();
              }
            }}
          />
        )}
      </div>

      {/* Session History Modal */}
      {showSessionHistory && (
        <SessionHistory
          sessions={sessionHistory.sessions}
          currentSessionId={sessionHistory.currentSessionId}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onClose={() => setShowSessionHistory(false)}
        />
      )}
    </main>
  );
}
