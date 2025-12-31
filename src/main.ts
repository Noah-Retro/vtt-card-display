/**
 * VTT Card Display - Obsidian Plugin
 * 
 * Display game cards and project them to a second monitor for tabletop RPG sessions.
 * Cards are stored directly as image files (PNG, JPG, SVG, etc.) in a configurable folder.
 * 
 * Features:
 * - Card/Map projection to popout window
 * - Image rotation with automatic centering
 * - Statblock rendering from notes
 * - Multi-monitor support
 * - Grid overlay and Fog of War
 * - Monster/Map image search
 */
import { Plugin, PluginSettingTab, Setting, SuggestModal, ItemView, Notice, MarkdownRenderer, Modal, requestUrl, arrayBufferToBase64, TFile } from 'obsidian';

// Import from modules
import type { Settings, CardEntry, MapEntry, SearchResult, BattleMapResult } from './types';
import { DEFAULT_SETTINGS, IMAGE_EXTENSIONS, VIEW_TYPE_CARD } from './constants';
import { 
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
import { buildPopoutHtml } from './popout-html';

/** Main plugin class */
export default class VttCardDisplay extends Plugin {
  settings!: Settings;
  /** Loaded card entries (image files from Cards folder) */
  cards: Array<{ src: string; path?: string }> = [];
  /** Loaded map entries (images/notes from Maps folder) */
  maps: Array<{ src?: string; path: string; title?: string }> = [];
  current = 0;
  popoutWindow: any = null; // Window or in-app proxy
  inAppPopoutEl: HTMLElement | null = null;
  inAppWindowProxy: any = null;
  _lastPopoutBlobUrl: string | null = null;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    await this.loadCards();
    await this.loadMaps();
    this.addCommand({ id: 'vtt-open-popout', name: 'Open Cards Popout', callback: () => this.openPopout() });
    this.addCommand({ id: 'vtt-close-popout', name: 'Close Popout', callback: () => this.closePopout() });

    // Popout helpers
    this.addCommand({ id: 'vtt-popout-save-position', name: 'Save popout position (from current popout)', callback: () => this.savePopoutPosition() });
    this.addCommand({ id: 'vtt-popout-move-second-monitor', name: 'Move popout to second monitor (approx)', callback: () => this.movePopoutToSecondMonitor() });
    this.addCommand({ id: 'vtt-open-card-viewer', name: 'Open Card Viewer Pane', callback: () => this.openViewerPane() });

    // Add ribbon icon (left sidebar button)
    this.addRibbonIcon('projector', 'VTT Card Viewer', () => {
      this.openViewerPane();
    });

    // register settings UI
    this.addSettingTab(new VttCardDisplaySettingTab(this.app, this));

    // Message listener for popout
    // Message listener for popout
    window.addEventListener('message', (ev) => {
      if (!ev.data || ev.data.plugin !== 'vtt-card-display') return;
      if (ev.data.type === 'next') this.nextCard();
      if (ev.data.type === 'prev') this.prevCard();
      if (ev.data.type === 'requestCurrent') {
        // If we recently opened the popout with suppression, ignore the first automatic request
        if ((this as any)._suppressNextRequest) {
          
          (this as any)._suppressNextRequest = false;
          return;
        }
        this.sendCurrentToPopout();
      }
    });

    // Postprocessor replacement for [[project:ID]] buttons
    // @ts-ignore registerMarkdownPostProcessor may exist in runtime
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).registerMarkdownPostProcessor((el: HTMLElement, ctx: any) => {
        try {
          const regex = /\[\[project:([^\]]+)\]\]/g;
          el.querySelectorAll('div, p').forEach((node) => {
            if (!node.innerHTML || !regex.test(node.innerHTML)) return;
            node.innerHTML = node.innerHTML.replace(regex, (m, id) => {
              const item = (this.settings.items || []).find(x => x.id === id);
              const label = item ? item.title : `Project ${id}`;
              return `<button class="vtt-project-btn" data-id="${id}">${label}</button>`;
            });
          });
          el.querySelectorAll('.vtt-project-btn').forEach((btn: Element) => {
            btn.addEventListener('click', (e: any) => {
              const id = e.currentTarget.dataset.id;
              this.projectItemById(id);
            });
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          
        }
      });
    } catch (e) {
      // ignore if postprocessor not available in environment
    }

    // Register code block handler for ```vtt-project``` blocks
    // This allows embedding a "Project this note" button directly in notes
    try {
      this.registerMarkdownCodeBlockProcessor('vtt-project', (source, el, ctx) => {
        const config = source.trim();
        const lines = config.split('\n').map(l => l.trim()).filter(l => l);
        
        // Parse options
        let buttonText = '🖥️ Project to Screen';
        let style = 'default'; // default, minimal, large
        
        for (const line of lines) {
          if (line.startsWith('text:')) {
            buttonText = line.substring(5).trim();
          } else if (line.startsWith('style:')) {
            style = line.substring(6).trim();
          }
        }
        
        // Create button container
        const container = el.createDiv({ cls: 'vtt-project-block' });
        
        // Style the container
        const containerStyles: Record<string, string> = {
          default: 'display:flex;justify-content:center;padding:12px;',
          minimal: 'display:inline-block;',
          large: 'display:flex;justify-content:center;padding:20px;'
        };
        container.style.cssText = containerStyles[style] || containerStyles.default;
        
        // Create the button
        const btn = container.createEl('button', { cls: 'vtt-project-note-btn' });
        btn.textContent = buttonText;
        
        // Style the button based on style option
        const buttonStyles: Record<string, string> = {
          default: 'padding:10px 20px;font-size:14px;background:var(--interactive-accent);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:500;transition:all 150ms ease;box-shadow:0 2px 8px rgba(0,0,0,0.2);',
          minimal: 'padding:6px 12px;font-size:12px;background:var(--background-secondary);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:4px;cursor:pointer;',
          large: 'padding:16px 32px;font-size:18px;background:linear-gradient(135deg,var(--interactive-accent),var(--interactive-accent-hover));color:var(--text-on-accent);border:none;border-radius:12px;cursor:pointer;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);'
        };
        btn.style.cssText = buttonStyles[style] || buttonStyles.default;
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-2px)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = style === 'large' ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)';
        });
        
        // Click handler - project the current note
        btn.addEventListener('click', async () => {
          const filePath = ctx.sourcePath;
          if (filePath) {
            btn.textContent = '⏳ Loading...';
            btn.style.opacity = '0.7';
            await this.projectNoteByPath(filePath);
            setTimeout(() => {
              btn.textContent = buttonText;
              btn.style.opacity = '1';
            }, 500);
          } else {
            new Notice('Could not determine note path');
          }
        });
      });
    } catch (e) {
      
    }

    // Commands for projection
    this.addCommand({ id: 'vtt-project-current-statblock', name: 'Project current file (rendered)', callback: () => this.projectCurrentFileAsRendered() });
    this.addCommand({ id: 'vtt-project-current-image', name: 'Project first image in current note', callback: () => this.projectFirstImageInCurrentFile() });
    
    // Monster image search command
    this.addCommand({ 
      id: 'vtt-search-monster-image', 
      name: 'Search D&D Monster Image...', 
      callback: () => this.openMonsterImageSearch() 
    });
    
    // Battle map search command
    this.addCommand({ 
      id: 'vtt-search-battle-map', 
      name: 'Search Battle Map...', 
      callback: () => this.openBattleMapSearch() 
    });

    // Register commands per item
    this._registerItemCommands();

    // interval to detect closed popout
    this.registerInterval(window.setInterval(() => {
      if (this.popoutWindow && this.popoutWindow.closed) this.popoutWindow = null;
    }, 2000));

    // Auto-delete video thumbnails when video files are deleted
    this.registerEvent(this.app.vault.on('delete', async (file) => {
      if (file instanceof TFile && IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())) {
        // Check if it's a video file
        const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
        if (videoExtensions.includes(file.extension.toLowerCase())) {
          // Delete corresponding thumbnail
          const safeName = file.path.replace(/[\/\\:*?"<>|]/g, '_');
          const thumbnailPath = `_vtt_thumbnails/thumb_${safeName}.jpg`;
          const thumbnailFile = this.app.vault.getAbstractFileByPath(thumbnailPath);
          if (thumbnailFile instanceof TFile) {
            try {
              await this.app.vault.delete(thumbnailFile);
              console.log('Deleted thumbnail:', thumbnailPath);
            } catch (e) {
              console.error('Failed to delete thumbnail:', e);
            }
          }
        }
      }
    }));

    // register view type
    try { this.registerView('vtt-card-view', (leaf: any) => new CardView(leaf, this)); } catch (e) {}
  }

  private _registeredItemCommands = new Set<string>();

  onunload() {
    if (this.popoutWindow && !this.popoutWindow.closed && typeof this.popoutWindow.close === 'function') this.popoutWindow.close();
    try { this.app.workspace.detachLeavesOfType('vtt-card-view'); } catch (e) {}
    this.closeInAppPopout();
  }

  createInAppPopout() {
    if (this.inAppPopoutEl) return;
    const el = document.createElement('div');
    el.className = 'vtt-inapp-popout';
    el.style.position = 'fixed'; el.style.left = '0'; el.style.top = '0'; el.style.width = '100%'; el.style.height = '100%'; el.style.zIndex = '99999'; el.style.background = '#0b0b0b'; el.style.color = '#fff';
    el.style.display = 'flex'; el.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.style.padding = '8px'; header.style.display = 'flex'; header.style.justifyContent = 'space-between'; header.style.gap = '8px'; header.style.background = '#00000088';
    const title = document.createElement('div'); title.textContent = 'VTT Cards'; title.style.fontWeight = 'bold';
    const controls = document.createElement('div');
    const prevBtn = document.createElement('button'); prevBtn.textContent = '◀ Prev'; prevBtn.style.marginRight = '6px'; prevBtn.addEventListener('click', () => this.prevCard());
    const nextBtn = document.createElement('button'); nextBtn.textContent = 'Next ▶'; nextBtn.style.marginRight = '6px'; nextBtn.addEventListener('click', () => this.nextCard());
    const closeBtn = document.createElement('button'); closeBtn.textContent = 'Close'; closeBtn.addEventListener('click', () => this.closeInAppPopout());
    controls.appendChild(prevBtn); controls.appendChild(nextBtn); controls.appendChild(closeBtn);
    header.appendChild(title); header.appendChild(controls);

    const content = document.createElement('div'); content.style.flex = '1'; content.style.overflow = 'auto'; content.style.display = 'flex'; content.style.justifyContent = 'center'; content.style.alignItems = 'center'; content.style.padding = '12px';
    const img = document.createElement('img'); img.id = 'vtt-inapp-img'; img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; img.style.display = 'block';
    // make content positioning relative so overlay controls can be positioned
    (content as HTMLElement).style.position = 'relative';
    content.appendChild(img);

    // In-app rotate button: create/ensure it exists when needed. This avoids it being removed
    // when we set content.innerHTML during showHTML.
    let _inapp_rot = 0;
    const applyInappRotation = () => {
      try {
        const imgEl = content.querySelector('img');
        const vidEl = content.querySelector('video');
        const el = imgEl && (imgEl as HTMLImageElement).style.display !== 'none' ? imgEl : (vidEl && (vidEl as HTMLVideoElement).style.display !== 'none' ? vidEl : null);
          if (el) {
            const h = (el as HTMLElement) as any;
            h.style.transformOrigin = 'center center';
            h.style.transform = `rotate(${_inapp_rot}deg)`;
            // Resize to preserve natural aspect ratio based on rotation and container size
            try {
              const container = content as HTMLElement;
              // Use getBoundingClientRect for accurate rendered size
              const rect = container.getBoundingClientRect();
              const cw = rect.width;
              const ch = rect.height;
              const natW = (h.naturalWidth || (h as HTMLVideoElement).videoWidth) || 0;
              const natH = (h.naturalHeight || (h as HTMLVideoElement).videoHeight) || 0;
              const isRotated = (_inapp_rot % 180) !== 0;
              if (natW && natH) {
                let scale: number;
                // Always use contain so image fits fully without clipping
                if (!isRotated) scale = Math.min(cw / natW, ch / natH);
                else scale = Math.min(cw / natH, ch / natW); // contain when rotated
                // Apply explicit pixel sizing and disable max constraints; center via margin
                try { } catch(e){}
                h.style.width = Math.round(natW * scale) + 'px';
                h.style.height = Math.round(natH * scale) + 'px';
                h.style.maxWidth = 'none'; h.style.maxHeight = 'none';
                h.style.margin = 'auto';
                try { const pf = (h as HTMLElement).closest && (h as HTMLElement).closest('.img-frame'); if (pf && (pf as HTMLElement).style) { (pf as HTMLElement).style.display = 'flex'; (pf as HTMLElement).style.alignItems = 'center'; (pf as HTMLElement).style.justifyContent = 'center'; (pf as HTMLElement).style.height = '100%'; (pf as HTMLElement).style.width = '100%'; (pf as HTMLElement).style.overflow = 'hidden'; } } catch(e){}
              } else {
                // fallback
                if (isRotated) { h.style.height = '100%'; h.style.width = 'auto'; h.style.maxWidth = 'none'; h.style.maxHeight = '100%'; }
                else { h.style.width = '100%'; h.style.height = 'auto'; h.style.maxWidth = '100%'; h.style.maxHeight = '100%'; }
              }
            } catch (e) { /* ignore */ }
          }
      } catch (e) { }
    };

    const showInappRotate = (transientMs = 1200) => {
      try {
        const rotateBtnEl = document.getElementById('vtt-inapp-rotate') as HTMLButtonElement | null;
        if (!rotateBtnEl) return;
        rotateBtnEl.style.transform = 'translateY(0)'; rotateBtnEl.style.opacity = '1';
        if (transientMs) setTimeout(()=>{ rotateBtnEl.style.transform='translateY(-120%)'; rotateBtnEl.style.opacity='0'; }, transientMs);
      } catch(e){}
    };

    const createInappRotateButton = () => {
      const rotateBtn = document.createElement('button'); rotateBtn.id = 'vtt-inapp-rotate'; rotateBtn.textContent = '⤾';
      rotateBtn.title = 'Rotate image';
      // Position relative to the popout root so innerHTML changes in `content` won't remove it
      rotateBtn.style.position = 'absolute'; rotateBtn.style.top = '12px'; rotateBtn.style.right = '12px'; rotateBtn.style.zIndex = '10000';
      // Make button visually distinct on dark background
      rotateBtn.style.background = 'rgba(255,255,255,0.08)'; rotateBtn.style.color = '#fff'; rotateBtn.style.border = '1px solid rgba(255,255,255,0.12)'; rotateBtn.style.padding = '8px'; rotateBtn.style.borderRadius = '8px';
      rotateBtn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
      rotateBtn.style.pointerEvents = 'auto';
      rotateBtn.style.transform = 'translateY(-120%)'; rotateBtn.style.transition = 'transform 220ms ease, opacity 220ms ease'; rotateBtn.style.opacity = '0';
      rotateBtn.addEventListener('click', (ev) => { ev.stopPropagation(); _inapp_rot = (_inapp_rot + 90) % 360; applyInappRotation(); showInappRotate(1500); });
      // Append to top-level element so it's not removed by content.innerHTML changes
      el.appendChild(rotateBtn);
      return rotateBtn;
    };

    const ensureInappRotate = () => { if (!document.getElementById('vtt-inapp-rotate')) createInappRotateButton(); };

    // ensure rotate exists initially
    ensureInappRotate();

    content.addEventListener('mouseenter', () => showInappRotate(0));
    content.addEventListener('mouseleave', () => { const r = document.getElementById('vtt-inapp-rotate'); if (r) { (r as HTMLButtonElement).style.transform='translateY(-120%)'; (r as HTMLButtonElement).style.opacity='0'; } });

    el.appendChild(header); el.appendChild(content);
    document.body.appendChild(el);

    this.inAppPopoutEl = el;
    

    this.inAppWindowProxy = {
      closed: false,
      postMessage: (msg: any) => {
        if (!msg || !msg.type) return;
        if (msg.type === 'show') {
          const i = el.querySelector('#vtt-inapp-img') as HTMLImageElement;
          if (i) {
            i.style.display = 'block';
            i.src = msg.src || '';
            // Ensure image is wrapped in .img-frame for consistent centering
              try {
              const contentEl = content as HTMLElement;
              if (contentEl && i && (!i.parentElement || !i.parentElement.classList.contains('img-frame'))) {
                const f = document.createElement('div'); f.className = 'img-frame';
                // Ensure the in-app frame fills available area and centers content
                f.style.width = '100%'; f.style.height = '100%'; f.style.display = 'flex'; f.style.alignItems = 'center'; f.style.justifyContent = 'center'; f.style.overflow = 'hidden'; f.style.boxSizing = 'border-box';
                i.parentElement && i.parentElement.replaceChild(f, i);
                f.appendChild(i);
              }
              // Reset rotation and run sizing after the image loads
              i.addEventListener('load', () => { try { _inapp_rot = 0; applyInappRotation(); showInappRotate(1500); } catch(e){} });
            } catch(e) { /* ignore */ }
          }
          // ensure rotate control exists and reset rotation immediately
          try { ensureInappRotate(); _inapp_rot = 0; applyInappRotation(); showInappRotate(1500); } catch(e){}
        } else if (msg.type === 'showHTML') {
          const i = el.querySelector('#vtt-inapp-img') as HTMLImageElement;
          if (i) i.style.display = 'none';
          content.innerHTML = msg.html || '';
          // If content now contains images/videos, ensure rotate button exists and show it briefly
          try {
            // Recreate rotate control if it was removed by innerHTML replace
            ensureInappRotate();
            const imgs = content.getElementsByTagName('img');
            const vids = content.getElementsByTagName('video');
            if ((imgs && imgs.length>0) || (vids && vids.length>0)) {
              _inapp_rot = 0; // reset rotation for new content
              applyInappRotation();
              showInappRotate(1500);
              // attach listeners to images/videos for diagnostics and to briefly show rotate when they load
              for (let i = 0; i < imgs.length; i++) {
                try { imgs[i].addEventListener('load', () => { showInappRotate(1500); }); imgs[i].addEventListener('error', () => { }); } catch(e){}
              }
              for (let v = 0; v < vids.length; v++) {
                try { vids[v].addEventListener('loadeddata', () => { showInappRotate(1500); }); vids[v].addEventListener('error', () => { }); } catch(e){}
              }
            }
          } catch(e){}
        } else if (msg.type === 'requestCurrent') {
          this.sendCurrentToPopout();
        }
      },
      focus: () => { if (this.inAppPopoutEl) (this.inAppPopoutEl as HTMLElement).focus(); },
      close: () => this.closeInAppPopout()
    };

    // Register the in-app proxy as the active popout window so sendCurrentToPopout posts to it
    this.popoutWindow = this.inAppWindowProxy;

    // Keyboard handling inside in-app popout
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') this.nextCard();
      if (e.key === 'ArrowLeft') this.prevCard();
      if (e.key === 'Escape') this.closeInAppPopout();
    });
    // Allow focusing the popout container to receive key events
    el.tabIndex = -1;

    // When created, send current card
    setTimeout(() => this.sendCurrentToPopout(), 100);
  }

  closeInAppPopout() {
    if (this.inAppPopoutEl) {
      try { document.body.removeChild(this.inAppPopoutEl); } catch (e) {}
      this.inAppPopoutEl = null;
    }
    if (this.inAppWindowProxy) { this.inAppWindowProxy.closed = true; this.inAppWindowProxy = null; }
    // if this.popoutWindow points to this proxy, clear it
    if (this.popoutWindow && this.popoutWindow === this.inAppWindowProxy) this.popoutWindow = null;
  }

  async _convertFileToDataUrl(path: string): Promise<string> {
    try {
      
      const file: any = this.app.vault.getAbstractFileByPath(path);
      if (!file) throw new Error('file not found: ' + path);
      
      // Use vault.readBinary properly bound to vault
      
      const data = await this.app.vault.readBinary(file);
      // data may be Uint8Array, ArrayBuffer, or string
      let bytes: Uint8Array;
      if (data instanceof Uint8Array) bytes = data;
      else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
      else if (typeof data === 'string') {
        // string fallback: assume it's base64 or text - convert to utf8 bytes
        const encoder = new TextEncoder(); bytes = encoder.encode(data);
      } else bytes = new Uint8Array(0);

      const b64 = this._uint8ArrayToBase64(bytes);
      
      const mime = this._mimeForPath(path) || 'application/octet-stream';
      return `data:${mime};base64,${b64}`;
    } catch (e) {
      // next fallback: try to read the file via the app:// src or via fs if available
      try {
        // Try to find in cards or maps
        const entry = (this.cards.find((c: any) => c.path === path) || this.maps.find((m: any) => m.path === path)) as any;
        if (entry && entry.src && entry.src.startsWith('app://')) {
          // app://<id>/absolute/path?query -> extract absolute path
          const withoutQuery = entry.src.split('?')[0];
          const absPath = withoutQuery.replace(/^app:\/\/[^\/]+\//, '/');
          
          try {
            const req = (globalThis as any).require || null;
            if (req) {
              const fs = req('fs');
              const buf = fs.readFileSync(absPath);
              // Buffer -> base64
              const globalBuffer = (globalThis as any).Buffer;
              const b64 = (typeof globalBuffer !== 'undefined' && globalBuffer.from ? globalBuffer.from(buf).toString('base64') : this._uint8ArrayToBase64(new Uint8Array(buf)));
              const mime = this._mimeForPath(path) || 'application/octet-stream';
              return `data:${mime};base64,${b64}`;
            }
          } catch (fsErr) {
            
          }
        }

        // last resort: try fetching the URL directly
        const srcUrl = (this.cards.find((c: any) => c.path === path)?.src || this.maps.find((m: any) => m.path === path)?.src);
        
        if (!srcUrl) throw e;
        const resp = await fetch(srcUrl);
        if (!resp.ok) throw new Error('fetch failed ' + resp.status);
        const blob = await resp.blob();
        return await this._blobToDataUrl(blob);
      } catch (e2) {
        throw e2;
      }
    }
  }

  _uint8ArrayToBase64(u8: Uint8Array) {
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, Array.prototype.slice.call(u8, i, i + chunk));
    }
    return btoa(s);
  }

  _blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  async _convertFileToPopoutUrl(path: string): Promise<string> {
    try {
      const file: any = this.app.vault.getAbstractFileByPath(path);
      if (!file) throw new Error('file not found: ' + path);

      const data = await this.app.vault.readBinary(file);
      let blob: Blob;
      const mime = this._mimeForPath(path) || 'application/octet-stream';
      if (data instanceof Uint8Array) {
        blob = new Blob([data], { type: mime });
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([new Uint8Array(data)], { type: mime });
      } else if (typeof data === 'string') {
        blob = new Blob([data], { type: mime });
      } else {
        blob = new Blob([], { type: mime });
      }

      // Create blob URL usable by external popout window
      const url = URL.createObjectURL(blob);
      return url;
    } catch (e) {
      // Fallback to data URL if blob approach fails
      try {
        return await this._convertFileToDataUrl(path);
      } catch (e2) {
        throw e2;
      }
    }
  }

  _mimeForPath(path: string) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'bmp': return 'image/bmp';
      case 'tif': case 'tiff': return 'image/tiff';
      case 'ico': return 'image/x-icon';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogg': return 'video/ogg';
      case 'mov': return 'video/quicktime';
      default: return null;
    }
  }

  /**
   * Get or create a cached video thumbnail.
   * Thumbnails are stored in the vault's _thumbnails folder (hidden with underscore).
   * Returns the app:// URL to the cached thumbnail, or null if it couldn't be created.
   */
  async _getOrCreateVideoThumbnail(videoPath: string): Promise<string | null> {
    try {
      // Generate a unique thumbnail filename based on the video path
      const videoFile = this.app.vault.getAbstractFileByPath(videoPath);
      if (!videoFile) return null;
      
      // Create a hash-like identifier from the path
      const safeFileName = videoPath.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
      const thumbnailFileName = `thumb_${safeFileName}.jpg`;
      
      // Thumbnail cache folder path (in vault root, starts with _ to be ignored/hidden)
      const thumbnailFolder = '_vtt_thumbnails';
      const thumbnailPath = `${thumbnailFolder}/${thumbnailFileName}`;
      
      // Check if thumbnail already exists
      const existingThumb = this.app.vault.getAbstractFileByPath(thumbnailPath);
      if (existingThumb) {
        // Thumbnail exists - return its resource path
        return this.app.vault.getResourcePath(existingThumb as any);
      }
      
      // Thumbnail doesn't exist - create it
      // First, ensure the thumbnails folder exists
      try {
        const folder = this.app.vault.getAbstractFileByPath(thumbnailFolder);
        if (!folder) {
          await this.app.vault.createFolder(thumbnailFolder);
        }
      } catch (e) { /* folder might exist */ }
      
      // Get video resource path to load it
      const videoUrl = this.app.vault.getResourcePath(videoFile as any);
      
      // Create thumbnail by extracting a frame from the video
      const thumbnailData = await this._extractVideoFrame(videoUrl);
      if (!thumbnailData) return null;
      
      // Convert base64 to binary and save
      const base64Data = thumbnailData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      await this.app.vault.createBinary(thumbnailPath, bytes);
      
      // Return the resource path to the new thumbnail
      const newThumb = this.app.vault.getAbstractFileByPath(thumbnailPath);
      if (newThumb) {
        return this.app.vault.getResourcePath(newThumb as any);
      }
      
      return null;
    } catch (e) {
      console.error('Failed to get/create video thumbnail:', e);
      return null;
    }
  }
  
  /**
   * Extract a single frame from a video URL and return as base64 JPEG
   */
  async _extractVideoFrame(videoUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      // Timeout fallback - don't wait forever
      const timeout = setTimeout(() => {
        video.src = '';
        resolve(null);
      }, 10000);
      
      video.onloadeddata = () => {
        // Seek to 1 second or 10% of duration, whichever is smaller
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        try {
          clearTimeout(timeout);
          
          // Create canvas and draw video frame
          const canvas = document.createElement('canvas');
          // Use smaller size for thumbnails (max 200px)
          const maxSize = 200;
          const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            video.src = ''; // Release video
            resolve(thumbnail);
          } else {
            video.src = '';
            resolve(null);
          }
        } catch (e) {
          console.error('Error extracting video frame:', e);
          video.src = '';
          resolve(null);
        }
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        video.src = '';
        resolve(null);
      };
      
      video.src = videoUrl;
      video.load();
    });
  }

  // Convert resource URLs inside rendered HTML to inline data URLs when possible
  async _inlineResourcesInHtml(html: string, contextPath?: string): Promise<string> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Determine context directory for relative path resolution
      let contextDir = '';
      if (contextPath) {
        const lastSlash = contextPath.lastIndexOf('/');
        contextDir = lastSlash > 0 ? contextPath.substring(0, lastSlash) : '';
      }
      
      // Handle Obsidian's internal-embed spans (from ![[image.jpg]] syntax)
      const spans = Array.from(doc.querySelectorAll('span.internal-embed')) as HTMLElement[];
      
      for (const span of spans) {
        const src = span.getAttribute('src');
        const alt = span.getAttribute('alt') || 'image';
        if (!src) continue;
        
        try {
          // Try to resolve the src as a vault path
          let dataUrl: string | null = null;
          let foundFile: any = null;
          
          // First try the src as-is (might be a full path)
          foundFile = this.app.vault.getAbstractFileByPath(src);
          
          // Try relative to context directory
          if (!foundFile && contextDir) {
            const fullPath = contextDir + '/' + src;
            foundFile = this.app.vault.getAbstractFileByPath(fullPath);
          }
          
          // Try as relative to the active file (fallback)
          if (!foundFile) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && activeFile.parent) {
              const parentPath = activeFile.parent.path;
              const fullPath = parentPath ? parentPath + '/' + src : src;
              foundFile = this.app.vault.getAbstractFileByPath(fullPath);
            }
          }
          
          // Search in entire vault by filename
          if (!foundFile) {
            const baseName = src.split('/').pop();
            const allFiles = this.app.vault.getFiles();
            foundFile = allFiles.find((f: any) => f.name === baseName || f.path.endsWith(src));
          }
          
          if (foundFile) {
            dataUrl = await this._convertFileToDataUrl((foundFile as any).path);
          }
          
          if (dataUrl) {
            // Replace the span with an actual img element
            const img = doc.createElement('img');
            img.setAttribute('src', dataUrl);
            img.setAttribute('alt', alt);
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            span.parentNode?.replaceChild(img, span);
            
          } else {
            
          }
        } catch (e) { }
      }
      
      const imgs = Array.from(doc.getElementsByTagName('img')) as HTMLImageElement[];
      for (const img of imgs) {
        const src = img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) continue;
        try {
          const data = await this._urlToDataUrl(src);
          if (data) img.setAttribute('src', data);
        } catch (e) { }
      }
      const videos = Array.from(doc.getElementsByTagName('video')) as HTMLVideoElement[];
      for (const v of videos) {
        // handle <video src=...> and <source> children
        const s = v.getAttribute('src');
        if (s && !s.startsWith('data:')) {
          try { 
            const data = await this._urlToDataUrl(s); 
            if (data) {
              v.setAttribute('src', data);
            } else if (s.startsWith('app://')) {
              // For large videos that can't be converted, try to keep the app:// URL
              // This works in in-app popouts but not external windows
              // External windows will show a broken video, which is better than nothing
            }
          } catch (e) { }
        }
        const sources = Array.from(v.getElementsByTagName('source')) as HTMLSourceElement[];
        for (const srcEl of sources) {
          const s2 = srcEl.getAttribute('src');
          if (!s2 || s2.startsWith('data:')) continue;
          try { 
            const data = await this._urlToDataUrl(s2); 
            if (data) srcEl.setAttribute('src', data); 
          } catch (e) { }
        }
      }
      // srcset handling
      for (const img of imgs) {
        const ss = img.getAttribute('srcset');
        if (!ss) continue;
        try {
          const parts = ss.split(',').map(p => p.trim()).map(p => {
            const [url, desc] = p.split(/\s+/);
            return { url, desc };
          });
          for (const p of parts) {
            try {
              const data = await this._urlToDataUrl(p.url);
              if (data) p.url = data;
            } catch (e) { /* ignore */ }
          }
          const newSrcSet = parts.map(p => p.url + (p.desc ? ' ' + p.desc : '')).join(', ');
          img.setAttribute('srcset', newSrcSet);
        } catch (e) { }
      }
      // Remove any <script> tags from the rendered HTML to avoid running embedded scripts (and TypeScript 'as' casts)
      try {
        const scripts = Array.from(doc.getElementsByTagName('script'));
        for (const s of scripts) { s.parentNode?.removeChild(s); }
      } catch(e) { /* ignore */ }
      return doc.body.innerHTML;
    } catch (e) {
      
      return html;
    }
  }

  // Convert a URL (possibly app:// or remote) to a data URL when possible
  // For in-app popouts, returns app:// URLs without conversion for large files
  async _urlToDataUrl(url: string): Promise<string | null> {
    try {
      if (!url) return null;
      const clean = url.split('?')[0];
      
      // Check if this is an in-app popout
      const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
      
      // For in-app popouts, return app:// URLs directly
      if (isInAppPopout && url.startsWith('app://')) {
        return url;
      }
      
      // try to match known cards/maps entries
      const all: any[] = ([] as any[]).concat(this.cards || [], this.maps || []);
      for (const entry of all) {
        if (entry && entry.src && entry.src.split('?')[0] === clean) {
          if (entry.path) {
            try { return await this._convertFileToDataUrl(entry.path); } catch (e) { }
          }
        }
      }
      // If URL is a relative path or plain filename, try resolving it in the vault
      if (!/^([a-zA-Z]+:)?\/\//.test(url) && !url.startsWith('data:')) {
        // try absolute path
        let candidate = url;
        try {
          let file = this.app.vault.getAbstractFileByPath(candidate);
          if (!file && this.app.workspace.getActiveFile()) {
            const base = this.app.workspace.getActiveFile().parent?.path || '';
            candidate = base.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
            file = this.app.vault.getAbstractFileByPath(candidate);
          }
          if (file) {
            const filePath = (file as any).path;
            try { return await this._convertFileToDataUrl(filePath); } catch (e) { }
          }
        } catch (e) { /* ignore */ }
      }
      // fallback: try fetch and convert to blob data url
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('fetch failed ' + resp.status);
        const blob = await resp.blob();
        return await this._blobToDataUrl(blob);
      } catch (e) {
        
      }
      return null;
    } catch (e) { return null; }
  }

  /**
   * Extract content from a note for projection.
   * Notes can have sections:
   * - Content before any header or under other headers: always shown (image/main content)
   * - # Player Infos: shown only if showPlayerInfo is true
   * - # DM Info: never shown in popout
   * 
   * @param content - Raw markdown content
   * @param includePlayerInfo - Whether to include Player Infos section
   * @returns Processed markdown content for projection
   */
  _extractNoteContentForProjection(content: string, includePlayerInfo: boolean): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let currentSection: 'main' | 'player' | 'dm' = 'main';
    
    for (const line of lines) {
      // Check for section headers (case-insensitive)
      const headerMatch = line.match(/^(#+)\s*(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[2].toLowerCase().trim();
        if (headerText.includes('player info') || headerText.includes('player-info') || headerText.includes('playerinfo') || headerText === 'player infos') {
          currentSection = 'player';
          if (includePlayerInfo) {
            result.push(line); // Include the header too
          }
          continue;
        } else if (headerText.includes('dm info') || headerText.includes('dm-info') || headerText.includes('dminfo') || headerText.includes('gm info') || headerText.includes('gamemaster') || headerText === 'dm') {
          currentSection = 'dm';
          continue; // Never include DM header
        } else {
          // Other header - back to main content
          currentSection = 'main';
        }
      }
      
      // Add line based on current section
      if (currentSection === 'main') {
        result.push(line);
      } else if (currentSection === 'player' && includePlayerInfo) {
        result.push(line);
      }
      // DM section lines are never added
    }
    
    return result.join('\n');
  }

  /**
   * Parse note content into separate image and player info sections.
   * Structure: Everything before first section header OR after images = image content
   * # Player Infos section = player info (shown in top-right box if enabled)
   * # DM Info section = never shown
   * Other sections after DM Info = still hidden (DM notes)
   * 
   * Expected note format:
   * ![[image.jpg]]
   * # Player Infos
   * (player visible text)
   * # DM Info
   * (dm only text - never shown)
   * 
   * @returns Object with imageContent (main/image part) and playerInfoContent (player info text)
   */
  _parseNoteContent(content: string, includePlayerInfo: boolean): { imageContent: string; playerInfoContent: string } {
    // First, remove all ```vtt-project ... ``` code blocks from the content
    const cleanedContent = content.replace(/```vtt-project[\s\S]*?```/g, '');
    
    const lines = cleanedContent.split('\n');
    const imageLines: string[] = [];
    const playerInfoLines: string[] = [];
    let currentSection: 'main' | 'player' | 'dm' = 'main';
    
    for (const line of lines) {
      // Check for section headers (case-insensitive)
      const headerMatch = line.match(/^(#+)\s*(.*)$/);
      if (headerMatch) {
        const headerText = headerMatch[2].toLowerCase().trim();
        
        // Check for DM Info section FIRST (various formats) - these are never shown
        if (headerText.includes('dm info') || headerText.includes('dm-info') || 
            headerText.includes('dminfo') || headerText.includes('gm info') || 
            headerText.includes('gamemaster') || headerText === 'dm' ||
            headerText.startsWith('dm info') || headerText.startsWith('dm-info') ||
            headerText === 'story' || headerText.includes('dm note') ||
            headerText === 'story generator') {
          currentSection = 'dm';
          
          continue; // Never include DM header
        }
        
        // Check for Player Info section (various formats) - can switch back from DM section!
        if (headerText.includes('player info') || headerText.includes('player-info') || 
            headerText.includes('playerinfo') || headerText.startsWith('player info') ||
            headerText === 'player infos' || headerText === 'player info' ||
            headerText.includes('introduction to player') || headerText.includes('player introduction') ||
            headerText.includes('to player') || headerText.includes('for player')) {
          currentSection = 'player';
          // Include the header for player sections (except "Player Infos" itself)
          if (!headerText.match(/^player\s*info/)) {
            playerInfoLines.push(line);
          }
          
          continue;
        }
        
        // Other headers: stay in current section
      }
      
      // Add line based on current section
      if (currentSection === 'main') {
        imageLines.push(line);
      } else if (currentSection === 'player' && includePlayerInfo) {
        playerInfoLines.push(line);
      }
      // DM section lines are never added
    }
    
    
    
    return {
      imageContent: imageLines.join('\n'),
      playerInfoContent: playerInfoLines.join('\n')
    };
  }

  /**
   * Build HTML for note projection with image/video centered and text in top-right box
   */
  _buildNoteProjectionHtml(imageHtml: string, playerInfoHtml: string): string {
    // Use very explicit inline styles to ensure the box appears correctly
    const infoBoxStyle = `position:absolute!important;top:16px!important;right:16px!important;max-width:350px!important;max-height:60%!important;overflow-y:auto!important;background:rgba(0,0,0,0.9)!important;border:2px solid rgba(255,255,255,0.3)!important;border-radius:8px!important;padding:16px 20px!important;color:#fff!important;font-size:14px!important;line-height:1.6!important;box-shadow:0 4px 24px rgba(0,0,0,0.7)!important;z-index:9999!important;text-align:left!important;`;

    const containerStyle = `position:relative!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;`;

    const mediaStyle = `position:relative!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;`;

    let html = `<div class="vtt-note-container" style="${containerStyle}">`;
    html += `<div class="vtt-note-image" style="${mediaStyle}">${imageHtml}</div>`;
    
    if (playerInfoHtml && playerInfoHtml.trim()) {
      html += `<div class="vtt-player-info-box" style="${infoBoxStyle}">${playerInfoHtml}</div>`;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Resolve ![[image]] and ![[video]] links in markdown content to actual file paths.
   * Also handles video file extensions for proper rendering.
   */
  _resolveEmbeddedMedia(content: string, noteDir: string): string {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
      // Try to find the file
      const allFiles = this.app.vault.getFiles();
      const baseName = filename.split('/').pop();
      const isVideo = videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      
      // Try to find the file in vault - prioritize relative paths
      let foundFile: any = null;
      
      // First try: relative to note directory (e.g., _resources/image.png -> Maps/_resources/image.png)
      if (noteDir) {
        const relativePath = noteDir + '/' + filename;
        foundFile = this.app.vault.getAbstractFileByPath(relativePath);
      }
      
      // Second try: absolute path
      if (!foundFile) {
        foundFile = this.app.vault.getAbstractFileByPath(filename);
      }
      
      // Third try: by filename or path ending
      if (!foundFile) {
        const fileMatches = allFiles.filter((f: any) => f.name === baseName || f.path.endsWith(filename));
        if (fileMatches.length > 0) {
          foundFile = fileMatches[0];
        }
      }
      
      // Fourth try: common folders
      if (!foundFile) {
        const candidates = [
          'images/' + baseName,
          '_resources/' + baseName,
        ];
        for (const candidate of candidates) {
          const f = this.app.vault.getAbstractFileByPath(candidate);
          if (f) { foundFile = f; break; }
        }
      }
      
      if (foundFile) {
        if (isVideo) {
          // Get resource URL for the video file
          const resourceUrl = this.app.vault.getResourcePath(foundFile);
          return `<video controls autoplay muted loop style="max-width:100%;max-height:100%;display:block;margin:auto"><source src="${resourceUrl}" type="video/${foundFile.extension}"></video>`;
        }
        return `![${filename}](${foundFile.path})`;
      }
      
      // Fallback
      if (isVideo) {
        return `<video controls style="max-width:100%;max-height:100%"><source src="${filename}"></video>`;
      }
      return `![${filename}](${filename})`;
    });
  }

  /** Check if a file path contains an underscore-prefixed folder (to be ignored) */
  _isInIgnoredFolder(filePath: string, baseFolder: string): boolean {
    // Get the relative path after the base folder
    const relativePath = baseFolder ? filePath.substring(baseFolder.length + 1) : filePath;
    // Check if any folder component starts with underscore
    const parts = relativePath.split('/');
    // Check all parts except the filename itself
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].startsWith('_')) return true;
    }
    return false;
  }

  /** Load card image files from the configured Cards folder */
  async loadCards() {
    const folder = (this.settings.folderPath || '').trim();
    const files: any[] = this.app.vault.getFiles();
    this.cards = files
      .filter(f => folder === '' || f.path.startsWith(folder + '/'))
      .filter(f => !this._isInIgnoredFolder(f.path, folder))
      .filter(f => IMAGE_EXTENSIONS.some(e => f.name.toLowerCase().endsWith(e)))
      .map(f => ({ src: this.app.vault.getResourcePath(f), path: f.path }));
    this.current = 0;
    
  }

  /** Load map files (images and markdown) from the configured Maps folder */
  async loadMaps() {
    const folder = (this.settings.mapsFolderPath || '').trim();
    const files: any[] = this.app.vault.getFiles();
    const mapExtensions = [...IMAGE_EXTENSIONS, '.md'];
    
    this.maps = files
      .filter(f => folder === '' || f.path.startsWith(folder + '/'))
      .filter(f => !this._isInIgnoredFolder(f.path, folder))
      .filter(f => mapExtensions.some(e => f.name.toLowerCase().endsWith(e)))
      .map(f => ({ src: f.extension === 'md' ? undefined : this.app.vault.getResourcePath(f), path: f.path, title: f.name.replace(/\.[^.]+$/, '') }));
    
  }

  /** Close the popout window */
  closePopout() {
    // Close in-app popout if exists
    if (this.inAppPopoutEl) {
      this.closeInAppPopout();
      return;
    }
    // Close external popout window
    if (this.popoutWindow && !this.popoutWindow.closed) {
      try {
        this.popoutWindow.close();
      } catch (e) {
        
      }
      this.popoutWindow = null;
      new Notice('Popout closed');
    } else {
      new Notice('No popout open');
    }
  }

  /** Open or focus the popout window */
  openPopout(suppressInitialSend: boolean = false) {
    if (this.popoutWindow && !this.popoutWindow.closed) { this.popoutWindow.focus(); if (!suppressInitialSend) this.sendCurrentToPopout(); this.sendSettingsToPopout(); return; }
    // When caller requests suppression, set a flag to ignore the first requestCurrent coming from the popout
    if (suppressInitialSend) { (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 2000); }
    const html = buildPopoutHtml(this.settings);

    // Try Electron BrowserWindow fallback first (if available)
    try {
      const ep = this.tryOpenElectronWindow(html);
      if (ep) { this.popoutWindow = ep; if (!suppressInitialSend) setTimeout(() => this.sendCurrentToPopout(), 300); setTimeout(() => this.sendSettingsToPopout(), 350); return; }
    } catch (e) { }
    const opts = `width=${this.settings.popoutWidth},height=${this.settings.popoutHeight},left=${this.settings.popoutLeft},top=${this.settings.popoutTop}`;
    try {
      // 1) Try opening an empty window and write the HTML
      this.popoutWindow = window.open('', 'vtt-card-popout', opts);
      
      if (this.popoutWindow) {
      try { this.popoutWindow.document.open(); this.popoutWindow.document.write(html); this.popoutWindow.document.close(); }
        catch (e) {
          new (globalThis as any).Notice('Could not initialize popout content');
        }
        if (!suppressInitialSend) setTimeout(() => this.sendCurrentToPopout(), 300);
        setTimeout(() => this.sendSettingsToPopout(), 350);
        return;
      }

      // 2) Try opening about:blank explicitly
      this.popoutWindow = window.open('about:blank', 'vtt-card-popout', opts);
      
        if (this.popoutWindow) {
        try { this.popoutWindow.document.open(); this.popoutWindow.document.write(html); this.popoutWindow.document.close(); }
        catch (e) { }
        if (!suppressInitialSend) setTimeout(() => this.sendCurrentToPopout(), 300);
        setTimeout(() => this.sendSettingsToPopout(), 350);
        return;
      }

      // 3) Fallback: create an iframe inside the newly opened window and set srcdoc (avoids blob: URLs)
      try {
        const w = window.open('', 'vtt-card-popout', opts);
        
        if (w && w.document) {
          try {
            w.document.open();
            w.document.write('<!doctype html><html><body><div id="vtt-iframe-root"></div></body></html>');
            w.document.close();
            const iframe = w.document.createElement('iframe');
            iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
            iframe.srcdoc = html;
            const root = w.document.getElementById('vtt-iframe-root');
            if (root) root.appendChild(iframe);
            this.popoutWindow = w;
            if (!suppressInitialSend) setTimeout(() => this.sendCurrentToPopout(), 300);
            setTimeout(() => this.sendSettingsToPopout(), 350);
            return;
          } catch (e) { }
        }
      } catch (e) { }

      // If we reach here nothing worked — create in-app fallback
      
      new (globalThis as any).Notice('Could not open external popout (blocked). Opening in-app popout instead.');
      this.createInAppPopout();
    } catch (e) {
      
      new (globalThis as any).Notice('Could not open popout window');
    }
  }

  tryOpenElectronWindow(html: string) {
    try {
      const req = (window as any).require || ((globalThis as any).require ? (globalThis as any).require : null);
      if (!req) { return null; }

      // Try multiple electron entry points
      const tryNames = ['electron', '@electron/remote'];
      let electron: any = null;
      for (const n of tryNames) {
        try { electron = req(n); if (electron) { break; } } catch (e) { /* ignore */ }
      }
      if (!electron) { return null; }

      const BrowserWindow = electron.BrowserWindow || (electron.remote && electron.remote.BrowserWindow) || (electron.remote && electron.remote.getCurrentWindow && electron.remote.getCurrentWindow().constructor);
      if (!BrowserWindow) { return null; }

      // Create a BrowserWindow
      const win = new (BrowserWindow as any)({ width: this.settings.popoutWidth || 800, height: this.settings.popoutHeight || 600, x: this.settings.popoutLeft, y: this.settings.popoutTop, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      try {
        // Load blank page and inject HTML after DOM is ready; executing too early can leave a blank page
        try { win.loadURL('about:blank'); } catch (e) { }
        const safeHtml = JSON.stringify(html);
        // Inject HTML and create a message handler that dispatches to the window's message event listener
        // The buildPopoutHtml already includes proper message handlers, we just need to dispatch messages to them
        const inject = `(function(html){ 
          try { document.open(); document.write(html); document.close(); } catch (e) { } 
          window._vtt_handle = function(msg){ 
            try { 
              if (!msg) return;
              // Dispatch as a MessageEvent to trigger the existing message listener in the HTML
              var ev = new MessageEvent('message', { data: msg });
              window.dispatchEvent(ev);
            } catch(e){ } 
          }; 
          window._vtt_ready = true; 
        })( ${safeHtml} );`;
        try {
          const exec = () => {
            try {
              win.webContents && win.webContents.executeJavaScript && win.webContents.executeJavaScript(inject).then(()=>{}).catch((err:any)=>{
                // Injection failed
              });
            } catch (e) { }
            try { win.show && win.show(); } catch (e) {}
          };
          if (win.webContents && typeof win.webContents.once === 'function') {
              win.webContents.once('dom-ready', () => {
                exec();
                // mark ready and flush any queued messages
                try {
                  proxy._ready = true;
                  if ((proxy as any)._pending && (proxy as any)._pending.length) {
                    const arr = (proxy as any)._pending.splice(0);
                    arr.forEach((m: any) => {
                      try { win.webContents.executeJavaScript(`(window._vtt_handle && window._vtt_handle(${JSON.stringify(m)}))`).catch(()=>{}); } catch(e){}
                    });
                    
                  }
                } catch(e) { }
              });
            } else exec();
        } catch (e) { }
      } catch (e) { }

      const pending: any[] = [] as any[];
      const proxy: any = {
        closed: false,
        _ready: false,
        _pending: pending,
        postMessage: (msg: any) => {
          try {
            
            if (!proxy._ready) {
              pending.push(msg);
              
              return;
            }
            // Call the in-window handler
            win.webContents && win.webContents.executeJavaScript && win.webContents.executeJavaScript(`(window._vtt_handle && window._vtt_handle(${JSON.stringify(msg)}))`).catch(()=>{});
          } catch (e) { }
        },
        focus: () => { try { win.focus && win.focus(); } catch (e) { } },
        close: () => { try { win.close && win.close(); proxy.closed = true; } catch (e) { } }
      };
      try { win.on && win.on('closed', () => { proxy.closed = true; if (this.popoutWindow === proxy) this.popoutWindow = null; }); } catch (e) { /* ignore */ }
      return proxy;
    } catch (e) { return null; }
  }

  tryForcedExternalPopout() {
    const html = buildPopoutHtml(this.settings);
    const ep = this.tryOpenElectronWindow(html);
    if (ep) { this.popoutWindow = ep; new (globalThis as any).Notice('Opened external popout via Electron.'); setTimeout(() => this.sendCurrentToPopout(), 300); return; }
    new (globalThis as any).Notice('Could not open external popout via Electron. See README for instructions to enable BrowserWindow fallback (AppImage/non-sandboxed).');
    
  }

  // Send grid and fog settings to popout
  sendSettingsToPopout() {
    if (!this.popoutWindow || this.popoutWindow.closed) return;
    
    try {
      this.popoutWindow.postMessage({ 
        plugin: 'vtt-card-display', 
        type: 'settings', 
        gridSize: this.settings.gridSize ?? 50,
        gridColor: this.settings.gridColor ?? '#ffffff',
        gridOpacity: this.settings.gridOpacity ?? 0.3,
        fogRevealSize: this.settings.fogRevealSize ?? 30,
        showPlayerInfo: this.settings.showPlayerInfo ?? false,
      }, '*');
    } catch (e) {
      
    }
  }

  async sendCurrentToPopout() {
    if (!this.popoutWindow || this.popoutWindow.closed) return;
    
    const entry: any = this.cards[this.current];
    
    if (!entry) {
      if (!this.cards || this.cards.length === 0) {
        new (globalThis as any).Notice('No cards available to project — add images to the Cards folder or set the folder path in settings');
        return;
      }
      
      try {
        this.popoutWindow.postMessage({ plugin: 'vtt-card-display', type: 'showHTML', html: '<div style="color:#fff;padding:24px;text-align:center">No card image available</div>' }, '*');
      } catch (e) { }
      return;
    }

    // Normalize src
    let src: string | null = null;
    if (typeof entry === 'string') src = entry;
    else if (entry && typeof entry.src === 'string') src = entry.src;
    else src = null;

    // Check if this is an in-app popout (can use app:// URLs directly)
    const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
    
    // For in-app popouts, we can use app:// URLs directly without conversion
    if (isInAppPopout && src && src.startsWith('app://')) {
      // Use the app:// URL directly - no conversion needed
      try {
        const message = { plugin: 'vtt-card-display', type: 'show', src };
        this.popoutWindow.postMessage(message, '*');
        (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 500);
      } catch (e) { }
      return;
    }

    // For external popouts, convert files to a URL usable by the popout (prefer blob: URLs)
    if ((!src || src.startsWith('app://') || src.startsWith('file://')) && entry && entry.path) {
      try {
        // Revoke previous blob URL if any
        try { if (this._lastPopoutBlobUrl) { URL.revokeObjectURL(this._lastPopoutBlobUrl); this._lastPopoutBlobUrl = null; } } catch (e) {}
        src = await this._convertFileToPopoutUrl(entry.path);
        // If we got a blob URL, remember it so we can revoke later
        if (src && src.startsWith('blob:')) this._lastPopoutBlobUrl = src;
      } catch (e) { }
    }

    // As a last resort, if src still looks like an app:// URL, try to convert by parsing the path
    if (src && src.startsWith('app://') && entry && entry.path) {
      try {
        src = await this._convertFileToPopoutUrl(entry.path);
        if (src && src.startsWith('blob:')) this._lastPopoutBlobUrl = src;
      } catch (e) { }
    }

    if (!src) {
      try { this.popoutWindow.postMessage({ plugin: 'vtt-card-display', type: 'showHTML', html: '<div style="color:#fff;padding:24px;text-align:center">Unable to resolve card image</div>' }, '*'); }
      catch (e) { }
      return;
    }

    try {
      // For external popouts, prefer sending a blob/data URL converted from the vault file
      let outSrc = src;
      if (!isInAppPopout && entry && entry.path) {
        try {
          if (this._lastPopoutBlobUrl) { try { URL.revokeObjectURL(this._lastPopoutBlobUrl); } catch (e) {} this._lastPopoutBlobUrl = null; }
          outSrc = await this._convertFileToPopoutUrl(entry.path);
          if (outSrc && outSrc.startsWith('blob:')) this._lastPopoutBlobUrl = outSrc;
        } catch (e) {
          // fallback to previously resolved src
          outSrc = src;
        }
      }

      // Determine kind for the popout so it can choose video vs image explicitly
      let kind: string | undefined = undefined;
      try {
        const mime = this._mimeForPath(entry?.path || '') || '';
        if (mime.startsWith('video/')) kind = 'video';
        else if (mime.startsWith('image/')) kind = 'image';
      } catch (e) {}

      const message = { plugin: 'vtt-card-display', type: 'show', src: outSrc, kind };
      this.popoutWindow.postMessage(message, '*');
      // set suppress flag briefly so popout-initiated requestCurrent doesn't immediately overwrite
      (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 500);
    } catch (e) {
      
    }
  }

  nextCard() { if (!this.cards || this.cards.length === 0) return; this.current = (this.current + 1) % this.cards.length; this.sendCurrentToPopout(); }
  prevCard() { if (!this.cards || this.cards.length === 0) return; this.current = (this.current - 1 + this.cards.length) % this.cards.length; this.sendCurrentToPopout(); }

  // Project helpers
  async projectItemById(id: string) {
    const item = (this.settings.items || []).find(x => x.id === id as string);
    if (!item) { new Notice(`Item ${id} not found`); return; }
    try {
      if (item.type === 'image') {
        const file: any = this.app.vault.getAbstractFileByPath(item.value);
        if (!file) { new (globalThis as any).Notice('Image file not found: ' + item.value); return; }
        let src = this.app.vault.getResourcePath(file);
        // Convert to data URL for external popout
        try { src = await this._convertFileToDataUrl(file.path); } catch (e) { }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'image', src, title: item.title });
      } else if (item.type === 'statblock') {
        const file: any = this.app.vault.getAbstractFileByPath(item.value);
        if (!file) { new (globalThis as any).Notice('Note not found: ' + item.value); return; }
        const content = await this.app.vault.read(file);
          // Open the popout immediately to preserve the user gesture (avoid popup blockers), then render and send content
          this.openPopout(true);
          const div = document.createElement('div');
          await MarkdownRenderer.renderMarkdown(content, div, file.path, this);
          const inlined = await this._inlineResourcesInHtml(div.innerHTML);
          await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'showHTML', html: inlined, title: item.title });
      } else if (item.type === 'note-image') {
        const path = item.value || (this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : null);
        if (!path) { new (globalThis as any).Notice('No note to find image from'); return; }
        const file: any = this.app.vault.getAbstractFileByPath(path);
        if (!file) { new (globalThis as any).Notice('Note not found: ' + path); return; }
        const md = await this.app.vault.read(file);
        const m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
        if (!m) { new Notice('No image found in note'); return; }
        const imgPath = m[1];
        const target = this.app.vault.getAbstractFileByPath(imgPath) || this.app.vault.getAbstractFileByPath((file.parent && file.parent.path ? file.parent.path + '/' : '') + imgPath);
        if (!target) { new (globalThis as any).Notice('Image not found: ' + imgPath); return; }
        let src = this.app.vault.getResourcePath(target);
        // Convert to data URL for external popout
        try { src = await this._convertFileToDataUrl((target as any).path); } catch (e) { }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'image', src, title: item.title });
      }
      else if (item.type === 'card') {
        // value should be a card path (relative vault path)
        const cardPath = item.value;
        if (!cardPath) { new (globalThis as any).Notice('No card selected'); return; }
        const entry = (this.cards || []).find((c: any) => c.path === cardPath);
        if (!entry) { new (globalThis as any).Notice('Card not found: ' + cardPath); return; }
        let src = entry.src;
        // If it's a local file (path exists), convert to data URL for external popout reliability
        if (entry.path && (entry.path.toLowerCase().endsWith('.mp4') || entry.path.toLowerCase().endsWith('.png') || entry.path.toLowerCase().endsWith('.jpg') || entry.path.toLowerCase().endsWith('.jpeg') || entry.path.toLowerCase().endsWith('.svg') || entry.path.toLowerCase().endsWith('.webp') || entry.path.toLowerCase().endsWith('.gif'))) {
          try { src = await this._convertFileToDataUrl(entry.path); } catch (e) { }
        }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'card', src, title: item.title });
      }
      else if (item.type === 'map') {
        // value should be a map path (media or markdown)
        const mapPath = item.value;
        if (!mapPath) { new (globalThis as any).Notice('No map selected'); return; }
        const entry = (this.maps || []).find((c: any) => c.path === mapPath);
        if (!entry) { new (globalThis as any).Notice('Map not found: ' + mapPath); return; }
        if (entry.path && entry.path.toLowerCase().endsWith('.md')) {
          // Render the note as HTML into the popout
          const file: any = this.app.vault.getAbstractFileByPath(entry.path);
          if (!file) { new (globalThis as any).Notice('Map note not found: ' + entry.path); return; }
          const content = await this.app.vault.read(file);
          this.openPopout(true);
          const div = document.createElement('div');
          await MarkdownRenderer.renderMarkdown(content, div, file.path, this);
          await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'showHTML', html: div.innerHTML, title: item.title });
        } else {
          // media map
          let src = entry.src;
          try { if (entry.path) src = await this._convertFileToDataUrl(entry.path); } catch (e) { }
          this.openPopout(true);
          await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'map', src, title: item.title });
        }
      }
      else if (item.type === 'note') {
        // Project a note from any folder - with Player/DM info filtering
        const notePath = item.value;
        if (!notePath) { new (globalThis as any).Notice('No note selected'); return; }
        const file: any = this.app.vault.getAbstractFileByPath(notePath);
        if (!file) { new (globalThis as any).Notice('Note not found: ' + notePath); return; }
        
        const rawContent = await this.app.vault.read(file);
        const noteDir = (file.parent && file.parent.path) ? file.parent.path : '';
        
        // Parse the note into image and text sections
        const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, this.settings.showPlayerInfo || false);
        
        // Resolve ![[image]] and ![[video]] links in image content
        const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, noteDir);
        
        // Render image/video part
        const imageDiv = document.createElement('div');
        await MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
        const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
        
        // Render player info part if present
        let inlinedPlayerInfo = '';
        if (playerInfoContent.trim()) {
          const infoDiv = document.createElement('div');
          await MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
          inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
        }
        
        // Build combined HTML with special layout (without player info - we send that separately)
        const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, '');
        
        // Open popout and wait for ready
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ 
          plugin: 'vtt-card-display', 
          type: 'showHTML', 
          html: combinedHtml, 
          title: item.title || file.basename,
          playerInfo: inlinedPlayerInfo || ''
        });
      }
    } catch (e: any) { new Notice('Error projecting item: ' + (e && e.message)); }
  }

  async projectCurrentFileAsRendered() {
    const file: any = this.app.workspace.getActiveFile();
    if (!file) { new Notice('No active file'); return; }
    const content = await this.app.vault.read(file);
    // Open the popout immediately to preserve the user gesture (avoid popup blockers)
    this.openPopout(true);
    const div = document.createElement('div');
    await MarkdownRenderer.renderMarkdown(content, div, file.path, this);
    setTimeout(async () => {
      const selectors = (this.settings.statblockSelectors && this.settings.statblockSelectors.trim())
        ? this.settings.statblockSelectors.split(',').map((s: string) => s.trim()).filter(Boolean)
        : ['.statblock', '.stat-block', '.quickmonster', '.qm', '.statblock-render', '.statblock-container'];
      let found: HTMLElement | null = null;
      for (const s of selectors) {
        try {
          const el = div.querySelector(s) as HTMLElement;
          if (el) { found = el; break; }
        } catch (e) { /* invalid selector - ignore */ }
      }

      let html: string;
      if (found && found.innerHTML) {
        html = found.outerHTML;
      } else {
        // Fallback: look for fenced statblock code block in the source markdown
        const codeMatch = content.match(/```(?:statblock|stat-block)\n([\s\S]*?)```/i);
        if (codeMatch) {
          const tmp = document.createElement('div');
          await MarkdownRenderer.renderMarkdown(codeMatch[0], tmp, file.path, this);
          html = tmp.innerHTML || div.innerHTML;
        } else {
          html = div.innerHTML;
        }
      }

      this.openPopout(true);
      const inlined = await this._inlineResourcesInHtml(html);
      await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'showHTML', html: inlined, title: file.basename });
    }, 120);
  }

  /** Wait for popout window to be ready and send a message */
  async _sendToPopoutWhenReady(message: any, maxWaitMs: number = 2000): Promise<boolean> {
    
    const startTime = Date.now();
    const checkInterval = 50;
    
    while (Date.now() - startTime < maxWaitMs) {
      if (this.popoutWindow && !this.popoutWindow.closed) {
        try {
          
          this.popoutWindow.postMessage(message, '*');
          // Set suppress flag to prevent requestCurrent from overwriting
          (this as any)._suppressNextRequest = true;
          setTimeout(() => { (this as any)._suppressNextRequest = false; }, 500);
          return true;
        } catch (e) {
          
        }
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return false;
  }

  /**
   * Project any note file as a map/note to the popout display.
   * This works for any note in the vault, not just registered maps.
   * Used by the ```vtt-project``` code block.
   * @param notePath Path to the note file
   */
  async projectNoteByPath(notePath: string) {
    
    const file: any = this.app.vault.getAbstractFileByPath(notePath);
    if (!file) { 
      new (globalThis as any).Notice('Note not found: ' + notePath); 
      return; 
    }
    
    const rawContent = await this.app.vault.read(file);
    
    
    
    const noteDir = (file.parent && file.parent.path) ? file.parent.path : '';
    
    // Get title from filename without extension
    const title = file.basename || notePath.split('/').pop()?.replace('.md', '') || 'Note';
    
    // Parse the note into image and text sections
    const showPlayerInfo = this.settings.showPlayerInfo ?? true; // Default to true if not set
    
    const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, showPlayerInfo);
    
    
    
    
    
    // Resolve ![[image]] and ![[video]] links in image content
    const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, noteDir);
    
    
    
    
    
    // Render image/video part
    const imageDiv = document.createElement('div');
    await MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
    
    
    const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
    
    
    
    // Render player info part if present
    let inlinedPlayerInfo = '';
    if (playerInfoContent.trim()) {
      const infoDiv = document.createElement('div');
      await MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
      inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
    }
    
    // Build combined HTML with special layout (without player info - we send that separately)
    const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, '');
    
    // Open popout and wait for it to be ready before sending
    this.openPopout(true);
    await this._sendToPopoutWhenReady({ 
      plugin: 'vtt-card-display', 
      type: 'showHTML', 
      html: combinedHtml, 
      title,
      playerInfo: inlinedPlayerInfo || ''
    });
    (this as any)._suppressNextRequest = true; 
    setTimeout(() => { (this as any)._suppressNextRequest = false; }, 1000);
  }

  async projectMapByPath(mapPath: string) {
    const entry = (this.maps || []).find((m: any) => m.path === mapPath);
    if (!entry) { new (globalThis as any).Notice('Map not found: ' + mapPath); return; }
    if (entry.path && entry.path.toLowerCase().endsWith('.md')) {
      const file: any = this.app.vault.getAbstractFileByPath(entry.path);
      if (!file) { new (globalThis as any).Notice('Map note not found: ' + entry.path); return; }
      const rawContent = await this.app.vault.read(file);
      const mapDir = (file.parent && file.parent.path) ? file.parent.path : '';
      
      // Parse the note into image and text sections (same as note projection)
      const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, this.settings.showPlayerInfo || false);
      
      // Resolve ![[image]] and ![[video]] links in image content
      const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, mapDir);
      
      
      
      // Render image/video part
      const imageDiv = document.createElement('div');
      await MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
      const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
      
      // Render player info part if present
      let inlinedPlayerInfo = '';
      if (playerInfoContent.trim()) {
        const infoDiv = document.createElement('div');
        await MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
        inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
      }
      
      // Build combined HTML with special layout (without player info - we send that separately)
      const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, '');
      
      
      
      // Open popout and wait for it to be ready before sending
      this.openPopout(true);
      await this._sendToPopoutWhenReady({ 
        plugin: 'vtt-card-display', 
        type: 'showHTML', 
        html: combinedHtml, 
        title: entry.title,
        playerInfo: inlinedPlayerInfo || ''
      });
      (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 1000);
    } else {
      // Image/video map
      let src = entry.src;
      
      // Check if this is an in-app popout (can use app:// URLs directly)
      const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
      
      // For in-app popouts, we can use app:// URLs directly
      if (isInAppPopout && src && src.startsWith('app://')) {
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'map', src, title: entry.title });
        (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 1000);
        return;
      }
      
      // For external popouts, convert to data URL
      try { 
        if (entry.path) {
          src = await this._convertFileToDataUrl(entry.path);
        }
      } catch (e) { }
      
      // Open popout and wait for it to be ready before sending
      this.openPopout(true);
      await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'map', src, title: entry.title });
      (this as any)._suppressNextRequest = true; setTimeout(() => { (this as any)._suppressNextRequest = false; }, 1000);
    }
  }

  async projectFirstImageInCurrentFile() {
    const file: any = this.app.workspace.getActiveFile();
    if (!file) { new Notice('No active file'); return; }
    const md = await this.app.vault.read(file);
    const m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (!m) { new (globalThis as any).Notice('No image found in note'); return; }
    const imgPath = m[1];
    const target = this.app.vault.getAbstractFileByPath(imgPath) || this.app.vault.getAbstractFileByPath((file.parent && file.parent.path ? file.parent.path + '/' : '') + imgPath);
    if (!target) { new (globalThis as any).Notice('Image not found: ' + imgPath); return; }
    let src = this.app.vault.getResourcePath(target);
    // Convert to data URL for external popout
    try { src = await this._convertFileToDataUrl((target as any).path); } catch (e) { }
    this.openPopout(true);
    await this._sendToPopoutWhenReady({ plugin: 'vtt-card-display', type: 'show', kind: 'image', src, title: file.basename });
  }

  async savePopoutPosition() {
    if (!this.popoutWindow || this.popoutWindow.closed) { new (globalThis as any).Notice('No popout open'); return; }
    try {
      const left = typeof (this.popoutWindow as any).screenX !== 'undefined' ? (this.popoutWindow as any).screenX : (this.popoutWindow as any).screenLeft || 0;
      const top = typeof (this.popoutWindow as any).screenY !== 'undefined' ? (this.popoutWindow as any).screenY : (this.popoutWindow as any).screenTop || 0;
      const width = (this.popoutWindow as any).outerWidth || (this.popoutWindow as any).innerWidth || this.settings.popoutWidth;
      const height = (this.popoutWindow as any).outerHeight || (this.popoutWindow as any).innerHeight || this.settings.popoutHeight;
      this.settings.popoutLeft = left; this.settings.popoutTop = top; this.settings.popoutWidth = width; this.settings.popoutHeight = height;
      await this.saveData(this.settings);
      new (globalThis as any).Notice('Saved popout position');
    } catch (e) { new (globalThis as any).Notice('Error saving popout position'); }
  }

  async movePopoutToSecondMonitor() {
    try {
      const left = (window.screen && window.screen.width) ? (window.screen.width + 10) : (this.settings.popoutLeft + 1920);
      this.settings.popoutLeft = left;
      await this.saveData(this.settings);
      if (this.popoutWindow && !this.popoutWindow.closed && typeof (this.popoutWindow as any).moveTo === 'function') (this.popoutWindow as any).moveTo(this.settings.popoutLeft, this.settings.popoutTop);
      new (globalThis as any).Notice('Moved popout position to approx second monitor');
    } catch (e) { new (globalThis as any).Notice('Could not move popout'); }
  }

  async openViewerPane() {
    try {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: 'vtt-card-view', active: true });
      this.app.workspace.revealLeaf(leaf);
    } catch (e) { }
  }

  /**
   * Open a modal to search for D&D monster images
   */
  openMonsterImageSearch() {
    new MonsterImageSearchModal(this.app, this).open();
  }

  /**
   * Open a modal to search for battle maps
   */
  openBattleMapSearch() {
    new BattleMapSearchModal(this.app, this).open();
  }

  /**
   * Search for monster images using multiple sources
   */
  async searchMonsterImages(monsterName: string): Promise<{ url: string; source: string; title: string }[]> {
    const results: { url: string; source: string; title: string }[] = [];
    
    try {
      // Run searches in parallel for speed - use imported functions
      const [localResults, dndBeyondResults, fandomResults, artStationResults, deviantArtResults, redditResults] = await Promise.all([
        searchLocalVault(this.app.vault, monsterName),
        searchDndBeyond(monsterName),
        searchFandomWikis(monsterName),
        searchArtStation(monsterName),
        searchDeviantArt(monsterName),
        searchReddit(monsterName),
      ]);
      
      // Add results in priority order (local first, then online)
      results.push(...localResults);
      results.push(...dndBeyondResults);
      results.push(...fandomResults);
      results.push(...artStationResults);
      results.push(...deviantArtResults);
      results.push(...redditResults);
      
    } catch (e) {
      
    }
    
    // Remove duplicates
    return deduplicateResults(results);
  }

  /**
   * Project a monster image directly to the popout
   */
  async projectMonsterImage(imageUrl: string, monsterName: string) {
    try {
      // Try to fetch and convert to data URL for better compatibility
      let src = imageUrl;
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          src = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        
      }
      
      // Open popout with suppression to prevent requestCurrent from overwriting
      this.openPopout(true);
      
      // Force send to popout - use _sendToPopoutWhenReady to handle timing
      const message = { 
        plugin: 'vtt-card-display', 
        type: 'show', 
        kind: 'image', 
        src, 
        title: monsterName 
      };
      
      // Always use _sendToPopoutWhenReady for reliable delivery
      
      await this._sendToPopoutWhenReady(message);
      
    } catch (e) {
      
      new Notice('Failed to project monster image');
    }
  }

  /**
   * Download and save a monster image to the vault
   * Uses Obsidian's requestUrl to bypass CORS restrictions
   */
  async saveMonsterImage(imageUrl: string, monsterName: string): Promise<string | null> {
    try {
      // Use Obsidian's requestUrl to bypass CORS
      const response = await requestUrl({ url: imageUrl, method: 'GET' });
      
      if (!response.arrayBuffer || response.arrayBuffer.byteLength === 0) {
        throw new Error('Could not fetch image');
      }
      
      const arrayBuffer = response.arrayBuffer;
      const contentType = (response.headers['content-type'] || '').toLowerCase();
      
      // First try to get extension from URL
      let ext = '';
      const urlLower = imageUrl.toLowerCase();
      const urlMatch = urlLower.match(/\.([a-z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        const urlExt = urlMatch[1];
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExt)) {
          ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
        }
      }
      
      // If no valid extension from URL, determine from content-type
      if (!ext) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          ext = 'jpg';
        } else if (contentType.includes('gif')) {
          ext = 'gif';
        } else if (contentType.includes('webp')) {
          ext = 'webp';
        } else {
          ext = 'png';
        }
      }
      
      // Create filename (allow German umlauts)
      const safeName = monsterName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, '').trim().substring(0, 50) || 'monster';
      const safeFileName = safeName.replace(/\s+/g, '_').toLowerCase();
      const timestamp = Date.now();
      const fileName = `${safeFileName}_${timestamp}.${ext}`;
      
      // Save to Cards folder (create images subfolder if needed)
      const cardsFolder = this.settings.folderPath || 'Cards';
      const folderPath = `${cardsFolder}/images`;
      const filePath = `${folderPath}/${fileName}`;
      
      // Create folders if needed
      try {
        const folder = this.app.vault.getAbstractFileByPath(cardsFolder);
        if (!folder) {
          await this.app.vault.createFolder(cardsFolder);
        }
      } catch (e) { /* folder might exist */ }
      
      try {
        const imagesFolder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!imagesFolder) {
          await this.app.vault.createFolder(folderPath);
        }
      } catch (e) { /* folder might exist */ }
      
      // Save file
      await this.app.vault.createBinary(filePath, new Uint8Array(arrayBuffer));
      new Notice(`Saved: ${filePath}`);
      
      // Reload cards to include the new image
      await this.loadCards();
      
      return filePath;
    } catch (e) {
      console.error('Failed to save monster image:', e);
      new Notice('Failed to save monster image - CORS or network error');
      return null;
    }
  }

  /**
   * Search for battle maps from various sources
   * @param query Search query
   * @param animatedOnly If true, only return animated maps (GIF, MP4, WebM)
   */
  async searchBattleMaps(query: string, animatedOnly: boolean = false): Promise<Array<{url: string, title: string, source: string, thumbnail?: string}>> {
    const results: Array<{url: string, title: string, source: string, thumbnail?: string}> = [];
    
    // Search multiple sources in parallel
    const searches = await Promise.allSettled([
      this._searchRedditBattlemaps(query, animatedOnly),
      this._searchRedditAnimatedMaps(query, animatedOnly), // Additional animated search
      this._search2MinuteTabletop(query, animatedOnly), // 2-Minute Tabletop
      this._searchDynamicDungeons(query, animatedOnly), // Dynamic Dungeons for animated
      this._searchDeviantArtMaps(query, animatedOnly),
      this._searchImgurMaps(query, animatedOnly),
    ]);
    
    for (const result of searches) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(...result.value);
      }
    }
    
    // Remove duplicates based on URL
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  /**
   * Additional search specifically for animated battle maps
   */
  async _searchRedditAnimatedMaps(query: string, animatedOnly: boolean): Promise<Array<{url: string, title: string, source: string, thumbnail?: string}>> {
    // Only run this search when looking for animated content
    if (!animatedOnly) return [];
    
    const results: Array<{url: string, title: string, source: string, thumbnail?: string}> = [];
    try {
      // Search multiple animated-focused queries
      const searches = [
        `${query} animated`,
        `${query} gif`,
        `animated battle map ${query}`,
      ];
      
      for (const searchTerms of searches) {
        const searchQuery = encodeURIComponent(searchTerms);
        const url = `https://www.reddit.com/r/battlemaps+dndmaps+dungeondraft/search.json?q=${searchQuery}&restrict_sr=1&limit=25&sort=top&t=year`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const posts = data?.data?.children || [];
          
          for (const post of posts) {
            const postData = post.data;
            if (!postData) continue;
            
            let imageUrl = '';
            let thumbnail = '';
            let isAnimated = false;
            
            // Get thumbnail for preview
            if (postData.preview?.images?.[0]?.source?.url) {
              thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
            } else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
              thumbnail = postData.thumbnail;
            }
            
            // Check for video content
            if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
              isAnimated = true;
            } else if (postData.url && /\.gif$/i.test(postData.url)) {
              imageUrl = postData.url;
              isAnimated = true;
            } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
              imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, '&');
              isAnimated = true;
            } else if (postData.preview?.images?.[0]?.variants?.gif?.source?.url) {
              imageUrl = postData.preview.images[0].variants.gif.source.url.replace(/&amp;/g, '&');
              isAnimated = true;
            }
            
            if (isAnimated && imageUrl) {
              results.push({
                url: imageUrl,
                title: postData.title || 'Animated Battle Map',
                source: 'Reddit (Animated)',
                thumbnail: thumbnail || undefined
              });
            }
          }
        }
      }
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Search Reddit r/battlemaps for map images
   * @param animatedOnly If true, search for animated maps only
   */
  async _searchRedditBattlemaps(query: string, animatedOnly: boolean = false): Promise<Array<{url: string, title: string, source: string, thumbnail?: string}>> {
    const results: Array<{url: string, title: string, source: string, thumbnail?: string}> = [];
    try {
      // Build search query - for animated, search with "animated" keyword and sort by top
      const searchTerms = animatedOnly 
        ? `${query} animated`
        : `${query} battle map`;
      const searchQuery = encodeURIComponent(searchTerms);
      
      // Search subreddits - include animated-focused subreddits when searching for animated
      const subreddit = animatedOnly ? 'battlemaps+dndmaps' : 'battlemaps';
      // For animated, sort by top of all time to get better results
      const sortParam = animatedOnly ? 'top&t=all' : 'relevance';
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchQuery}&restrict_sr=1&limit=50&sort=${sortParam}`;
      
      
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        
        
        for (const post of posts) {
          const postData = post.data;
          if (!postData) continue;
          
          // Check for direct image/video URLs
          let imageUrl = '';
          let isAnimated = false;
          
          const isAnimatedUrl = (url: string) => /\.(gif|mp4|webm|gifv)$/i.test(url) || url.includes('v.redd.it');
          const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|mp4|webm|gifv)$/i.test(url);
          
          // Check for video content (Reddit hosted videos) - these are animated!
          if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
            imageUrl = postData.media.reddit_video.fallback_url;
            isAnimated = true;
          } else if (postData.url && postData.url.includes('v.redd.it')) {
            // v.redd.it video - try to get the fallback URL
            if (postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
            } else {
              // Try secure_media as fallback
              imageUrl = postData.secure_media?.reddit_video?.fallback_url || '';
            }
            isAnimated = true;
            
          } else if (postData.url && /\.gif$/i.test(postData.url)) {
            // Direct GIF URL
            imageUrl = postData.url;
            isAnimated = true;
            
          } else if (postData.url && isImageUrl(postData.url)) {
            // Handle gifv -> mp4 conversion for imgur
            if (postData.url.endsWith('.gifv')) {
              imageUrl = postData.url.replace('.gifv', '.mp4');
              isAnimated = true;
            } else {
              imageUrl = postData.url;
              isAnimated = isAnimatedUrl(postData.url);
            }
          } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
            // Reddit's mp4 variant - this is animated
            imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, '&');
            isAnimated = true;
            
          } else if (postData.preview?.images?.[0]?.variants?.gif?.source?.url) {
            // Reddit's gif variant - this is animated
            imageUrl = postData.preview.images[0].variants.gif.source.url.replace(/&amp;/g, '&');
            isAnimated = true;
            
          } else if (!animatedOnly) {
            // Only try static fallbacks if not searching for animated only
            if (postData.preview?.images?.[0]?.source?.url) {
              imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
            } else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
              if (postData.url_overridden_by_dest && isImageUrl(postData.url_overridden_by_dest)) {
                imageUrl = postData.url_overridden_by_dest;
              }
            }
          }
          
          // Get thumbnail for videos (preview image)
          let thumbnail = '';
          if (postData.preview?.images?.[0]?.source?.url) {
            thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
          } else if (postData.thumbnail && postData.thumbnail.startsWith('http') && postData.thumbnail !== 'self' && postData.thumbnail !== 'default') {
            thumbnail = postData.thumbnail;
          }
          
          // Filter for animated only if requested
          if (animatedOnly && !isAnimated) {
            
            continue;
          }
          
          if (imageUrl) {
            
            results.push({
              url: imageUrl,
              title: postData.title || 'Battle Map',
              source: isAnimated ? 'Reddit (Animated)' : 'Reddit r/battlemaps',
              thumbnail: (isAnimated && thumbnail) ? thumbnail : undefined
            });
          }
        }
      }
      
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Search DeviantArt for battle maps
   * @param animatedOnly If true, only return animated content
   */
  /**
   * Search 2-Minute Tabletop for battle maps
   * Popular battle map creator site
   */
  async _search2MinuteTabletop(query: string, animatedOnly: boolean): Promise<Array<{url: string, title: string, source: string, thumbnail?: string}>> {
    // 2-Minute Tabletop mostly has static maps
    if (animatedOnly) return [];
    
    const results: Array<{url: string, title: string, source: string, thumbnail?: string}> = [];
    try {
      // Search via their site's search or via Google site search
      const searchTerms = encodeURIComponent(`site:2minutetabletop.com ${query} battle map`);
      const url = `https://www.google.com/search?q=${searchTerms}&tbm=isch`;
      
      // Alternative: try to fetch from their Patreon/main site RSS or search
      // Since direct scraping is unreliable, we search Reddit for 2minutetabletop mentions
      const redditUrl = `https://www.reddit.com/r/battlemaps/search.json?q=${encodeURIComponent(query + ' 2minutetabletop OR 2-minute')}&restrict_sr=1&limit=15&sort=top&t=year`;
      
      const response = await fetch(redditUrl, {
        headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        
        for (const post of posts) {
          const postData = post.data;
          if (!postData) continue;
          
          // Look for image URLs
          let imageUrl = '';
          if (postData.url && /\.(jpg|jpeg|png|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
          }
          
          if (imageUrl && (postData.title?.toLowerCase().includes('2minute') || postData.title?.toLowerCase().includes('2-minute') || postData.url?.includes('2minutetabletop'))) {
            results.push({
              url: imageUrl,
              title: postData.title || 'Battle Map',
              source: '2-Minute Tabletop',
              thumbnail: postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : undefined
            });
          }
        }
      }
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Search Dynamic Dungeons for animated battle maps
   * Known source for animated/video battle maps
   */
  async _searchDynamicDungeons(query: string, animatedOnly: boolean): Promise<Array<{url: string, title: string, source: string, thumbnail?: string}>> {
    const results: Array<{url: string, title: string, source: string, thumbnail?: string}> = [];
    try {
      // Search Reddit for dynamic dungeons animated maps
      const searchTerms = animatedOnly 
        ? `${query} dynamic dungeons animated OR video`
        : `${query} dynamic dungeons`;
      const redditUrl = `https://www.reddit.com/r/battlemaps+dndmaps+FoundryVTT/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&limit=20&sort=top&t=year`;
      
      const response = await fetch(redditUrl, {
        headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        
        for (const post of posts) {
          const postData = post.data;
          if (!postData) continue;
          
          let imageUrl = '';
          let thumbnail = '';
          let isAnimated = false;
          
          // Get thumbnail
          if (postData.preview?.images?.[0]?.source?.url) {
            thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
          } else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
            thumbnail = postData.thumbnail;
          }
          
          // Check for video/animated content
          if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
            imageUrl = postData.media.reddit_video.fallback_url;
            isAnimated = true;
          } else if (postData.url && /\.gif$/i.test(postData.url)) {
            imageUrl = postData.url;
            isAnimated = true;
          } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
            imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, '&');
            isAnimated = true;
          } else if (!animatedOnly && postData.url && /\.(jpg|jpeg|png|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (!animatedOnly && postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
          }
          
          // Only add if relevant to dynamic dungeons style content
          const title = postData.title?.toLowerCase() || '';
          const isDynamic = title.includes('dynamic') || title.includes('animated') || title.includes('video') || postData.url?.includes('dynamic');
          
          if (imageUrl && (!animatedOnly || isAnimated) && (isDynamic || isAnimated)) {
            results.push({
              url: imageUrl,
              title: postData.title || 'Animated Battle Map',
              source: 'Dynamic Dungeons',
              thumbnail: thumbnail || undefined
            });
          }
        }
      }
      
      // Also search for living maps / animated battlemaps subreddit
      if (animatedOnly) {
        const livingMapsUrl = `https://www.reddit.com/r/LivingBattleMaps+animatedbattlemaps/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=15&sort=top&t=year`;
        
        const response2 = await fetch(livingMapsUrl, {
          headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
        });
        
        if (response2.ok) {
          const data = await response2.json();
          const posts = data?.data?.children || [];
          
          for (const post of posts) {
            const postData = post.data;
            if (!postData) continue;
            
            let imageUrl = '';
            let thumbnail = '';
            
            if (postData.preview?.images?.[0]?.source?.url) {
              thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
            } else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
              thumbnail = postData.thumbnail;
            }
            
            if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
            } else if (postData.url && /\.gif$/i.test(postData.url)) {
              imageUrl = postData.url;
            } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
              imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, '&');
            }
            
            if (imageUrl) {
              results.push({
                url: imageUrl,
                title: postData.title || 'Animated Battle Map',
                source: 'Living Battle Maps',
                thumbnail: thumbnail || undefined
              });
            }
          }
        }
      }
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Search DeviantArt for battle maps
   * @param animatedOnly If true, only return animated content
   */
  async _searchDeviantArtMaps(query: string, animatedOnly: boolean = false): Promise<Array<{url: string, title: string, source: string}>> {
    const results: Array<{url: string, title: string, source: string}> = [];
    
    // DeviantArt doesn't have many animated battle maps, skip if animated only
    if (animatedOnly) {
      return results;
    }
    
    try {
      const searchQuery = encodeURIComponent(query + ' battlemap battle map dnd rpg');
      const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=${searchQuery}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const items = doc.querySelectorAll('item');
        
        items.forEach((item, index) => {
          if (index >= 15) return; // Limit results
          
          const title = item.querySelector('title')?.textContent || 'Battle Map';
          // Look for media:content or media:thumbnail
          const mediaContent = item.querySelector('content[url]');
          const mediaThumbnail = item.querySelector('thumbnail[url]');
          
          let imageUrl = '';
          if (mediaContent) {
            imageUrl = mediaContent.getAttribute('url') || '';
          } else if (mediaThumbnail) {
            imageUrl = mediaThumbnail.getAttribute('url') || '';
          }
          
          // Try to get larger image from description
          const description = item.querySelector('description')?.textContent || '';
          const imgMatch = description.match(/src="([^"]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
          
          if (imageUrl) {
            results.push({
              url: imageUrl,
              title: title,
              source: 'DeviantArt'
            });
          }
        });
      }
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Search Imgur for battle maps
   * @param animatedOnly If true, only return animated content (GIF/MP4)
   */
  async _searchImgurMaps(query: string, animatedOnly: boolean = false): Promise<Array<{url: string, title: string, source: string}>> {
    const results: Array<{url: string, title: string, source: string}> = [];
    try {
      // Add animated keyword if searching for animated
      const searchTerms = animatedOnly 
        ? query + ' animated battlemap battle map gif'
        : query + ' battlemap battle map dnd';
      const searchQuery = encodeURIComponent(searchTerms);
      const url = `https://imgur.com/search?q=${searchQuery}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        // Look for image IDs in the response
        const idMatches = html.matchAll(/data-id="([a-zA-Z0-9]+)"/g);
        let count = 0;
        for (const match of idMatches) {
          if (count >= 10) break;
          const id = match[1];
          if (id) {
            results.push({
              url: `https://i.imgur.com/${id}.jpg`,
              title: `Map ${id}`,
              source: 'Imgur'
            });
            count++;
          }
        }
      }
    } catch (e) {
      
    }
    return results;
  }

  /**
   * Project a battle map image directly to the popout
   */
  async projectBattleMapImage(imageUrl: string, mapName: string) {
    try {
      // Use Obsidian's requestUrl to bypass CORS
      let src = imageUrl;
      
      try {
        const response = await requestUrl({ url: imageUrl, method: 'GET' });
        if (response.arrayBuffer && response.arrayBuffer.byteLength > 0) {
          // Convert to base64 data URL
          const contentType = response.headers['content-type'] || 'image/png';
          const base64 = arrayBufferToBase64(response.arrayBuffer);
          src = `data:${contentType};base64,${base64}`;
          
        }
      } catch (e) {
        
      }
      
      this.openPopout(true);
      
      const message = { 
        plugin: 'vtt-card-display', 
        type: 'show', 
        kind: 'map', 
        src, 
        title: mapName 
      };
      
      
      await this._sendToPopoutWhenReady(message);
      
    } catch (e) {
      
      new Notice('Failed to project battle map');
    }
  }

  /**
   * Download and save a battle map image to the vault and create a map note
   */
  async saveBattleMapImage(imageUrl: string, mapName: string): Promise<string | null> {
    try {
      
      
      // Use Obsidian's requestUrl to bypass CORS
      const response = await requestUrl({ url: imageUrl, method: 'GET' });
      
      if (!response.arrayBuffer || response.arrayBuffer.byteLength === 0) {
        throw new Error('Could not fetch image');
      }
      
      
      const contentType = (response.headers['content-type'] || '').toLowerCase();
      const arrayBuffer = response.arrayBuffer;
      
      // First try to get extension from URL
      let ext = '';
      const urlLower = imageUrl.toLowerCase();
      const urlMatch = urlLower.match(/\.([a-z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        const urlExt = urlMatch[1];
        // Validate known extensions
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'gifv'].includes(urlExt)) {
          ext = urlExt === 'jpeg' ? 'jpg' : urlExt === 'gifv' ? 'mp4' : urlExt;
        }
      }
      
      // If no valid extension from URL, determine from content-type
      if (!ext) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          ext = 'jpg';
        } else if (contentType.includes('gif')) {
          ext = 'gif';
        } else if (contentType.includes('webp')) {
          ext = 'webp';
        } else if (contentType.includes('mp4') || contentType.includes('video/mp4')) {
          ext = 'mp4';
        } else if (contentType.includes('webm') || contentType.includes('video/webm')) {
          ext = 'webm';
        } else if (contentType.includes('video')) {
          ext = 'mp4'; // Default video to mp4
        } else {
          ext = 'png'; // Default image to png
        }
      }
      
      
      
      // Clean up the name for file system (allow German umlauts)
      const safeName = (mapName || 'Battle Map').replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, '').trim().substring(0, 50) || 'Battle_Map';
      const safeFileName = safeName.replace(/\s+/g, '_').toLowerCase();
      const timestamp = Date.now();
      const imageFileName = `${safeFileName}_${timestamp}.${ext}`;
      
      // Save image to Maps/_resources folder
      const folderPath = this.settings.mapsFolderPath || 'Maps';
      const resourcesPath = `${folderPath}/_resources`;
      const imageFilePath = `${resourcesPath}/${imageFileName}`;
      
      
      
      // Create folders if needed
      try {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          
          await this.app.vault.createFolder(folderPath);
        }
      } catch (e) { 
        
      }
      
      try {
        const resourcesFolder = this.app.vault.getAbstractFileByPath(resourcesPath);
        if (!resourcesFolder) {
          
          await this.app.vault.createFolder(resourcesPath);
        }
      } catch (e) { 
        
      }
      
      // Save the image file
      try {
        await this.app.vault.createBinary(imageFilePath, new Uint8Array(arrayBuffer));
        
      } catch (e: any) {
        
        throw new Error('Failed to save image: ' + (e.message || e));
      }
      
      // Create a map note with the two sections
      const noteFileName = `${safeName}.md`;
      const noteFilePath = `${folderPath}/${noteFileName}`;
      
      // Check if note already exists, add timestamp if so
      let finalNotePath = noteFilePath;
      const existingNote = this.app.vault.getAbstractFileByPath(noteFilePath);
      if (existingNote) {
        finalNotePath = `${folderPath}/${safeName}_${timestamp}.md`;
      }
      
      
      
      // Create the note content with the image and sections
      // Reference image from _resources subfolder (no title, just image and sections)
      const noteContent = `![[_resources/${imageFileName}]]

# Player Infos

*Beschreibung für die Spieler...*



# DM Info

**Quelle:** ${mapName}

*Notizen für den DM...*

`;
      
      try {
        await this.app.vault.create(finalNotePath, noteContent);
        
      } catch (e: any) {
        
        // Note creation failed but image was saved
        new Notice(`Image saved but note creation failed: ${imageFilePath}`);
        return imageFilePath;
      }
      
      new Notice(`Map saved: ${finalNotePath}`);
      
      // Reload maps to include the new one
      await this.loadMaps();
      
      // Open the new note
      try {
        const newFile = this.app.vault.getAbstractFileByPath(finalNotePath);
        if (newFile) {
          await this.app.workspace.getLeaf().openFile(newFile as any);
        }
      } catch (e) {
        
      }
      
      return finalNotePath;
    } catch (e) {
      
      new Notice('Failed to save battle map');
      return null;
    }
  }

  _registerItemCommands() {
    (this.settings.items || []).forEach(it => {
      if (!it.id) return;
      if (this._registeredItemCommands.has(it.id)) return;
      try { this.addCommand({ id: `vtt-project-${it.id}`, name: `Project: ${it.title || it.id}`, callback: () => this.projectItemById(it.id) }); this._registeredItemCommands.add(it.id); } catch (e) { }
    });
  }
}

