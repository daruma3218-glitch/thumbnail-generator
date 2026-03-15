import { NextRequest } from 'next/server';
import { generateCopy } from '@/lib/copywriter';
import { ExtractedParts } from '@/lib/types';

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

  let body: { title?: string; parts?: ExtractedParts; selectedType?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!body.title || !body.parts) {
    return new Response(
      JSON.stringify({ error: 'title and parts are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const result = await generateCopy(body.title, body.parts, anthropicKey, body.selectedType as import('@/lib/thumbnail-types').ThumbnailTypeId | undefined);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[copywrite] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Failed to generate copy' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
