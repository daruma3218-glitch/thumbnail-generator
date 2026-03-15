import { NextRequest } from 'next/server';
import { designDirections } from '@/lib/directions';

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

  let body: {
    concept?: string;
    stylePrinciples?: string;
    hasReferenceImages?: boolean;
    copywriterOutput?: {
      mainCopies: Array<{ text: string; trigger: string; effectiveness: string }>;
      subTexts: string[];
      reasoning: string;
    };
    imageUsageTypes?: string[];
    selectedType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!body.concept || body.concept.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'concept is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await designDirections(
      body.concept,
      anthropicKey,
      body.stylePrinciples,
      body.hasReferenceImages,
      body.copywriterOutput,
      body.imageUsageTypes as import('@/lib/types').ImageUsageType[] | undefined,
      body.selectedType as import('@/lib/thumbnail-types').ThumbnailTypeId | undefined,
    );
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[directions] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Failed to design directions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