class VttCardDisplaySettingTab extends PluginSettingTab {
  plugin: VttCardDisplay;
  constructor(app: any, plugin: VttCardDisplay) { super(app, plugin); this.plugin = plugin; }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Cards folder path')
      .setDesc('Relative path in vault to images (e.g., "Cards"). Leave blank to use all images in vault.')
      .addText((text: any) => text
        .setPlaceholder('Cards')
        .setValue(this.plugin.settings.folderPath)
        .onChange(async (v: any) => {
          this.plugin.settings.folderPath = v;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.loadCards();
          await this.plugin.loadMaps();
          this.plugin.sendCurrentToPopout();
        }));

    new Setting(containerEl)
      .setName('Maps folder path')
      .setDesc('Relative path in vault to map pages and media (e.g., "Maps"). Leave blank to use all notes/media in vault.')
      .addText((text: any) => text
        .setPlaceholder('Maps')
        .setValue(this.plugin.settings.mapsFolderPath || '')
        .onChange(async (v: any) => {
          this.plugin.settings.mapsFolderPath = v;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.loadMaps();
        }));

    new Setting(containerEl)
      .setName('Popout left,top,width,height')
      .addText((text: any) => text
        .setPlaceholder('left,top,width,height')
        .setValue(`${this.plugin.settings.popoutLeft},${this.plugin.settings.popoutTop},${this.plugin.settings.popoutWidth},${this.plugin.settings.popoutHeight}`)
        .onChange(async (v: any) => {
          const [l, t, w, h] = v.split(',').map((x: any) => parseInt(x.trim()) || 0);
          this.plugin.settings.popoutLeft = l; this.plugin.settings.popoutTop = t;
          this.plugin.settings.popoutWidth = w; this.plugin.settings.popoutHeight = h;
          await this.plugin.saveData(this.plugin.settings);
        }));

