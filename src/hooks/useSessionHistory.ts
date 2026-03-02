'use client';

import { useState, useCallback, useEffect } from 'react';
import { SavedSession, SessionListItem } from '@/lib/types';
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
} from '@/lib/session-storage';

export function useSessionHistory() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load session list on mount
  const refreshList = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (err) {
      console.error('[session-history] Failed to list sessions:', err);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Save a session (creates or updates)
  const save = useCallback(
    async (session: SavedSession) => {
      try {
        await saveSession(session);
        setCurrentSessionId(session.id);
        await refreshList();
      } catch (err) {
        console.error('[session-history] Failed to save session:', err);
      }
    },
    [refreshList]
  );

  // Load a specific session by ID
  const load = useCallback(
    async (id: string): Promise<SavedSession | null> => {
      setIsLoading(true);
      try {
        const session = await loadSession(id);
        if (session) {
          setCurrentSessionId(session.id);
        }
        return session;
      } catch (err) {
        console.error('[session-history] Failed to load session:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Remove a session
  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        if (currentSessionId === id) {
          setCurrentSessionId(null);
        }
        await refreshList();
      } catch (err) {
        console.error('[session-history] Failed to delete session:', err);
      }
    },
    [currentSessionId, refreshList]
  );

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isLoading,
    save,
    load,
    remove,
    refreshList,
  };
}
