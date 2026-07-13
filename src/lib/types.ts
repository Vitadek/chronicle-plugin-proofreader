// Manuscript types, mirrored from Chronicle (plugins can't import app internals).

export interface Chapter {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export interface ManuscriptMetadata {
  id: string;
  title: string;
  author: string;
  lastModified: number;
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