    new Setting(containerEl)
      .setName('Statblock selectors')
      .setDesc('Comma-separated CSS selectors used to locate the statblock in rendered HTML (e.g. .statblock,.quickmonster).')
      .addText((text: any) => text.setPlaceholder('.statblock,.quickmonster')
        .setValue(this.plugin.settings.statblockSelectors || '')
        .onChange(async (v: any) => { this.plugin.settings.statblockSelectors = v; await this.plugin.saveData(this.plugin.settings); }));

    new Setting(containerEl)
      .setName('Show Player Info')
      .setDesc('When enabled, the "# Player Infos" section from notes will be shown in the popout. The "# DM Info" section is never shown.')
      .addToggle((toggle: any) => toggle
        .setValue(this.plugin.settings.showPlayerInfo || false)
        .onChange(async (v: any) => {
          this.plugin.settings.showPlayerInfo = v;
          await this.plugin.saveData(this.plugin.settings);
        }));

    // Grid and Fog of War Settings
    containerEl.createEl('h3', { text: 'Grid & Fog of War' });

    new Setting(containerEl)
      .setName('Default Grid Size')
      .setDesc('Default size of grid squares in pixels (10-200)')
      .addSlider((slider: any) => slider
        .setLimits(10, 200, 5)
        .setValue(this.plugin.settings.gridSize ?? 50)
        .setDynamicTooltip()
        .onChange(async (v: number) => {
          this.plugin.settings.gridSize = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Grid Color')
      .setDesc('Default color of the grid overlay')
      .addColorPicker((picker: any) => picker
        .setValue(this.plugin.settings.gridColor ?? '#ffffff')
        .onChange(async (v: string) => {
          this.plugin.settings.gridColor = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Grid Opacity')
      .setDesc('Default opacity of the grid (5-100%)')
      .addSlider((slider: any) => slider
        .setLimits(5, 100, 5)
        .setValue(Math.round((this.plugin.settings.gridOpacity ?? 0.3) * 100))
        .setDynamicTooltip()
        .onChange(async (v: number) => {
          this.plugin.settings.gridOpacity = v / 100;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Fog Reveal Size')
      .setDesc('Default brush size for revealing fog of war in pixels (10-150)')
      .addSlider((slider: any) => slider
        .setLimits(10, 150, 5)
        .setValue(this.plugin.settings.fogRevealSize ?? 30)
        .setDynamicTooltip()
        .onChange(async (v: number) => {
          this.plugin.settings.fogRevealSize = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    containerEl.createEl('h3', { text: 'Registered items (projectable)' });
    const list = containerEl.createEl('div');
    const renderList = () => {
      list.empty();
      (this.plugin.settings.items || []).forEach((it, idx) => {
        const row = list.createDiv({ cls: 'vtt-item-row' });
        row.createEl('strong', { text: it.title || it.id });
        row.createEl('div', { text: `id: ${it.id}` });
          const s = new Setting(row);
          s.addDropdown((dd: any) => dd
            .addOption('image', 'Image')
            .addOption('card', 'Card (from Cards folder)')
            .addOption('map', 'Map (from Maps folder)')
            .addOption('note', 'Note (any folder)')
            .addOption('statblock', 'Statblock (note)')
            .addOption('note-image', 'First image in note')
            .setValue(it.type || 'image')
            .onChange(async (v: any) => { it.type = v as any; await this.plugin.saveData(this.plugin.settings); renderList(); }));
          // For value: if type is 'card' or 'map', render a dropdown of available items; otherwise render a text input with file suggester
          if (it.type === 'card' || it.type === 'map') {
            s.addDropdown((dd2: any) => {
              dd2.addOption('', '-- select --');
              const itemList = it.type === 'map' ? (this.plugin.maps || []) : (this.plugin.cards || []);
              itemList.forEach((c: any) => dd2.addOption(c.path, c.path));
              dd2.setValue(it.value || '');
              dd2.onChange(async (v: any) => { it.value = v; await this.plugin.saveData(this.plugin.settings); });
            });
          } else if (it.type === 'note') {
            // For notes, show a text input but also add a button to pick from vault
            s.addText((text: any) => text.setPlaceholder('path/to/note.md').setValue(it.value || '').onChange(async (v: any) => { it.value = v; await this.plugin.saveData(this.plugin.settings); }));
            s.addButton((btn: any) => btn.setButtonText('Browse').onClick(() => {
              // Open a simple file picker modal
              const modal = new NotePickerModal(this.plugin.app, async (path: string) => {
                it.value = path;
                await this.plugin.saveData(this.plugin.settings);
                renderList();
              });
              modal.open();
            }));
          } else {
            s.addText((text: any) => text.setPlaceholder('value (path)').setValue(it.value || '').onChange(async (v: any) => { it.value = v; await this.plugin.saveData(this.plugin.settings); }));
          }
          s.addButton((bt: any) => bt.setButtonText('Delete').setWarning().onClick(async () => {
            this.plugin.settings.items!.splice(idx, 1);
            await this.plugin.saveData(this.plugin.settings);
            renderList();
          }));
      });
    };
    renderList();

    new Setting(containerEl)
      .addButton((b: any) => b.setButtonText('Add item').onClick(async () => {
        const id = `item${Date.now()}`;
        this.plugin.settings.items = this.plugin.settings.items || [];
        this.plugin.settings.items.push({ id, title: `Note ${this.plugin.settings.items.length + 1}`, type: 'note', value: '' });
        await this.plugin.saveData(this.plugin.settings);
        renderList();
        (this.plugin as any)._registerItemCommands();
      }));

    // Small helper: create a new map page in the Maps folder
    new Setting(containerEl)
      .addButton((b: any) => b.setButtonText('Create Map Page').onClick(async () => {
        const modal = new MapCreateModal(this.plugin.app, this.plugin as VttCardDisplay);
        modal.open();
      }));
  }
}

/**
 * Modal to search for D&D monster images
 */
class MonsterImageSearchModal extends Modal {
  plugin: VttCardDisplay;
  searchInput: HTMLInputElement | null = null;
  resultsContainer: HTMLElement | null = null;
  loadingEl: HTMLElement | null = null;
  
  constructor(app: any, plugin: VttCardDisplay) {
    super(app);
    this.plugin = plugin;
  }
  
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vtt-monster-search-modal');
    
    // Add styles
    const style = contentEl.createEl('style');
    style.textContent = `
      .vtt-monster-search-modal { min-width: 500px; }
      .vtt-monster-search-header { margin-bottom: 16px; }
      .vtt-monster-search-header h2 { margin: 0 0 8px 0; }
      .vtt-monster-search-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
      .vtt-monster-search-input { 
        flex: 1; 
        padding: 8px 12px; 
        border: 1px solid var(--background-modifier-border); 
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 14px;
      }
      .vtt-monster-search-btn {
        padding: 8px 16px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      }
      .vtt-monster-search-btn:hover { opacity: 0.9; }
      .vtt-monster-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .vtt-monster-results { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
      }
      .vtt-monster-result {
        border: 2px solid var(--background-modifier-border);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 150ms ease;
        background: var(--background-secondary);
      }
      .vtt-monster-result:hover {
        border-color: var(--interactive-accent);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .vtt-monster-result img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
      }
      .vtt-monster-result-info {
        padding: 8px;
      }
      .vtt-monster-result-title {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vtt-monster-result-source {
        font-size: 9px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .vtt-monster-result-actions {
        display: flex;
        gap: 4px;
        padding: 6px 8px;
        border-top: 1px solid var(--background-modifier-border);
      }
      .vtt-monster-result-actions button {
        flex: 1;
        padding: 4px 8px;
        font-size: 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .vtt-monster-action-project {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      .vtt-monster-action-save {
        background: var(--background-modifier-border);
        color: var(--text-normal);
      }
      .vtt-monster-loading {
        text-align: center;
        padding: 24px;
        color: var(--text-muted);
      }
      .vtt-monster-empty {
        text-align: center;
        padding: 24px;
        color: var(--text-muted);
      }
      .vtt-monster-tips {
        margin-top: 16px;
        padding: 12px;
        background: var(--background-secondary);
        border-radius: 6px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .vtt-monster-tips strong { color: var(--text-normal); }
    `;
    
    // Header
    const header = contentEl.createDiv({ cls: 'vtt-monster-search-header' });
    header.createEl('h2', { text: '🐉 D&D Monster Image Search' });
    header.createEl('p', { text: 'Search for monster artwork from free sources' });
    
    // Search input row
    const inputRow = contentEl.createDiv({ cls: 'vtt-monster-search-input-row' });
    this.searchInput = inputRow.createEl('input', { 
      cls: 'vtt-monster-search-input',
      attr: { 
        type: 'text', 
        placeholder: 'Enter monster name (e.g., "Beholder", "Mind Flayer", "Owlbear")...'
      }
    });
    
    const searchBtn = inputRow.createEl('button', { text: '🔍 Search', cls: 'vtt-monster-search-btn' });
    
    // Results container
    this.resultsContainer = contentEl.createDiv({ cls: 'vtt-monster-results' });
    
    // Loading indicator
    this.loadingEl = contentEl.createDiv({ cls: 'vtt-monster-loading' });
    this.loadingEl.style.display = 'none';
    this.loadingEl.textContent = '⏳ Searching...';
    
    // Tips
    const tips = contentEl.createDiv({ cls: 'vtt-monster-tips' });
    tips.innerHTML = `
      <strong>💡 Tips:</strong><br>
      • Use English monster names for best results<br>
      • Try variations: "Red Dragon", "Ancient Red Dragon", "Dragon Red"<br>
      • Click an image to see options: Project to screen or Save to vault<br>
    `;
    
    // Event handlers
    searchBtn.addEventListener('click', () => this.doSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.doSearch();
    });
    
    // Focus input
    setTimeout(() => this.searchInput?.focus(), 100);
  }
  
  async doSearch() {
    const query = this.searchInput?.value.trim();
    if (!query) {
      new Notice('Please enter a monster name');
      return;
    }
    
    if (!this.resultsContainer || !this.loadingEl) return;
    
    // Show loading
    this.resultsContainer.empty();
    this.loadingEl.style.display = 'block';
    
    try {
      const results = await this.plugin.searchMonsterImages(query);
      this.loadingEl.style.display = 'none';
      
      if (results.length === 0) {
        const empty = this.resultsContainer.createDiv({ cls: 'vtt-monster-empty' });
        empty.innerHTML = `
          <p>😕 No images found for "<strong>${query}</strong>"</p>
          <p style="font-size:11px">Try a different spelling or a more common monster name</p>
        `;
        return;
      }
      
      // Render results
      for (const result of results) {
        const card = this.resultsContainer.createDiv({ cls: 'vtt-monster-result' });
        
        const img = card.createEl('img');
        img.src = result.url;
        img.alt = result.title;
        img.onerror = () => {
          img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="40">🖼️</text></svg>';
        };
        
        const info = card.createDiv({ cls: 'vtt-monster-result-info' });
        info.createEl('div', { text: result.title, cls: 'vtt-monster-result-title', attr: { title: result.title } });
        info.createEl('div', { text: result.source, cls: 'vtt-monster-result-source' });
        
        const actions = card.createDiv({ cls: 'vtt-monster-result-actions' });
        
        const projectBtn = actions.createEl('button', { text: '🖥️ Project', cls: 'vtt-monster-action-project' });
        projectBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.plugin.projectMonsterImage(result.url, query);
          new Notice(`Projecting: ${query}`);
        });
        
        // Only show save button for non-local results (local files are already in vault)
        if (result.source !== 'Local Vault') {
          const saveBtn = actions.createEl('button', { text: '💾 Save', cls: 'vtt-monster-action-save' });
          saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Open modal to enter the name before saving
            new MonsterImageSaveModal(this.app, this.plugin, result.url, result.title || query).open();
          });
        } else {
          // Show "Already in Vault" badge for local files
          const localBadge = actions.createEl('span', { text: '✓ In Vault', cls: 'vtt-monster-action-save' });
          localBadge.style.opacity = '0.6';
          localBadge.style.cursor = 'default';
          localBadge.style.textAlign = 'center';
        }
      }
      
    } catch (e) {
      
      this.loadingEl.style.display = 'none';
      
      const error = this.resultsContainer.createDiv({ cls: 'vtt-monster-empty' });
      error.innerHTML = `<p>❌ Search failed. Please try again.</p>`;
    }
  }
  
  onClose() {
    this.contentEl.empty();
  }
}

/**
 * Modal for searching battle maps from online sources
 */
class BattleMapSearchModal extends Modal {
  plugin: VttCardDisplay;
  searchInput: HTMLInputElement | null = null;
  animatedCheckbox: HTMLInputElement | null = null;
  resultsContainer: HTMLElement | null = null;
  loadingEl: HTMLElement | null = null;
  
  constructor(app: any, plugin: VttCardDisplay) {
    super(app);
    this.plugin = plugin;
  }
  
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vtt-map-search-modal');
    // Add class to the modal container for width styling
    this.modalEl.addClass('mod-vtt-map-search');
    
    // Add styles - also target the modal container for width
    const style = contentEl.createEl('style');
    style.textContent = `
      .modal.mod-vtt-map-search {
        width: 95vw !important;
        max-width: 1400px !important;
      }
      .vtt-map-search-modal { 
        width: 100% !important; 
        max-width: 100% !important; 
        overflow: hidden !important;
      }
      .vtt-map-search-modal .modal-content {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        max-height: 80vh;
        padding: 16px;
      }
      .vtt-map-search-header { margin-bottom: 16px; }
      .vtt-map-search-header h2 { margin: 0 0 8px 0; }
      .vtt-map-search-input-row { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
      .vtt-map-search-input { 
        flex: 1; 
        min-width: 150px;
        padding: 10px 14px; 
        border: 1px solid var(--background-modifier-border); 
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 15px;
      }
      .vtt-map-search-btn {
        padding: 10px 20px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
      }
      .vtt-map-search-btn:hover { opacity: 0.9; }
      .vtt-map-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .vtt-map-results { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
        gap: 12px;
        max-height: 50vh;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 4px;
        width: 100%;
        box-sizing: border-box;
      }
      .vtt-map-result {
        border: 2px solid var(--background-modifier-border);
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: all 150ms ease;
        background: var(--background-secondary);
        position: relative;
        min-width: 0;
      }
      .vtt-map-result.animated::before {
        content: '🎬';
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1;
      }
      .vtt-map-result:hover {
        border-color: var(--interactive-accent);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .vtt-map-result img {
        width: 100%;
        height: 140px;
        object-fit: cover;
        display: block;
      }
      .vtt-map-result-info {
        padding: 8px;
      }
      .vtt-map-result-title {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vtt-map-result-source {
        font-size: 9px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .vtt-map-result-actions {
        display: flex;
        gap: 6px;
        padding: 8px 10px;
        border-top: 1px solid var(--background-modifier-border);
      }
      .vtt-map-result-actions button {
        flex: 1;
        padding: 6px 10px;
        font-size: 11px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 500;
      }
      .vtt-map-action-project {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      .vtt-map-action-save {
        background: var(--background-modifier-success);
        color: var(--text-on-accent);
      }
      .vtt-map-action-save:hover {
        opacity: 0.9;
      }
      .vtt-map-loading {
        text-align: center;
        padding: 32px;
        color: var(--text-muted);
        font-size: 16px;
      }
      .vtt-map-empty {
        text-align: center;
        padding: 32px;
        color: var(--text-muted);
      }
      .vtt-map-tips {
        margin-top: 16px;
        padding: 14px;
        background: var(--background-secondary);
        border-radius: 8px;
        font-size: 13px;
        color: var(--text-muted);
      }
      .vtt-map-tips strong { color: var(--text-normal); }
    `;
    
    // Header
    const header = contentEl.createDiv({ cls: 'vtt-map-search-header' });
    header.createEl('h2', { text: '🗺️ Battle Map Search' });
    header.createEl('p', { text: 'Search for battle maps from Reddit, DeviantArt and more' });
    
    // Search input row
    const inputRow = contentEl.createDiv({ cls: 'vtt-map-search-input-row' });
    this.searchInput = inputRow.createEl('input', { 
      cls: 'vtt-map-search-input',
      attr: { 
        type: 'text', 
        placeholder: 'Enter map type (e.g., "forest", "tavern", "dungeon", "cave")...'
      }
    });
    
    const searchBtn = inputRow.createEl('button', { text: '🔍 Search', cls: 'vtt-map-search-btn' });
    
    // Options row with animated checkbox
    const optionsRow = contentEl.createDiv({ cls: 'vtt-map-options-row' });
    optionsRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:12px;';
    
    const animatedLabel = optionsRow.createEl('label', { cls: 'vtt-map-option' });
    animatedLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;';
    this.animatedCheckbox = animatedLabel.createEl('input') as HTMLInputElement;
    this.animatedCheckbox.type = 'checkbox';
    this.animatedCheckbox.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:var(--interactive-accent);';
    animatedLabel.createEl('span', { text: '🎬 Search only animated maps (GIF/Video)' });
    
    // Results container
    this.resultsContainer = contentEl.createDiv({ cls: 'vtt-map-results' });
    
    // Loading indicator
    this.loadingEl = contentEl.createDiv({ cls: 'vtt-map-loading' });
    this.loadingEl.style.display = 'none';
    this.loadingEl.textContent = '⏳ Searching for maps...';
    
    // Tips
    const tips = contentEl.createDiv({ cls: 'vtt-map-tips' });
    tips.innerHTML = `
      <strong>💡 Tips:</strong><br>
      • Try keywords like: forest, tavern, dungeon, cave, castle, ship, city, swamp<br>
      • Add descriptors: "dark forest", "abandoned tavern", "ice cave"<br>
      • <strong>🖥️ Project</strong> — Show the map directly on the popout screen<br>
      • <strong>💾 Save</strong> — Creates a new map note with the image, Player Infos and DM Info sections<br>
      • Sources: Reddit r/battlemaps, DeviantArt, Imgur
    `;
    
    // Event handlers
    searchBtn.addEventListener('click', () => this.doSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.doSearch();
    });
    
    // Focus input
    setTimeout(() => this.searchInput?.focus(), 100);
  }
  
  async doSearch() {
    const query = this.searchInput?.value.trim();
    if (!query) {
      new Notice('Please enter a map type');
      return;
    }
    
    if (!this.resultsContainer || !this.loadingEl) return;
    
    const animatedOnly = this.animatedCheckbox?.checked || false;
    
    // Show loading
    this.resultsContainer.empty();
    this.loadingEl.style.display = 'block';
    this.loadingEl.textContent = animatedOnly ? '⏳ Searching for animated maps...' : '⏳ Searching for maps...';
    
    try {
      const results = await this.plugin.searchBattleMaps(query, animatedOnly);
      this.loadingEl.style.display = 'none';
      
      if (results.length === 0) {
        const empty = this.resultsContainer.createDiv({ cls: 'vtt-map-empty' });
        empty.innerHTML = `
          <p>😕 No ${animatedOnly ? 'animated ' : ''}maps found for "<strong>${query}</strong>"</p>
          <p style="font-size:11px">${animatedOnly ? 'Try broader terms like "forest", "cave", "dungeon"' : 'Try different keywords like "forest path", "tavern interior", "dungeon corridor"'}</p>
        `;
        return;
      }
      
      // Show result count
      const countEl = this.resultsContainer.createDiv({ cls: 'vtt-map-result-count' });
      countEl.style.cssText = 'grid-column: 1/-1; padding: 8px 0; font-size: 12px; color: var(--text-muted);';
      countEl.textContent = `Found ${results.length} ${animatedOnly ? 'animated ' : ''}map${results.length !== 1 ? 's' : ''}`;
      
      // Render results
      for (const result of results) {
        const isAnimated = result.source.includes('Animated');
        const card = this.resultsContainer.createDiv({ cls: `vtt-map-result${isAnimated ? ' animated' : ''}` });
        
        const img = card.createEl('img');
        // Use thumbnail if available (for videos), otherwise use URL directly
        img.src = result.thumbnail || result.url;
        img.alt = result.title;
        img.onerror = () => {
          // Try the actual URL if thumbnail fails
          if (result.thumbnail && img.src === result.thumbnail) {
            img.src = result.url;
          } else {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="40">🗺️</text></svg>';
          }
        };
        
        const info = card.createDiv({ cls: 'vtt-map-result-info' });
        info.createEl('div', { text: result.title, cls: 'vtt-map-result-title', attr: { title: result.title } });
        info.createEl('div', { text: result.source, cls: 'vtt-map-result-source' });
        
        const actions = card.createDiv({ cls: 'vtt-map-result-actions' });
        
        const projectBtn = actions.createEl('button', { text: '🖥️ Project', cls: 'vtt-map-action-project' });
        projectBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.plugin.projectBattleMapImage(result.url, result.title);
          new Notice(`Projecting: ${result.title}`);
        });
        
        const saveBtn = actions.createEl('button', { text: '💾 Save', cls: 'vtt-map-action-save' });
        saveBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          // Open modal to enter the note name before saving
          new BattleMapSaveModal(this.app, this.plugin, result.url, result.title).open();
        });
      }
      
    } catch (e) {
      
      this.loadingEl.style.display = 'none';
      
      const error = this.resultsContainer.createDiv({ cls: 'vtt-map-empty' });
      error.innerHTML = `<p>❌ Search failed. Please try again.</p>`;
    }
  }
  
  onClose() {
    this.contentEl.empty();
  }
}

