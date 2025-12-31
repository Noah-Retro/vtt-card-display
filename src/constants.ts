/**
 * VTT Card Display - Constants
 */
import type { Settings } from './types';

/** Default plugin settings */
export const DEFAULT_SETTINGS: Settings = {
  folderPath: 'Cards',
  mapsFolderPath: 'Maps',
  popoutLeft: 1920,
  popoutTop: 0,
  popoutWidth: 800,
  popoutHeight: 600,
  statblockSelectors: '.statblock,.stat-block,.quickmonster,.qm,.statblock-render,.statblock-container',
  showPlayerInfo: false,
  favorites: [],
  sessionHistory: [],
  gridSize: 50,
  gridColor: '#ffffff',
  gridOpacity: 0.3,
  fogRevealSize: 30
};

/** Supported image and video file extensions */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.gif', '.webp', '.svg', '.ico', '.mp4', '.webm', '.ogg', '.mov'];

/** View type identifier */
export const VIEW_TYPE_CARD = 'vtt-card-view';
