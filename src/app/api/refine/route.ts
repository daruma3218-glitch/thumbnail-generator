import { NextRequest } from 'next/server';
import { runIterationDirector } from '@/lib/iteration-director';
import { RefineRequest, RefinementResult } from '@/lib/types';
import { ThumbnailTypeId } from '@/lib/thumbnail-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const anthropicKey = request.headers.get('x-anthropic-key');
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'Anthropic API key is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: RefineRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (
    !body.originalConcept ||
    !body.selectedDirection?.promptEn ||
    !body.userFeedback
  ) {
    return new Response(
      JSON.stringify({ error: 'originalConcept, selectedDirection, and userFeedback are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ⑤ イテレーション・ディレクターでマスタープロンプトを再構築
    const iterationResult = await runIterationDirector(
      {
        originalConcept: body.originalConcept,
        currentPromptEn: body.selectedDirection.promptEn,
        currentApproach: body.selectedDirection.approach || '',
        currentSummary: body.selectedDirection.conceptSummary || '',
        userFeedback: body.userFeedback,
        copywriterOutput: body.copywriterOutput,
        hasReferenceImages: body.hasReferenceImages || false,
        imageUsageTypes: body.imageUsageTypes,
        previousFeedbacks: body.previousFeedbacks,
        selectedType: (body as unknown as Record<string, unknown>).selectedType as ThumbnailTypeId | undefined,
      },
      anthropicKey,
    );

    // Convert iteration director output to RefinementResult format
    const result: RefinementResult = {
      reasoning: iterationResult.reasoning,
      directions: iterationResult.refinedPrompts.map(p => ({
        id: p.id,
        refinementAxis: p.refinementAxis,
        changeSummary: p.changeSummary,
        conceptSummary: p.conceptSummary,
        promptEn: p.promptEn,
        keyChanges: p.keyChanges,
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[refine] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Failed to refine design' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