// Modal to enter name before saving a battle map
class BattleMapSaveModal extends Modal {
  nameInput!: HTMLInputElement;
  
  constructor(
    app: any, 
    private plugin: VttCardDisplay, 
    private imageUrl: string, 
    private originalTitle: string
  ) { 
    super(app); 
  }
  
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vtt-map-save-modal');
    
    // Header
    contentEl.createEl('h2', { text: '💾 Save Battle Map' });
    
    // Preview image
    const previewContainer = contentEl.createDiv({ cls: 'vtt-map-save-preview' });
    previewContainer.style.cssText = 'margin-bottom:16px;text-align:center;';
    
    const previewImg = previewContainer.createEl('img');
    previewImg.src = this.imageUrl;
    previewImg.style.cssText = 'max-width:100%;max-height:200px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    previewImg.onerror = () => {
      previewImg.style.display = 'none';
    };
    
    // Name input section
    const inputSection = contentEl.createDiv({ cls: 'vtt-modal-section' });
    inputSection.style.cssText = 'margin-bottom:16px;';
    
    const label = inputSection.createEl('label', { text: 'Map Name' });
    label.style.cssText = 'display:block;margin-bottom:6px;font-weight:500;';
    
    this.nameInput = inputSection.createEl('input') as HTMLInputElement;
    this.nameInput.type = 'text';
    this.nameInput.value = this.originalTitle.replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, '').trim().substring(0, 50) || 'Battle Map';
    this.nameInput.placeholder = 'e.g. Dragon\'s Lair';
    this.nameInput.style.cssText = 'width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);';
    
    // Info text
    const infoSection = contentEl.createDiv({ cls: 'vtt-modal-info' });
    infoSection.style.cssText = 'margin-bottom:16px;padding:10px;background:var(--background-secondary);border-radius:6px;font-size:12px;color:var(--text-muted);';
    
    const folderPath = this.plugin.settings.mapsFolderPath || 'Maps';
    infoSection.innerHTML = `
      <div>📁 Note will be saved to: <strong>${folderPath}/</strong></div>
      <div>🖼️ Image will be saved to: <strong>${folderPath}/_resources/</strong></div>
      <div style="margin-top:6px;">📝 The note will contain Player Infos and DM Info sections.</div>
    `;
    
    // Button row
    const btnRow = contentEl.createDiv({ cls: 'vtt-modal-buttons' });
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';
    
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());
    
    const saveBtn = btnRow.createEl('button', { text: '💾 Save', cls: 'mod-cta' });
    saveBtn.addEventListener('click', async () => {
      const name = this.nameInput.value?.trim();
      if (!name) { 
        new Notice('Please enter a map name'); 
        return; 
      }
      
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Saving...';
      
      try {
        const saved = await this.plugin.saveBattleMapImage(this.imageUrl, name);
        if (saved) {
          new Notice(`✅ Saved: ${saved}`);
          this.close();
        }
      } catch (e) {
        
        new Notice('❌ Failed to save map');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save';
      }
    });
    
    // Enter key to save
    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });
    
    // Focus input and select text
    setTimeout(() => {
      this.nameInput?.focus();
      this.nameInput?.select();
    }, 100);
  }
  
  onClose() {
    this.contentEl.empty();
  }
}

