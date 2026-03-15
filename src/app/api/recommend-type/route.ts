import { NextRequest, NextResponse } from 'next/server';
import { recommendType } from '@/lib/type-recommender';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const anthropicKey = request.headers.get('x-anthropic-key');
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Anthropic API key is required' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title?.trim() || !body.parts) {
    return NextResponse.json(
      { error: 'title and parts are required' },
      { status: 400 },
    );
  }

  try {
    const recommendation = await recommendType(body.title, body.parts, anthropicKey);
    return NextResponse.json(recommendation);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
