import { NextRequest, NextResponse } from 'next/server';
import { generateAllThumbnails, editAllThumbnails } from '@/lib/gemini';
import { GeminiModel } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const geminiKey = request.headers.get('x-gemini-key');
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let thumbnails;
    let totalRequested: number;
    const geminiModel: GeminiModel = body.geminiModel || 'pro';

    console.log(`[generate] mode=${body.editMode ? 'edit' : 'generate'}, model=${geminiModel}`);

    if (body.editMode && body.sourceImage && body.editInstructions) {
      // === 画像編集モード (Round 4+) ===
      totalRequested = body.editInstructions.length;
      thumbnails = await editAllThumbnails(
        body.sourceImage,
        body.editInstructions,
        geminiKey,
        body.promptVariations || [],
        body.referenceImages || undefined,
        body.imageUsageTypes,
        geminiModel,
      );
    } else {
      // === 通常生成モード (Round 1-3) ===
      if (!body.prompts || body.prompts.length === 0) {
        return NextResponse.json({ error: 'prompts are required' }, { status: 400 });
      }
      totalRequested = body.prompts.length;
      thumbnails = await generateAllThumbnails(
        body.prompts,
        geminiKey,
        body.referenceImages || (body.referenceImage ? [body.referenceImage] : undefined),
        body.imageUsageTypes,
        geminiModel,
      );
    }

    // Send dataUrl directly for display (most reliable)
    // base64Data is stripped to avoid duplication
    const thumbnailsForClient = thumbnails.map((t) => ({
      id: t.id,
      promptVariation: t.promptVariation,
      base64Data: '',
      dataUrl: t.dataUrl,
      localPath: t.localPath,
    }));

    console.log(`[generate] success: ${thumbnails.length}/${totalRequested} images`);

    return NextResponse.json({
      thumbnails: thumbnailsForClient,
      totalRequested,
      totalGenerated: thumbnails.length,
    });
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    console.error(`[generate] error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