// Modal to enter name before saving a monster image
class MonsterImageSaveModal extends Modal {
  nameInput!: HTMLInputElement;
  
  constructor(
    app: any, 
    private plugin: VttCardDisplay, 
    private imageUrl: string, 
    private originalTitle: string
  ) { 
    super(app); 
  }
  
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vtt-monster-save-modal');
    
    // Header
    contentEl.createEl('h2', { text: '💾 Save Monster Image' });
    
    // Preview image
    const previewContainer = contentEl.createDiv({ cls: 'vtt-monster-save-preview' });
    previewContainer.style.cssText = 'margin-bottom:16px;text-align:center;';
    
    const previewImg = previewContainer.createEl('img');
    previewImg.src = this.imageUrl;
    previewImg.style.cssText = 'max-width:100%;max-height:200px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    previewImg.onerror = () => {
      previewImg.style.display = 'none';
    };
    
    // Name input section
    const inputSection = contentEl.createDiv({ cls: 'vtt-modal-section' });
    inputSection.style.cssText = 'margin-bottom:16px;';
    
    const label = inputSection.createEl('label', { text: 'Monster Name' });
    label.style.cssText = 'display:block;margin-bottom:6px;font-weight:500;';
    
    this.nameInput = inputSection.createEl('input') as HTMLInputElement;
    this.nameInput.type = 'text';
    this.nameInput.value = this.originalTitle.replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, '').trim().substring(0, 50) || 'Monster';
    this.nameInput.placeholder = 'e.g. Ancient Red Dragon';
    this.nameInput.style.cssText = 'width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);';
    
    // Info text
    const infoSection = contentEl.createDiv({ cls: 'vtt-modal-info' });
    infoSection.style.cssText = 'margin-bottom:16px;padding:10px;background:var(--background-secondary);border-radius:6px;font-size:12px;color:var(--text-muted);';
    
    const cardsFolder = this.plugin.settings.folderPath || 'Cards';
    infoSection.innerHTML = `
      <div>📁 Image will be saved to: <strong>${cardsFolder}/images/</strong></div>
      <div style="margin-top:6px;">🃏 The image will appear in your Cards panel after saving.</div>
    `;
    
    // Button row
    const btnRow = contentEl.createDiv({ cls: 'vtt-modal-buttons' });
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';
    
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());
    
    const saveBtn = btnRow.createEl('button', { text: '💾 Save', cls: 'mod-cta' });
    saveBtn.addEventListener('click', async () => {
      const name = this.nameInput.value?.trim();
      if (!name) { 
        new Notice('Please enter a monster name'); 
        return; 
      }
      
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Saving...';
      
      try {
        const saved = await this.plugin.saveMonsterImage(this.imageUrl, name);
        if (saved) {
          new Notice(`✅ Saved: ${saved}`);
          this.close();
        }
      } catch (e) {
        console.error('Failed to save monster image:', e);
        new Notice('❌ Failed to save image');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save';
      }
    });
    
    // Enter key to save
    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });
    
    // Focus input and select text
    setTimeout(() => {
      this.nameInput?.focus();
      this.nameInput?.select();
    }, 100);
  }
  
  onClose() {
    this.contentEl.empty();
  }
}

