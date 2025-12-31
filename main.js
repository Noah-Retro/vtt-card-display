"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VttCardDisplay
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/constants.ts
var DEFAULT_SETTINGS = {
  folderPath: "Cards",
  mapsFolderPath: "Maps",
  popoutLeft: 1920,
  popoutTop: 0,
  popoutWidth: 800,
  popoutHeight: 600,
  statblockSelectors: ".statblock,.stat-block,.quickmonster,.qm,.statblock-render,.statblock-container",
  showPlayerInfo: false,
  favorites: [],
  sessionHistory: [],
  gridSize: 50,
  gridColor: "#ffffff",
  gridOpacity: 0.3,
  fogRevealSize: 30
};
var IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".gif", ".webp", ".svg", ".ico", ".mp4", ".webm", ".ogg", ".mov"];

// src/search-apis.ts
async function searchLocalVault(vault, searchQuery) {
  const results = [];
  const searchTerms = searchQuery.toLowerCase().split(/\s+/);
  try {
    const allFiles = vault.getFiles();
    const imageFiles = allFiles.filter(
      (f) => IMAGE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    for (const file of imageFiles) {
      const fileName = file.name.toLowerCase();
      const filePath = file.path.toLowerCase();
      const matchesAll = searchTerms.every(
        (term) => fileName.includes(term) || filePath.includes(term)
      );
      const matchesSome = searchTerms.some(
        (term) => fileName.includes(term) || filePath.includes(term)
      );
      if (matchesAll) {
        const resourcePath = vault.getResourcePath(file);
        results.unshift({
          url: resourcePath,
          source: "Local Vault",
          title: file.name.replace(/\.[^.]+$/, "")
        });
      } else if (matchesSome && results.length < 20) {
        const resourcePath = vault.getResourcePath(file);
        results.push({
          url: resourcePath,
          source: "Local Vault",
          title: file.name.replace(/\.[^.]+$/, "")
        });
      }
      if (results.length >= 20)
        break;
    }
  } catch (e) {
  }
  return results;
}
async function searchFandomWikis(monsterName) {
  const results = [];
  const wikis = [
    { base: "forgottenrealms.fandom.com", name: "Forgotten Realms Wiki" },
    { base: "dnd.fandom.com", name: "D&D Wiki" }
  ];
  const searchVariants = [
    monsterName,
    monsterName.replace(/\s+/g, "_")
  ];
  for (const wiki of wikis) {
    for (const searchName of searchVariants) {
      try {
        const url = `https://${wiki.base}/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages|images&piprop=original&format=json&origin=*&imlimit=10`;
        const response = await fetch(url);
        if (!response.ok)
          continue;
        const data = await response.json();
        const pages = data.query?.pages || {};
        for (const pageId in pages) {
          if (pageId === "-1")
            continue;
          const page = pages[pageId];
          if (page.original?.source) {
            results.push({
              url: page.original.source,
              source: wiki.name,
              title: page.title || monsterName
            });
          }
        }
        if (results.length > 0)
          break;
      } catch (e) {
      }
    }
  }
  return results;
}
function searchDndBeyond(monsterName) {
  const results = [];
  const knownMonsters = {
    "beholder": ["https://www.dndbeyond.com/avatars/thumbnails/30783/57/1000/1000/638062024584880857.png"],
    "mind flayer": ["https://www.dndbeyond.com/avatars/thumbnails/30835/570/1000/1000/638063842570726627.png"],
    "owlbear": ["https://www.dndbeyond.com/avatars/thumbnails/30835/876/1000/1000/638063843970232932.png"],
    "dragon": ["https://www.dndbeyond.com/avatars/thumbnails/30761/974/1000/1000/638061113344926498.png"],
    "goblin": ["https://www.dndbeyond.com/avatars/thumbnails/30784/623/1000/1000/638062027226498498.png"],
    "orc": ["https://www.dndbeyond.com/avatars/thumbnails/30835/914/1000/1000/638063844132752513.png"],
    "skeleton": ["https://www.dndbeyond.com/avatars/thumbnails/30836/389/1000/1000/638063846088583498.png"],
    "zombie": ["https://www.dndbeyond.com/avatars/thumbnails/30837/79/1000/1000/638063848914306498.png"],
    "troll": ["https://www.dndbeyond.com/avatars/thumbnails/30836/890/1000/1000/638063848107658498.png"],
    "giant": ["https://www.dndbeyond.com/avatars/thumbnails/30784/333/1000/1000/638062026084648498.png"],
    "wolf": ["https://www.dndbeyond.com/avatars/thumbnails/30837/28/1000/1000/638063848711583498.png"],
    "spider": ["https://www.dndbeyond.com/avatars/thumbnails/30836/440/1000/1000/638063846307193498.png"],
    "mimic": ["https://www.dndbeyond.com/avatars/thumbnails/30835/495/1000/1000/638063842254523498.png"],
    "gelatinous cube": ["https://www.dndbeyond.com/avatars/thumbnails/30784/295/1000/1000/638062025946428498.png"],
    "lich": ["https://www.dndbeyond.com/avatars/thumbnails/30835/305/1000/1000/638063841536473498.png"],
    "vampire": ["https://www.dndbeyond.com/avatars/thumbnails/30836/930/1000/1000/638063848269628498.png"],
    "werewolf": ["https://www.dndbeyond.com/avatars/thumbnails/30836/995/1000/1000/638063848531823498.png"],
    "demon": ["https://www.dndbeyond.com/avatars/thumbnails/30783/400/1000/1000/638062025308243498.png"],
    "devil": ["https://www.dndbeyond.com/avatars/thumbnails/30783/474/1000/1000/638062025514888498.png"],
    "elemental": ["https://www.dndbeyond.com/avatars/thumbnails/30783/808/1000/1000/638062026634568498.png"]
  };
  const lowerName = monsterName.toLowerCase();
  for (const [key, urls] of Object.entries(knownMonsters)) {
    if (lowerName.includes(key)) {
      for (const url of urls) {
        results.push({ url, source: "D&D Beyond", title: monsterName });
      }
    }
  }
  return results;
}
async function searchArtStation(monsterName) {
  const results = [];
  try {
    const searchQuery = encodeURIComponent(`dnd ${monsterName}`);
    const url = `https://www.artstation.com/api/v2/search/projects.json?query=${searchQuery}&page=1&per_page=5`;
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (response.ok) {
      const data = await response.json();
      const projects = data.data || [];
      for (const project of projects.slice(0, 5)) {
        if (project.cover?.medium_image_url) {
          results.push({
            url: project.cover.medium_image_url.replace("/medium/", "/large/"),
            source: "ArtStation",
            title: project.title || monsterName
          });
        }
      }
    }
  } catch (e) {
  }
  return results;
}
async function searchDeviantArt(monsterName) {
  const results = [];
  try {
    const searchQuery = encodeURIComponent(`dnd ${monsterName} fantasy`);
    const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=${searchQuery}`;
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        const title = item.querySelector("title")?.textContent || monsterName;
        const mediaContent = item.getElementsByTagName("media:content")[0];
        const mediaThumbnail = item.getElementsByTagName("media:thumbnail")[0];
        const imageUrl = mediaContent?.getAttribute("url") || mediaThumbnail?.getAttribute("url");
        if (imageUrl) {
          results.push({ url: imageUrl, source: "DeviantArt", title });
        }
      }
    }
  } catch (e) {
  }
  return results;
}
async function searchReddit(monsterName) {
  const results = [];
  const subreddits = [
    "DnD",
    "dndart",
    "ImaginaryMonsters",
    "ImaginaryDragons",
    "DungeonsAndDragons",
    "battlemaps"
  ];
  for (const subreddit of subreddits) {
    try {
      const searchQuery = encodeURIComponent(monsterName);
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchQuery}&restrict_sr=1&limit=5&sort=relevance&t=all`;
      const response = await fetch(url, {
        headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
      });
      if (response.ok) {
        const data = await response.json();
        const posts = data.data?.children || [];
        for (const post of posts) {
          const postData = post.data;
          let imageUrl = "";
          if (postData.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (postData.url && postData.url.includes("i.redd.it")) {
            imageUrl = postData.url;
          } else if (postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
          } else if (postData.url && postData.url.includes("imgur.com")) {
            imageUrl = postData.url;
            if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              imageUrl = imageUrl.replace("imgur.com", "i.imgur.com") + ".jpg";
            }
          }
          if (imageUrl) {
            results.push({
              url: imageUrl,
              source: `Reddit r/${subreddit}`,
              title: postData.title || monsterName
            });
          }
        }
      }
    } catch (e) {
    }
    if (results.length >= 15)
      break;
  }
  return results;
}
function deduplicateResults(results) {
  const seen = /* @__PURE__ */ new Set();
  return results.filter((r) => {
    if (seen.has(r.url))
      return false;
    seen.add(r.url);
    return true;
  });
}

