/**
 * VTT Card Display - Module Exports
 */

// Types
export type { 
  Settings, 
  RegisteredItem, 
  CardEntry, 
  MapEntry, 
  SearchResult, 
  BattleMapResult 
} from './types';

// Constants
export { 
  DEFAULT_SETTINGS, 
  IMAGE_EXTENSIONS, 
  VIEW_TYPE_CARD 
} from './constants';

// Search APIs
export {
  searchLocalVault,
  searchFandomWikis,
  searchDndBeyond,
  searchArtStation,
  searchDeviantArt,
  searchReddit,
  searchRedditBattlemaps,
  searchDeviantArtMaps,
  deduplicateResults
} from './search-apis';

// Popout HTML
export { buildPopoutHtml } from './popout-html';

// Settings Tab
export { VttCardDisplaySettingTab } from './settings-tab';