// Modal to pick a note file from the vault
class NotePickerModal extends SuggestModal<any> {
  onChooseCallback: (path: string) => void;
  constructor(app: any, onChoose: (path: string) => void) {
    super(app);
    this.onChooseCallback = onChoose;
  }
  getSuggestions(query: string) {
    const files = this.app.vault.getFiles().filter((f: any) => f.extension === 'md');
    if (!query) return files.slice(0, 50);
    const lower = query.toLowerCase();
    return files.filter((f: any) => f.path.toLowerCase().includes(lower) || f.name.toLowerCase().includes(lower)).slice(0, 50);
  }
  renderSuggestion(file: any, el: HTMLElement) {
    el.createEl('div', { text: file.name.replace(/\.md$/, '') });
    el.createEl('small', { text: file.path });
  }
  onChooseSuggestion(file: any) {
    this.close();
    if (this.onChooseCallback) this.onChooseCallback(file.path);
  }
}

// Modal to create a new Map page with a manually entered name
class MapCreateModal extends Modal {
  nameInput!: HTMLInputElement;
  constructor(app: any, private plugin: VttCardDisplay) { super(app); }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vtt-map-create-modal');
    
    // Header
    contentEl.createEl('h2', { text: 'Create Map Page' });
    
    // Description
    const desc = contentEl.createDiv({ cls: 'vtt-modal-desc' });
    desc.style.cssText = 'margin-bottom:16px;color:var(--text-muted);font-size:13px;';
    desc.textContent = 'Create a new map page with Player Info and DM Info sections for projection.';
    
