import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Sanitize: only allow uuid-like filenames
  if (!/^[a-f0-9-]+$/.test(id)) {
    return new Response('Not found', { status: 404 });
  }

  const dir = path.join(process.cwd(), 'public', 'generated-thumbnails');

  // Try jpg first, then png
  for (const ext of ['jpg', 'png']) {
    const filePath = path.join(dir, `${id}.${ext}`);
    try {
      const buffer = await readFile(filePath);
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      // File not found, try next extension
    }
  }

  return new Response('Not found', { status: 404 });
}
