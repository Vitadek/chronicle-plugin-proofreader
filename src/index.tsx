import React, { useEffect, useRef, useState } from 'react';
import { SpellCheck, Loader2 } from 'lucide-react';
import { definePlugin, PLUGIN_API_VERSION, type PluginContext } from '@chronicle/plugin-api';
import { ProofreadView } from './components/ProofreadView';
import { authFetch } from './lib/api';
import type { Chapter, ManuscriptMetadata, SaveStatus } from './lib/types';

/**
 * Proofreader — a guided revision pass over one book.
 *
 * Walks the writer through spelling and grammar (LanguageTool, via the host's
 * grammar service) plus an on-demand AI clarity pass that flags clunky or
 * unclear wording. The clarity pass is OBSERVATION ONLY: it never proposes a
 * rewrite — enforced by the server's schema, not just by prompt.
 *
 * Entry point is an icon on each Library book card (the `libraryActions` slot),
 * which opens the full-page view (`views`).
 */

interface Manuscript {
  metadata: ManuscriptMetadata;
  chapters: Chapter[];
}

/** Shape of a conflict entry in the server's 409 body. */
interface RecordConflict {
  entity: 'manuscript' | 'chapter';
  id: string;
  currentRevision?: number;
  reason?: string;
}

/** Loads the book, then hands it to the view. Saves edits back, debounced. */
const ProofreadHost: React.FC<PluginContext & { close: () => void; manuscriptId: string }> = ({
  close,
  manuscriptId,
  ...ctx
}) => {
  const context = ctx as PluginContext;
  const [book, setBook] = useState<Manuscript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // The save pipeline lives in refs so the first-render closures used by the
  // debounce timer and the beforeunload listener always see current data.
  const bookRef = useRef<Manuscript | null>(null);
  const dirtyRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBookState = (next: Manuscript) => {
    bookRef.current = next;
    setBook(next);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/manuscripts/${encodeURIComponent(manuscriptId)}`);
        if (!res.ok) throw new Error('Could not load the manuscript.');
        const data = (await res.json()) as Manuscript;
        if (!cancelled) {
          bookRef.current = data;
          setBook(data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      }
    })();
    return () => { cancelled = true; };
  }, [manuscriptId]);

  /**
   * Adopt the server's bookkeeping after any PUT response (200 or 409 — both
   * return the freshly loaded manuscript). Chapter CONTENT always stays local:
   * anything re-edited mid-flight is back in the dirty set and will re-flush.
   * Metadata is never edited in this view, so the server copy is authoritative.
   */
  const adoptServerRevisions = (fresh: Manuscript) => {
    const current = bookRef.current;
    if (!current) return;
    const freshById = new Map(fresh.chapters.map((c) => [c.id, c]));
    setBookState({
      metadata: fresh.metadata,
      chapters: current.chapters.map((c) => {
        const f = freshById.get(c.id);
        return f ? { ...c, revision: f.revision } : c;
      }),
    });
  };

  /**
   * Flush the dirty chapters. Sends ONLY what changed — the server never
   * treats an omitted chapter as a delete — and round-trips each record's
   * revision so the server's optimistic-concurrency check protects edits made
   * elsewhere instead of silently rejecting every save after the first.
   */
  const flush = async (opts: { keepalive?: boolean; isConflictRetry?: boolean } = {}) => {
    const current = bookRef.current;
    if (!current || inFlightRef.current || dirtyRef.current.size === 0) return;

    const sentIds = new Set(dirtyRef.current);
    dirtyRef.current = new Set(); // re-edits during the request re-add themselves
    inFlightRef.current = true;
    setSaveStatus('saving');
    let failed = false;

    try {
      const res = await authFetch(`/api/manuscripts/${encodeURIComponent(manuscriptId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: current.metadata,
          chapters: current.chapters.filter((c) => sentIds.has(c.id)),
        }),
        keepalive: opts.keepalive,
      });

      if (res.ok) {
        adoptServerRevisions((await res.json()) as Manuscript);
      } else if (res.status === 409) {
        const body = (await res.json()) as { manuscript?: Manuscript; conflicts?: RecordConflict[] };
        // Non-conflicting records in the same request WERE written; conflicting
        // chapters keep our content but pick up the server's revision, so one
        // immediate retry makes the author's active proofreading edits win.
        if (body.manuscript) adoptServerRevisions(body.manuscript);
        let retryable = false;
        for (const conflict of body.conflicts ?? []) {
          if (conflict.entity !== 'chapter' || !sentIds.has(conflict.id)) continue;
          if (conflict.reason === 'deleted') {
            // Retrying can never succeed against a deleted chapter — don't loop.
            setSaveNotice('A chapter was deleted on another device — its proofreading edits can no longer be saved.');
            continue;
          }
          dirtyRef.current.add(conflict.id);
          retryable = true;
        }
        if (retryable) {
          setSaveNotice('This book changed on another device — keeping your proofreading version.');
          if (opts.isConflictRetry) {
            failed = true; // the retry conflicted too; stop rather than loop
          } else {
            inFlightRef.current = false;
            await flush({ ...opts, isConflictRetry: true });
            return;
          }
        }
      } else {
        failed = true;
      }
    } catch {
      failed = true;
    } finally {
      inFlightRef.current = false;
    }

    if (failed) {
      // Keep the work queued; the next edit's debounce retries. No auto-loop.
      sentIds.forEach((id) => dirtyRef.current.add(id));
      setSaveStatus('error');
      return;
    }
    if (dirtyRef.current.size > 0) {
      scheduleFlush();
    } else {
      setSaveStatus('saved');
    }
  };

  const scheduleFlush = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, 1200);
  };

  const save = (next: Manuscript, chapterId: string) => {
    setBookState(next);
    dirtyRef.current.add(chapterId);
    setSaveStatus('saving');
    scheduleFlush();
  };

  const flushNow = (keepalive: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flush({ keepalive });
  };

  // Leaving the view (or the page) must not orphan a pending debounce.
  const exit = () => {
    flushNow(true);
    close();
  };
  useEffect(() => {
    const onBeforeUnload = () => flushNow(true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen-dvh flex flex-col items-center justify-center gap-4 bg-manuscript-light dark:bg-manuscript-dark">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={close} className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-[10px] uppercase font-black tracking-widest">
          Back to library
        </button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen-dvh flex items-center justify-center gap-3 bg-manuscript-light dark:bg-manuscript-dark">
        <Loader2 className="w-4 h-4 animate-spin opacity-40" />
        <p className="text-[11px] opacity-50">Opening manuscript…</p>
      </div>
    );
  }

  return (
    <ProofreadView
      ctx={context}
      metadata={book.metadata}
      chapters={book.chapters}
      isDarkMode={document.documentElement.classList.contains('dark')}
      aiAvailable={ctx.services.ai.available}
      saveStatus={saveStatus}
      saveNotice={saveNotice}
      onDismissNotice={() => setSaveNotice(null)}
      onUpdateChapter={(chapterId, content) => {
        // Always mutate off the ref: `book` from this render may predate an
        // in-flight response that already adopted fresh revisions.
        const current = bookRef.current;
        if (!current) return;
        save(
          {
            ...current,
            chapters: current.chapters.map((c) =>
              c.id === chapterId ? { ...c, content, lastModified: Date.now() } : c,
            ),
          },
          chapterId,
        );
      }}
      onExit={exit}
    />
  );
};

export default definePlugin({
  apiVersion: PLUGIN_API_VERSION,
  id: 'chronicle.proofreader',
  name: 'Proofreader',
  description: 'A guided revision pass: spelling, grammar, and an observation-only AI clarity check.',

  contributes: {
    libraryActions: [
      {
        id: 'proofread',
        icon: SpellCheck,
        tooltip: 'Proofread — guided spelling, grammar & clarity pass',
        run: (manuscriptId, openView) => openView('proofread', manuscriptId),
      },
    ],
    views: [
      {
        id: 'proofread',
        title: 'Proofread',
        render: (ctx) => {
          if (!ctx.manuscriptId) return null;
          return <ProofreadHost {...ctx} manuscriptId={ctx.manuscriptId} />;
        },
      },
    ],
  },
});
