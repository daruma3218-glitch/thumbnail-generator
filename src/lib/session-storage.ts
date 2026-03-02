import { SavedSession, SessionListItem } from './types';

const SESSION_PREFIX = 'tn-session:';

function sessionKey(id: string): string {
  return `${SESSION_PREFIX}${id}`;
}

// Dynamic import to avoid SSR issues with IndexedDB
async function getIdbKeyval() {
  const { get, set, del, entries } = await import('idb-keyval');
  return { get, set, del, entries };
}

export async function saveSession(session: SavedSession): Promise<void> {
  const { set } = await getIdbKeyval();
  session.updatedAt = new Date().toISOString();
  await set(sessionKey(session.id), session);
}

export async function loadSession(id: string): Promise<SavedSession | null> {
  const { get } = await getIdbKeyval();
  const session = await get<SavedSession>(sessionKey(id));
  return session ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  const { del } = await getIdbKeyval();
  await del(sessionKey(id));
}

export async function listSessions(): Promise<SessionListItem[]> {
  const { entries } = await getIdbKeyval();
  const allEntries = await entries<string, SavedSession>();
  const sessions: SessionListItem[] = [];

  for (const [key, value] of allEntries) {
    if (typeof key === 'string' && key.startsWith(SESSION_PREFIX) && value) {
      // Get preview thumbnail from last iteration's first thumbnail
      let previewThumbnailDataUrl: string | undefined;
      if (value.iterations && value.iterations.length > 0) {
        const lastIteration = value.iterations[value.iterations.length - 1];
        if (lastIteration.thumbnails && lastIteration.thumbnails.length > 0) {
          previewThumbnailDataUrl = lastIteration.thumbnails[0].dataUrl;
        }
      }

      sessions.push({
        id: value.id,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        title: value.title,
        previewThumbnailDataUrl,
        iterationCount: value.iterations?.length || 0,
      });
    }
  }

  // Sort by updatedAt descending (newest first)
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions;
}
