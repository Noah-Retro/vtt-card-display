/**
 * VTT Card Display - Popout HTML Builder
 * 
 * Contains the HTML template for the popout projection window
 */
import type { Settings } from './types';

/**
 * Build the HTML content for the popout projection window
 */
export function buildPopoutHtml(settings: Settings): string {
  const gridSize = settings.gridSize ?? 50;
  const gridColor = settings.gridColor ?? '#ffffff';
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
      <span>🎮 Controls</span>
      <button class="toggle-btn" id="toggle-controls">−</button>
    </div>
    <div class="control-content">
      <!-- Zoom/Pan Section -->
      <div class="control-section">
        <label>Zoom & Pan</label>
        <div class="control-row">
          <button class="control-btn" id="zoom-out">−</button>
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
          <button class="control-btn" id="rotate-left">↺ 90°</button>
          <span class="zoom-display" id="rotation-display">0°</span>
          <button class="control-btn" id="rotate-right">↻ 90°</button>
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
          <button class="control-btn" id="export-btn" style="flex:1;">📸 Export Image</button>
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
      toggleBtn.textContent = controlsCollapsed ? '+' : '−';
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
      
      document.getElementById('rotation-display').textContent = currentRotation + '°';
      // Show rotation info briefly
      rotationInfo.textContent = 'Rotation: ' + currentRotation + '°';
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
        document.getElementById('rotation-display').textContent = '0°';
        
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
        document.getElementById('rotation-display').textContent = '0°';
        
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
  </script>
</body>
</html>`;
}
