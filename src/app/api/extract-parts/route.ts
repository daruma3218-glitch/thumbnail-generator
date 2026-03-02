import { NextRequest, NextResponse } from 'next/server';
import { extractParts } from '@/lib/extract-parts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const anthropicKey = request.headers.get('x-anthropic-key');
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Anthropic API key is required' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title?.trim() || !body.script?.trim()) {
    return NextResponse.json(
      { error: 'title and script are required' },
      { status: 400 },
    );
  }

  try {
    const parts = await extractParts(body.title, body.script, anthropicKey);
    return NextResponse.json({ parts });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