// src/popout-html.ts
function buildPopoutHtml(settings) {
  const gridSize = settings.gridSize ?? 50;
  const gridColor = settings.gridColor ?? "#ffffff";
  const gridOpacity = settings.gridOpacity ?? 0.3;
  const fogRevealSize = settings.fogRevealSize ?? 30;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VTT Projection</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { 
      width: 100vw; 
      height: 100vh; 
      overflow: hidden; 
      background: #000; 
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    /* Main container */
    #container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    /* Content wrapper for zoom/pan */
    #content-wrapper {
      position: relative;
      transform-origin: center center;
      transition: none;
    }
    
    /* Image display */
    #img {
      max-width: 100vw;
      max-height: 100vh;
      object-fit: contain;
      display: block;
    }
    
    /* Grid overlay */
    #grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: none;
      z-index: 10;
    }
    
    /* Fog of war canvas - positioned over container, doesn't rotate */
    #fog-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      display: none;
      z-index: 20;
    }
    
    /* HTML content (statblocks, notes with images, etc.) */
    #html {
      display: none;
      background: transparent;
      color: #eee;
      overflow: visible;
      width: 100%;
      height: 100%;
    }
    
    /* Style for HTML content that should be scrollable (statblocks) */
    #html.scrollable {
      background: #1a1a2e;
      padding: 24px;
      overflow: auto;
      max-height: 100vh;
    }
    
    /* Make images/videos in HTML content behave like the main img */
    #html img, #html video {
      max-width: 100vw;
      max-height: 100vh;
      object-fit: contain;
      display: block;
      margin: auto;
    }
    
    /* Controls panel */
    #controls {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.85);
      padding: 12px;
      border-radius: 8px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 200px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    #controls.collapsed {
      min-width: auto;
      padding: 8px;
    }
    
    #controls.collapsed .control-content {
      display: none;
    }
    
    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #fff;
      font-weight: 600;
      font-size: 12px;
    }
    
    .toggle-btn {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
    }
    
    .control-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .control-section label {
      color: #aaa;
      font-size: 11px;
      display: block;
      margin-bottom: 4px;
    }
    
    .control-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    
    .control-row input[type="range"] {
      flex: 1;
      height: 4px;
    }
    
    .control-row input[type="color"] {
      width: 30px;
      height: 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .control-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }
    
    .control-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: all 150ms;
    }
    
    .control-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .control-btn.active {
      background: var(--accent-color, #7c3aed);
      border-color: var(--accent-color, #7c3aed);
    }
    
    .zoom-display {
      color: #fff;
      font-size: 11px;
      min-width: 40px;
      text-align: center;
    }
    
    /* Rotation info */
    #rotation-info {
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
      z-index: 100;
    }
    
    /* Player info overlay */
    #player-info-overlay {
      position: fixed;
      top: 60px;
      right: 10px;
      background: rgba(0,0,0,0.85);
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      max-width: 300px;
      max-height: 40vh;
      overflow-y: auto;
      z-index: 999;
      display: none;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    #player-info-overlay h1, #player-info-overlay h2, #player-info-overlay h3 {
      margin-top: 0;
      font-size: 1.1em;
    }
    
    /* Auto-hide controls when collapsed after timeout */
    #controls.collapsed.auto-hidden {
      opacity: 0;
      pointer-events: none;
      transition: opacity 300ms ease;
    }
    
    #controls.collapsed:not(.auto-hidden) {
      opacity: 1;
      transition: opacity 300ms ease;
    }
    
    #controls:hover, #controls:focus-within {
      opacity: 1 !important;
      pointer-events: auto !important;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="content-wrapper">
      <img id="img" src="" alt="Card" />
      <video id="video" style="display:none;max-width:100vw;max-height:100vh;object-fit:contain;" loop></video>
      <div id="html"></div>
      <canvas id="grid-overlay"></canvas>
    </div>
    <!-- Fog canvas outside wrapper so it doesn't rotate with image -->
    <canvas id="fog-canvas"></canvas>
  </div>
  
  <!-- Controls Panel -->
  <div id="controls">
    <div class="control-header">
      <span>\u{1F3AE} Controls</span>
      <button class="toggle-btn" id="toggle-controls">\u2212</button>
    </div>
    <div class="control-content">
      <!-- Zoom/Pan Section -->
      <div class="control-section">
        <label>Zoom & Pan</label>
        <div class="control-row">
          <button class="control-btn" id="zoom-out">\u2212</button>
          <span class="zoom-display" id="zoom-level">100%</span>
          <button class="control-btn" id="zoom-in">+</button>
          <button class="control-btn" id="zoom-reset">Reset</button>
        </div>
      </div>
      
      <!-- Grid Section -->
      <div class="control-section">
        <label>Grid Overlay</label>
        <div class="control-row">
          <input type="checkbox" id="grid-toggle" />
          <span style="color:#fff;font-size:11px;">Show Grid</span>
        </div>
        <div class="control-row">
          <label style="min-width:40px;">Size</label>
          <input type="range" id="grid-size" min="10" max="200" value="${gridSize}" />
          <span id="grid-size-value" style="color:#fff;font-size:11px;min-width:35px;">${gridSize}px</span>
        </div>
        <div class="control-row">
          <label style="min-width:40px;">Color</label>
          <input type="color" id="grid-color" value="${gridColor}" />
          <input type="range" id="grid-opacity" min="5" max="100" value="${Math.round(gridOpacity * 100)}" style="flex:1;" />
        </div>
      </div>
      
      <!-- Fog of War Section -->
      <div class="control-section">
        <label>Fog of War</label>
        <div class="control-row">
          <input type="checkbox" id="fog-toggle" />
          <span style="color:#fff;font-size:11px;">Enable Fog</span>
        </div>
        <div class="control-row">
          <label style="min-width:50px;">Brush</label>
          <input type="range" id="fog-size" min="10" max="150" value="${fogRevealSize}" />
          <span id="fog-size-value" style="color:#fff;font-size:11px;min-width:35px;">${fogRevealSize}px</span>
        </div>
        <div class="control-row">
          <button class="control-btn" id="fog-reset">Reset Fog</button>
          <button class="control-btn" id="fog-reveal-all">Reveal All</button>
        </div>
      </div>
      
      <!-- Rotation Section -->
      <div class="control-section">
        <label>Rotation</label>
        <div class="control-row">
          <button class="control-btn" id="rotate-left">\u21BA 90\xB0</button>
          <span class="zoom-display" id="rotation-display">0\xB0</span>
          <button class="control-btn" id="rotate-right">\u21BB 90\xB0</button>
          <button class="control-btn" id="rotate-reset">Reset</button>
        </div>
      </div>
      
      <!-- Player Info Section -->
      <div class="control-section">
        <label>Player Info</label>
        <div class="control-row">
          <input type="checkbox" id="player-info-toggle" />
          <span style="color:#fff;font-size:11px;">Show Player Info</span>
        </div>
      </div>
      
      <!-- Export Section -->
      <div class="control-section">
        <div class="control-row">
          <button class="control-btn" id="export-btn" style="flex:1;">\u{1F4F8} Export Image</button>
        </div>
      </div>
    </div>
  </div>
  
  <div id="player-info-overlay"></div>
  <div id="rotation-info"></div>
  
  <script>
    // State
    let currentZoom = 1;
    let panX = 0, panY = 0;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let gridEnabled = false;
    let fogEnabled = false;
    let currentRotation = 0;
    let showPlayerInfo = false;
    let playerInfoContent = '';
    let controlsAutoHideTimer = null;
    let controlsCollapsed = false;
    let fogRevealSize = ${fogRevealSize};
    let isDrawingFog = false;
    
    // Elements
    const container = document.getElementById('container');
    const wrapper = document.getElementById('content-wrapper');
    const img = document.getElementById('img');
    const video = document.getElementById('video');
    const htmlEl = document.getElementById('html');
    const gridCanvas = document.getElementById('grid-overlay');
    const fogCanvas = document.getElementById('fog-canvas');
    const gridCtx = gridCanvas.getContext('2d');
    const fogCtx = fogCanvas.getContext('2d');
    
    // Controls
    const toggleBtn = document.getElementById('toggle-controls');
    const controls = document.getElementById('controls');
    const playerInfoOverlay = document.getElementById('player-info-overlay');
    const rotationInfo = document.getElementById('rotation-info');
    
    // Auto-hide timer for collapsed controls
    function startAutoHideTimer() {
      if (controlsAutoHideTimer) clearTimeout(controlsAutoHideTimer);
      if (controlsCollapsed) {
        controlsAutoHideTimer = setTimeout(() => {
          controls.classList.add('auto-hidden');
        }, 3000);
      }
    }
    
    function showControls() {
      controls.classList.remove('auto-hidden');
      startAutoHideTimer();
    }
    
    // Show controls on mouse move anywhere
    document.addEventListener('mousemove', showControls);
    
    toggleBtn.addEventListener('click', () => {
      controls.classList.toggle('collapsed');
      controlsCollapsed = controls.classList.contains('collapsed');
      toggleBtn.textContent = controlsCollapsed ? '+' : '\u2212';
      if (controlsCollapsed) {
        startAutoHideTimer();
      } else {
        if (controlsAutoHideTimer) clearTimeout(controlsAutoHideTimer);
        controls.classList.remove('auto-hidden');
      }
    });
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => setZoom(currentZoom + 0.25));
    document.getElementById('zoom-out').addEventListener('click', () => setZoom(currentZoom - 0.25));
    document.getElementById('zoom-reset').addEventListener('click', () => { currentZoom = 1; panX = 0; panY = 0; updateTransform(); });
    
    // Rotation controls
    document.getElementById('rotate-left').addEventListener('click', () => setRotation(currentRotation - 90));
    document.getElementById('rotate-right').addEventListener('click', () => setRotation(currentRotation + 90));
    document.getElementById('rotate-reset').addEventListener('click', () => setRotation(0));
    
    function setRotation(deg) {
      currentRotation = ((deg % 360) + 360) % 360;
      // Reset pan
      panX = 0;
      panY = 0;
      
      // Calculate optimal zoom to fit content (touch at least 2 sides)
      fitContentToViewport();
      
      document.getElementById('rotation-display').textContent = currentRotation + '\xB0';
      // Show rotation info briefly
      rotationInfo.textContent = 'Rotation: ' + currentRotation + '\xB0';
      rotationInfo.style.display = 'block';
      setTimeout(() => { rotationInfo.style.display = 'none'; }, 1500);
    }
    
    // Fit content to viewport so it touches at least 2 sides
    function fitContentToViewport() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isRotated90 = (currentRotation === 90 || currentRotation === 270);
      
      // Get content natural dimensions
      let naturalW = 0, naturalH = 0;
      
      if (img.style.display !== 'none' && img.src && img.naturalWidth) {
        naturalW = img.naturalWidth;
        naturalH = img.naturalHeight;
      } else if (video.style.display !== 'none' && video.src && video.videoWidth) {
        naturalW = video.videoWidth;
        naturalH = video.videoHeight;
      } else if (htmlEl.style.display !== 'none') {
        const htmlImg = htmlEl.querySelector('img');
        const htmlVid = htmlEl.querySelector('video');
        if (htmlImg && htmlImg.naturalWidth) {
          naturalW = htmlImg.naturalWidth;
          naturalH = htmlImg.naturalHeight;
        } else if (htmlVid && htmlVid.videoWidth) {
          naturalW = htmlVid.videoWidth;
          naturalH = htmlVid.videoHeight;
        }
      }
      
      if (!naturalW || !naturalH) {
        currentZoom = 1;
        updateTransform();
        return;
      }
      
      // CSS already scales image to fit viewport with object-fit: contain
      // So the displayed size is determined by CSS max-width/max-height
      // Calculate what CSS displays the image as:
      const cssScaleX = vw / naturalW;
      const cssScaleY = vh / naturalH;
      const cssScale = Math.min(cssScaleX, cssScaleY);
      const displayedW = naturalW * cssScale;
      const displayedH = naturalH * cssScale;
      
      // When rotated 90/270, the displayed dimensions are swapped
      let effectiveW = isRotated90 ? displayedH : displayedW;
      let effectiveH = isRotated90 ? displayedW : displayedH;
      
      // Calculate zoom needed to make content fit viewport after rotation
      const neededScaleX = vw / effectiveW;
      const neededScaleY = vh / effectiveH;
      currentZoom = Math.min(neededScaleX, neededScaleY);
      
      updateTransform();
    }
    
    // Player Info toggle
    document.getElementById('player-info-toggle').addEventListener('change', (e) => {
      showPlayerInfo = e.target.checked;
      updatePlayerInfoOverlay();
    });
    
    function updatePlayerInfoOverlay() {
      if (showPlayerInfo && playerInfoContent) {
        playerInfoOverlay.innerHTML = playerInfoContent;
        playerInfoOverlay.style.display = 'block';
      } else {
        playerInfoOverlay.style.display = 'none';
      }
    }
    
    function setZoom(z) {
      currentZoom = Math.max(0.25, Math.min(5, z));
      updateTransform();
    }
    
    function updateTransform() {
      wrapper.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentZoom + ') rotate(' + currentRotation + 'deg)';
      document.getElementById('zoom-level').textContent = Math.round(currentZoom * 100) + '%';
    }
    
    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(currentZoom + delta);
    });
    
    // Pan with mouse drag on container
    container.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 1) {
        isDragging = true;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        container.style.cursor = 'grabbing';
      }
    });
    
    container.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - dragStartX;
        panY = e.clientY - dragStartY;
        updateTransform();
      }
    });
    
    container.addEventListener('mouseup', () => {
      isDragging = false;
      container.style.cursor = 'default';
    });
    
    container.addEventListener('mouseleave', () => {
      isDragging = false;
    });
    
    // Fog drawing events on fog canvas (only active when fog enabled)
    fogCanvas.addEventListener('mousedown', (e) => {
      if (fogEnabled && e.button === 0) {
        isDrawingFog = true;
        revealFogAt(e);
        e.stopPropagation(); // Don't trigger pan
      }
    });
    
    fogCanvas.addEventListener('mousemove', (e) => {
      if (isDrawingFog) {
        revealFogAt(e);
      }
    });
    
    fogCanvas.addEventListener('mouseup', () => {
      isDrawingFog = false;
    });
    
    fogCanvas.addEventListener('mouseleave', () => {
      isDrawingFog = false;
    });
    
    // Grid controls
    document.getElementById('grid-toggle').addEventListener('change', (e) => {
      gridEnabled = e.target.checked;
      gridCanvas.style.display = gridEnabled ? 'block' : 'none';
      if (gridEnabled) drawGrid();
    });
    
    document.getElementById('grid-size').addEventListener('input', (e) => {
      document.getElementById('grid-size-value').textContent = e.target.value + 'px';
      if (gridEnabled) drawGrid();
    });
    
    document.getElementById('grid-color').addEventListener('input', () => { if (gridEnabled) drawGrid(); });
    document.getElementById('grid-opacity').addEventListener('input', () => { if (gridEnabled) drawGrid(); });
    
    function drawGrid() {
      const size = parseInt(document.getElementById('grid-size').value);
      const color = document.getElementById('grid-color').value;
      const opacity = parseInt(document.getElementById('grid-opacity').value) / 100;
      
      // Get dimensions from active content
      let contentW = 0, contentH = 0;
      let displayW = 0, displayH = 0;
      
      if (img.style.display !== 'none' && img.src) {
        contentW = img.naturalWidth || 800;
        contentH = img.naturalHeight || 600;
        displayW = img.width || img.clientWidth;
        displayH = img.height || img.clientHeight;
      } else if (video.style.display !== 'none' && video.src) {
        contentW = video.videoWidth || 800;
        contentH = video.videoHeight || 600;
        displayW = video.width || video.clientWidth;
        displayH = video.height || video.clientHeight;
      } else if (htmlEl.style.display !== 'none') {
        // For HTML content, get first image/video or use container size
        const htmlImg = htmlEl.querySelector('img');
        const htmlVid = htmlEl.querySelector('video');
        if (htmlImg) {
          contentW = htmlImg.naturalWidth || htmlImg.width || 800;
          contentH = htmlImg.naturalHeight || htmlImg.height || 600;
          displayW = htmlImg.width || htmlImg.clientWidth;
          displayH = htmlImg.height || htmlImg.clientHeight;
        } else if (htmlVid) {
          contentW = htmlVid.videoWidth || 800;
          contentH = htmlVid.videoHeight || 600;
          displayW = htmlVid.width || htmlVid.clientWidth;
          displayH = htmlVid.height || htmlVid.clientHeight;
        } else {
          // Fallback to viewport
          contentW = window.innerWidth;
          contentH = window.innerHeight;
          displayW = window.innerWidth;
          displayH = window.innerHeight;
        }
      }
      
      if (!contentW || !contentH) {
        contentW = 800;
        contentH = 600;
      }
      if (!displayW || !displayH) {
        displayW = contentW;
        displayH = contentH;
      }
      
      gridCanvas.width = contentW;
      gridCanvas.height = contentH;
      gridCanvas.style.width = displayW + 'px';
      gridCanvas.style.height = displayH + 'px';
      
      gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      gridCtx.strokeStyle = color;
      gridCtx.globalAlpha = opacity;
      gridCtx.lineWidth = 1;
      
      for (let x = 0; x <= gridCanvas.width; x += size) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, gridCanvas.height);
        gridCtx.stroke();
      }
      
      for (let y = 0; y <= gridCanvas.height; y += size) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(gridCanvas.width, y);
        gridCtx.stroke();
      }
    }
    
    // Fog of War controls
    document.getElementById('fog-toggle').addEventListener('change', (e) => {
      fogEnabled = e.target.checked;
      fogCanvas.style.display = fogEnabled ? 'block' : 'none';
      // When fog is enabled, fog canvas needs pointer events to capture drawing
      fogCanvas.style.pointerEvents = fogEnabled ? 'auto' : 'none';
      if (fogEnabled) initFog();
    });
    
    document.getElementById('fog-size').addEventListener('input', (e) => {
      fogRevealSize = parseInt(e.target.value);
      document.getElementById('fog-size-value').textContent = fogRevealSize + 'px';
    });
    
    document.getElementById('fog-reset').addEventListener('click', initFog);
    document.getElementById('fog-reveal-all').addEventListener('click', () => {
      fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    });
    
    function initFog() {
      // Fog canvas covers the entire viewport (fixed position)
      fogCanvas.width = window.innerWidth;
      fogCanvas.height = window.innerHeight;
      fogCanvas.style.width = window.innerWidth + 'px';
      fogCanvas.style.height = window.innerHeight + 'px';
      
      // Simple solid dark fog - no textures to save memory
      fogCtx.fillStyle = '#000000';
      fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    }
    
    // Reinit fog on window resize (simplified - doesn't preserve revealed areas to save memory)
    window.addEventListener('resize', () => {
      if (fogEnabled) {
        initFog();
      }
      if (gridEnabled) drawGrid();
    });
    
    function revealFogAt(e) {
      // Fog canvas is fixed to viewport, so use clientX/clientY directly
      const x = e.clientX;
      const y = e.clientY;
      
      // Use clearRect in a circular pattern by using clip
      fogCtx.save();
      fogCtx.beginPath();
      fogCtx.arc(x, y, fogRevealSize, 0, Math.PI * 2);
      fogCtx.clip();
      fogCtx.clearRect(x - fogRevealSize, y - fogRevealSize, fogRevealSize * 2, fogRevealSize * 2);
      fogCtx.restore();
    }
    
    // Export
    document.getElementById('export-btn').addEventListener('click', exportImage);
    
    function exportImage() {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, 0, 0);
      if (gridEnabled) ctx.drawImage(gridCanvas, 0, 0);
      if (fogEnabled) ctx.drawImage(fogCanvas, 0, 0);
      
      const link = document.createElement('a');
      link.download = 'vtt-export-' + Date.now() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    
    // Image load handler
    img.onload = () => {
      if (gridEnabled) drawGrid();
      if (fogEnabled) initFog();
      // Fit to viewport when new image loads
      fitContentToViewport();
    };
    
    // Video load handler
    video.onloadedmetadata = () => {
      if (gridEnabled) drawGrid();
      if (fogEnabled) initFog();
      fitContentToViewport();
    };
    
    // Message handling from plugin
    window.addEventListener('message', (ev) => {
      if (!ev.data || ev.data.plugin !== 'vtt-card-display') return;
      
      if (ev.data.type === 'show') {
        try { console.log('popout show', ev.data); } catch (e) {}
        // Reset rotation for new content
        currentRotation = 0;
        document.getElementById('rotation-display').textContent = '0\xB0';
        
        const src = ev.data.src || '';
        const isVideo = src && (src.startsWith('data:video') || /\\.(mp4|webm|ogg|mov)$/i.test(src));
        
        // Handle videos
        if (isVideo) {
          img.style.display = 'none';
          htmlEl.style.display = 'none';
          video.style.display = 'block';
          try { video.src = src; } catch (e) { console.error('video.src set error', e); }
          video.load();
          video.play().catch((err) => { try { console.error('video play error', err); } catch(e){} });
        }
        // Handle images - with or without 'kind' property
        else if (ev.data.kind === 'image' || ev.data.kind === 'card' || ev.data.kind === 'map' || (!ev.data.kind && src)) {
          video.pause();
          video.src = '';
          video.style.display = 'none';
          img.style.display = 'block';
          htmlEl.style.display = 'none';
          try { img.src = src; } catch (e) { console.error('img.src set error', e); }
        } else if (ev.data.kind === 'html') {
          video.pause();
          video.src = '';
          video.style.display = 'none';
          img.style.display = 'none';
          htmlEl.style.display = 'block';
          htmlEl.innerHTML = ev.data.html || '';
        }
        
        // Handle player info content
        if (ev.data.playerInfo) {
          playerInfoContent = ev.data.playerInfo;
          updatePlayerInfoOverlay();
        } else {
          playerInfoContent = '';
          updatePlayerInfoOverlay();
        }
        
        // attach error handlers for debug
        img.onerror = (err) => { try { console.error('img error', err, img.src); } catch (e) {} };
        video.onerror = (err) => { try { console.error('video error', err, video.src); } catch (e) {} };

        updateTransform();
      }
      
      if (ev.data.type === 'showHTML') {
        // Reset rotation for new content
        currentRotation = 0;
        document.getElementById('rotation-display').textContent = '0\xB0';
        
        video.pause();
        video.src = '';
        video.style.display = 'none';
        img.style.display = 'none';
        htmlEl.style.display = 'block';
        htmlEl.innerHTML = ev.data.html || '';
        
        // Check if HTML contains images/videos - if so, it's a map projection
        // Otherwise it's a statblock and should be scrollable
        const hasMedia = htmlEl.querySelector('img, video');
        if (hasMedia) {
          htmlEl.classList.remove('scrollable');
        } else {
          htmlEl.classList.add('scrollable');
        }
        
        // Handle player info for HTML content
        if (ev.data.playerInfo) {
          playerInfoContent = ev.data.playerInfo;
          updatePlayerInfoOverlay();
        }
        
        updateTransform();
      }
      
      if (ev.data.type === 'settings') {
        if (ev.data.gridSize) document.getElementById('grid-size').value = ev.data.gridSize;
        if (ev.data.gridColor) document.getElementById('grid-color').value = ev.data.gridColor;
        if (ev.data.gridOpacity) document.getElementById('grid-opacity').value = Math.round(ev.data.gridOpacity * 100);
        if (ev.data.fogRevealSize) {
          fogRevealSize = ev.data.fogRevealSize;
          document.getElementById('fog-size').value = fogRevealSize;
        }
        if (typeof ev.data.showPlayerInfo === 'boolean') {
          showPlayerInfo = ev.data.showPlayerInfo;
          document.getElementById('player-info-toggle').checked = showPlayerInfo;
          updatePlayerInfoOverlay();
        }
        if (gridEnabled) drawGrid();
      }
    });
    
    // Request current content
    if (window.opener) {
      window.opener.postMessage({ plugin: 'vtt-card-display', type: 'requestCurrent' }, '*');
    }
  <\/script>
