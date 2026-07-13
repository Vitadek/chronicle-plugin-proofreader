import React, { useEffect, useState } from 'react';
import { SpellCheck, Loader2 } from 'lucide-react';
import { definePlugin, PLUGIN_API_VERSION, type PluginContext } from '@chronicle/plugin-api';
import { ProofreadView } from './components/ProofreadView';
import { authFetch } from './lib/api';
import type { Chapter, ManuscriptMetadata } from './lib/types';

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

/** Loads the book, then hands it to the view. Saves edits back, debounced. */
const ProofreadHost: React.FC<PluginContext & { close: () => void; manuscriptId: string }> = ({
  close,
  manuscriptId,
  ...ctx
}) => {
  const context = ctx as PluginContext;
  const [book, setBook] = useState<Manuscript | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/manuscripts/${encodeURIComponent(manuscriptId)}`);
        if (!res.ok) throw new Error('Could not load the manuscript.');
        const data = (await res.json()) as Manuscript;
        if (!cancelled) setBook(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      }
    })();
    return () => { cancelled = true; };
  }, [manuscriptId]);

  /**
   * Persist an edited chapter. Debounced, and always writing the WHOLE
   * manuscript back, matching how the app itself autosaves.
   */
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = (next: Manuscript) => {
    setBook(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void authFetch(`/api/manuscripts/${encodeURIComponent(manuscriptId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: next.metadata, chapters: next.chapters }),
      }).catch(() => ctx.services.toast('Could not save your proofreading edits.', 'error'));
    }, 1200);
  };

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
      onUpdateChapter={(chapterId, content) =>
        save({
          ...book,
          chapters: book.chapters.map((c) =>
            c.id === chapterId ? { ...c, content, lastModified: Date.now() } : c,
          ),
        })
      }
      onExit={close}
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
