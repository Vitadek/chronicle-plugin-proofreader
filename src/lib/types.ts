// Manuscript types, mirrored from Chronicle (plugins can't import app internals).

/** Lifecycle of the debounced manuscript save, shown in the view header. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  /**
   * Server-issued optimistic-concurrency revision. Must be round-tripped on
   * PUT or the server rejects the write as stale.
   */
  revision?: number;
}

export interface ManuscriptMetadata {
  id: string;
  title: string;
  author: string;
  lastModified: number;
  /** Server-issued optimistic-concurrency revision — see Chapter.revision. */
  revision?: number;
  sceneBreakStyle?: 'classic' | 'dots' | 'ornamental' | 'custom';
  customSceneBreakSvg?: string;
  contactName?: string;
  contactAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  agentInfo?: string;
  genre?: string;
  wordCount?: number;
  synopsis?: string;
  /**
   * Cover art reference. Set after the client uploads to /api/covers and
   * the server returns the stored filename. The image itself is served
   * back at /api/covers/<filename>.
   */
  coverArt?: string;
}