    // Name input section
    const inputSection = contentEl.createDiv({ cls: 'vtt-modal-section' });
    inputSection.style.cssText = 'margin-bottom:16px;';
    
    const label = inputSection.createEl('label', { text: 'Map Name' });
    label.style.cssText = 'display:block;margin-bottom:6px;font-weight:500;';
    
    this.nameInput = inputSection.createEl('input') as HTMLInputElement;
    this.nameInput.type = 'text';
    this.nameInput.placeholder = 'e.g. Dragon\'s Lair';
    this.nameInput.style.cssText = 'width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);';
    
    // Preview section
    const previewSection = contentEl.createDiv({ cls: 'vtt-modal-section' });
    previewSection.style.cssText = 'margin-bottom:16px;padding:12px;background:var(--background-secondary);border-radius:6px;';
    
    const previewLabel = previewSection.createEl('div', { text: 'Template Preview:' });
    previewLabel.style.cssText = 'font-weight:500;margin-bottom:8px;font-size:12px;color:var(--text-muted);';
    
    const previewContent = previewSection.createEl('pre');
    previewContent.style.cssText = 'margin:0;padding:8px;background:var(--background-primary);border-radius:4px;font-size:11px;white-space:pre-wrap;color:var(--text-muted);';
    previewContent.textContent = `# Map Name

![[map-image.png]]

# Player Infos
Information visible to players when projected.

# DM Info
Secret notes - never shown in projection.`;
    
    // Button row
    const btnRow = contentEl.createDiv({ cls: 'vtt-modal-buttons' });
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';
    
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());
    
    const createBtn = btnRow.createEl('button', { text: 'Create', cls: 'mod-cta' });
    createBtn.addEventListener('click', async () => {
      const name = this.nameInput.value?.trim();
      if (!name) { new (globalThis as any).Notice('Please enter a map name'); return; }
      const folder = this.plugin.settings.mapsFolderPath || 'Maps';
      const path = `${folder.replace(/\/$/, '')}/${name}.md`;
      try {
        const exists = this.plugin.app.vault.getAbstractFileByPath(path);
        if (exists) { new (globalThis as any).Notice('Map page already exists: ' + path); return; }
        
        // Create template with proper sections
        const template = `# ${name}

![[${name.toLowerCase().replace(/\s+/g, '-')}-map.png]]

# Player Infos
Add information that players should see here.

# DM Info
Add secret DM notes here - this section is never projected.
`;
        await this.plugin.app.vault.create(path, template);
        new (globalThis as any).Notice('Created map page: ' + path);
        await this.plugin.loadMaps();
        this.close();
      } catch (e) { new (globalThis as any).Notice('Could not create map page: ' + e); }
    });
  }
}

// Suggest modal to pick registered items
class ItemSuggestModal extends SuggestModal<any> {
  items: any[];
  onChoose: (item: any) => void;
  constructor(app: any, items: any[], onChoose: (item: any) => void) { super(app); this.items = items || []; this.onChoose = onChoose; }
  getSuggestions(query: string) { return this.items.filter(i => (i.title && i.title.toLowerCase().includes(query.toLowerCase())) || (i.id && i.id.toLowerCase().includes(query.toLowerCase()))); }
  renderSuggestion(item: any, el: HTMLElement) { (el as any).createEl('div', { text: item.title }); (el as any).createEl('small', { text: ` ${item.id}` }); }
  onChooseSuggestion(item: any) { (this as any).close(); if (this.onChoose) this.onChoose(item); }
}

// Card viewer as a Workspace view - Windows Explorer style
class CardView extends ItemView {
  plugin: VttCardDisplay;
  constructor(leaf: any, plugin: VttCardDisplay) { super(leaf); this.plugin = plugin; }
  getViewType() { return 'vtt-card-view'; }
  getDisplayText() { return 'VTT Cards'; }
  getIcon() { return 'image'; }
  
  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.addClass('vtt-panel-view');
    
    // Inject custom styles
    const styleEl = container.createEl('style');
    styleEl.textContent = `
      .vtt-panel-view { 
        padding: 0 !important; 
        background: var(--background-primary); 
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .vtt-panel-content {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .vtt-panel-header { 
        padding: 12px 16px; 
        background: var(--background-secondary); 
        border-bottom: 1px solid var(--background-modifier-border);
        display: flex; 
        align-items: center; 
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      .vtt-search-row {
        width: 100%;
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .vtt-search-input {
        flex: 1;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 12px;
      }
      .vtt-search-input:focus {
        outline: none;
        border-color: var(--interactive-accent);
      }
      .vtt-panel-header button {
        padding: 6px 12px;
        border-radius: 6px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        cursor: pointer;
        font-size: 12px;
        transition: all 150ms ease;
      }
      .vtt-panel-header button:hover {
        background: var(--interactive-hover);
        border-color: var(--interactive-accent);
      }
      .vtt-panel-header button.mod-cta {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
      }
      .vtt-toggle-container {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        padding: 4px 10px;
        background: var(--background-primary);
        border-radius: 6px;
        font-size: 12px;
      }
      .vtt-toggle-container input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: var(--interactive-accent);
      }
      .vtt-section {
        padding: 12px 16px;
        flex-shrink: 0;
      }
      .vtt-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--background-modifier-border);
        cursor: pointer;
        user-select: none;
        transition: background 150ms ease;
        border-radius: 6px;
        margin: 0 -8px 12px -8px;
        padding: 8px;
      }
      .vtt-section-header:hover {
        background: var(--background-secondary);
      }
      .vtt-section-icon {
        font-size: 12px;
        transition: transform 150ms ease;
      }
      .vtt-section-icon.collapsed {
        transform: rotate(-90deg);
      }
      .vtt-section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-normal);
        margin: 0;
        flex: 1;
      }
      .vtt-section-content {
        overflow: hidden;
        transition: max-height 200ms ease;
      }
      .vtt-section-content.collapsed {
        max-height: 0 !important;
        padding: 0;
        margin: 0;
      }
      .vtt-section-count {
        font-size: 11px;
        color: var(--text-muted);
        background: var(--background-secondary);
        padding: 2px 8px;
        border-radius: 10px;
      }
      .vtt-folder-tree {
        overflow-y: visible;
        overflow-x: hidden;
        padding: 4px;
      }
      .vtt-folder {
        margin-bottom: 4px;
      }
      .vtt-folder-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        user-select: none;
        transition: background 150ms ease;
      }
      .vtt-folder-header:hover {
        background: var(--background-secondary);
      }
      .vtt-folder-icon {
        font-size: 14px;
        transition: transform 150ms ease;
      }
      .vtt-folder-icon.collapsed {
        transform: rotate(-90deg);
      }
      .vtt-folder-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-normal);
        flex: 1;
      }
      .vtt-folder-count {
        font-size: 10px;
        color: var(--text-muted);
        background: var(--background-modifier-border);
        padding: 1px 6px;
        border-radius: 8px;
      }
      .vtt-folder-contents {
        margin-left: 20px;
        border-left: 1px solid var(--background-modifier-border);
        padding-left: 8px;
        overflow: hidden;
        transition: max-height 200ms ease;
      }
      .vtt-folder-contents.collapsed {
        max-height: 0 !important;
        padding: 0;
        margin: 0;
      }
      .vtt-file-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 8px;
        padding: 8px 0;
      }
      .vtt-file-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 6px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 150ms ease;
        background: transparent;
        border: 2px solid transparent;
      }
      .vtt-file-item:hover {
        background: var(--background-secondary);
        border-color: var(--background-modifier-border);
      }
      .vtt-file-item.selected {
        background: var(--interactive-accent-hover);
        border-color: var(--interactive-accent);
      }
      .vtt-file-thumb {
        width: 70px;
        height: 70px;
        border-radius: 6px;
        overflow: hidden;
        background: var(--background-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        position: relative;
      }
      .vtt-file-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .vtt-file-thumb .vtt-note-icon {
        font-size: 28px;
        color: var(--text-muted);
      }
      .vtt-file-thumb .vtt-video-badge {
        position: absolute;
        bottom: 2px;
        right: 2px;
        background: rgba(0,0,0,0.7);
        color: #fff;
        font-size: 8px;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .vtt-file-name {
        font-size: 10px;
        color: var(--text-normal);
        text-align: center;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.3;
      }
      .vtt-file-type {
        font-size: 8px;
        color: var(--text-muted);
        text-transform: uppercase;
        margin-top: 1px;
      }
      .vtt-favorite-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        background: rgba(0,0,0,0.5);
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        cursor: pointer;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 150ms ease;
      }
      .vtt-file-item:hover .vtt-favorite-btn {
        opacity: 1;
      }
      .vtt-favorite-btn.active {
        opacity: 1;
        color: gold;
      }
      .vtt-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        color: var(--text-muted);
        font-size: 12px;
        text-align: center;
      }
      .vtt-empty-state svg {
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
        opacity: 0.5;
      }
      .vtt-root-files {
        margin-bottom: 8px;
      }
      .vtt-favorites-section {
        background: var(--background-secondary-alt);
        border-radius: 8px;
        margin-bottom: 8px;
        padding: 8px;
      }
      .vtt-favorites-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `;

    // Header with controls
    const header = container.createDiv({ cls: 'vtt-panel-header' });
    
    const openPopoutBtn = header.createEl('button', { text: '🖥️ Open Popout', cls: 'mod-cta' });
    openPopoutBtn.addEventListener('click', () => this.plugin.openPopout());
    
    const prevBtn = header.createEl('button', { text: '◀ Prev' });
    prevBtn.addEventListener('click', () => this.plugin.prevCard());
    
    const nextBtn = header.createEl('button', { text: 'Next ▶' });
    nextBtn.addEventListener('click', () => this.plugin.nextCard());
    
    const reloadBtn = header.createEl('button', { text: '🔄' });
    reloadBtn.title = 'Reload';
    
    const exportBtn = header.createEl('button', { text: '📋' });
    exportBtn.title = 'Export Session History';
    exportBtn.addEventListener('click', () => this.exportSessionHistory());
    reloadBtn.addEventListener('click', async () => {
      reloadBtn.disabled = true;
      reloadBtn.textContent = '⏳ Loading...';
      try {
        await this.plugin.loadCards();
        await this.plugin.loadMaps();
        await this.onOpen(); // Re-render the view
        new Notice('Cards and Maps reloaded');
      } catch (e) {
        
        new Notice('Failed to reload');
      }
    });
    