</body>
</html>`;
}

// src/main.ts
var VttCardDisplay = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    /** Loaded card entries (image files from Cards folder) */
    this.cards = [];
    /** Loaded map entries (images/notes from Maps folder) */
    this.maps = [];
    this.current = 0;
    this.popoutWindow = null;
    // Window or in-app proxy
    this.inAppPopoutEl = null;
    this.inAppWindowProxy = null;
    this._lastPopoutBlobUrl = null;
    this._registeredItemCommands = /* @__PURE__ */ new Set();
  }
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    await this.loadCards();
    await this.loadMaps();
    this.addCommand({ id: "vtt-open-popout", name: "Open Cards Popout", callback: () => this.openPopout() });
    this.addCommand({ id: "vtt-close-popout", name: "Close Popout", callback: () => this.closePopout() });
    this.addCommand({ id: "vtt-popout-save-position", name: "Save popout position (from current popout)", callback: () => this.savePopoutPosition() });
    this.addCommand({ id: "vtt-popout-move-second-monitor", name: "Move popout to second monitor (approx)", callback: () => this.movePopoutToSecondMonitor() });
    this.addCommand({ id: "vtt-open-card-viewer", name: "Open Card Viewer Pane", callback: () => this.openViewerPane() });
    this.addRibbonIcon("projector", "VTT Card Viewer", () => {
      this.openViewerPane();
    });
    this.addSettingTab(new VttCardDisplaySettingTab(this.app, this));
    window.addEventListener("message", (ev) => {
      if (!ev.data || ev.data.plugin !== "vtt-card-display")
        return;
      if (ev.data.type === "next")
        this.nextCard();
      if (ev.data.type === "prev")
        this.prevCard();
      if (ev.data.type === "requestCurrent") {
        if (this._suppressNextRequest) {
          this._suppressNextRequest = false;
          return;
        }
        this.sendCurrentToPopout();
      }
    });
    try {
      this.registerMarkdownPostProcessor((el, ctx) => {
        try {
          const regex = /\[\[project:([^\]]+)\]\]/g;
          el.querySelectorAll("div, p").forEach((node) => {
            if (!node.innerHTML || !regex.test(node.innerHTML))
              return;
            node.innerHTML = node.innerHTML.replace(regex, (m, id) => {
              const item = (this.settings.items || []).find((x) => x.id === id);
              const label = item ? item.title : `Project ${id}`;
              return `<button class="vtt-project-btn" data-id="${id}">${label}</button>`;
            });
          });
          el.querySelectorAll(".vtt-project-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const id = e.currentTarget.dataset.id;
              this.projectItemById(id);
            });
          });
        } catch (e) {
        }
      });
    } catch (e) {
    }
    try {
      this.registerMarkdownCodeBlockProcessor("vtt-project", (source, el, ctx) => {
        const config = source.trim();
        const lines = config.split("\n").map((l) => l.trim()).filter((l) => l);
        let buttonText = "\u{1F5A5}\uFE0F Project to Screen";
        let style = "default";
        for (const line of lines) {
          if (line.startsWith("text:")) {
            buttonText = line.substring(5).trim();
          } else if (line.startsWith("style:")) {
            style = line.substring(6).trim();
          }
        }
        const container = el.createDiv({ cls: "vtt-project-block" });
        const containerStyles = {
          default: "display:flex;justify-content:center;padding:12px;",
          minimal: "display:inline-block;",
          large: "display:flex;justify-content:center;padding:20px;"
        };
        container.style.cssText = containerStyles[style] || containerStyles.default;
        const btn = container.createEl("button", { cls: "vtt-project-note-btn" });
        btn.textContent = buttonText;
        const buttonStyles = {
          default: "padding:10px 20px;font-size:14px;background:var(--interactive-accent);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:500;transition:all 150ms ease;box-shadow:0 2px 8px rgba(0,0,0,0.2);",
          minimal: "padding:6px 12px;font-size:12px;background:var(--background-secondary);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:4px;cursor:pointer;",
          large: "padding:16px 32px;font-size:18px;background:linear-gradient(135deg,var(--interactive-accent),var(--interactive-accent-hover));color:var(--text-on-accent);border:none;border-radius:12px;cursor:pointer;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);"
        };
        btn.style.cssText = buttonStyles[style] || buttonStyles.default;
        btn.addEventListener("mouseenter", () => {
          btn.style.transform = "translateY(-2px)";
          btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.transform = "translateY(0)";
          btn.style.boxShadow = style === "large" ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.2)";
        });
        btn.addEventListener("click", async () => {
          const filePath = ctx.sourcePath;
          if (filePath) {
            btn.textContent = "\u23F3 Loading...";
            btn.style.opacity = "0.7";
            await this.projectNoteByPath(filePath);
            setTimeout(() => {
              btn.textContent = buttonText;
              btn.style.opacity = "1";
            }, 500);
          } else {
            new import_obsidian.Notice("Could not determine note path");
          }
        });
      });
    } catch (e) {
    }
    this.addCommand({ id: "vtt-project-current-statblock", name: "Project current file (rendered)", callback: () => this.projectCurrentFileAsRendered() });
    this.addCommand({ id: "vtt-project-current-image", name: "Project first image in current note", callback: () => this.projectFirstImageInCurrentFile() });
    this.addCommand({
      id: "vtt-search-monster-image",
      name: "Search D&D Monster Image...",
      callback: () => this.openMonsterImageSearch()
    });
    this.addCommand({
      id: "vtt-search-battle-map",
      name: "Search Battle Map...",
      callback: () => this.openBattleMapSearch()
    });
    this._registerItemCommands();
    this.registerInterval(window.setInterval(() => {
      if (this.popoutWindow && this.popoutWindow.closed)
        this.popoutWindow = null;
    }, 2e3));
    this.registerEvent(this.app.vault.on("delete", async (file) => {
      if (file instanceof import_obsidian.TFile && IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())) {
        const videoExtensions = ["mp4", "webm", "ogg", "mov"];
        if (videoExtensions.includes(file.extension.toLowerCase())) {
          const safeName = file.path.replace(/[\/\\:*?"<>|]/g, "_");
          const thumbnailPath = `_vtt_thumbnails/thumb_${safeName}.jpg`;
          const thumbnailFile = this.app.vault.getAbstractFileByPath(thumbnailPath);
          if (thumbnailFile instanceof import_obsidian.TFile) {
            try {
              await this.app.vault.delete(thumbnailFile);
              console.log("Deleted thumbnail:", thumbnailPath);
            } catch (e) {
              console.error("Failed to delete thumbnail:", e);
            }
          }
        }
      }
    }));
    try {
      this.registerView("vtt-card-view", (leaf) => new CardView(leaf, this));
    } catch (e) {
    }
  }
  onunload() {
    if (this.popoutWindow && !this.popoutWindow.closed && typeof this.popoutWindow.close === "function")
      this.popoutWindow.close();
    try {
      this.app.workspace.detachLeavesOfType("vtt-card-view");
    } catch (e) {
    }
    this.closeInAppPopout();
  }
  createInAppPopout() {
    if (this.inAppPopoutEl)
      return;
    const el = document.createElement("div");
    el.className = "vtt-inapp-popout";
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.zIndex = "99999";
    el.style.background = "#0b0b0b";
    el.style.color = "#fff";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    const header = document.createElement("div");
    header.style.padding = "8px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    header.style.background = "#00000088";
    const title = document.createElement("div");
    title.textContent = "VTT Cards";
    title.style.fontWeight = "bold";
    const controls = document.createElement("div");
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "\u25C0 Prev";
    prevBtn.style.marginRight = "6px";
    prevBtn.addEventListener("click", () => this.prevCard());
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next \u25B6";
    nextBtn.style.marginRight = "6px";
    nextBtn.addEventListener("click", () => this.nextCard());
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.closeInAppPopout());
    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);
    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.style.display = "flex";
    content.style.justifyContent = "center";
    content.style.alignItems = "center";
    content.style.padding = "12px";
    const img = document.createElement("img");
    img.id = "vtt-inapp-img";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.display = "block";
    content.style.position = "relative";
    content.appendChild(img);
    let _inapp_rot = 0;
    const applyInappRotation = () => {
      try {
        const imgEl = content.querySelector("img");
        const vidEl = content.querySelector("video");
        const el2 = imgEl && imgEl.style.display !== "none" ? imgEl : vidEl && vidEl.style.display !== "none" ? vidEl : null;
        if (el2) {
          const h = el2;
          h.style.transformOrigin = "center center";
          h.style.transform = `rotate(${_inapp_rot}deg)`;
          try {
            const container = content;
            const rect = container.getBoundingClientRect();
            const cw = rect.width;
            const ch = rect.height;
            const natW = h.naturalWidth || h.videoWidth || 0;
            const natH = h.naturalHeight || h.videoHeight || 0;
            const isRotated = _inapp_rot % 180 !== 0;
            if (natW && natH) {
              let scale;
              if (!isRotated)
                scale = Math.min(cw / natW, ch / natH);
              else
                scale = Math.min(cw / natH, ch / natW);
              try {
              } catch (e) {
              }
              h.style.width = Math.round(natW * scale) + "px";
              h.style.height = Math.round(natH * scale) + "px";
              h.style.maxWidth = "none";
              h.style.maxHeight = "none";
              h.style.margin = "auto";
              try {
                const pf = h.closest && h.closest(".img-frame");
                if (pf && pf.style) {
                  pf.style.display = "flex";
                  pf.style.alignItems = "center";
                  pf.style.justifyContent = "center";
                  pf.style.height = "100%";
                  pf.style.width = "100%";
                  pf.style.overflow = "hidden";
                }
              } catch (e) {
              }
            } else {
              if (isRotated) {
                h.style.height = "100%";
                h.style.width = "auto";
                h.style.maxWidth = "none";
                h.style.maxHeight = "100%";
              } else {
                h.style.width = "100%";
                h.style.height = "auto";
                h.style.maxWidth = "100%";
                h.style.maxHeight = "100%";
              }
            }
          } catch (e) {
          }
        }
      } catch (e) {
      }
    };
    const showInappRotate = (transientMs = 1200) => {
      try {
        const rotateBtnEl = document.getElementById("vtt-inapp-rotate");
        if (!rotateBtnEl)
          return;
        rotateBtnEl.style.transform = "translateY(0)";
        rotateBtnEl.style.opacity = "1";
        if (transientMs)
          setTimeout(() => {
            rotateBtnEl.style.transform = "translateY(-120%)";
            rotateBtnEl.style.opacity = "0";
          }, transientMs);
      } catch (e) {
      }
    };
    const createInappRotateButton = () => {
      const rotateBtn = document.createElement("button");
      rotateBtn.id = "vtt-inapp-rotate";
      rotateBtn.textContent = "\u293E";
      rotateBtn.title = "Rotate image";
      rotateBtn.style.position = "absolute";
      rotateBtn.style.top = "12px";
      rotateBtn.style.right = "12px";
      rotateBtn.style.zIndex = "10000";
      rotateBtn.style.background = "rgba(255,255,255,0.08)";
      rotateBtn.style.color = "#fff";
      rotateBtn.style.border = "1px solid rgba(255,255,255,0.12)";
      rotateBtn.style.padding = "8px";
      rotateBtn.style.borderRadius = "8px";
      rotateBtn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.6)";
      rotateBtn.style.pointerEvents = "auto";
      rotateBtn.style.transform = "translateY(-120%)";
      rotateBtn.style.transition = "transform 220ms ease, opacity 220ms ease";
      rotateBtn.style.opacity = "0";
      rotateBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        _inapp_rot = (_inapp_rot + 90) % 360;
        applyInappRotation();
        showInappRotate(1500);
      });
      el.appendChild(rotateBtn);
      return rotateBtn;
    };
    const ensureInappRotate = () => {
      if (!document.getElementById("vtt-inapp-rotate"))
        createInappRotateButton();
    };
    ensureInappRotate();
    content.addEventListener("mouseenter", () => showInappRotate(0));
    content.addEventListener("mouseleave", () => {
      const r = document.getElementById("vtt-inapp-rotate");
      if (r) {
        r.style.transform = "translateY(-120%)";
        r.style.opacity = "0";
      }
    });
    el.appendChild(header);
    el.appendChild(content);
    document.body.appendChild(el);
    this.inAppPopoutEl = el;
    this.inAppWindowProxy = {
      closed: false,
      postMessage: (msg) => {
        if (!msg || !msg.type)
          return;
        if (msg.type === "show") {
          const i = el.querySelector("#vtt-inapp-img");
          if (i) {
            i.style.display = "block";
            i.src = msg.src || "";
            try {
              const contentEl = content;
              if (contentEl && i && (!i.parentElement || !i.parentElement.classList.contains("img-frame"))) {
                const f = document.createElement("div");
                f.className = "img-frame";
                f.style.width = "100%";
                f.style.height = "100%";
                f.style.display = "flex";
                f.style.alignItems = "center";
                f.style.justifyContent = "center";
                f.style.overflow = "hidden";
                f.style.boxSizing = "border-box";
                i.parentElement && i.parentElement.replaceChild(f, i);
                f.appendChild(i);
              }
              i.addEventListener("load", () => {
                try {
                  _inapp_rot = 0;
                  applyInappRotation();
                  showInappRotate(1500);
                } catch (e) {
                }
              });
            } catch (e) {
            }
          }
          try {
            ensureInappRotate();
            _inapp_rot = 0;
            applyInappRotation();
            showInappRotate(1500);
          } catch (e) {
          }
        } else if (msg.type === "showHTML") {
          const i = el.querySelector("#vtt-inapp-img");
          if (i)
            i.style.display = "none";
          content.innerHTML = msg.html || "";
          try {
            ensureInappRotate();
            const imgs = content.getElementsByTagName("img");
            const vids = content.getElementsByTagName("video");
            if (imgs && imgs.length > 0 || vids && vids.length > 0) {
              _inapp_rot = 0;
              applyInappRotation();
              showInappRotate(1500);
              for (let i2 = 0; i2 < imgs.length; i2++) {
                try {
                  imgs[i2].addEventListener("load", () => {
                    showInappRotate(1500);
                  });
                  imgs[i2].addEventListener("error", () => {
                  });
                } catch (e) {
                }
              }
              for (let v = 0; v < vids.length; v++) {
                try {
                  vids[v].addEventListener("loadeddata", () => {
                    showInappRotate(1500);
                  });
                  vids[v].addEventListener("error", () => {
                  });
                } catch (e) {
                }
              }
            }
          } catch (e) {
          }
        } else if (msg.type === "requestCurrent") {
          this.sendCurrentToPopout();
        }
      },
      focus: () => {
        if (this.inAppPopoutEl)
          this.inAppPopoutEl.focus();
      },
      close: () => this.closeInAppPopout()
    };
    this.popoutWindow = this.inAppWindowProxy;
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight")
        this.nextCard();
      if (e.key === "ArrowLeft")
        this.prevCard();
      if (e.key === "Escape")
        this.closeInAppPopout();
    });
    el.tabIndex = -1;
    setTimeout(() => this.sendCurrentToPopout(), 100);
  }
  closeInAppPopout() {
    if (this.inAppPopoutEl) {
      try {
        document.body.removeChild(this.inAppPopoutEl);
      } catch (e) {
      }
      this.inAppPopoutEl = null;
    }
    if (this.inAppWindowProxy) {
      this.inAppWindowProxy.closed = true;
      this.inAppWindowProxy = null;
    }
    if (this.popoutWindow && this.popoutWindow === this.inAppWindowProxy)
      this.popoutWindow = null;
  }
  async _convertFileToDataUrl(path) {
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!file)
        throw new Error("file not found: " + path);
      const data = await this.app.vault.readBinary(file);
      let bytes;
      if (data instanceof Uint8Array)
        bytes = data;
      else if (data instanceof ArrayBuffer)
        bytes = new Uint8Array(data);
      else if (typeof data === "string") {
        const encoder = new TextEncoder();
        bytes = encoder.encode(data);
      } else
        bytes = new Uint8Array(0);
      const b64 = this._uint8ArrayToBase64(bytes);
      const mime = this._mimeForPath(path) || "application/octet-stream";
      return `data:${mime};base64,${b64}`;
    } catch (e) {
      try {
        const entry = this.cards.find((c) => c.path === path) || this.maps.find((m) => m.path === path);
        if (entry && entry.src && entry.src.startsWith("app://")) {
          const withoutQuery = entry.src.split("?")[0];
          const absPath = withoutQuery.replace(/^app:\/\/[^\/]+\//, "/");
          try {
            const req = globalThis.require || null;
            if (req) {
              const fs = req("fs");
              const buf = fs.readFileSync(absPath);
              const globalBuffer = globalThis.Buffer;
              const b64 = typeof globalBuffer !== "undefined" && globalBuffer.from ? globalBuffer.from(buf).toString("base64") : this._uint8ArrayToBase64(new Uint8Array(buf));
              const mime = this._mimeForPath(path) || "application/octet-stream";
              return `data:${mime};base64,${b64}`;
            }
          } catch (fsErr) {
          }
        }
        const srcUrl = this.cards.find((c) => c.path === path)?.src || this.maps.find((m) => m.path === path)?.src;
        if (!srcUrl)
          throw e;
        const resp = await fetch(srcUrl);
        if (!resp.ok)
          throw new Error("fetch failed " + resp.status);
        const blob = await resp.blob();
        return await this._blobToDataUrl(blob);
      } catch (e2) {
        throw e2;
      }
    }
  }
  _uint8ArrayToBase64(u8) {
    let s = "";
    const chunk = 32768;
    for (let i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, Array.prototype.slice.call(u8, i, i + chunk));
    }
    return btoa(s);
  }
  _blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  async _convertFileToPopoutUrl(path) {
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!file)
        throw new Error("file not found: " + path);
      const data = await this.app.vault.readBinary(file);
      let blob;
      const mime = this._mimeForPath(path) || "application/octet-stream";
      if (data instanceof Uint8Array) {
        blob = new Blob([data], { type: mime });
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([new Uint8Array(data)], { type: mime });
      } else if (typeof data === "string") {
        blob = new Blob([data], { type: mime });
      } else {
        blob = new Blob([], { type: mime });
      }
      const url = URL.createObjectURL(blob);
      return url;
    } catch (e) {
      try {
        return await this._convertFileToDataUrl(path);
      } catch (e2) {
        throw e2;
      }
    }
  }
  _mimeForPath(path) {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "bmp":
        return "image/bmp";
      case "tif":
      case "tiff":
        return "image/tiff";
      case "ico":
        return "image/x-icon";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "ogg":
        return "video/ogg";
      case "mov":
        return "video/quicktime";
      default:
        return null;
    }
  }
  /**
   * Get or create a cached video thumbnail.
   * Thumbnails are stored in the vault's _thumbnails folder (hidden with underscore).
   * Returns the app:// URL to the cached thumbnail, or null if it couldn't be created.
   */
  async _getOrCreateVideoThumbnail(videoPath) {
    try {
      const videoFile = this.app.vault.getAbstractFileByPath(videoPath);
      if (!videoFile)
        return null;
      const safeFileName = videoPath.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 100);
      const thumbnailFileName = `thumb_${safeFileName}.jpg`;
      const thumbnailFolder = "_vtt_thumbnails";
      const thumbnailPath = `${thumbnailFolder}/${thumbnailFileName}`;
      const existingThumb = this.app.vault.getAbstractFileByPath(thumbnailPath);
      if (existingThumb) {
        return this.app.vault.getResourcePath(existingThumb);
      }
      try {
        const folder = this.app.vault.getAbstractFileByPath(thumbnailFolder);
        if (!folder) {
          await this.app.vault.createFolder(thumbnailFolder);
        }
      } catch (e) {
      }
      const videoUrl = this.app.vault.getResourcePath(videoFile);
      const thumbnailData = await this._extractVideoFrame(videoUrl);
      if (!thumbnailData)
        return null;
      const base64Data = thumbnailData.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await this.app.vault.createBinary(thumbnailPath, bytes);
      const newThumb = this.app.vault.getAbstractFileByPath(thumbnailPath);
      if (newThumb) {
        return this.app.vault.getResourcePath(newThumb);
      }
      return null;
    } catch (e) {
      console.error("Failed to get/create video thumbnail:", e);
      return null;
    }
  }
  /**
   * Extract a single frame from a video URL and return as base64 JPEG
   */
  async _extractVideoFrame(videoUrl) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";
      const timeout = setTimeout(() => {
        video.src = "";
        resolve(null);
      }, 1e4);
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      video.onseeked = () => {
        try {
          clearTimeout(timeout);
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
            video.src = "";
            resolve(thumbnail);
          } else {
            video.src = "";
            resolve(null);
          }
        } catch (e) {
          console.error("Error extracting video frame:", e);
          video.src = "";
          resolve(null);
        }
      };
      video.onerror = () => {
        clearTimeout(timeout);
        video.src = "";
        resolve(null);
      };
      video.src = videoUrl;
      video.load();
    });
  }
  // Convert resource URLs inside rendered HTML to inline data URLs when possible
  async _inlineResourcesInHtml(html, contextPath) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      let contextDir = "";
      if (contextPath) {
        const lastSlash = contextPath.lastIndexOf("/");
        contextDir = lastSlash > 0 ? contextPath.substring(0, lastSlash) : "";
      }
      const spans = Array.from(doc.querySelectorAll("span.internal-embed"));
      for (const span of spans) {
        const src = span.getAttribute("src");
        const alt = span.getAttribute("alt") || "image";
        if (!src)
          continue;
        try {
          let dataUrl = null;
          let foundFile = null;
          foundFile = this.app.vault.getAbstractFileByPath(src);
          if (!foundFile && contextDir) {
            const fullPath = contextDir + "/" + src;
            foundFile = this.app.vault.getAbstractFileByPath(fullPath);
          }
          if (!foundFile) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && activeFile.parent) {
              const parentPath = activeFile.parent.path;
              const fullPath = parentPath ? parentPath + "/" + src : src;
              foundFile = this.app.vault.getAbstractFileByPath(fullPath);
            }
          }
          if (!foundFile) {
            const baseName = src.split("/").pop();
            const allFiles = this.app.vault.getFiles();
            foundFile = allFiles.find((f) => f.name === baseName || f.path.endsWith(src));
          }
          if (foundFile) {
            dataUrl = await this._convertFileToDataUrl(foundFile.path);
          }
          if (dataUrl) {
            const img = doc.createElement("img");
            img.setAttribute("src", dataUrl);
            img.setAttribute("alt", alt);
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            span.parentNode?.replaceChild(img, span);
          } else {
          }
        } catch (e) {
        }
      }
      const imgs = Array.from(doc.getElementsByTagName("img"));
      for (const img of imgs) {
        const src = img.getAttribute("src") || "";
        if (!src || src.startsWith("data:"))
          continue;
        try {
          const data = await this._urlToDataUrl(src);
          if (data)
            img.setAttribute("src", data);
        } catch (e) {
        }
      }
      const videos = Array.from(doc.getElementsByTagName("video"));
      for (const v of videos) {
        const s = v.getAttribute("src");
        if (s && !s.startsWith("data:")) {
          try {
            const data = await this._urlToDataUrl(s);
            if (data) {
              v.setAttribute("src", data);
            } else if (s.startsWith("app://")) {
            }
          } catch (e) {
          }
        }
        const sources = Array.from(v.getElementsByTagName("source"));
        for (const srcEl of sources) {
          const s2 = srcEl.getAttribute("src");
          if (!s2 || s2.startsWith("data:"))
            continue;
          try {
            const data = await this._urlToDataUrl(s2);
            if (data)
              srcEl.setAttribute("src", data);
          } catch (e) {
          }
        }
      }
      for (const img of imgs) {
        const ss = img.getAttribute("srcset");
        if (!ss)
          continue;
        try {
          const parts = ss.split(",").map((p) => p.trim()).map((p) => {
            const [url, desc] = p.split(/\s+/);
            return { url, desc };
          });
          for (const p of parts) {
            try {
              const data = await this._urlToDataUrl(p.url);
              if (data)
                p.url = data;
            } catch (e) {
            }
          }
          const newSrcSet = parts.map((p) => p.url + (p.desc ? " " + p.desc : "")).join(", ");
          img.setAttribute("srcset", newSrcSet);
        } catch (e) {
        }
      }
      try {
        const scripts = Array.from(doc.getElementsByTagName("script"));
        for (const s of scripts) {
          s.parentNode?.removeChild(s);
        }
      } catch (e) {
      }
      return doc.body.innerHTML;
    } catch (e) {
      return html;
    }
  }
  // Convert a URL (possibly app:// or remote) to a data URL when possible
  // For in-app popouts, returns app:// URLs without conversion for large files
  async _urlToDataUrl(url) {
    try {
      if (!url)
        return null;
      const clean = url.split("?")[0];
      const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
      if (isInAppPopout && url.startsWith("app://")) {
        return url;
      }
      const all = [].concat(this.cards || [], this.maps || []);
      for (const entry of all) {
        if (entry && entry.src && entry.src.split("?")[0] === clean) {
          if (entry.path) {
            try {
              return await this._convertFileToDataUrl(entry.path);
            } catch (e) {
            }
          }
        }
      }
      if (!/^([a-zA-Z]+:)?\/\//.test(url) && !url.startsWith("data:")) {
        let candidate = url;
        try {
          let file = this.app.vault.getAbstractFileByPath(candidate);
          if (!file && this.app.workspace.getActiveFile()) {
            const base = this.app.workspace.getActiveFile().parent?.path || "";
            candidate = base.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
            file = this.app.vault.getAbstractFileByPath(candidate);
          }
          if (file) {
            const filePath = file.path;
            try {
              return await this._convertFileToDataUrl(filePath);
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok)
          throw new Error("fetch failed " + resp.status);
        const blob = await resp.blob();
        return await this._blobToDataUrl(blob);
      } catch (e) {
      }
      return null;
    } catch (e) {
      return null;
    }
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
  _extractNoteContentForProjection(content, includePlayerInfo) {
    const lines = content.split("\n");
    const result = [];
    let currentSection = "main";
    for (const line of lines) {
      const headerMatch = line.match(/^(#+)\s*(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[2].toLowerCase().trim();
        if (headerText.includes("player info") || headerText.includes("player-info") || headerText.includes("playerinfo") || headerText === "player infos") {
          currentSection = "player";
          if (includePlayerInfo) {
            result.push(line);
          }
          continue;
        } else if (headerText.includes("dm info") || headerText.includes("dm-info") || headerText.includes("dminfo") || headerText.includes("gm info") || headerText.includes("gamemaster") || headerText === "dm") {
          currentSection = "dm";
          continue;
        } else {
          currentSection = "main";
        }
      }
      if (currentSection === "main") {
        result.push(line);
      } else if (currentSection === "player" && includePlayerInfo) {
        result.push(line);
      }
    }
    return result.join("\n");
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
  _parseNoteContent(content, includePlayerInfo) {
    const cleanedContent = content.replace(/```vtt-project[\s\S]*?```/g, "");
    const lines = cleanedContent.split("\n");
    const imageLines = [];
    const playerInfoLines = [];
    let currentSection = "main";
    for (const line of lines) {
      const headerMatch = line.match(/^(#+)\s*(.*)$/);
      if (headerMatch) {
        const headerText = headerMatch[2].toLowerCase().trim();
        if (headerText.includes("dm info") || headerText.includes("dm-info") || headerText.includes("dminfo") || headerText.includes("gm info") || headerText.includes("gamemaster") || headerText === "dm" || headerText.startsWith("dm info") || headerText.startsWith("dm-info") || headerText === "story" || headerText.includes("dm note") || headerText === "story generator") {
          currentSection = "dm";
          continue;
        }
        if (headerText.includes("player info") || headerText.includes("player-info") || headerText.includes("playerinfo") || headerText.startsWith("player info") || headerText === "player infos" || headerText === "player info" || headerText.includes("introduction to player") || headerText.includes("player introduction") || headerText.includes("to player") || headerText.includes("for player")) {
          currentSection = "player";
          if (!headerText.match(/^player\s*info/)) {
            playerInfoLines.push(line);
          }
          continue;
        }
      }
      if (currentSection === "main") {
        imageLines.push(line);
      } else if (currentSection === "player" && includePlayerInfo) {
        playerInfoLines.push(line);
      }
    }
    return {
      imageContent: imageLines.join("\n"),
      playerInfoContent: playerInfoLines.join("\n")
    };
  }
  /**
   * Build HTML for note projection with image/video centered and text in top-right box
   */
  _buildNoteProjectionHtml(imageHtml, playerInfoHtml) {
    const infoBoxStyle = `position:absolute!important;top:16px!important;right:16px!important;max-width:350px!important;max-height:60%!important;overflow-y:auto!important;background:rgba(0,0,0,0.9)!important;border:2px solid rgba(255,255,255,0.3)!important;border-radius:8px!important;padding:16px 20px!important;color:#fff!important;font-size:14px!important;line-height:1.6!important;box-shadow:0 4px 24px rgba(0,0,0,0.7)!important;z-index:9999!important;text-align:left!important;`;
    const containerStyle = `position:relative!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;`;
    const mediaStyle = `position:relative!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;`;
    let html = `<div class="vtt-note-container" style="${containerStyle}">`;
    html += `<div class="vtt-note-image" style="${mediaStyle}">${imageHtml}</div>`;
    if (playerInfoHtml && playerInfoHtml.trim()) {
      html += `<div class="vtt-player-info-box" style="${infoBoxStyle}">${playerInfoHtml}</div>`;
    }
    html += "</div>";
    return html;
  }
  /**
   * Resolve ![[image]] and ![[video]] links in markdown content to actual file paths.
   * Also handles video file extensions for proper rendering.
   */
  _resolveEmbeddedMedia(content, noteDir) {
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov"];
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
      const allFiles = this.app.vault.getFiles();
      const baseName = filename.split("/").pop();
      const isVideo = videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
      let foundFile = null;
      if (noteDir) {
        const relativePath = noteDir + "/" + filename;
        foundFile = this.app.vault.getAbstractFileByPath(relativePath);
      }
      if (!foundFile) {
        foundFile = this.app.vault.getAbstractFileByPath(filename);
      }
      if (!foundFile) {
        const fileMatches = allFiles.filter((f) => f.name === baseName || f.path.endsWith(filename));
        if (fileMatches.length > 0) {
          foundFile = fileMatches[0];
        }
      }
      if (!foundFile) {
        const candidates = [
          "images/" + baseName,
          "_resources/" + baseName
        ];
        for (const candidate of candidates) {
          const f = this.app.vault.getAbstractFileByPath(candidate);
          if (f) {
            foundFile = f;
            break;
          }
        }
      }
      if (foundFile) {
        if (isVideo) {
          const resourceUrl = this.app.vault.getResourcePath(foundFile);
          return `<video controls autoplay muted loop style="max-width:100%;max-height:100%;display:block;margin:auto"><source src="${resourceUrl}" type="video/${foundFile.extension}"></video>`;
        }
        return `![${filename}](${foundFile.path})`;
      }
      if (isVideo) {
        return `<video controls style="max-width:100%;max-height:100%"><source src="${filename}"></video>`;
      }
      return `![${filename}](${filename})`;
    });
  }
  /** Check if a file path contains an underscore-prefixed folder (to be ignored) */
  _isInIgnoredFolder(filePath, baseFolder) {
    const relativePath = baseFolder ? filePath.substring(baseFolder.length + 1) : filePath;
    const parts = relativePath.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].startsWith("_"))
        return true;
    }
    return false;
  }
  /** Load card image files from the configured Cards folder */
  async loadCards() {
    const folder = (this.settings.folderPath || "").trim();
    const files = this.app.vault.getFiles();
    this.cards = files.filter((f) => folder === "" || f.path.startsWith(folder + "/")).filter((f) => !this._isInIgnoredFolder(f.path, folder)).filter((f) => IMAGE_EXTENSIONS.some((e) => f.name.toLowerCase().endsWith(e))).map((f) => ({ src: this.app.vault.getResourcePath(f), path: f.path }));
    this.current = 0;
  }
  /** Load map files (images and markdown) from the configured Maps folder */
  async loadMaps() {
    const folder = (this.settings.mapsFolderPath || "").trim();
    const files = this.app.vault.getFiles();
    const mapExtensions = [...IMAGE_EXTENSIONS, ".md"];
    this.maps = files.filter((f) => folder === "" || f.path.startsWith(folder + "/")).filter((f) => !this._isInIgnoredFolder(f.path, folder)).filter((f) => mapExtensions.some((e) => f.name.toLowerCase().endsWith(e))).map((f) => ({ src: f.extension === "md" ? void 0 : this.app.vault.getResourcePath(f), path: f.path, title: f.name.replace(/\.[^.]+$/, "") }));
  }
  /** Close the popout window */
  closePopout() {
    if (this.inAppPopoutEl) {
      this.closeInAppPopout();
      return;
    }
    if (this.popoutWindow && !this.popoutWindow.closed) {
      try {
        this.popoutWindow.close();
      } catch (e) {
      }
      this.popoutWindow = null;
      new import_obsidian.Notice("Popout closed");
    } else {
      new import_obsidian.Notice("No popout open");
    }
  }
  /** Open or focus the popout window */
  openPopout(suppressInitialSend = false) {
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.focus();
      if (!suppressInitialSend)
        this.sendCurrentToPopout();
      this.sendSettingsToPopout();
      return;
    }
    if (suppressInitialSend) {
      this._suppressNextRequest = true;
      setTimeout(() => {
        this._suppressNextRequest = false;
      }, 2e3);
    }
    const html = buildPopoutHtml(this.settings);
    try {
      const ep = this.tryOpenElectronWindow(html);
      if (ep) {
        this.popoutWindow = ep;
        if (!suppressInitialSend)
          setTimeout(() => this.sendCurrentToPopout(), 300);
        setTimeout(() => this.sendSettingsToPopout(), 350);
        return;
      }
    } catch (e) {
    }
    const opts = `width=${this.settings.popoutWidth},height=${this.settings.popoutHeight},left=${this.settings.popoutLeft},top=${this.settings.popoutTop}`;
    try {
      this.popoutWindow = window.open("", "vtt-card-popout", opts);
      if (this.popoutWindow) {
        try {
          this.popoutWindow.document.open();
          this.popoutWindow.document.write(html);
          this.popoutWindow.document.close();
        } catch (e) {
          new globalThis.Notice("Could not initialize popout content");
        }
        if (!suppressInitialSend)
          setTimeout(() => this.sendCurrentToPopout(), 300);
        setTimeout(() => this.sendSettingsToPopout(), 350);
        return;
      }
      this.popoutWindow = window.open("about:blank", "vtt-card-popout", opts);
      if (this.popoutWindow) {
        try {
          this.popoutWindow.document.open();
          this.popoutWindow.document.write(html);
          this.popoutWindow.document.close();
        } catch (e) {
        }
        if (!suppressInitialSend)
          setTimeout(() => this.sendCurrentToPopout(), 300);
        setTimeout(() => this.sendSettingsToPopout(), 350);
        return;
      }
      try {
        const w = window.open("", "vtt-card-popout", opts);
        if (w && w.document) {
          try {
            w.document.open();
            w.document.write('<!doctype html><html><body><div id="vtt-iframe-root"></div></body></html>');
            w.document.close();
            const iframe = w.document.createElement("iframe");
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";
            iframe.srcdoc = html;
            const root = w.document.getElementById("vtt-iframe-root");
            if (root)
              root.appendChild(iframe);
            this.popoutWindow = w;
            if (!suppressInitialSend)
              setTimeout(() => this.sendCurrentToPopout(), 300);
            setTimeout(() => this.sendSettingsToPopout(), 350);
            return;
          } catch (e) {
          }
        }
      } catch (e) {
      }
      new globalThis.Notice("Could not open external popout (blocked). Opening in-app popout instead.");
      this.createInAppPopout();
    } catch (e) {
      new globalThis.Notice("Could not open popout window");
    }
  }
  tryOpenElectronWindow(html) {
    try {
      const req = window.require || (globalThis.require ? globalThis.require : null);
      if (!req) {
        return null;
      }
      const tryNames = ["electron", "@electron/remote"];
      let electron = null;
      for (const n of tryNames) {
        try {
          electron = req(n);
          if (electron) {
            break;
          }
        } catch (e) {
        }
      }
      if (!electron) {
        return null;
      }
      const BrowserWindow = electron.BrowserWindow || electron.remote && electron.remote.BrowserWindow || electron.remote && electron.remote.getCurrentWindow && electron.remote.getCurrentWindow().constructor;
      if (!BrowserWindow) {
        return null;
      }
      const win = new BrowserWindow({ width: this.settings.popoutWidth || 800, height: this.settings.popoutHeight || 600, x: this.settings.popoutLeft, y: this.settings.popoutTop, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      try {
        try {
          win.loadURL("about:blank");
        } catch (e) {
        }
        const safeHtml = JSON.stringify(html);
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
              win.webContents && win.webContents.executeJavaScript && win.webContents.executeJavaScript(inject).then(() => {
              }).catch((err) => {
              });
            } catch (e) {
            }
            try {
              win.show && win.show();
            } catch (e) {
            }
          };
          if (win.webContents && typeof win.webContents.once === "function") {
            win.webContents.once("dom-ready", () => {
              exec();
              try {
                proxy._ready = true;
                if (proxy._pending && proxy._pending.length) {
                  const arr = proxy._pending.splice(0);
                  arr.forEach((m) => {
                    try {
                      win.webContents.executeJavaScript(`(window._vtt_handle && window._vtt_handle(${JSON.stringify(m)}))`).catch(() => {
                      });
                    } catch (e) {
                    }
                  });
                }
              } catch (e) {
              }
            });
          } else
            exec();
        } catch (e) {
        }
      } catch (e) {
      }
      const pending = [];
      const proxy = {
        closed: false,
        _ready: false,
        _pending: pending,
        postMessage: (msg) => {
          try {
            if (!proxy._ready) {
              pending.push(msg);
              return;
            }
            win.webContents && win.webContents.executeJavaScript && win.webContents.executeJavaScript(`(window._vtt_handle && window._vtt_handle(${JSON.stringify(msg)}))`).catch(() => {
            });
          } catch (e) {
          }
        },
        focus: () => {
          try {
            win.focus && win.focus();
          } catch (e) {
          }
        },
        close: () => {
          try {
            win.close && win.close();
            proxy.closed = true;
          } catch (e) {
          }
        }
      };
      try {
        win.on && win.on("closed", () => {
          proxy.closed = true;
          if (this.popoutWindow === proxy)
            this.popoutWindow = null;
        });
      } catch (e) {
      }
      return proxy;
    } catch (e) {
      return null;
    }
  }
  tryForcedExternalPopout() {
    const html = buildPopoutHtml(this.settings);
    const ep = this.tryOpenElectronWindow(html);
    if (ep) {
      this.popoutWindow = ep;
      new globalThis.Notice("Opened external popout via Electron.");
      setTimeout(() => this.sendCurrentToPopout(), 300);
      return;
    }
    new globalThis.Notice("Could not open external popout via Electron. See README for instructions to enable BrowserWindow fallback (AppImage/non-sandboxed).");
  }
  // Send grid and fog settings to popout
  sendSettingsToPopout() {
    if (!this.popoutWindow || this.popoutWindow.closed)
      return;
    try {
      this.popoutWindow.postMessage({
        plugin: "vtt-card-display",
        type: "settings",
        gridSize: this.settings.gridSize ?? 50,
        gridColor: this.settings.gridColor ?? "#ffffff",
        gridOpacity: this.settings.gridOpacity ?? 0.3,
        fogRevealSize: this.settings.fogRevealSize ?? 30,
        showPlayerInfo: this.settings.showPlayerInfo ?? false
      }, "*");
    } catch (e) {
    }
  }
  async sendCurrentToPopout() {
    if (!this.popoutWindow || this.popoutWindow.closed)
      return;
    const entry = this.cards[this.current];
    if (!entry) {
      if (!this.cards || this.cards.length === 0) {
        new globalThis.Notice("No cards available to project \u2014 add images to the Cards folder or set the folder path in settings");
        return;
      }
      try {
        this.popoutWindow.postMessage({ plugin: "vtt-card-display", type: "showHTML", html: '<div style="color:#fff;padding:24px;text-align:center">No card image available</div>' }, "*");
      } catch (e) {
      }
      return;
    }
    let src = null;
    if (typeof entry === "string")
      src = entry;
    else if (entry && typeof entry.src === "string")
      src = entry.src;
    else
      src = null;
    const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
    if (isInAppPopout && src && src.startsWith("app://")) {
      try {
        const message = { plugin: "vtt-card-display", type: "show", src };
        this.popoutWindow.postMessage(message, "*");
        this._suppressNextRequest = true;
        setTimeout(() => {
          this._suppressNextRequest = false;
        }, 500);
      } catch (e) {
      }
      return;
    }
    if ((!src || src.startsWith("app://") || src.startsWith("file://")) && entry && entry.path) {
      try {
        try {
          if (this._lastPopoutBlobUrl) {
            URL.revokeObjectURL(this._lastPopoutBlobUrl);
            this._lastPopoutBlobUrl = null;
          }
        } catch (e) {
        }
        src = await this._convertFileToPopoutUrl(entry.path);
        if (src && src.startsWith("blob:"))
          this._lastPopoutBlobUrl = src;
      } catch (e) {
      }
    }
    if (src && src.startsWith("app://") && entry && entry.path) {
      try {
        src = await this._convertFileToPopoutUrl(entry.path);
        if (src && src.startsWith("blob:"))
          this._lastPopoutBlobUrl = src;
      } catch (e) {
      }
    }
    if (!src) {
      try {
        this.popoutWindow.postMessage({ plugin: "vtt-card-display", type: "showHTML", html: '<div style="color:#fff;padding:24px;text-align:center">Unable to resolve card image</div>' }, "*");
      } catch (e) {
      }
      return;
    }
    try {
      let outSrc = src;
      if (!isInAppPopout && entry && entry.path) {
        try {
          if (this._lastPopoutBlobUrl) {
            try {
              URL.revokeObjectURL(this._lastPopoutBlobUrl);
            } catch (e) {
            }
            this._lastPopoutBlobUrl = null;
          }
          outSrc = await this._convertFileToPopoutUrl(entry.path);
          if (outSrc && outSrc.startsWith("blob:"))
            this._lastPopoutBlobUrl = outSrc;
        } catch (e) {
          outSrc = src;
        }
      }
      let kind = void 0;
      try {
        const mime = this._mimeForPath(entry?.path || "") || "";
        if (mime.startsWith("video/"))
          kind = "video";
        else if (mime.startsWith("image/"))
          kind = "image";
      } catch (e) {
      }
      const message = { plugin: "vtt-card-display", type: "show", src: outSrc, kind };
      this.popoutWindow.postMessage(message, "*");
      this._suppressNextRequest = true;
      setTimeout(() => {
        this._suppressNextRequest = false;
      }, 500);
    } catch (e) {
    }
  }
  nextCard() {
    if (!this.cards || this.cards.length === 0)
      return;
    this.current = (this.current + 1) % this.cards.length;
    this.sendCurrentToPopout();
  }
  prevCard() {
    if (!this.cards || this.cards.length === 0)
      return;
    this.current = (this.current - 1 + this.cards.length) % this.cards.length;
    this.sendCurrentToPopout();
  }
  // Project helpers
  async projectItemById(id) {
    const item = (this.settings.items || []).find((x) => x.id === id);
    if (!item) {
      new import_obsidian.Notice(`Item ${id} not found`);
      return;
    }
    try {
      if (item.type === "image") {
        const file = this.app.vault.getAbstractFileByPath(item.value);
        if (!file) {
          new globalThis.Notice("Image file not found: " + item.value);
          return;
        }
        let src = this.app.vault.getResourcePath(file);
        try {
          src = await this._convertFileToDataUrl(file.path);
        } catch (e) {
        }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "image", src, title: item.title });
      } else if (item.type === "statblock") {
        const file = this.app.vault.getAbstractFileByPath(item.value);
        if (!file) {
          new globalThis.Notice("Note not found: " + item.value);
          return;
        }
        const content = await this.app.vault.read(file);
        this.openPopout(true);
        const div = document.createElement("div");
        await import_obsidian.MarkdownRenderer.renderMarkdown(content, div, file.path, this);
        const inlined = await this._inlineResourcesInHtml(div.innerHTML);
        await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "showHTML", html: inlined, title: item.title });
      } else if (item.type === "note-image") {
        const path = item.value || (this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : null);
        if (!path) {
          new globalThis.Notice("No note to find image from");
          return;
        }
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
          new globalThis.Notice("Note not found: " + path);
          return;
        }
        const md = await this.app.vault.read(file);
        const m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
        if (!m) {
          new import_obsidian.Notice("No image found in note");
          return;
        }
        const imgPath = m[1];
        const target = this.app.vault.getAbstractFileByPath(imgPath) || this.app.vault.getAbstractFileByPath((file.parent && file.parent.path ? file.parent.path + "/" : "") + imgPath);
        if (!target) {
          new globalThis.Notice("Image not found: " + imgPath);
          return;
        }
        let src = this.app.vault.getResourcePath(target);
        try {
          src = await this._convertFileToDataUrl(target.path);
        } catch (e) {
        }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "image", src, title: item.title });
      } else if (item.type === "card") {
        const cardPath = item.value;
        if (!cardPath) {
          new globalThis.Notice("No card selected");
          return;
        }
        const entry = (this.cards || []).find((c) => c.path === cardPath);
        if (!entry) {
          new globalThis.Notice("Card not found: " + cardPath);
          return;
        }
        let src = entry.src;
        if (entry.path && (entry.path.toLowerCase().endsWith(".mp4") || entry.path.toLowerCase().endsWith(".png") || entry.path.toLowerCase().endsWith(".jpg") || entry.path.toLowerCase().endsWith(".jpeg") || entry.path.toLowerCase().endsWith(".svg") || entry.path.toLowerCase().endsWith(".webp") || entry.path.toLowerCase().endsWith(".gif"))) {
          try {
            src = await this._convertFileToDataUrl(entry.path);
          } catch (e) {
          }
        }
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "card", src, title: item.title });
      } else if (item.type === "map") {
        const mapPath = item.value;
        if (!mapPath) {
          new globalThis.Notice("No map selected");
          return;
        }
        const entry = (this.maps || []).find((c) => c.path === mapPath);
        if (!entry) {
          new globalThis.Notice("Map not found: " + mapPath);
          return;
        }
        if (entry.path && entry.path.toLowerCase().endsWith(".md")) {
          const file = this.app.vault.getAbstractFileByPath(entry.path);
          if (!file) {
            new globalThis.Notice("Map note not found: " + entry.path);
            return;
          }
          const content = await this.app.vault.read(file);
          this.openPopout(true);
          const div = document.createElement("div");
          await import_obsidian.MarkdownRenderer.renderMarkdown(content, div, file.path, this);
          await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "showHTML", html: div.innerHTML, title: item.title });
        } else {
          let src = entry.src;
          try {
            if (entry.path)
              src = await this._convertFileToDataUrl(entry.path);
          } catch (e) {
          }
          this.openPopout(true);
          await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "map", src, title: item.title });
        }
      } else if (item.type === "note") {
        const notePath = item.value;
        if (!notePath) {
          new globalThis.Notice("No note selected");
          return;
        }
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (!file) {
          new globalThis.Notice("Note not found: " + notePath);
          return;
        }
        const rawContent = await this.app.vault.read(file);
        const noteDir = file.parent && file.parent.path ? file.parent.path : "";
        const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, this.settings.showPlayerInfo || false);
        const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, noteDir);
        const imageDiv = document.createElement("div");
        await import_obsidian.MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
        const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
        let inlinedPlayerInfo = "";
        if (playerInfoContent.trim()) {
          const infoDiv = document.createElement("div");
          await import_obsidian.MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
          inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
        }
        const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, "");
        this.openPopout(true);
        await this._sendToPopoutWhenReady({
          plugin: "vtt-card-display",
          type: "showHTML",
          html: combinedHtml,
          title: item.title || file.basename,
          playerInfo: inlinedPlayerInfo || ""
        });
      }
    } catch (e) {
      new import_obsidian.Notice("Error projecting item: " + (e && e.message));
    }
  }
  async projectCurrentFileAsRendered() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active file");
      return;
    }
    const content = await this.app.vault.read(file);
    this.openPopout(true);
    const div = document.createElement("div");
    await import_obsidian.MarkdownRenderer.renderMarkdown(content, div, file.path, this);
    setTimeout(async () => {
      const selectors = this.settings.statblockSelectors && this.settings.statblockSelectors.trim() ? this.settings.statblockSelectors.split(",").map((s) => s.trim()).filter(Boolean) : [".statblock", ".stat-block", ".quickmonster", ".qm", ".statblock-render", ".statblock-container"];
      let found = null;
      for (const s of selectors) {
        try {
          const el = div.querySelector(s);
          if (el) {
            found = el;
            break;
          }
        } catch (e) {
        }
      }
      let html;
      if (found && found.innerHTML) {
        html = found.outerHTML;
      } else {
        const codeMatch = content.match(/```(?:statblock|stat-block)\n([\s\S]*?)```/i);
        if (codeMatch) {
          const tmp = document.createElement("div");
          await import_obsidian.MarkdownRenderer.renderMarkdown(codeMatch[0], tmp, file.path, this);
          html = tmp.innerHTML || div.innerHTML;
        } else {
          html = div.innerHTML;
        }
      }
      this.openPopout(true);
      const inlined = await this._inlineResourcesInHtml(html);
      await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "showHTML", html: inlined, title: file.basename });
    }, 120);
  }
  /** Wait for popout window to be ready and send a message */
  async _sendToPopoutWhenReady(message, maxWaitMs = 2e3) {
    const startTime = Date.now();
    const checkInterval = 50;
    while (Date.now() - startTime < maxWaitMs) {
      if (this.popoutWindow && !this.popoutWindow.closed) {
        try {
          this.popoutWindow.postMessage(message, "*");
          this._suppressNextRequest = true;
          setTimeout(() => {
            this._suppressNextRequest = false;
          }, 500);
          return true;
        } catch (e) {
        }
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
    return false;
  }
  /**
   * Project any note file as a map/note to the popout display.
   * This works for any note in the vault, not just registered maps.
   * Used by the ```vtt-project``` code block.
   * @param notePath Path to the note file
   */
  async projectNoteByPath(notePath) {
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (!file) {
      new globalThis.Notice("Note not found: " + notePath);
      return;
    }
    const rawContent = await this.app.vault.read(file);
    const noteDir = file.parent && file.parent.path ? file.parent.path : "";
    const title = file.basename || notePath.split("/").pop()?.replace(".md", "") || "Note";
    const showPlayerInfo = this.settings.showPlayerInfo ?? true;
    const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, showPlayerInfo);
    const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, noteDir);
    const imageDiv = document.createElement("div");
    await import_obsidian.MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
    const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
    let inlinedPlayerInfo = "";
    if (playerInfoContent.trim()) {
      const infoDiv = document.createElement("div");
      await import_obsidian.MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
      inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
    }
    const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, "");
    this.openPopout(true);
    await this._sendToPopoutWhenReady({
      plugin: "vtt-card-display",
      type: "showHTML",
      html: combinedHtml,
      title,
      playerInfo: inlinedPlayerInfo || ""
    });
    this._suppressNextRequest = true;
    setTimeout(() => {
      this._suppressNextRequest = false;
    }, 1e3);
  }
  async projectMapByPath(mapPath) {
    const entry = (this.maps || []).find((m) => m.path === mapPath);
    if (!entry) {
      new globalThis.Notice("Map not found: " + mapPath);
      return;
    }
    if (entry.path && entry.path.toLowerCase().endsWith(".md")) {
      const file = this.app.vault.getAbstractFileByPath(entry.path);
      if (!file) {
        new globalThis.Notice("Map note not found: " + entry.path);
        return;
      }
      const rawContent = await this.app.vault.read(file);
      const mapDir = file.parent && file.parent.path ? file.parent.path : "";
      const { imageContent, playerInfoContent } = this._parseNoteContent(rawContent, this.settings.showPlayerInfo || false);
      const resolvedImageContent = this._resolveEmbeddedMedia(imageContent, mapDir);
      const imageDiv = document.createElement("div");
      await import_obsidian.MarkdownRenderer.renderMarkdown(resolvedImageContent, imageDiv, file.path, this);
      const inlinedImage = await this._inlineResourcesInHtml(imageDiv.innerHTML, file.path);
      let inlinedPlayerInfo = "";
      if (playerInfoContent.trim()) {
        const infoDiv = document.createElement("div");
        await import_obsidian.MarkdownRenderer.renderMarkdown(playerInfoContent, infoDiv, file.path, this);
        inlinedPlayerInfo = await this._inlineResourcesInHtml(infoDiv.innerHTML, file.path);
      }
      const combinedHtml = this._buildNoteProjectionHtml(inlinedImage, "");
      this.openPopout(true);
      await this._sendToPopoutWhenReady({
        plugin: "vtt-card-display",
        type: "showHTML",
        html: combinedHtml,
        title: entry.title,
        playerInfo: inlinedPlayerInfo || ""
      });
      this._suppressNextRequest = true;
      setTimeout(() => {
        this._suppressNextRequest = false;
      }, 1e3);
    } else {
      let src = entry.src;
      const isInAppPopout = this.popoutWindow === this.inAppWindowProxy;
      if (isInAppPopout && src && src.startsWith("app://")) {
        this.openPopout(true);
        await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "map", src, title: entry.title });
        this._suppressNextRequest = true;
        setTimeout(() => {
          this._suppressNextRequest = false;
        }, 1e3);
        return;
      }
      try {
        if (entry.path) {
          src = await this._convertFileToDataUrl(entry.path);
        }
      } catch (e) {
      }
      this.openPopout(true);
      await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "map", src, title: entry.title });
      this._suppressNextRequest = true;
      setTimeout(() => {
        this._suppressNextRequest = false;
      }, 1e3);
    }
  }
  async projectFirstImageInCurrentFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active file");
      return;
    }
    const md = await this.app.vault.read(file);
    const m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (!m) {
      new globalThis.Notice("No image found in note");
      return;
    }
    const imgPath = m[1];
    const target = this.app.vault.getAbstractFileByPath(imgPath) || this.app.vault.getAbstractFileByPath((file.parent && file.parent.path ? file.parent.path + "/" : "") + imgPath);
    if (!target) {
      new globalThis.Notice("Image not found: " + imgPath);
      return;
    }
    let src = this.app.vault.getResourcePath(target);
    try {
      src = await this._convertFileToDataUrl(target.path);
    } catch (e) {
    }
    this.openPopout(true);
    await this._sendToPopoutWhenReady({ plugin: "vtt-card-display", type: "show", kind: "image", src, title: file.basename });
  }
  async savePopoutPosition() {
    if (!this.popoutWindow || this.popoutWindow.closed) {
      new globalThis.Notice("No popout open");
      return;
    }
    try {
      const left = typeof this.popoutWindow.screenX !== "undefined" ? this.popoutWindow.screenX : this.popoutWindow.screenLeft || 0;
      const top = typeof this.popoutWindow.screenY !== "undefined" ? this.popoutWindow.screenY : this.popoutWindow.screenTop || 0;
      const width = this.popoutWindow.outerWidth || this.popoutWindow.innerWidth || this.settings.popoutWidth;
      const height = this.popoutWindow.outerHeight || this.popoutWindow.innerHeight || this.settings.popoutHeight;
      this.settings.popoutLeft = left;
      this.settings.popoutTop = top;
      this.settings.popoutWidth = width;
      this.settings.popoutHeight = height;
      await this.saveData(this.settings);
      new globalThis.Notice("Saved popout position");
    } catch (e) {
      new globalThis.Notice("Error saving popout position");
    }
  }
  async movePopoutToSecondMonitor() {
    try {
      const left = window.screen && window.screen.width ? window.screen.width + 10 : this.settings.popoutLeft + 1920;
      this.settings.popoutLeft = left;
      await this.saveData(this.settings);
      if (this.popoutWindow && !this.popoutWindow.closed && typeof this.popoutWindow.moveTo === "function")
        this.popoutWindow.moveTo(this.settings.popoutLeft, this.settings.popoutTop);
      new globalThis.Notice("Moved popout position to approx second monitor");
    } catch (e) {
      new globalThis.Notice("Could not move popout");
    }
  }
  async openViewerPane() {
    try {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: "vtt-card-view", active: true });
      this.app.workspace.revealLeaf(leaf);
    } catch (e) {
    }
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
  async searchMonsterImages(monsterName) {
    const results = [];
    try {
      const [localResults, dndBeyondResults, fandomResults, artStationResults, deviantArtResults, redditResults] = await Promise.all([
        searchLocalVault(this.app.vault, monsterName),
        searchDndBeyond(monsterName),
        searchFandomWikis(monsterName),
        searchArtStation(monsterName),
        searchDeviantArt(monsterName),
        searchReddit(monsterName)
      ]);
      results.push(...localResults);
      results.push(...dndBeyondResults);
      results.push(...fandomResults);
      results.push(...artStationResults);
      results.push(...deviantArtResults);
      results.push(...redditResults);
    } catch (e) {
    }
    return deduplicateResults(results);
  }
  /**
   * Project a monster image directly to the popout
   */
  async projectMonsterImage(imageUrl, monsterName) {
    try {
      let src = imageUrl;
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          src = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
      }
      this.openPopout(true);
      const message = {
        plugin: "vtt-card-display",
        type: "show",
        kind: "image",
        src,
        title: monsterName
      };
      await this._sendToPopoutWhenReady(message);
    } catch (e) {
      new import_obsidian.Notice("Failed to project monster image");
    }
  }
  /**
   * Download and save a monster image to the vault
   * Uses Obsidian's requestUrl to bypass CORS restrictions
   */
  async saveMonsterImage(imageUrl, monsterName) {
    try {
      const response = await (0, import_obsidian.requestUrl)({ url: imageUrl, method: "GET" });
      if (!response.arrayBuffer || response.arrayBuffer.byteLength === 0) {
        throw new Error("Could not fetch image");
      }
      const arrayBuffer = response.arrayBuffer;
      const contentType = (response.headers["content-type"] || "").toLowerCase();
      let ext = "";
      const urlLower = imageUrl.toLowerCase();
      const urlMatch = urlLower.match(/\.([a-z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        const urlExt = urlMatch[1];
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(urlExt)) {
          ext = urlExt === "jpeg" ? "jpg" : urlExt;
        }
      }
      if (!ext) {
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          ext = "jpg";
        } else if (contentType.includes("gif")) {
          ext = "gif";
        } else if (contentType.includes("webp")) {
          ext = "webp";
        } else {
          ext = "png";
        }
      }
      const safeName = monsterName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, "").trim().substring(0, 50) || "monster";
      const safeFileName = safeName.replace(/\s+/g, "_").toLowerCase();
      const timestamp = Date.now();
      const fileName = `${safeFileName}_${timestamp}.${ext}`;
      const cardsFolder = this.settings.folderPath || "Cards";
      const folderPath = `${cardsFolder}/images`;
      const filePath = `${folderPath}/${fileName}`;
      try {
        const folder = this.app.vault.getAbstractFileByPath(cardsFolder);
        if (!folder) {
          await this.app.vault.createFolder(cardsFolder);
        }
      } catch (e) {
      }
      try {
        const imagesFolder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!imagesFolder) {
          await this.app.vault.createFolder(folderPath);
        }
      } catch (e) {
      }
      await this.app.vault.createBinary(filePath, new Uint8Array(arrayBuffer));
      new import_obsidian.Notice(`Saved: ${filePath}`);
      await this.loadCards();
      return filePath;
    } catch (e) {
      console.error("Failed to save monster image:", e);
      new import_obsidian.Notice("Failed to save monster image - CORS or network error");
      return null;
    }
  }
  /**
   * Search for battle maps from various sources
   * @param query Search query
   * @param animatedOnly If true, only return animated maps (GIF, MP4, WebM)
   */
  async searchBattleMaps(query, animatedOnly = false) {
    const results = [];
    const searches = await Promise.allSettled([
      this._searchRedditBattlemaps(query, animatedOnly),
      this._searchRedditAnimatedMaps(query, animatedOnly),
      // Additional animated search
      this._search2MinuteTabletop(query, animatedOnly),
      // 2-Minute Tabletop
      this._searchDynamicDungeons(query, animatedOnly),
      // Dynamic Dungeons for animated
      this._searchDeviantArtMaps(query, animatedOnly),
      this._searchImgurMaps(query, animatedOnly)
    ]);
    for (const result of searches) {
      if (result.status === "fulfilled" && result.value) {
        results.push(...result.value);
      }
    }
    const seen = /* @__PURE__ */ new Set();
    return results.filter((r) => {
      if (seen.has(r.url))
        return false;
      seen.add(r.url);
      return true;
    });
  }
  /**
   * Additional search specifically for animated battle maps
   */
  async _searchRedditAnimatedMaps(query, animatedOnly) {
    if (!animatedOnly)
      return [];
    const results = [];
    try {
      const searches = [
        `${query} animated`,
        `${query} gif`,
        `animated battle map ${query}`
      ];
      for (const searchTerms of searches) {
        const searchQuery = encodeURIComponent(searchTerms);
        const url = `https://www.reddit.com/r/battlemaps+dndmaps+dungeondraft/search.json?q=${searchQuery}&restrict_sr=1&limit=25&sort=top&t=year`;
        const response = await fetch(url, {
          headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
        });
        if (response.ok) {
          const data = await response.json();
          const posts = data?.data?.children || [];
          for (const post of posts) {
            const postData = post.data;
            if (!postData)
              continue;
            let imageUrl = "";
            let thumbnail = "";
            let isAnimated = false;
            if (postData.preview?.images?.[0]?.source?.url) {
              thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
            } else if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
              thumbnail = postData.thumbnail;
            }
            if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
              isAnimated = true;
            } else if (postData.url && /\.gif$/i.test(postData.url)) {
              imageUrl = postData.url;
              isAnimated = true;
            } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
              imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, "&");
              isAnimated = true;
            } else if (postData.preview?.images?.[0]?.variants?.gif?.source?.url) {
              imageUrl = postData.preview.images[0].variants.gif.source.url.replace(/&amp;/g, "&");
              isAnimated = true;
            }
            if (isAnimated && imageUrl) {
              results.push({
                url: imageUrl,
                title: postData.title || "Animated Battle Map",
                source: "Reddit (Animated)",
                thumbnail: thumbnail || void 0
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
  async _searchRedditBattlemaps(query, animatedOnly = false) {
    const results = [];
    try {
      const searchTerms = animatedOnly ? `${query} animated` : `${query} battle map`;
      const searchQuery = encodeURIComponent(searchTerms);
      const subreddit = animatedOnly ? "battlemaps+dndmaps" : "battlemaps";
      const sortParam = animatedOnly ? "top&t=all" : "relevance";
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchQuery}&restrict_sr=1&limit=50&sort=${sortParam}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
      });
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          const postData = post.data;
          if (!postData)
            continue;
          let imageUrl = "";
          let isAnimated = false;
          const isAnimatedUrl = (url2) => /\.(gif|mp4|webm|gifv)$/i.test(url2) || url2.includes("v.redd.it");
          const isImageUrl = (url2) => /\.(jpg|jpeg|png|gif|webp|mp4|webm|gifv)$/i.test(url2);
          if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
            imageUrl = postData.media.reddit_video.fallback_url;
            isAnimated = true;
          } else if (postData.url && postData.url.includes("v.redd.it")) {
            if (postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
            } else {
              imageUrl = postData.secure_media?.reddit_video?.fallback_url || "";
            }
            isAnimated = true;
          } else if (postData.url && /\.gif$/i.test(postData.url)) {
            imageUrl = postData.url;
            isAnimated = true;
          } else if (postData.url && isImageUrl(postData.url)) {
            if (postData.url.endsWith(".gifv")) {
              imageUrl = postData.url.replace(".gifv", ".mp4");
              isAnimated = true;
            } else {
              imageUrl = postData.url;
              isAnimated = isAnimatedUrl(postData.url);
            }
          } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
            imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, "&");
            isAnimated = true;
          } else if (postData.preview?.images?.[0]?.variants?.gif?.source?.url) {
            imageUrl = postData.preview.images[0].variants.gif.source.url.replace(/&amp;/g, "&");
            isAnimated = true;
          } else if (!animatedOnly) {
            if (postData.preview?.images?.[0]?.source?.url) {
              imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
            } else if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
              if (postData.url_overridden_by_dest && isImageUrl(postData.url_overridden_by_dest)) {
                imageUrl = postData.url_overridden_by_dest;
              }
            }
          }
          let thumbnail = "";
          if (postData.preview?.images?.[0]?.source?.url) {
            thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
          } else if (postData.thumbnail && postData.thumbnail.startsWith("http") && postData.thumbnail !== "self" && postData.thumbnail !== "default") {
            thumbnail = postData.thumbnail;
          }
          if (animatedOnly && !isAnimated) {
            continue;
          }
          if (imageUrl) {
            results.push({
              url: imageUrl,
              title: postData.title || "Battle Map",
              source: isAnimated ? "Reddit (Animated)" : "Reddit r/battlemaps",
              thumbnail: isAnimated && thumbnail ? thumbnail : void 0
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
  async _search2MinuteTabletop(query, animatedOnly) {
    if (animatedOnly)
      return [];
    const results = [];
    try {
      const searchTerms = encodeURIComponent(`site:2minutetabletop.com ${query} battle map`);
      const url = `https://www.google.com/search?q=${searchTerms}&tbm=isch`;
      const redditUrl = `https://www.reddit.com/r/battlemaps/search.json?q=${encodeURIComponent(query + " 2minutetabletop OR 2-minute")}&restrict_sr=1&limit=15&sort=top&t=year`;
      const response = await fetch(redditUrl, {
        headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
      });
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          const postData = post.data;
          if (!postData)
            continue;
          let imageUrl = "";
          if (postData.url && /\.(jpg|jpeg|png|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
          }
          if (imageUrl && (postData.title?.toLowerCase().includes("2minute") || postData.title?.toLowerCase().includes("2-minute") || postData.url?.includes("2minutetabletop"))) {
            results.push({
              url: imageUrl,
              title: postData.title || "Battle Map",
              source: "2-Minute Tabletop",
              thumbnail: postData.thumbnail && postData.thumbnail.startsWith("http") ? postData.thumbnail : void 0
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
  async _searchDynamicDungeons(query, animatedOnly) {
    const results = [];
    try {
      const searchTerms = animatedOnly ? `${query} dynamic dungeons animated OR video` : `${query} dynamic dungeons`;
      const redditUrl = `https://www.reddit.com/r/battlemaps+dndmaps+FoundryVTT/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&limit=20&sort=top&t=year`;
      const response = await fetch(redditUrl, {
        headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
      });
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          const postData = post.data;
          if (!postData)
            continue;
          let imageUrl = "";
          let thumbnail = "";
          let isAnimated = false;
          if (postData.preview?.images?.[0]?.source?.url) {
            thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
          } else if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
            thumbnail = postData.thumbnail;
          }
          if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
            imageUrl = postData.media.reddit_video.fallback_url;
            isAnimated = true;
          } else if (postData.url && /\.gif$/i.test(postData.url)) {
            imageUrl = postData.url;
            isAnimated = true;
          } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
            imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, "&");
            isAnimated = true;
          } else if (!animatedOnly && postData.url && /\.(jpg|jpeg|png|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (!animatedOnly && postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
          }
          const title = postData.title?.toLowerCase() || "";
          const isDynamic = title.includes("dynamic") || title.includes("animated") || title.includes("video") || postData.url?.includes("dynamic");
          if (imageUrl && (!animatedOnly || isAnimated) && (isDynamic || isAnimated)) {
            results.push({
              url: imageUrl,
              title: postData.title || "Animated Battle Map",
              source: "Dynamic Dungeons",
              thumbnail: thumbnail || void 0
            });
          }
        }
      }
      if (animatedOnly) {
        const livingMapsUrl = `https://www.reddit.com/r/LivingBattleMaps+animatedbattlemaps/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=15&sort=top&t=year`;
        const response2 = await fetch(livingMapsUrl, {
          headers: { "User-Agent": "ObsidianVTTCardDisplay/1.0" }
        });
        if (response2.ok) {
          const data = await response2.json();
          const posts = data?.data?.children || [];
          for (const post of posts) {
            const postData = post.data;
            if (!postData)
              continue;
            let imageUrl = "";
            let thumbnail = "";
            if (postData.preview?.images?.[0]?.source?.url) {
              thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
            } else if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
              thumbnail = postData.thumbnail;
            }
            if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
              imageUrl = postData.media.reddit_video.fallback_url;
            } else if (postData.url && /\.gif$/i.test(postData.url)) {
              imageUrl = postData.url;
            } else if (postData.preview?.images?.[0]?.variants?.mp4?.source?.url) {
              imageUrl = postData.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, "&");
            }
            if (imageUrl) {
              results.push({
                url: imageUrl,
                title: postData.title || "Animated Battle Map",
                source: "Living Battle Maps",
                thumbnail: thumbnail || void 0
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
  async _searchDeviantArtMaps(query, animatedOnly = false) {
    const results = [];
    if (animatedOnly) {
      return results;
    }
    try {
      const searchQuery = encodeURIComponent(query + " battlemap battle map dnd rpg");
      const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=${searchQuery}`;
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const items = doc.querySelectorAll("item");
        items.forEach((item, index) => {
          if (index >= 15)
            return;
          const title = item.querySelector("title")?.textContent || "Battle Map";
          const mediaContent = item.querySelector("content[url]");
          const mediaThumbnail = item.querySelector("thumbnail[url]");
          let imageUrl = "";
          if (mediaContent) {
            imageUrl = mediaContent.getAttribute("url") || "";
          } else if (mediaThumbnail) {
            imageUrl = mediaThumbnail.getAttribute("url") || "";
          }
          const description = item.querySelector("description")?.textContent || "";
          const imgMatch = description.match(/src="([^"]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
          if (imageUrl) {
            results.push({
              url: imageUrl,
              title,
              source: "DeviantArt"
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
  async _searchImgurMaps(query, animatedOnly = false) {
    const results = [];
    try {
      const searchTerms = animatedOnly ? query + " animated battlemap battle map gif" : query + " battlemap battle map dnd";
      const searchQuery = encodeURIComponent(searchTerms);
      const url = `https://imgur.com/search?q=${searchQuery}`;
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        const idMatches = html.matchAll(/data-id="([a-zA-Z0-9]+)"/g);
        let count = 0;
        for (const match of idMatches) {
          if (count >= 10)
            break;
          const id = match[1];
          if (id) {
            results.push({
              url: `https://i.imgur.com/${id}.jpg`,
              title: `Map ${id}`,
              source: "Imgur"
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
  async projectBattleMapImage(imageUrl, mapName) {
    try {
      let src = imageUrl;
      try {
        const response = await (0, import_obsidian.requestUrl)({ url: imageUrl, method: "GET" });
        if (response.arrayBuffer && response.arrayBuffer.byteLength > 0) {
          const contentType = response.headers["content-type"] || "image/png";
          const base64 = (0, import_obsidian.arrayBufferToBase64)(response.arrayBuffer);
          src = `data:${contentType};base64,${base64}`;
        }
      } catch (e) {
      }
      this.openPopout(true);
      const message = {
        plugin: "vtt-card-display",
        type: "show",
        kind: "map",
        src,
        title: mapName
      };
      await this._sendToPopoutWhenReady(message);
    } catch (e) {
      new import_obsidian.Notice("Failed to project battle map");
    }
  }
  /**
   * Download and save a battle map image to the vault and create a map note
   */
  async saveBattleMapImage(imageUrl, mapName) {
    try {
      const response = await (0, import_obsidian.requestUrl)({ url: imageUrl, method: "GET" });
      if (!response.arrayBuffer || response.arrayBuffer.byteLength === 0) {
        throw new Error("Could not fetch image");
      }
      const contentType = (response.headers["content-type"] || "").toLowerCase();
      const arrayBuffer = response.arrayBuffer;
      let ext = "";
      const urlLower = imageUrl.toLowerCase();
      const urlMatch = urlLower.match(/\.([a-z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        const urlExt = urlMatch[1];
        if (["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov", "gifv"].includes(urlExt)) {
          ext = urlExt === "jpeg" ? "jpg" : urlExt === "gifv" ? "mp4" : urlExt;
        }
      }
      if (!ext) {
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          ext = "jpg";
        } else if (contentType.includes("gif")) {
          ext = "gif";
        } else if (contentType.includes("webp")) {
          ext = "webp";
        } else if (contentType.includes("mp4") || contentType.includes("video/mp4")) {
          ext = "mp4";
        } else if (contentType.includes("webm") || contentType.includes("video/webm")) {
          ext = "webm";
        } else if (contentType.includes("video")) {
          ext = "mp4";
        } else {
          ext = "png";
        }
      }
      const safeName = (mapName || "Battle Map").replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, "").trim().substring(0, 50) || "Battle_Map";
      const safeFileName = safeName.replace(/\s+/g, "_").toLowerCase();
      const timestamp = Date.now();
      const imageFileName = `${safeFileName}_${timestamp}.${ext}`;
      const folderPath = this.settings.mapsFolderPath || "Maps";
      const resourcesPath = `${folderPath}/_resources`;
      const imageFilePath = `${resourcesPath}/${imageFileName}`;
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
      try {
        await this.app.vault.createBinary(imageFilePath, new Uint8Array(arrayBuffer));
      } catch (e) {
        throw new Error("Failed to save image: " + (e.message || e));
      }
      const noteFileName = `${safeName}.md`;
      const noteFilePath = `${folderPath}/${noteFileName}`;
      let finalNotePath = noteFilePath;
      const existingNote = this.app.vault.getAbstractFileByPath(noteFilePath);
      if (existingNote) {
        finalNotePath = `${folderPath}/${safeName}_${timestamp}.md`;
      }
      const noteContent = `![[_resources/${imageFileName}]]

# Player Infos

*Beschreibung f\xFCr die Spieler...*



# DM Info

**Quelle:** ${mapName}

*Notizen f\xFCr den DM...*

`;
      try {
        await this.app.vault.create(finalNotePath, noteContent);
      } catch (e) {
        new import_obsidian.Notice(`Image saved but note creation failed: ${imageFilePath}`);
        return imageFilePath;
      }
      new import_obsidian.Notice(`Map saved: ${finalNotePath}`);
      await this.loadMaps();
      try {
        const newFile = this.app.vault.getAbstractFileByPath(finalNotePath);
        if (newFile) {
          await this.app.workspace.getLeaf().openFile(newFile);
        }
      } catch (e) {
      }
      return finalNotePath;
    } catch (e) {
      new import_obsidian.Notice("Failed to save battle map");
      return null;
    }
  }
  _registerItemCommands() {
    (this.settings.items || []).forEach((it) => {
      if (!it.id)
        return;
      if (this._registeredItemCommands.has(it.id))
        return;
      try {
        this.addCommand({ id: `vtt-project-${it.id}`, name: `Project: ${it.title || it.id}`, callback: () => this.projectItemById(it.id) });
        this._registeredItemCommands.add(it.id);
      } catch (e) {
      }
    });
  }
};
var VttCardDisplaySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Cards folder path").setDesc('Relative path in vault to images (e.g., "Cards"). Leave blank to use all images in vault.').addText((text) => text.setPlaceholder("Cards").setValue(this.plugin.settings.folderPath).onChange(async (v) => {
      this.plugin.settings.folderPath = v;
      await this.plugin.saveData(this.plugin.settings);
      await this.plugin.loadCards();
      await this.plugin.loadMaps();
      this.plugin.sendCurrentToPopout();
    }));
    new import_obsidian.Setting(containerEl).setName("Maps folder path").setDesc('Relative path in vault to map pages and media (e.g., "Maps"). Leave blank to use all notes/media in vault.').addText((text) => text.setPlaceholder("Maps").setValue(this.plugin.settings.mapsFolderPath || "").onChange(async (v) => {
      this.plugin.settings.mapsFolderPath = v;
      await this.plugin.saveData(this.plugin.settings);
      await this.plugin.loadMaps();
    }));
    new import_obsidian.Setting(containerEl).setName("Popout left,top,width,height").addText((text) => text.setPlaceholder("left,top,width,height").setValue(`${this.plugin.settings.popoutLeft},${this.plugin.settings.popoutTop},${this.plugin.settings.popoutWidth},${this.plugin.settings.popoutHeight}`).onChange(async (v) => {
      const [l, t, w, h] = v.split(",").map((x) => parseInt(x.trim()) || 0);
      this.plugin.settings.popoutLeft = l;
      this.plugin.settings.popoutTop = t;
      this.plugin.settings.popoutWidth = w;
      this.plugin.settings.popoutHeight = h;
      await this.plugin.saveData(this.plugin.settings);
    }));
    new import_obsidian.Setting(containerEl).setName("Statblock selectors").setDesc("Comma-separated CSS selectors used to locate the statblock in rendered HTML (e.g. .statblock,.quickmonster).").addText((text) => text.setPlaceholder(".statblock,.quickmonster").setValue(this.plugin.settings.statblockSelectors || "").onChange(async (v) => {
      this.plugin.settings.statblockSelectors = v;
      await this.plugin.saveData(this.plugin.settings);
    }));
    new import_obsidian.Setting(containerEl).setName("Show Player Info").setDesc('When enabled, the "# Player Infos" section from notes will be shown in the popout. The "# DM Info" section is never shown.').addToggle((toggle) => toggle.setValue(this.plugin.settings.showPlayerInfo || false).onChange(async (v) => {
      this.plugin.settings.showPlayerInfo = v;
      await this.plugin.saveData(this.plugin.settings);
    }));
    containerEl.createEl("h3", { text: "Grid & Fog of War" });
    new import_obsidian.Setting(containerEl).setName("Default Grid Size").setDesc("Default size of grid squares in pixels (10-200)").addSlider((slider) => slider.setLimits(10, 200, 5).setValue(this.plugin.settings.gridSize ?? 50).setDynamicTooltip().onChange(async (v) => {
      this.plugin.settings.gridSize = v;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.sendSettingsToPopout();
    }));
    new import_obsidian.Setting(containerEl).setName("Default Grid Color").setDesc("Default color of the grid overlay").addColorPicker((picker) => picker.setValue(this.plugin.settings.gridColor ?? "#ffffff").onChange(async (v) => {
      this.plugin.settings.gridColor = v;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.sendSettingsToPopout();
    }));
    new import_obsidian.Setting(containerEl).setName("Default Grid Opacity").setDesc("Default opacity of the grid (5-100%)").addSlider((slider) => slider.setLimits(5, 100, 5).setValue(Math.round((this.plugin.settings.gridOpacity ?? 0.3) * 100)).setDynamicTooltip().onChange(async (v) => {
      this.plugin.settings.gridOpacity = v / 100;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.sendSettingsToPopout();
    }));
    new import_obsidian.Setting(containerEl).setName("Default Fog Reveal Size").setDesc("Default brush size for revealing fog of war in pixels (10-150)").addSlider((slider) => slider.setLimits(10, 150, 5).setValue(this.plugin.settings.fogRevealSize ?? 30).setDynamicTooltip().onChange(async (v) => {
      this.plugin.settings.fogRevealSize = v;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.sendSettingsToPopout();
    }));
    containerEl.createEl("h3", { text: "Registered items (projectable)" });
    const list = containerEl.createEl("div");
    const renderList = () => {
      list.empty();
      (this.plugin.settings.items || []).forEach((it, idx) => {
        const row = list.createDiv({ cls: "vtt-item-row" });
        row.createEl("strong", { text: it.title || it.id });
        row.createEl("div", { text: `id: ${it.id}` });
        const s = new import_obsidian.Setting(row);
        s.addDropdown((dd) => dd.addOption("image", "Image").addOption("card", "Card (from Cards folder)").addOption("map", "Map (from Maps folder)").addOption("note", "Note (any folder)").addOption("statblock", "Statblock (note)").addOption("note-image", "First image in note").setValue(it.type || "image").onChange(async (v) => {
          it.type = v;
          await this.plugin.saveData(this.plugin.settings);
          renderList();
        }));
        if (it.type === "card" || it.type === "map") {
          s.addDropdown((dd2) => {
            dd2.addOption("", "-- select --");
            const itemList = it.type === "map" ? this.plugin.maps || [] : this.plugin.cards || [];
            itemList.forEach((c) => dd2.addOption(c.path, c.path));
            dd2.setValue(it.value || "");
            dd2.onChange(async (v) => {
              it.value = v;
              await this.plugin.saveData(this.plugin.settings);
            });
          });
        } else if (it.type === "note") {
          s.addText((text) => text.setPlaceholder("path/to/note.md").setValue(it.value || "").onChange(async (v) => {
            it.value = v;
            await this.plugin.saveData(this.plugin.settings);
          }));
          s.addButton((btn) => btn.setButtonText("Browse").onClick(() => {
            const modal = new NotePickerModal(this.plugin.app, async (path) => {
              it.value = path;
              await this.plugin.saveData(this.plugin.settings);
              renderList();
            });
            modal.open();
          }));
        } else {
          s.addText((text) => text.setPlaceholder("value (path)").setValue(it.value || "").onChange(async (v) => {
            it.value = v;
            await this.plugin.saveData(this.plugin.settings);
          }));
        }
        s.addButton((bt) => bt.setButtonText("Delete").setWarning().onClick(async () => {
          this.plugin.settings.items.splice(idx, 1);
          await this.plugin.saveData(this.plugin.settings);
          renderList();
        }));
      });
    };
    renderList();
    new import_obsidian.Setting(containerEl).addButton((b) => b.setButtonText("Add item").onClick(async () => {
      const id = `item${Date.now()}`;
      this.plugin.settings.items = this.plugin.settings.items || [];
      this.plugin.settings.items.push({ id, title: `Note ${this.plugin.settings.items.length + 1}`, type: "note", value: "" });
      await this.plugin.saveData(this.plugin.settings);
      renderList();
      this.plugin._registerItemCommands();
    }));
    new import_obsidian.Setting(containerEl).addButton((b) => b.setButtonText("Create Map Page").onClick(async () => {
      const modal = new MapCreateModal(this.plugin.app, this.plugin);
      modal.open();
    }));
  }
};
var MonsterImageSearchModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.searchInput = null;
    this.resultsContainer = null;
    this.loadingEl = null;
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vtt-monster-search-modal");
    const style = contentEl.createEl("style");
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
    const header = contentEl.createDiv({ cls: "vtt-monster-search-header" });
    header.createEl("h2", { text: "\u{1F409} D&D Monster Image Search" });
    header.createEl("p", { text: "Search for monster artwork from free sources" });
    const inputRow = contentEl.createDiv({ cls: "vtt-monster-search-input-row" });
    this.searchInput = inputRow.createEl("input", {
      cls: "vtt-monster-search-input",
      attr: {
        type: "text",
        placeholder: 'Enter monster name (e.g., "Beholder", "Mind Flayer", "Owlbear")...'
      }
    });
    const searchBtn = inputRow.createEl("button", { text: "\u{1F50D} Search", cls: "vtt-monster-search-btn" });
    this.resultsContainer = contentEl.createDiv({ cls: "vtt-monster-results" });
    this.loadingEl = contentEl.createDiv({ cls: "vtt-monster-loading" });
    this.loadingEl.style.display = "none";
    this.loadingEl.textContent = "\u23F3 Searching...";
    const tips = contentEl.createDiv({ cls: "vtt-monster-tips" });
    tips.innerHTML = `
      <strong>\u{1F4A1} Tips:</strong><br>
      \u2022 Use English monster names for best results<br>
      \u2022 Try variations: "Red Dragon", "Ancient Red Dragon", "Dragon Red"<br>
      \u2022 Click an image to see options: Project to screen or Save to vault<br>
    `;
    searchBtn.addEventListener("click", () => this.doSearch());
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter")
        this.doSearch();
    });
    setTimeout(() => this.searchInput?.focus(), 100);
  }
  async doSearch() {
    const query = this.searchInput?.value.trim();
    if (!query) {
      new import_obsidian.Notice("Please enter a monster name");
      return;
    }
    if (!this.resultsContainer || !this.loadingEl)
      return;
    this.resultsContainer.empty();
    this.loadingEl.style.display = "block";
    try {
      const results = await this.plugin.searchMonsterImages(query);
      this.loadingEl.style.display = "none";
      if (results.length === 0) {
        const empty = this.resultsContainer.createDiv({ cls: "vtt-monster-empty" });
        empty.innerHTML = `
          <p>\u{1F615} No images found for "<strong>${query}</strong>"</p>
          <p style="font-size:11px">Try a different spelling or a more common monster name</p>
        `;
        return;
      }
      for (const result of results) {
        const card = this.resultsContainer.createDiv({ cls: "vtt-monster-result" });
        const img = card.createEl("img");
        img.src = result.url;
        img.alt = result.title;
        img.onerror = () => {
          img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="40">\u{1F5BC}\uFE0F</text></svg>';
        };
        const info = card.createDiv({ cls: "vtt-monster-result-info" });
        info.createEl("div", { text: result.title, cls: "vtt-monster-result-title", attr: { title: result.title } });
        info.createEl("div", { text: result.source, cls: "vtt-monster-result-source" });
        const actions = card.createDiv({ cls: "vtt-monster-result-actions" });
        const projectBtn = actions.createEl("button", { text: "\u{1F5A5}\uFE0F Project", cls: "vtt-monster-action-project" });
        projectBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await this.plugin.projectMonsterImage(result.url, query);
          new import_obsidian.Notice(`Projecting: ${query}`);
        });
        if (result.source !== "Local Vault") {
          const saveBtn = actions.createEl("button", { text: "\u{1F4BE} Save", cls: "vtt-monster-action-save" });
          saveBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            new MonsterImageSaveModal(this.app, this.plugin, result.url, result.title || query).open();
          });
        } else {
          const localBadge = actions.createEl("span", { text: "\u2713 In Vault", cls: "vtt-monster-action-save" });
          localBadge.style.opacity = "0.6";
          localBadge.style.cursor = "default";
          localBadge.style.textAlign = "center";
        }
      }
    } catch (e) {
      this.loadingEl.style.display = "none";
      const error = this.resultsContainer.createDiv({ cls: "vtt-monster-empty" });
      error.innerHTML = `<p>\u274C Search failed. Please try again.</p>`;
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BattleMapSearchModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.searchInput = null;
    this.animatedCheckbox = null;
    this.resultsContainer = null;
    this.loadingEl = null;
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vtt-map-search-modal");
    this.modalEl.addClass("mod-vtt-map-search");
    const style = contentEl.createEl("style");
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
        content: '\u{1F3AC}';
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
    const header = contentEl.createDiv({ cls: "vtt-map-search-header" });
    header.createEl("h2", { text: "\u{1F5FA}\uFE0F Battle Map Search" });
    header.createEl("p", { text: "Search for battle maps from Reddit, DeviantArt and more" });
    const inputRow = contentEl.createDiv({ cls: "vtt-map-search-input-row" });
    this.searchInput = inputRow.createEl("input", {
      cls: "vtt-map-search-input",
      attr: {
        type: "text",
        placeholder: 'Enter map type (e.g., "forest", "tavern", "dungeon", "cave")...'
      }
    });
    const searchBtn = inputRow.createEl("button", { text: "\u{1F50D} Search", cls: "vtt-map-search-btn" });
    const optionsRow = contentEl.createDiv({ cls: "vtt-map-options-row" });
    optionsRow.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:12px;";
    const animatedLabel = optionsRow.createEl("label", { cls: "vtt-map-option" });
    animatedLabel.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;";
    this.animatedCheckbox = animatedLabel.createEl("input");
    this.animatedCheckbox.type = "checkbox";
    this.animatedCheckbox.style.cssText = "width:16px;height:16px;cursor:pointer;accent-color:var(--interactive-accent);";
    animatedLabel.createEl("span", { text: "\u{1F3AC} Search only animated maps (GIF/Video)" });
    this.resultsContainer = contentEl.createDiv({ cls: "vtt-map-results" });
    this.loadingEl = contentEl.createDiv({ cls: "vtt-map-loading" });
    this.loadingEl.style.display = "none";
    this.loadingEl.textContent = "\u23F3 Searching for maps...";
    const tips = contentEl.createDiv({ cls: "vtt-map-tips" });
    tips.innerHTML = `
      <strong>\u{1F4A1} Tips:</strong><br>
      \u2022 Try keywords like: forest, tavern, dungeon, cave, castle, ship, city, swamp<br>
      \u2022 Add descriptors: "dark forest", "abandoned tavern", "ice cave"<br>
      \u2022 <strong>\u{1F5A5}\uFE0F Project</strong> \u2014 Show the map directly on the popout screen<br>
      \u2022 <strong>\u{1F4BE} Save</strong> \u2014 Creates a new map note with the image, Player Infos and DM Info sections<br>
      \u2022 Sources: Reddit r/battlemaps, DeviantArt, Imgur
    `;
    searchBtn.addEventListener("click", () => this.doSearch());
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter")
        this.doSearch();
    });
    setTimeout(() => this.searchInput?.focus(), 100);
  }
  async doSearch() {
    const query = this.searchInput?.value.trim();
    if (!query) {
      new import_obsidian.Notice("Please enter a map type");
      return;
    }
    if (!this.resultsContainer || !this.loadingEl)
      return;
    const animatedOnly = this.animatedCheckbox?.checked || false;
    this.resultsContainer.empty();
    this.loadingEl.style.display = "block";
    this.loadingEl.textContent = animatedOnly ? "\u23F3 Searching for animated maps..." : "\u23F3 Searching for maps...";
    try {
      const results = await this.plugin.searchBattleMaps(query, animatedOnly);
      this.loadingEl.style.display = "none";
      if (results.length === 0) {
        const empty = this.resultsContainer.createDiv({ cls: "vtt-map-empty" });
        empty.innerHTML = `
          <p>\u{1F615} No ${animatedOnly ? "animated " : ""}maps found for "<strong>${query}</strong>"</p>
          <p style="font-size:11px">${animatedOnly ? 'Try broader terms like "forest", "cave", "dungeon"' : 'Try different keywords like "forest path", "tavern interior", "dungeon corridor"'}</p>
        `;
        return;
      }
      const countEl = this.resultsContainer.createDiv({ cls: "vtt-map-result-count" });
      countEl.style.cssText = "grid-column: 1/-1; padding: 8px 0; font-size: 12px; color: var(--text-muted);";
      countEl.textContent = `Found ${results.length} ${animatedOnly ? "animated " : ""}map${results.length !== 1 ? "s" : ""}`;
      for (const result of results) {
        const isAnimated = result.source.includes("Animated");
        const card = this.resultsContainer.createDiv({ cls: `vtt-map-result${isAnimated ? " animated" : ""}` });
        const img = card.createEl("img");
        img.src = result.thumbnail || result.url;
        img.alt = result.title;
        img.onerror = () => {
          if (result.thumbnail && img.src === result.thumbnail) {
            img.src = result.url;
          } else {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="40">\u{1F5FA}\uFE0F</text></svg>';
          }
        };
        const info = card.createDiv({ cls: "vtt-map-result-info" });
        info.createEl("div", { text: result.title, cls: "vtt-map-result-title", attr: { title: result.title } });
        info.createEl("div", { text: result.source, cls: "vtt-map-result-source" });
        const actions = card.createDiv({ cls: "vtt-map-result-actions" });
        const projectBtn = actions.createEl("button", { text: "\u{1F5A5}\uFE0F Project", cls: "vtt-map-action-project" });
        projectBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await this.plugin.projectBattleMapImage(result.url, result.title);
          new import_obsidian.Notice(`Projecting: ${result.title}`);
        });
        const saveBtn = actions.createEl("button", { text: "\u{1F4BE} Save", cls: "vtt-map-action-save" });
        saveBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          new BattleMapSaveModal(this.app, this.plugin, result.url, result.title).open();
        });
      }
    } catch (e) {
      this.loadingEl.style.display = "none";
      const error = this.resultsContainer.createDiv({ cls: "vtt-map-empty" });
      error.innerHTML = `<p>\u274C Search failed. Please try again.</p>`;
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BattleMapSaveModal = class extends import_obsidian.Modal {
  constructor(app, plugin, imageUrl, originalTitle) {
    super(app);
    this.plugin = plugin;
    this.imageUrl = imageUrl;
    this.originalTitle = originalTitle;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vtt-map-save-modal");
    contentEl.createEl("h2", { text: "\u{1F4BE} Save Battle Map" });
    const previewContainer = contentEl.createDiv({ cls: "vtt-map-save-preview" });
    previewContainer.style.cssText = "margin-bottom:16px;text-align:center;";
    const previewImg = previewContainer.createEl("img");
    previewImg.src = this.imageUrl;
    previewImg.style.cssText = "max-width:100%;max-height:200px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
    previewImg.onerror = () => {
      previewImg.style.display = "none";
    };
    const inputSection = contentEl.createDiv({ cls: "vtt-modal-section" });
    inputSection.style.cssText = "margin-bottom:16px;";
    const label = inputSection.createEl("label", { text: "Map Name" });
    label.style.cssText = "display:block;margin-bottom:6px;font-weight:500;";
    this.nameInput = inputSection.createEl("input");
    this.nameInput.type = "text";
    this.nameInput.value = this.originalTitle.replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, "").trim().substring(0, 50) || "Battle Map";
    this.nameInput.placeholder = "e.g. Dragon's Lair";
    this.nameInput.style.cssText = "width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);";
    const infoSection = contentEl.createDiv({ cls: "vtt-modal-info" });
    infoSection.style.cssText = "margin-bottom:16px;padding:10px;background:var(--background-secondary);border-radius:6px;font-size:12px;color:var(--text-muted);";
    const folderPath = this.plugin.settings.mapsFolderPath || "Maps";
    infoSection.innerHTML = `
      <div>\u{1F4C1} Note will be saved to: <strong>${folderPath}/</strong></div>
      <div>\u{1F5BC}\uFE0F Image will be saved to: <strong>${folderPath}/_resources/</strong></div>
      <div style="margin-top:6px;">\u{1F4DD} The note will contain Player Infos and DM Info sections.</div>
    `;
    const btnRow = contentEl.createDiv({ cls: "vtt-modal-buttons" });
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:16px;";
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const saveBtn = btnRow.createEl("button", { text: "\u{1F4BE} Save", cls: "mod-cta" });
    saveBtn.addEventListener("click", async () => {
      const name = this.nameInput.value?.trim();
      if (!name) {
        new import_obsidian.Notice("Please enter a map name");
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "\u23F3 Saving...";
      try {
        const saved = await this.plugin.saveBattleMapImage(this.imageUrl, name);
        if (saved) {
          new import_obsidian.Notice(`\u2705 Saved: ${saved}`);
          this.close();
        }
      } catch (e) {
        new import_obsidian.Notice("\u274C Failed to save map");
        saveBtn.disabled = false;
        saveBtn.textContent = "\u{1F4BE} Save";
      }
    });
    this.nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter")
        saveBtn.click();
    });
    setTimeout(() => {
      this.nameInput?.focus();
      this.nameInput?.select();
    }, 100);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var MonsterImageSaveModal = class extends import_obsidian.Modal {
  constructor(app, plugin, imageUrl, originalTitle) {
    super(app);
    this.plugin = plugin;
    this.imageUrl = imageUrl;
    this.originalTitle = originalTitle;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vtt-monster-save-modal");
    contentEl.createEl("h2", { text: "\u{1F4BE} Save Monster Image" });
    const previewContainer = contentEl.createDiv({ cls: "vtt-monster-save-preview" });
    previewContainer.style.cssText = "margin-bottom:16px;text-align:center;";
    const previewImg = previewContainer.createEl("img");
    previewImg.src = this.imageUrl;
    previewImg.style.cssText = "max-width:100%;max-height:200px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
    previewImg.onerror = () => {
      previewImg.style.display = "none";
    };
    const inputSection = contentEl.createDiv({ cls: "vtt-modal-section" });
    inputSection.style.cssText = "margin-bottom:16px;";
    const label = inputSection.createEl("label", { text: "Monster Name" });
    label.style.cssText = "display:block;margin-bottom:6px;font-weight:500;";
    this.nameInput = inputSection.createEl("input");
    this.nameInput.type = "text";
    this.nameInput.value = this.originalTitle.replace(/[^a-zA-Z0-9\s\-_äöüÄÖÜß]/g, "").trim().substring(0, 50) || "Monster";
    this.nameInput.placeholder = "e.g. Ancient Red Dragon";
    this.nameInput.style.cssText = "width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);";
    const infoSection = contentEl.createDiv({ cls: "vtt-modal-info" });
    infoSection.style.cssText = "margin-bottom:16px;padding:10px;background:var(--background-secondary);border-radius:6px;font-size:12px;color:var(--text-muted);";
    const cardsFolder = this.plugin.settings.folderPath || "Cards";
    infoSection.innerHTML = `
      <div>\u{1F4C1} Image will be saved to: <strong>${cardsFolder}/images/</strong></div>
      <div style="margin-top:6px;">\u{1F0CF} The image will appear in your Cards panel after saving.</div>
    `;
    const btnRow = contentEl.createDiv({ cls: "vtt-modal-buttons" });
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:16px;";
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const saveBtn = btnRow.createEl("button", { text: "\u{1F4BE} Save", cls: "mod-cta" });
    saveBtn.addEventListener("click", async () => {
      const name = this.nameInput.value?.trim();
      if (!name) {
        new import_obsidian.Notice("Please enter a monster name");
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "\u23F3 Saving...";
      try {
        const saved = await this.plugin.saveMonsterImage(this.imageUrl, name);
        if (saved) {
          new import_obsidian.Notice(`\u2705 Saved: ${saved}`);
          this.close();
        }
      } catch (e) {
        console.error("Failed to save monster image:", e);
        new import_obsidian.Notice("\u274C Failed to save image");
        saveBtn.disabled = false;
        saveBtn.textContent = "\u{1F4BE} Save";
      }
    });
    this.nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter")
        saveBtn.click();
    });
    setTimeout(() => {
      this.nameInput?.focus();
      this.nameInput?.select();
    }, 100);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NotePickerModal = class extends import_obsidian.SuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChooseCallback = onChoose;
  }
  getSuggestions(query) {
    const files = this.app.vault.getFiles().filter((f) => f.extension === "md");
    if (!query)
      return files.slice(0, 50);
    const lower = query.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(lower) || f.name.toLowerCase().includes(lower)).slice(0, 50);
  }
  renderSuggestion(file, el) {
    el.createEl("div", { text: file.name.replace(/\.md$/, "") });
    el.createEl("small", { text: file.path });
  }
  onChooseSuggestion(file) {
    this.close();
    if (this.onChooseCallback)
      this.onChooseCallback(file.path);
  }
};
var MapCreateModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vtt-map-create-modal");
    contentEl.createEl("h2", { text: "Create Map Page" });
    const desc = contentEl.createDiv({ cls: "vtt-modal-desc" });
    desc.style.cssText = "margin-bottom:16px;color:var(--text-muted);font-size:13px;";
    desc.textContent = "Create a new map page with Player Info and DM Info sections for projection.";
    const inputSection = contentEl.createDiv({ cls: "vtt-modal-section" });
    inputSection.style.cssText = "margin-bottom:16px;";
    const label = inputSection.createEl("label", { text: "Map Name" });
    label.style.cssText = "display:block;margin-bottom:6px;font-weight:500;";
    this.nameInput = inputSection.createEl("input");
    this.nameInput.type = "text";
    this.nameInput.placeholder = "e.g. Dragon's Lair";
    this.nameInput.style.cssText = "width:100%;padding:8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-normal);";
    const previewSection = contentEl.createDiv({ cls: "vtt-modal-section" });
    previewSection.style.cssText = "margin-bottom:16px;padding:12px;background:var(--background-secondary);border-radius:6px;";
    const previewLabel = previewSection.createEl("div", { text: "Template Preview:" });
    previewLabel.style.cssText = "font-weight:500;margin-bottom:8px;font-size:12px;color:var(--text-muted);";
    const previewContent = previewSection.createEl("pre");
    previewContent.style.cssText = "margin:0;padding:8px;background:var(--background-primary);border-radius:4px;font-size:11px;white-space:pre-wrap;color:var(--text-muted);";
    previewContent.textContent = `# Map Name

![[map-image.png]]

# Player Infos
Information visible to players when projected.

# DM Info
Secret notes - never shown in projection.`;
    const btnRow = contentEl.createDiv({ cls: "vtt-modal-buttons" });
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:16px;";
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const createBtn = btnRow.createEl("button", { text: "Create", cls: "mod-cta" });
    createBtn.addEventListener("click", async () => {
      const name = this.nameInput.value?.trim();
      if (!name) {
        new globalThis.Notice("Please enter a map name");
        return;
      }
      const folder = this.plugin.settings.mapsFolderPath || "Maps";
      const path = `${folder.replace(/\/$/, "")}/${name}.md`;
      try {
        const exists = this.plugin.app.vault.getAbstractFileByPath(path);
        if (exists) {
          new globalThis.Notice("Map page already exists: " + path);
          return;
        }
        const template = `# ${name}

![[${name.toLowerCase().replace(/\s+/g, "-")}-map.png]]

# Player Infos
Add information that players should see here.

# DM Info
Add secret DM notes here - this section is never projected.
`;
        await this.plugin.app.vault.create(path, template);
        new globalThis.Notice("Created map page: " + path);
        await this.plugin.loadMaps();
        this.close();
      } catch (e) {
        new globalThis.Notice("Could not create map page: " + e);
      }
    });
  }
};
var CardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return "vtt-card-view";
  }
  getDisplayText() {
    return "VTT Cards";
  }
  getIcon() {
    return "image";
  }
  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.addClass("vtt-panel-view");
    const styleEl = container.createEl("style");
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
    const header = container.createDiv({ cls: "vtt-panel-header" });
    const openPopoutBtn = header.createEl("button", { text: "\u{1F5A5}\uFE0F Open Popout", cls: "mod-cta" });
    openPopoutBtn.addEventListener("click", () => this.plugin.openPopout());
    const prevBtn = header.createEl("button", { text: "\u25C0 Prev" });
    prevBtn.addEventListener("click", () => this.plugin.prevCard());
    const nextBtn = header.createEl("button", { text: "Next \u25B6" });
    nextBtn.addEventListener("click", () => this.plugin.nextCard());
    const reloadBtn = header.createEl("button", { text: "\u{1F504}" });
    reloadBtn.title = "Reload";
    const exportBtn = header.createEl("button", { text: "\u{1F4CB}" });
    exportBtn.title = "Export Session History";
    exportBtn.addEventListener("click", () => this.exportSessionHistory());
    reloadBtn.addEventListener("click", async () => {
      reloadBtn.disabled = true;
      reloadBtn.textContent = "\u23F3 Loading...";
      try {
        await this.plugin.loadCards();
        await this.plugin.loadMaps();
        await this.onOpen();
        new import_obsidian.Notice("Cards and Maps reloaded");
      } catch (e) {
        new import_obsidian.Notice("Failed to reload");
      }
    });
    const toggleContainer = header.createDiv({ cls: "vtt-toggle-container" });
    const toggleLabel = toggleContainer.createEl("label", { text: "Player Info" });
    const toggleCheckbox = toggleContainer.createEl("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = this.plugin.settings.showPlayerInfo || false;
    toggleCheckbox.addEventListener("change", async () => {
      this.plugin.settings.showPlayerInfo = toggleCheckbox.checked;
      await this.plugin.saveData(this.plugin.settings);
    });
    const searchRow = header.createDiv({ cls: "vtt-search-row" });
    const searchInput = searchRow.createEl("input", {
      cls: "vtt-search-input",
      attr: { type: "text", placeholder: "\u{1F50D} Filter cards and maps..." }
    });
    let currentFilter = "";
    const contentArea = container.createDiv({ cls: "vtt-panel-content" });
    const renderContent = async (filter) => {
      contentArea.empty();
      const filterLower = filter.toLowerCase();
      const filteredCards = (this.plugin.cards || []).filter((card) => {
        if (!filter)
          return true;
        const name = card.path ? card.path.split("/").pop()?.toLowerCase() || "" : "";
        return name.includes(filterLower);
      });
      const filteredMaps = (this.plugin.maps || []).filter((map) => {
        if (!filter)
          return true;
        const name = (map.title || map.path?.split("/").pop() || "").toLowerCase();
        return name.includes(filterLower);
      });
      const favorites = this.plugin.settings.favorites || [];
      if (favorites.length > 0 && !filter) {
        await this.renderFavoritesSection(contentArea, favorites);
      }
      await this.renderSection(contentArea, "Cards", "\u{1F3B4}", filteredCards, "card");
      await this.renderSection(contentArea, "Maps", "\u{1F5FA}\uFE0F", filteredMaps, "map");
    };
    await renderContent("");
    let searchTimeout = null;
    searchInput.addEventListener("input", () => {
      if (searchTimeout)
        clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        currentFilter = searchInput.value;
        await renderContent(currentFilter);
      }, 150);
    });
  }
  async renderFavoritesSection(container, favorites) {
    const favSection = container.createDiv({ cls: "vtt-favorites-section" });
    const title = favSection.createDiv({ cls: "vtt-favorites-title" });
    title.createEl("span", { text: "\u2B50" });
    title.createEl("span", { text: `Favorites (${favorites.length})` });
    const grid = favSection.createDiv({ cls: "vtt-file-grid" });
    for (const path of favorites) {
      const card = (this.plugin.cards || []).find((c) => c.path === path);
      const map = (this.plugin.maps || []).find((m) => m.path === path);
      const item = card || map;
      const type = card ? "card" : "map";
      if (item) {
        await this.renderFileItem(grid, item, type, true);
      }
    }
  }
  async renderSection(container, title, icon, items, type) {
    const section = container.createDiv({ cls: "vtt-section" });
    const sectionHeader = section.createDiv({ cls: "vtt-section-header" });
    const collapseIcon = sectionHeader.createEl("span", { text: "\u25BC", cls: "vtt-section-icon" });
    sectionHeader.createEl("span", { text: icon });
    sectionHeader.createEl("h3", { text: title, cls: "vtt-section-title" });
    sectionHeader.createEl("span", { text: `${items.length}`, cls: "vtt-section-count" });
    const sectionContent = section.createDiv({ cls: "vtt-section-content" });
    let isExpanded = true;
    sectionHeader.addEventListener("click", () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        sectionContent.removeClass("collapsed");
        collapseIcon.removeClass("collapsed");
      } else {
        sectionContent.addClass("collapsed");
        collapseIcon.addClass("collapsed");
      }
    });
    if (items.length === 0) {
      const emptyState = sectionContent.createDiv({ cls: "vtt-empty-state" });
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
    const baseFolderPath = type === "card" ? (this.plugin.settings.folderPath || "").trim() : (this.plugin.settings.mapsFolderPath || "").trim();
    const folderTree = this.buildFolderTree(items, baseFolderPath);
    const treeContainer = sectionContent.createDiv({ cls: "vtt-folder-tree" });
    await this.renderFolderTree(treeContainer, folderTree, type, baseFolderPath);
  }
  /**
   * Build a hierarchical folder tree from flat item list
   */
  buildFolderTree(items, baseFolderPath) {
    const root = /* @__PURE__ */ new Map();
    const rootNode = { items: [], subfolders: /* @__PURE__ */ new Map() };
    root.set("__root__", rootNode);
    for (const item of items) {
      if (!item.path)
        continue;
      let relativePath = item.path;
      if (baseFolderPath && item.path.startsWith(baseFolderPath + "/")) {
        relativePath = item.path.substring(baseFolderPath.length + 1);
      }
      const parts = relativePath.split("/");
      const fileName = parts.pop();
      if (parts.length === 0) {
        rootNode.items.push(item);
      } else {
        let currentNode = rootNode;
        for (const folderName of parts) {
          if (!currentNode.subfolders.has(folderName)) {
            currentNode.subfolders.set(folderName, { items: [], subfolders: /* @__PURE__ */ new Map() });
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
  async renderFolderTree(container, tree, type, currentPath) {
    const rootNode = tree.get("__root__");
    if (!rootNode)
      return;
    const sortedFolders = Array.from(rootNode.subfolders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [folderName, folderData] of sortedFolders) {
      await this.renderFolder(container, folderName, folderData, type, currentPath ? `${currentPath}/${folderName}` : folderName);
    }
    if (rootNode.items.length > 0) {
      const rootFilesContainer = container.createDiv({ cls: "vtt-root-files" });
      await this.renderFileGrid(rootFilesContainer, rootNode.items, type);
    }
  }
  /**
   * Render a single folder with its contents
   */
  async renderFolder(container, folderName, folderData, type, fullPath) {
    const folder = container.createDiv({ cls: "vtt-folder" });
    const totalCount = this.countItemsRecursive(folderData);
    const header = folder.createDiv({ cls: "vtt-folder-header" });
    const iconSpan = header.createEl("span", { text: "\u25BC", cls: "vtt-folder-icon collapsed" });
    header.createEl("span", { text: "\u{1F4C1}" });
    header.createEl("span", { text: folderName, cls: "vtt-folder-name" });
    header.createEl("span", { text: `${totalCount}`, cls: "vtt-folder-count" });
    const contents = folder.createDiv({ cls: "vtt-folder-contents collapsed" });
    if (folderData.items.length > 0) {
      await this.renderFileGrid(contents, folderData.items, type);
    }
    const sortedSubfolders = Array.from(folderData.subfolders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [subName, subData] of sortedSubfolders) {
      await this.renderFolder(contents, subName, subData, type, `${fullPath}/${subName}`);
    }
    let isExpanded = false;
    header.addEventListener("click", () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        contents.removeClass("collapsed");
        iconSpan.removeClass("collapsed");
      } else {
        contents.addClass("collapsed");
        iconSpan.addClass("collapsed");
      }
    });
  }
  /**
   * Count items recursively in a folder and its subfolders
   */
  countItemsRecursive(folderData) {
    let count = folderData.items.length;
    for (const [, subData] of folderData.subfolders) {
      count += this.countItemsRecursive(subData);
    }
    return count;
  }
  /**
   * Render a grid of files
   */
  async renderFileGrid(container, items, type) {
    const grid = container.createDiv({ cls: "vtt-file-grid" });
    for (let idx = 0; idx < items.length; idx++) {
      const entry = items[idx];
      await this.renderFileItem(grid, entry, type, false);
    }
  }
  /**
   * Render a single file item
   */
  async renderFileItem(container, entry, type, isFavoriteSection) {
    const fileItem = container.createDiv({ cls: "vtt-file-item" });
    const thumb = fileItem.createDiv({ cls: "vtt-file-thumb" });
    const isMarkdown = entry.path && entry.path.toLowerCase().endsWith(".md");
    const isVideo = entry.path && /\.(mp4|webm|ogg|mov)$/i.test(entry.path);
    if (isMarkdown) {
      const thumbImg = await this.getNoteThumbnail(entry.path);
      if (thumbImg && !thumbImg.startsWith("blob:")) {
        const img = thumb.createEl("img");
        img.loading = "lazy";
        img.src = thumbImg;
        img.onerror = () => {
          img.style.display = "none";
          thumb.createEl("span", { text: "\u{1F4C4}", cls: "vtt-note-icon" });
        };
      } else {
        thumb.createEl("span", { text: "\u{1F4C4}", cls: "vtt-note-icon" });
      }
    } else if (isVideo) {
      const videoThumbUrl = await this.plugin._getOrCreateVideoThumbnail(entry.path);
      if (videoThumbUrl) {
        const img = thumb.createEl("img");
        img.loading = "lazy";
        img.src = videoThumbUrl;
        img.onerror = () => {
          img.style.display = "none";
          thumb.createEl("span", { text: "\u{1F3AC}", cls: "vtt-note-icon" });
        };
        thumb.createEl("span", { text: "VIDEO", cls: "vtt-video-badge" });
      } else {
        thumb.createEl("span", { text: "\u{1F3AC}", cls: "vtt-note-icon" });
        thumb.createEl("span", { text: "VIDEO", cls: "vtt-video-badge" });
      }
    } else {
      const img = thumb.createEl("img");
      img.loading = "lazy";
      let srcVal = "";
      if (entry.path && !isMarkdown) {
        try {
          const file = this.plugin.app.vault.getAbstractFileByPath(entry.path);
          if (file) {
            srcVal = this.plugin.app.vault.getResourcePath(file);
          }
        } catch (e) {
          srcVal = "";
        }
      }
      if (srcVal && !srcVal.startsWith("blob:")) {
        img.src = srcVal;
      }
      img.onerror = () => {
        img.style.display = "none";
        thumb.createEl("span", { text: "\u{1F5BC}\uFE0F", cls: "vtt-note-icon" });
      };
    }
    const path = entry.path;
    const isFavorite = (this.plugin.settings.favorites || []).includes(path);
    const favBtn = thumb.createEl("button", {
      text: isFavorite ? "\u2B50" : "\u2606",
      cls: "vtt-favorite-btn" + (isFavorite ? " active" : "")
    });
    favBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const favorites = this.plugin.settings.favorites || [];
      const idx = favorites.indexOf(path);
      if (idx >= 0) {
        favorites.splice(idx, 1);
        favBtn.textContent = "\u2606";
        favBtn.removeClass("active");
      } else {
        favorites.push(path);
        favBtn.textContent = "\u2B50";
        favBtn.addClass("active");
      }
      this.plugin.settings.favorites = favorites;
      await this.plugin.saveData(this.plugin.settings);
      if (isFavoriteSection) {
        await this.onOpen();
      }
    });
    const fileName = entry.title || (entry.path ? ((entry.path || "").split("/").pop() || "").replace(/\.[^.]+$/, "") : "Untitled");
    fileItem.createEl("div", { text: fileName, cls: "vtt-file-name", attr: { title: fileName } });
    const ext = entry.path ? (entry.path.split(".").pop() || "").toUpperCase() : "";
    if (ext) {
      fileItem.createEl("div", { text: ext, cls: "vtt-file-type" });
    }
    const allItems = type === "card" ? this.plugin.cards : this.plugin.maps;
    const globalIdx = allItems.findIndex((item) => item.path === path);
    fileItem.addEventListener("click", async () => {
      const section = fileItem.closest(".vtt-section, .vtt-favorites-section");
      if (section) {
        section.querySelectorAll(".vtt-file-item").forEach((el) => el.removeClass("selected"));
      }
      fileItem.addClass("selected");
      this.addToSessionHistory(path, type);
      if (type === "card") {
        this.plugin.current = globalIdx >= 0 ? globalIdx : 0;
        this.plugin.openPopout();
        this.plugin.sendCurrentToPopout();
      } else {
        await this.plugin.projectMapByPath(path);
      }
    });
    fileItem.addEventListener("dblclick", async (e) => {
      e.stopPropagation();
      if (path) {
        const file = this.plugin.app.vault.getAbstractFileByPath(path);
        if (file) {
          await this.plugin.app.workspace.openLinkText(path, "", false);
        }
      }
    });
  }
  addToSessionHistory(path, type) {
    if (!this.plugin.settings.sessionHistory) {
      this.plugin.settings.sessionHistory = [];
    }
    this.plugin.settings.sessionHistory.push({
      path,
      timestamp: Date.now(),
      type
    });
    if (this.plugin.settings.sessionHistory.length > 500) {
      this.plugin.settings.sessionHistory = this.plugin.settings.sessionHistory.slice(-500);
    }
    this.plugin.saveData(this.plugin.settings);
  }
  exportSessionHistory() {
    const history = this.plugin.settings.sessionHistory || [];
    if (history.length === 0) {
      new import_obsidian.Notice("No session history to export");
      return;
    }
    const grouped = {};
    for (const entry of history) {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!grouped[date])
        grouped[date] = [];
      grouped[date].push(entry);
    }
    let md = "# Session History\\n\\n";
    for (const [date, entries] of Object.entries(grouped)) {
      md += `## ${date}\\n\\n`;
      for (const entry of entries) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const name = entry.path.split("/").pop()?.replace(/\\.[^.]+$/, "") || entry.path;
        const icon = entry.type === "card" ? "\u{1F3B4}" : "\u{1F5FA}\uFE0F";
        md += `- ${time} ${icon} [[${entry.path}|${name}]]\\n`;
      }
      md += "\\n";
    }
    const fileName = `Session History ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.md`;
    this.plugin.app.vault.create(fileName, md.replace(/\\\\n/g, "\\n")).then(() => new import_obsidian.Notice(`Exported to ${fileName}`)).catch((e) => {
      new import_obsidian.Notice("Failed to export session history");
    });
  }
  async getNoteThumbnail(notePath) {
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
      if (!file)
        return null;
      const content = await this.plugin.app.vault.read(file);
      const noteDir = file.parent?.path || "";
      const imageExts = "png|jpg|jpeg|gif|webp|svg";
      const videoExts = "mp4|webm|ogg|mov";
      const allMediaExts = `${imageExts}|${videoExts}`;
      const embedRegex = new RegExp(`!\\[\\[([^\\]]+\\.(${allMediaExts}))\\]\\]`, "i");
      const embedMatch = content.match(embedRegex);
      if (embedMatch) {
        const mediaName = embedMatch[1];
        const allFiles = this.plugin.app.vault.getFiles();
        const isVideo = new RegExp(`\\.(${videoExts})$`, "i").test(mediaName);
        let mediaFile = allFiles.find((f) => f.path === mediaName);
        if (!mediaFile && noteDir) {
          const relativePath = noteDir + "/" + mediaName;
          mediaFile = allFiles.find((f) => f.path === relativePath);
        }
        if (!mediaFile) {
          const baseName = mediaName.split("/").pop();
          mediaFile = allFiles.find((f) => f.name === baseName);
        }
        if (!mediaFile) {
          mediaFile = allFiles.find((f) => f.path.endsWith(mediaName));
        }
        if (mediaFile) {
          if (isVideo) {
            return await this.plugin._getOrCreateVideoThumbnail(mediaFile.path);
          } else {
            return this.plugin.app.vault.getResourcePath(mediaFile);
          }
        }
      }
      const mdRegex = new RegExp(`!\\[[^\\]]*\\]\\(([^)]+\\.(${allMediaExts}))\\)`, "i");
      const mdMatch = content.match(mdRegex);
      if (mdMatch) {
        const mediaPath = mdMatch[1];
        const isVideo = new RegExp(`\\.(${videoExts})$`, "i").test(mediaPath);
        let mediaFile = this.plugin.app.vault.getAbstractFileByPath(mediaPath);
        if (!mediaFile && noteDir) {
          mediaFile = this.plugin.app.vault.getAbstractFileByPath(noteDir + "/" + mediaPath);
        }
        if (mediaFile) {
          if (isVideo) {
            return await this.plugin._getOrCreateVideoThumbnail(mediaFile.path);
          } else {
            return this.plugin.app.vault.getResourcePath(mediaFile);
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async onClose() {
  }
};
module.exports = (module.exports && module.exports.default) ? module.exports.default : module.exports;
//# sourceMappingURL=main.js.map
