/**
 * VTT Card Display - Type Definitions
 */

/** Plugin settings interface */
export interface Settings {
  /** Folder path for card images (relative to vault root) */
  folderPath: string;
  /** Folder path for map images/notes */
  mapsFolderPath?: string;
  /** Popout window position */
  popoutLeft: number;
  popoutTop: number;
  popoutWidth: number;
  popoutHeight: number;
  /** CSS selectors to find statblocks in rendered HTML */
  statblockSelectors?: string;
  /** Whether to show Player Info section in popout */
  showPlayerInfo?: boolean;
  /** Favorite items (paths) */
  favorites?: string[];
  /** Session history for export */
  sessionHistory?: Array<{ path: string; timestamp: number; type: 'card' | 'map' }>;
  /** Grid overlay settings */
  gridSize?: number;
  gridColor?: string;
  gridOpacity?: number;
  /** Fog of war reveal size */
  fogRevealSize?: number;
  /** Registered projection items */
  items?: Array<RegisteredItem>;
}

/** Registered projection item */
export interface RegisteredItem {
  id: string;
  title?: string;
  type: 'image' | 'card' | 'map' | 'statblock' | 'note-image' | 'note';
  value: string;
}

/** Card entry */
export interface CardEntry {
  src: string;
  path?: string;
}

/** Map entry */
export interface MapEntry {
  src?: string;
  path: string;
  title?: string;
}

/** Search result from image APIs */
export interface SearchResult {
  url: string;
  source: string;
  title: string;
}

/** Battle map search result */
export interface BattleMapResult {
  url: string;
  title: string;
  source: string;
  author?: string;
  animated?: boolean;
  thumbnail?: string;
}