    // Player Info Toggle
    const toggleContainer = header.createDiv({ cls: 'vtt-toggle-container' });
    const toggleLabel = toggleContainer.createEl('label', { text: 'Player Info' });
    const toggleCheckbox = toggleContainer.createEl('input') as HTMLInputElement;
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.checked = this.plugin.settings.showPlayerInfo || false;
    toggleCheckbox.addEventListener('change', async () => {
      this.plugin.settings.showPlayerInfo = toggleCheckbox.checked;
      await this.plugin.saveData(this.plugin.settings);
    });
    
    // Search row
    const searchRow = header.createDiv({ cls: 'vtt-search-row' });
    const searchInput = searchRow.createEl('input', { 
      cls: 'vtt-search-input',
      attr: { type: 'text', placeholder: '🔍 Filter cards and maps...' }
    }) as HTMLInputElement;
    
    // Store filter state
    let currentFilter = '';
    
    // Scrollable content area
    const contentArea = container.createDiv({ cls: 'vtt-panel-content' });
    
    // Render function that can be called with filter
    const renderContent = async (filter: string) => {
      contentArea.empty();
      
      const filterLower = filter.toLowerCase();
      
      // Filter cards
      const filteredCards = (this.plugin.cards || []).filter(card => {
        if (!filter) return true;
        const name = card.path ? card.path.split('/').pop()?.toLowerCase() || '' : '';
        return name.includes(filterLower);
      });
      
      // Filter maps
      const filteredMaps = (this.plugin.maps || []).filter(map => {
        if (!filter) return true;
        const name = (map.title || map.path?.split('/').pop() || '').toLowerCase();
        return name.includes(filterLower);
      });
      
      // Render favorites section if there are favorites
      const favorites = this.plugin.settings.favorites || [];
      if (favorites.length > 0 && !filter) {
        await this.renderFavoritesSection(contentArea, favorites);
      }

      // Cards section
      await this.renderSection(contentArea, 'Cards', '🎴', filteredCards, 'card');
      
      // Maps section
      await this.renderSection(contentArea, 'Maps', '🗺️', filteredMaps, 'map');
    };
    
    // Initial render
    await renderContent('');
    
    // Search input handler with debounce
    let searchTimeout: any = null;
    searchInput.addEventListener('input', () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        currentFilter = searchInput.value;
        await renderContent(currentFilter);
      }, 150);
    });
  }
  
  async renderFavoritesSection(container: HTMLElement, favorites: string[]) {
    const favSection = container.createDiv({ cls: 'vtt-favorites-section' });
    const title = favSection.createDiv({ cls: 'vtt-favorites-title' });
    title.createEl('span', { text: '⭐' });
    title.createEl('span', { text: `Favorites (${favorites.length})` });
    
    const grid = favSection.createDiv({ cls: 'vtt-file-grid' });
    
    for (const path of favorites) {
      // Find the item in cards or maps
      const card = (this.plugin.cards || []).find(c => c.path === path);
      const map = (this.plugin.maps || []).find(m => m.path === path);
      const item = card || map;
      const type = card ? 'card' : 'map';
      
      if (item) {
        await this.renderFileItem(grid, item, type, true);
      }
    }
  }

  async renderSection(container: HTMLElement, title: string, icon: string, items: any[], type: 'card' | 'map') {
    const section = container.createDiv({ cls: 'vtt-section' });
    
    // Section header (clickable to collapse/expand)
    const sectionHeader = section.createDiv({ cls: 'vtt-section-header' });
    const collapseIcon = sectionHeader.createEl('span', { text: '▼', cls: 'vtt-section-icon' });
    sectionHeader.createEl('span', { text: icon });
    sectionHeader.createEl('h3', { text: title, cls: 'vtt-section-title' });
    sectionHeader.createEl('span', { text: `${items.length}`, cls: 'vtt-section-count' });
    
    // Section content container
    const sectionContent = section.createDiv({ cls: 'vtt-section-content' });
    
    // Toggle collapse on header click
    let isExpanded = true;
    sectionHeader.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        sectionContent.removeClass('collapsed');
        collapseIcon.removeClass('collapsed');
      } else {
        sectionContent.addClass('collapsed');
        collapseIcon.addClass('collapsed');
      }
    });
    
    if (items.length === 0) {
      const emptyState = sectionContent.createDiv({ cls: 'vtt-empty-state' });
      emptyState.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>No ${title.toLowerCase()} found</span>
        <span style="font-size:10px;margin-top:4px">Add files to the ${title} folder</span>
      `;
      return;
    }
    
    // Get the base folder path for this section
    const baseFolderPath = type === 'card' 
      ? (this.plugin.settings.folderPath || '').trim()
      : (this.plugin.settings.mapsFolderPath || '').trim();
    
    // Build folder tree structure
    const folderTree = this.buildFolderTree(items, baseFolderPath);
    
    // Create scrollable tree container inside section content
    const treeContainer = sectionContent.createDiv({ cls: 'vtt-folder-tree' });
    
    // Render the folder tree
    await this.renderFolderTree(treeContainer, folderTree, type, baseFolderPath);
  }
  
  /**
   * Build a hierarchical folder tree from flat item list
   */
  buildFolderTree(items: any[], baseFolderPath: string): Map<string, { items: any[], subfolders: Map<string, any> }> {
    const root = new Map<string, { items: any[], subfolders: Map<string, any> }>();
    
    // Initialize root level
    const rootNode = { items: [] as any[], subfolders: new Map<string, any>() };
    root.set('__root__', rootNode);
    
    for (const item of items) {
      if (!item.path) continue;
      
      // Get relative path from base folder
      let relativePath = item.path;
      if (baseFolderPath && item.path.startsWith(baseFolderPath + '/')) {
        relativePath = item.path.substring(baseFolderPath.length + 1);
      }
      
      const parts = relativePath.split('/');
      const fileName = parts.pop(); // Remove filename
      
      if (parts.length === 0) {
        // File is in root
        rootNode.items.push(item);
      } else {
        // File is in a subfolder
        let currentNode = rootNode;
        for (const folderName of parts) {
          if (!currentNode.subfolders.has(folderName)) {
            currentNode.subfolders.set(folderName, { items: [], subfolders: new Map() });
          }
          currentNode = currentNode.subfolders.get(folderName);
        }
        currentNode.items.push(item);
      }
    }
    
    return root;
  }
  
  /**
   * Recursively render the folder tree
   */
  async renderFolderTree(
    container: HTMLElement, 
    tree: Map<string, { items: any[], subfolders: Map<string, any> }>,
    type: 'card' | 'map',
    currentPath: string
  ) {
    const rootNode = tree.get('__root__');
    if (!rootNode) return;
    
    // Sort subfolders alphabetically
    const sortedFolders = Array.from(rootNode.subfolders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Render folders FIRST
    for (const [folderName, folderData] of sortedFolders) {
      await this.renderFolder(container, folderName, folderData, type, currentPath ? `${currentPath}/${folderName}` : folderName);
    }
    
    // Then render root-level loose files
    if (rootNode.items.length > 0) {
      const rootFilesContainer = container.createDiv({ cls: 'vtt-root-files' });
      await this.renderFileGrid(rootFilesContainer, rootNode.items, type);
    }
  }
  
  /**
   * Render a single folder with its contents
   */
  async renderFolder(
    container: HTMLElement,
    folderName: string,
    folderData: { items: any[], subfolders: Map<string, any> },
    type: 'card' | 'map',
    fullPath: string
  ) {
    const folder = container.createDiv({ cls: 'vtt-folder' });
    
    // Count total items in this folder and subfolders
    const totalCount = this.countItemsRecursive(folderData);
    
    // Folder header (clickable to expand/collapse)
    const header = folder.createDiv({ cls: 'vtt-folder-header' });
    const iconSpan = header.createEl('span', { text: '▼', cls: 'vtt-folder-icon collapsed' });
    header.createEl('span', { text: '📁' });
    header.createEl('span', { text: folderName, cls: 'vtt-folder-name' });
    header.createEl('span', { text: `${totalCount}`, cls: 'vtt-folder-count' });
    
    // Folder contents container - start collapsed
    const contents = folder.createDiv({ cls: 'vtt-folder-contents collapsed' });
    
    // Render files in this folder
    if (folderData.items.length > 0) {
      await this.renderFileGrid(contents, folderData.items, type);
    }
    
    // Recursively render subfolders
    const sortedSubfolders = Array.from(folderData.subfolders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [subName, subData] of sortedSubfolders) {
      await this.renderFolder(contents, subName, subData, type, `${fullPath}/${subName}`);
    }
    
    // Toggle expand/collapse on header click - start collapsed
    let isExpanded = false;
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        contents.removeClass('collapsed');
        iconSpan.removeClass('collapsed');
      } else {
        contents.addClass('collapsed');
        iconSpan.addClass('collapsed');
      }
    });
  }
  
  /**
   * Count items recursively in a folder and its subfolders
   */
  countItemsRecursive(folderData: { items: any[], subfolders: Map<string, any> }): number {
    let count = folderData.items.length;
    for (const [, subData] of folderData.subfolders) {
      count += this.countItemsRecursive(subData);
    }
    return count;
  }
  
  /**
   * Render a grid of files
   */
  async renderFileGrid(container: HTMLElement, items: any[], type: 'card' | 'map') {
    const grid = container.createDiv({ cls: 'vtt-file-grid' });
    
    for (let idx = 0; idx < items.length; idx++) {
      const entry = items[idx];
      await this.renderFileItem(grid, entry, type, false);
    }
  }
  
  /**
   * Render a single file item
   */
  async renderFileItem(container: HTMLElement, entry: any, type: 'card' | 'map', isFavoriteSection: boolean) {
      const fileItem = container.createDiv({ cls: 'vtt-file-item' });
      
      const thumb = fileItem.createDiv({ cls: 'vtt-file-thumb' });
      
      // Determine the thumbnail
      const isMarkdown = entry.path && entry.path.toLowerCase().endsWith('.md');
      const isVideo = entry.path && /\.(mp4|webm|ogg|mov)$/i.test(entry.path);
      
      if (isMarkdown) {
        // For markdown files, try to extract first image for thumbnail
        const thumbImg = await this.getNoteThumbnail(entry.path);
        if (thumbImg && !thumbImg.startsWith('blob:')) {
          const img = thumb.createEl('img');
          img.loading = 'lazy';
          img.src = thumbImg;
          img.onerror = () => { img.style.display = 'none'; thumb.createEl('span', { text: '📄', cls: 'vtt-note-icon' }); };
        } else {
          thumb.createEl('span', { text: '📄', cls: 'vtt-note-icon' });
        }
      } else if (isVideo) {
        // For videos, try to get/create a cached thumbnail
        const videoThumbUrl = await this.plugin._getOrCreateVideoThumbnail(entry.path);
        if (videoThumbUrl) {
          const img = thumb.createEl('img');
          img.loading = 'lazy';
          img.src = videoThumbUrl;
          img.onerror = () => { 
            img.style.display = 'none'; 
            thumb.createEl('span', { text: '🎬', cls: 'vtt-note-icon' }); 
          };
          // Add video badge overlay
          thumb.createEl('span', { text: 'VIDEO', cls: 'vtt-video-badge' });
        } else {
          // Fallback to video icon if thumbnail creation failed
          thumb.createEl('span', { text: '🎬', cls: 'vtt-note-icon' });
          thumb.createEl('span', { text: 'VIDEO', cls: 'vtt-video-badge' });
        }
      } else {
        // For images, show the image using Obsidian's resource path (works in-app)
        const img = thumb.createEl('img');
        img.loading = 'lazy';
        let srcVal = '';
        if (entry.path && !isMarkdown) {
          try {
            const file = this.plugin.app.vault.getAbstractFileByPath(entry.path);
            if (file) {
              srcVal = this.plugin.app.vault.getResourcePath(file as any);
            }
          } catch (e) {
            // File not found - no fallback to potentially stale URLs
            srcVal = '';
          }
        }
        // Only set src if we have a valid value (avoid stale app:// or blob: URLs)
        if (srcVal && !srcVal.startsWith('blob:')) {
          img.src = srcVal;
        }
        img.onerror = () => { img.style.display = 'none'; thumb.createEl('span', { text: '🖼️', cls: 'vtt-note-icon' }); };
      }
      
      // Favorite button
      const path = entry.path;
      const isFavorite = (this.plugin.settings.favorites || []).includes(path);
      const favBtn = thumb.createEl('button', { 
        text: isFavorite ? '⭐' : '☆', 
        cls: 'vtt-favorite-btn' + (isFavorite ? ' active' : '') 
      });
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const favorites = this.plugin.settings.favorites || [];
        const idx = favorites.indexOf(path);
        if (idx >= 0) {
          favorites.splice(idx, 1);
          favBtn.textContent = '☆';
          favBtn.removeClass('active');
        } else {
          favorites.push(path);
          favBtn.textContent = '⭐';
          favBtn.addClass('active');
        }
        this.plugin.settings.favorites = favorites;
        await this.plugin.saveData(this.plugin.settings);
        
        // Re-render if in favorites section
        if (isFavoriteSection) {
          await this.onOpen();
        }
      });
      
      // File name
      const fileName = entry.title || ((entry.path ? ((entry.path || '').split('/').pop() || '').replace(/\.[^.]+$/, '') : 'Untitled'));
      fileItem.createEl('div', { text: fileName, cls: 'vtt-file-name', attr: { title: fileName } });
      
      // File type badge
      const ext = entry.path ? (entry.path.split('.').pop() || '').toUpperCase() : '';
      if (ext) {
        fileItem.createEl('div', { text: ext, cls: 'vtt-file-type' });
      }
      
      // Click handler
      const allItems = type === 'card' ? this.plugin.cards : this.plugin.maps;
      const globalIdx = allItems.findIndex((item: any) => item.path === path);
      
      fileItem.addEventListener('click', async () => {
        // Visual feedback - clear all selections in this section
        const section = fileItem.closest('.vtt-section, .vtt-favorites-section');
        if (section) {
          section.querySelectorAll('.vtt-file-item').forEach(el => el.removeClass('selected'));
        }
        fileItem.addClass('selected');
        
        // Add to session history
        this.addToSessionHistory(path, type);
        
        if (type === 'card') {
          this.plugin.current = globalIdx >= 0 ? globalIdx : 0;
          this.plugin.openPopout();
          this.plugin.sendCurrentToPopout();
        } else {
          await this.plugin.projectMapByPath(path);
        }
      });
      
      // Double click to open file in editor
      fileItem.addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        if (path) {
          const file = this.plugin.app.vault.getAbstractFileByPath(path);
          if (file) {
            await this.plugin.app.workspace.openLinkText(path, '', false);
          }
        }
      });
  }
  
  addToSessionHistory(path: string, type: 'card' | 'map') {
    if (!this.plugin.settings.sessionHistory) {
      this.plugin.settings.sessionHistory = [];
    }
    this.plugin.settings.sessionHistory.push({
      path,
      timestamp: Date.now(),
      type
    });
    // Keep only last 500 entries
    if (this.plugin.settings.sessionHistory.length > 500) {
      this.plugin.settings.sessionHistory = this.plugin.settings.sessionHistory.slice(-500);
    }
    this.plugin.saveData(this.plugin.settings);
  }
  
  exportSessionHistory() {
    const history = this.plugin.settings.sessionHistory || [];
    if (history.length === 0) {
      new Notice('No session history to export');
      return;
    }
    
    // Group by date
    const grouped: Record<string, typeof history> = {};
    for (const entry of history) {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(entry);
    }
    
    // Build markdown
    let md = '# Session History\\n\\n';
    for (const [date, entries] of Object.entries(grouped)) {
      md += `## ${date}\\n\\n`;
      for (const entry of entries) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const name = entry.path.split('/').pop()?.replace(/\\.[^.]+$/, '') || entry.path;
        const icon = entry.type === 'card' ? '🎴' : '🗺️';
        md += `- ${time} ${icon} [[${entry.path}|${name}]]\\n`;
      }
      md += '\\n';
    }
    
    // Create file
    const fileName = `Session History ${new Date().toISOString().split('T')[0]}.md`;
    this.plugin.app.vault.create(fileName, md.replace(/\\\\n/g, '\\n'))
      .then(() => new Notice(`Exported to ${fileName}`))
      .catch((e: any) => {
        
        new Notice('Failed to export session history');
      });
  }
  
  async getNoteThumbnail(notePath: string): Promise<string | null> {
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
      if (!file) return null;
      
      const content = await this.plugin.app.vault.read(file as any);
      const noteDir = (file as any).parent?.path || '';
      
      // Supported media extensions
      const imageExts = 'png|jpg|jpeg|gif|webp|svg';
      const videoExts = 'mp4|webm|ogg|mov';
      const allMediaExts = `${imageExts}|${videoExts}`;
      
      // Look for embedded media ![[file.ext]] or ![[_resources/file.ext]]
      const embedRegex = new RegExp(`!\\[\\[([^\\]]+\\.(${allMediaExts}))\\]\\]`, 'i');
      const embedMatch = content.match(embedRegex);
      if (embedMatch) {
        const mediaName = embedMatch[1];
        const allFiles = this.plugin.app.vault.getFiles();
        const isVideo = new RegExp(`\\.(${videoExts})$`, 'i').test(mediaName);
        
        // Try multiple resolution strategies
        let mediaFile = allFiles.find((f: any) => f.path === mediaName);
        
        // Try relative to note directory (e.g., _resources/image.png -> Maps/_resources/image.png)
        if (!mediaFile && noteDir) {
          const relativePath = noteDir + '/' + mediaName;
          mediaFile = allFiles.find((f: any) => f.path === relativePath);
        }
        
        // Try by filename only
        if (!mediaFile) {
          const baseName = mediaName.split('/').pop();
          mediaFile = allFiles.find((f: any) => f.name === baseName);
        }
        
        // Try path ending
        if (!mediaFile) {
          mediaFile = allFiles.find((f: any) => f.path.endsWith(mediaName));
        }
        
        if (mediaFile) {
          if (isVideo) {
            // For videos, get or create a cached thumbnail
            return await this.plugin._getOrCreateVideoThumbnail(mediaFile.path);
          } else {
            // Use getResourcePath for images (returns app:// URL, no memory overhead)
            return this.plugin.app.vault.getResourcePath(mediaFile);
          }
        }
      }
      
      // Look for markdown image/video syntax ![](path)
      const mdRegex = new RegExp(`!\\[[^\\]]*\\]\\(([^)]+\\.(${allMediaExts}))\\)`, 'i');
      const mdMatch = content.match(mdRegex);
      if (mdMatch) {
        const mediaPath = mdMatch[1];
        const isVideo = new RegExp(`\\.(${videoExts})$`, 'i').test(mediaPath);
        
        // Try absolute path first
        let mediaFile = this.plugin.app.vault.getAbstractFileByPath(mediaPath);
        // Try relative to note directory
        if (!mediaFile && noteDir) {
          mediaFile = this.plugin.app.vault.getAbstractFileByPath(noteDir + '/' + mediaPath);
        }
        if (mediaFile) {
          if (isVideo) {
            // For videos, get or create a cached thumbnail
            return await this.plugin._getOrCreateVideoThumbnail((mediaFile as any).path);
          } else {
            // Use getResourcePath for images (returns app:// URL, no memory overhead)
            return this.plugin.app.vault.getResourcePath(mediaFile as any);
          }
        }
      }
      
      return null;
    } catch (e) {
      
      return null;
    }
  }
  
  async onClose() {}
}
