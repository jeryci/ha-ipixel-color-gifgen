/**
 * LED Matrix PixelForge - Image & Animated GIF Resizer
 * Supports GIF decoding/re-encoding, frame scaling, dithering, and realistic LED simulation.
 */

// Application State
const state = {
  targetWidth: 64,
  targetHeight: 16,
  fitMode: 'cover', // 'cover', 'contain', 'stretch'
  panX: 0,
  panY: 0,
  zoom: 1.0,
  bgColor: '#000000',
  sampling: 'nearest', // 'nearest', 'bilinear'
  brightness: 1.0,
  contrast: 1.1,
  ditherMode: 'none', // 'none', 'floyd', 'bayer'
  
  // Animation State
  frames: [], // Array of { canvas, delay }
  currentFrameIndex: 0,
  isPlaying: true,
  speedMultiplier: 1.0,
  timerId: null,
  isGif: false,
  originalDataUrl: null,
  fileName: 'matrix_art',

  // View options
  viewMode: 'led' // 'led', 'raw', 'original'
};

// DOM Elements
const elements = {
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  browseBtn: document.getElementById('browseBtn'),
  currentResBadge: document.getElementById('currentResBadge'),
  presetBtns: document.querySelectorAll('.btn-preset'),
  matrixWidthInput: document.getElementById('matrixWidth'),
  matrixHeightInput: document.getElementById('matrixHeight'),
  applyCustomResBtn: document.getElementById('applyCustomRes'),
  fitModeRadios: document.querySelectorAll('input[name="fitMode"]'),
  panX: document.getElementById('panX'),
  panXVal: document.getElementById('panXVal'),
  panY: document.getElementById('panY'),
  panYVal: document.getElementById('panYVal'),
  zoomScale: document.getElementById('zoomScale'),
  zoomVal: document.getElementById('zoomVal'),
  bgColor: document.getElementById('bgColor'),
  bgColorVal: document.getElementById('bgColorVal'),
  samplingFilter: document.getElementById('samplingFilter'),
  brightness: document.getElementById('brightness'),
  brightVal: document.getElementById('brightVal'),
  contrast: document.getElementById('contrast'),
  contrastVal: document.getElementById('contrastVal'),
  ditherMode: document.getElementById('ditherMode'),
  
  // Animation elements
  frameCountText: document.getElementById('frameCountText'),
  frameDelayText: document.getElementById('frameDelayText'),
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnPrevFrame: document.getElementById('btnPrevFrame'),
  btnNextFrame: document.getElementById('btnNextFrame'),
  speedMultiplier: document.getElementById('speedMultiplier'),
  frameScrubber: document.getElementById('frameScrubber'),
  currentFrameLabel: document.getElementById('currentFrameLabel'),
  
  // Preview Canvases
  matrixCanvas: document.getElementById('matrixCanvas'),
  rawCanvas: document.getElementById('rawCanvas'),
  originalPreview: document.getElementById('originalPreview'),
  toggleLedGrid: document.getElementById('toggleLedGrid'),
  toggleExactPixels: document.getElementById('toggleExactPixels'),
  toggleOriginal: document.getElementById('toggleOriginal'),
  infoDimensions: document.getElementById('infoDimensions'),
  infoTotalLeds: document.getElementById('infoTotalLeds'),
  infoRatio: document.getElementById('infoRatio'),

  // Export elements
  btnDownloadGif: document.getElementById('btnDownloadGif'),
  btnDownloadPng1x: document.getElementById('btnDownloadPng1x'),
  btnDownloadPngScale: document.getElementById('btnDownloadPngScale'),
  btnCopyHa: document.getElementById('btnCopyHa'),
  codeHaYaml: document.getElementById('codeHaYaml'),
  btnCopyHaPanel: document.getElementById('btnCopyHaPanel'),
  codeHaPanel: document.getElementById('codeHaPanel'),
  codeArrayFormat: document.getElementById('codeArrayFormat'),
  codeArrayContent: document.getElementById('codeArrayContent'),
  btnCopyCode: document.getElementById('btnCopyCode'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  toast: document.getElementById('toast'),

  // iPIXEL BLE elements
  bleAddressInput: document.getElementById('bleAddressInput'),
  saveSlotInput: document.getElementById('saveSlotInput'),
  btnScanBle: document.getElementById('btnScanBle'),
  bleScanResults: document.getElementById('bleScanResults'),
  btnSendToIpixel: document.getElementById('btnSendToIpixel'),
  ipixelStatusText: document.getElementById('ipixelStatusText'),

  // Samples
  sampleHeart: document.getElementById('sampleHeart'),
  samplePacman: document.getElementById('samplePacman'),
  sampleCat: document.getElementById('sampleCat'),
  sampleWeather: document.getElementById('sampleWeather')
};

// Offscreen canvases for processing
const processCanvas = document.createElement('canvas');
const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });

// Bayer 4x4 Dither Matrix
const bayerMatrix4x4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Initialize
function init() {
  setupEventListeners();
  updateResolution(64, 16);
  generateSampleHeart(); // Initial demo graphic
}

function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

// Event Listeners
function setupEventListeners() {
  // File Upload
  elements.browseBtn.addEventListener('click', () => elements.fileInput.click());
  elements.dropZone.addEventListener('click', (e) => {
    if (e.target !== elements.browseBtn) elements.fileInput.click();
  });
  elements.fileInput.addEventListener('change', handleFileSelect);

  // Drag & Drop
  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
  });
  elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragover'));
  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
    }
  });

  // Preset Resolutions
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const w = parseInt(btn.dataset.w, 10);
      const h = parseInt(btn.dataset.h, 10);
      elements.matrixWidthInput.value = w;
      elements.matrixHeightInput.value = h;
      updateResolution(w, h);
    });
  });

  elements.applyCustomResBtn.addEventListener('click', () => {
    const w = parseInt(elements.matrixWidthInput.value, 10) || 64;
    const h = parseInt(elements.matrixHeightInput.value, 10) || 16;
    elements.presetBtns.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.w) === w && parseInt(b.dataset.h) === h);
    });
    updateResolution(w, h);
  });

  // Fitting & Transform
  elements.fitModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.fitMode = e.target.value;
      rerenderAll();
    });
  });

  elements.panX.addEventListener('input', (e) => {
    state.panX = parseInt(e.target.value, 10);
    elements.panXVal.textContent = `${state.panX}%`;
    rerenderAll();
  });

  elements.panY.addEventListener('input', (e) => {
    state.panY = parseInt(e.target.value, 10);
    elements.panYVal.textContent = `${state.panY}%`;
    rerenderAll();
  });

  elements.zoomScale.addEventListener('input', (e) => {
    state.zoom = parseInt(e.target.value, 10) / 100;
    elements.zoomVal.textContent = `${e.target.value}%`;
    rerenderAll();
  });

  elements.bgColor.addEventListener('input', (e) => {
    state.bgColor = e.target.value;
    elements.bgColorVal.textContent = e.target.value.toUpperCase();
    rerenderAll();
  });

  // Color & Sampling
  elements.samplingFilter.addEventListener('change', (e) => {
    state.sampling = e.target.value;
    rerenderAll();
  });

  elements.brightness.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value, 10) / 100;
    elements.brightVal.textContent = `${e.target.value}%`;
    rerenderAll();
  });

  elements.contrast.addEventListener('input', (e) => {
    state.contrast = parseInt(e.target.value, 10) / 100;
    elements.contrastVal.textContent = `${e.target.value}%`;
    rerenderAll();
  });

  elements.ditherMode.addEventListener('change', (e) => {
    state.ditherMode = e.target.value;
    rerenderAll();
  });

  // Animation Timeline
  elements.btnPlayPause.addEventListener('click', togglePlayPause);
  elements.btnPrevFrame.addEventListener('click', () => stepFrame(-1));
  elements.btnNextFrame.addEventListener('click', () => stepFrame(1));
  elements.speedMultiplier.addEventListener('change', (e) => {
    state.speedMultiplier = parseFloat(e.target.value);
    elements.frameDelayText.textContent = `Speed: ${state.speedMultiplier}x`;
    if (state.isPlaying) restartAnimationTimer();
  });
  elements.frameScrubber.addEventListener('input', (e) => {
    pauseAnimation();
    state.currentFrameIndex = parseInt(e.target.value, 10);
    renderCurrentFrame();
  });

  // View Mode Toggles
  elements.toggleLedGrid.addEventListener('click', () => setViewMode('led'));
  elements.toggleExactPixels.addEventListener('click', () => setViewMode('raw'));
  elements.toggleOriginal.addEventListener('click', () => setViewMode('original'));

  // Tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'tab-esphome') updateCodeExport();
    });
  });

  // Export Buttons
  elements.btnDownloadGif.addEventListener('click', downloadResizedGif);
  elements.btnDownloadPng1x.addEventListener('click', () => downloadPng(1));
  elements.btnDownloadPngScale.addEventListener('click', () => downloadPng(16));
  elements.codeArrayFormat.addEventListener('change', updateCodeExport);
  elements.btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.codeArrayContent.textContent);
    showToast('C code copied to clipboard!');
  });
  elements.btnCopyHa.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.codeHaYaml.textContent);
    showToast('Home Assistant YAML copied!');
  });
  if (elements.btnCopyHaPanel) {
    elements.btnCopyHaPanel.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.codeHaPanel.textContent);
      showToast('Sidebar panel YAML copied!');
    });
  }

  // iPIXEL BLE Events
  if (elements.btnScanBle) {
    elements.btnScanBle.addEventListener('click', scanBleDevices);
  }
  if (elements.btnSendToIpixel) {
    elements.btnSendToIpixel.addEventListener('click', sendCurrentToIpixel);
  }

  // Sample Generators
  elements.sampleHeart.addEventListener('click', generateSampleHeart);
  elements.samplePacman.addEventListener('click', generateSamplePacman);
  elements.sampleCat.addEventListener('click', generateSampleCat);
  elements.sampleWeather.addEventListener('click', generateSampleWeather);
}

function updateResolution(w, h) {
  state.targetWidth = w;
  state.targetHeight = h;
  elements.currentResBadge.textContent = `${w} × ${h} px`;
  elements.infoDimensions.textContent = `${w} × ${h}`;
  elements.infoTotalLeds.textContent = (w * h).toLocaleString();
  
  // Calculate simplified aspect ratio
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const div = gcd(w, h);
  elements.infoRatio.textContent = `${w / div}:${h / div}`;

  // Update HA YAML preview
  elements.codeHaYaml.textContent = `# Home Assistant AWTRIX / Matrix Notification
service: mqtt.publish
data:
  topic: awtrix/custom/matrix_art
  payload: >-
    {
      "name": "matrix_${w}x${h}",
      "text": "",
      "icon": "matrix_art_${w}x${h}"
    }`;

  rerenderAll();
}

function setViewMode(mode) {
  state.viewMode = mode;
  elements.toggleLedGrid.classList.toggle('active', mode === 'led');
  elements.toggleExactPixels.classList.toggle('active', mode === 'raw');
  elements.toggleOriginal.classList.toggle('active', mode === 'original');

  elements.matrixCanvas.style.display = mode === 'led' ? 'block' : 'none';
  elements.rawCanvas.style.display = mode === 'raw' ? 'block' : 'none';
  elements.originalPreview.style.display = mode === 'original' ? 'block' : 'none';
}

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    loadFile(e.target.files[0]);
  }
}

function loadFile(file) {
  state.fileName = file.name.replace(/\.[^/.]+$/, "");
  const reader = new FileReader();

  if (file.type === 'image/gif') {
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      parseGif(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
    
    // Also read as Data URL for original preview
    const dataReader = new FileReader();
    dataReader.onload = (e) => {
      state.originalDataUrl = e.target.result;
      elements.originalPreview.src = state.originalDataUrl;
    };
    dataReader.readAsDataURL(file);
  } else {
    // Static image
    reader.onload = function(e) {
      state.originalDataUrl = e.target.result;
      elements.originalPreview.src = state.originalDataUrl;
      const img = new Image();
      img.onload = function() {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        state.frames = [{ canvas: c, delay: 100 }];
        state.isGif = false;
        state.currentFrameIndex = 0;
        updateAnimationUI();
        rerenderAll();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// Parse GIF frames using Omggif library
function parseGif(arrayBuffer) {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const gifReader = new GifReader(uint8Array);
    const numFrames = gifReader.numFrames();
    const gifWidth = gifReader.width;
    const gifHeight = gifReader.height;

    state.frames = [];
    state.isGif = numFrames > 1;

    // Buffer to compose disposal frames
    const compositedCanvas = document.createElement('canvas');
    compositedCanvas.width = gifWidth;
    compositedCanvas.height = gifHeight;
    const compositedCtx = compositedCanvas.getContext('2d', { willReadFrequently: true });

    let previousImageData = null;

    for (let i = 0; i < numFrames; i++) {
      const frameInfo = gifReader.frameInfo(i);
      const framePixels = new Uint8ClampedArray(gifWidth * gifHeight * 4);
      gifReader.decodeAndBlitFrameRGBA(i, framePixels);

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = gifWidth;
      frameCanvas.height = gifHeight;
      const frameCtx = frameCanvas.getContext('2d');
      const imgData = frameCtx.createImageData(gifWidth, gifHeight);
      imgData.data.set(framePixels);
      frameCtx.putImageData(imgData, 0, 0);

      // Disposal handling
      // 0: no disposal specified, 1: do not dispose, 2: restore to background, 3: restore to previous
      if (frameInfo.disposal === 3 && previousImageData) {
        compositedCtx.putImageData(previousImageData, 0, 0);
      } else if (frameInfo.disposal === 2) {
        compositedCtx.clearRect(frameInfo.x, frameInfo.y, frameInfo.width, frameInfo.height);
      }

      if (frameInfo.disposal === 3) {
        previousImageData = compositedCtx.getImageData(0, 0, gifWidth, gifHeight);
      }

      compositedCtx.drawImage(frameCanvas, 0, 0);

      // Save a copy of composited canvas as this frame
      const savedCanvas = document.createElement('canvas');
      savedCanvas.width = gifWidth;
      savedCanvas.height = gifHeight;
      const savedCtx = savedCanvas.getContext('2d');
      savedCtx.drawImage(compositedCanvas, 0, 0);

      // delay is in 100ths of a second (10ms units)
      const delay = (frameInfo.delay || 10) * 10;
      state.frames.push({ canvas: savedCanvas, delay: delay });
    }

    state.currentFrameIndex = 0;
    updateAnimationUI();
    rerenderAll();
    startAnimationTimer();
  } catch (err) {
    console.error('Failed to parse GIF:', err);
    alert('Error reading GIF file. Falling back to standard image loader.');
  }
}

function updateAnimationUI() {
  const count = state.frames.length;
  elements.frameCountText.textContent = `Frames: ${count}`;
  elements.frameScrubber.max = Math.max(0, count - 1);
  elements.frameScrubber.value = state.currentFrameIndex;
  elements.currentFrameLabel.textContent = `${state.currentFrameIndex + 1}/${count}`;
  
  const delay = state.frames[state.currentFrameIndex]?.delay || 100;
  elements.frameDelayText.textContent = `Frame delay: ${delay}ms (${Math.round(1000/delay)} fps)`;
}

function togglePlayPause() {
  if (state.isPlaying) {
    pauseAnimation();
  } else {
    startAnimationTimer();
  }
}

function pauseAnimation() {
  state.isPlaying = false;
  elements.btnPlayPause.textContent = '▶ Play';
  if (state.timerId) clearTimeout(state.timerId);
}

function startAnimationTimer() {
  if (state.frames.length <= 1) return;
  state.isPlaying = true;
  elements.btnPlayPause.textContent = '⏸ Pause';
  scheduleNextFrame();
}

function restartAnimationTimer() {
  if (state.timerId) clearTimeout(state.timerId);
  if (state.isPlaying && state.frames.length > 1) {
    scheduleNextFrame();
  }
}

function scheduleNextFrame() {
  if (!state.isPlaying || state.frames.length <= 1) return;
  const currentFrame = state.frames[state.currentFrameIndex];
  const delay = Math.max(20, (currentFrame.delay || 100) / state.speedMultiplier);

  state.timerId = setTimeout(() => {
    state.currentFrameIndex = (state.currentFrameIndex + 1) % state.frames.length;
    elements.frameScrubber.value = state.currentFrameIndex;
    elements.currentFrameLabel.textContent = `${state.currentFrameIndex + 1}/${state.frames.length}`;
    renderCurrentFrame();
    scheduleNextFrame();
  }, delay);
}

function stepFrame(delta) {
  pauseAnimation();
  const len = state.frames.length;
  if (len <= 1) return;
  state.currentFrameIndex = (state.currentFrameIndex + delta + len) % len;
  elements.frameScrubber.value = state.currentFrameIndex;
  elements.currentFrameLabel.textContent = `${state.currentFrameIndex + 1}/${len}`;
  renderCurrentFrame();
}

// Transform source frame to target matrix dimensions
function processFrameToMatrix(srcCanvas, targetW, targetH) {
  processCanvas.width = targetW;
  processCanvas.height = targetH;
  
  // Background fill
  processCtx.fillStyle = state.bgColor;
  processCtx.fillRect(0, 0, targetW, targetH);

  processCtx.imageSmoothingEnabled = state.sampling === 'bilinear';
  if (processCtx.imageSmoothingQuality) {
    processCtx.imageSmoothingQuality = 'high';
  }

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  let drawX = 0, drawY = 0, drawW = targetW, drawH = targetH;

  if (state.fitMode === 'cover') {
    const scale = Math.max(targetW / srcW, targetH / srcH) * state.zoom;
    drawW = srcW * scale;
    drawH = srcH * scale;
    drawX = (targetW - drawW) / 2 + (state.panX / 100) * (targetW / 2);
    drawY = (targetH - drawH) / 2 + (state.panY / 100) * (targetH / 2);
  } else if (state.fitMode === 'contain') {
    const scale = Math.min(targetW / srcW, targetH / srcH) * state.zoom;
    drawW = srcW * scale;
    drawH = srcH * scale;
    drawX = (targetW - drawW) / 2 + (state.panX / 100) * (targetW / 2);
    drawY = (targetH - drawH) / 2 + (state.panY / 100) * (targetH / 2);
  } else {
    // stretch
    drawW = targetW * state.zoom;
    drawH = targetH * state.zoom;
    drawX = (targetW - drawW) / 2 + (state.panX / 100) * (targetW / 2);
    drawY = (targetH - drawH) / 2 + (state.panY / 100) * (targetH / 2);
  }

  processCtx.drawImage(srcCanvas, drawX, drawY, drawW, drawH);

  // Apply Pixel Filters (Brightness, Contrast, Dithering)
  const imgData = processCtx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // 1. Brightness & Contrast
  const b = state.brightness;
  const c = state.contrast;
  for (let i = 0; i < data.length; i += 4) {
    // R, G, B
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      let val = data[i + cIdx];
      // Brightness
      val = val * b;
      // Contrast: (val - 128) * contrast + 128
      val = ((val - 128) * c) + 128;
      data[i + cIdx] = Math.max(0, Math.min(255, val));
    }
  }

  // 2. Dithering
  if (state.ditherMode === 'floyd') {
    applyFloydSteinbergDither(imgData, targetW, targetH);
  } else if (state.ditherMode === 'bayer') {
    applyBayerDither(imgData, targetW, targetH);
  }

  processCtx.putImageData(imgData, 0, 0);

  // Return a detached canvas for this processed frame
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(processCanvas, 0, 0);
  return outCanvas;
}

// Floyd-Steinberg error diffusion for RGB565 quantizing
function applyFloydSteinbergDither(imgData, w, h) {
  const data = imgData.data;
  // Quantization steps for RGB565: 32 levels for R&B (8-step), 64 levels for G (4-step)
  const quantR = 255 / 31;
  const quantG = 255 / 63;
  const quantB = 255 / 31;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const newR = Math.round(oldR / quantR) * quantR;
      const newG = Math.round(oldG / quantG) * quantG;
      const newB = Math.round(oldB / quantB) * quantB;

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, w, h, x + 1, y, errR, errG, errB, 7 / 16);
      distributeError(data, w, h, x - 1, y + 1, errR, errG, errB, 3 / 16);
      distributeError(data, w, h, x, y + 1, errR, errG, errB, 5 / 16);
      distributeError(data, w, h, x + 1, y + 1, errR, errG, errB, 1 / 16);
    }
  }
}

function distributeError(data, w, h, x, y, errR, errG, errB, factor) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  data[idx] = Math.max(0, Math.min(255, data[idx] + errR * factor));
  data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * factor));
  data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * factor));
}

// Ordered Bayer 4x4 Dither
function applyBayerDither(imgData, w, h) {
  const data = imgData.data;
  const quant = 32; // 8 levels

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const threshold = (bayerMatrix4x4[y % 4][x % 4] - 8) * (quant / 16);

      data[idx] = Math.max(0, Math.min(255, Math.round((data[idx] + threshold) / quant) * quant));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round((data[idx + 1] + threshold) / quant) * quant));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round((data[idx + 2] + threshold) / quant) * quant));
    }
  }
}

function rerenderAll() {
  if (state.frames.length === 0) return;
  renderCurrentFrame();
  updateCodeExport();
}

// Render the current frame into the matrix simulator & raw canvas
function renderCurrentFrame() {
  if (state.frames.length === 0) return;

  const currentRawFrame = state.frames[state.currentFrameIndex].canvas;
  const matrixPixelCanvas = processFrameToMatrix(currentRawFrame, state.targetWidth, state.targetHeight);

  // 1. Draw Raw Pixel Canvas
  elements.rawCanvas.width = state.targetWidth;
  elements.rawCanvas.height = state.targetHeight;
  const rawCtx = elements.rawCanvas.getContext('2d');
  rawCtx.drawImage(matrixPixelCanvas, 0, 0);

  // 2. Draw Simulated LED Matrix (circular diodes with pitch and diffusion glow)
  const matrixCanvas = elements.matrixCanvas;
  const pitch = 14; // LED pitch in screen pixels
  const ledRadius = 5.2; // Diode radius
  const gap = 1;

  matrixCanvas.width = state.targetWidth * pitch;
  matrixCanvas.height = state.targetHeight * pitch;
  const mCtx = matrixCanvas.getContext('2d');

  // Background PCB panel
  mCtx.fillStyle = '#06080c';
  mCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

  const pixelData = rawCtx.getImageData(0, 0, state.targetWidth, state.targetHeight).data;

  // Draw individual LED beads
  for (let y = 0; y < state.targetHeight; y++) {
    for (let x = 0; x < state.targetWidth; x++) {
      const idx = (y * state.targetWidth + x) * 4;
      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      const a = pixelData[idx + 3] / 255;

      const cx = x * pitch + pitch / 2;
      const cy = y * pitch + pitch / 2;

      // Dark unlit LED lens base
      mCtx.beginPath();
      mCtx.arc(cx, cy, ledRadius + 1, 0, Math.PI * 2);
      mCtx.fillStyle = '#11141a';
      mCtx.fill();

      // If diode is lit
      if (a > 0.05 && (r > 10 || g > 10 || b > 10)) {
        // Subtle outer glow
        const glowRadius = ledRadius * 1.8;
        const glowGrad = mCtx.createRadialGradient(cx, cy, ledRadius * 0.5, cx, cy, glowRadius);
        glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.45 * a})`);
        glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        mCtx.fillStyle = glowGrad;
        mCtx.beginPath();
        mCtx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        mCtx.fill();

        // Main Diode Body
        mCtx.beginPath();
        mCtx.arc(cx, cy, ledRadius, 0, Math.PI * 2);
        const diodeGrad = mCtx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, ledRadius);
        diodeGrad.addColorStop(0, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, ${a})`);
        diodeGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${a})`);
        mCtx.fillStyle = diodeGrad;
        mCtx.fill();

        // Diode specular reflection dot
        mCtx.beginPath();
        mCtx.arc(cx - 1.5, cy - 1.5, 1.2, 0, Math.PI * 2);
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        mCtx.fill();
      } else {
        // Off LED diode dome
        mCtx.beginPath();
        mCtx.arc(cx, cy, ledRadius, 0, Math.PI * 2);
        mCtx.fillStyle = '#181d24';
        mCtx.fill();
      }
    }
  }
}

// Download resized Animated GIF using gifshot or static PNG
function downloadResizedGif() {
  if (state.frames.length === 0) return;

  const btn = elements.btnDownloadGif;
  const originalText = btn.textContent;
  btn.textContent = 'Generating GIF...';
  btn.disabled = true;

  // Prepare processed frame images
  const processedFrames = [];
  for (let i = 0; i < state.frames.length; i++) {
    const pCanvas = processFrameToMatrix(state.frames[i].canvas, state.targetWidth, state.targetHeight);
    processedFrames.push(pCanvas.toDataURL('image/png'));
  }

  const avgDelayMs = state.frames.reduce((acc, f) => acc + (f.delay || 100), 0) / state.frames.length;
  const intervalSeconds = (avgDelayMs / 1000) / state.speedMultiplier;

  // Use gifshot to package client-side GIF
  gifshot.createGIF({
    images: processedFrames,
    gifWidth: state.targetWidth,
    gifHeight: state.targetHeight,
    interval: intervalSeconds,
    numFrames: processedFrames.length,
    sampleInterval: 1
  }, function(obj) {
    btn.textContent = originalText;
    btn.disabled = false;

    if (!obj.error) {
      const link = document.createElement('a');
      link.download = `${state.fileName}_${state.targetWidth}x${state.targetHeight}.gif`;
      link.href = obj.image;
      link.click();
      showToast('GIF downloaded successfully!');
    } else {
      console.error('GIF generation failed:', obj.error);
      alert('Error creating GIF: ' + obj.error);
    }
  });
}

function downloadPng(scale = 1) {
  if (state.frames.length === 0) return;
  const currentRawFrame = state.frames[state.currentFrameIndex].canvas;
  const pCanvas = processFrameToMatrix(currentRawFrame, state.targetWidth, state.targetHeight);

  let exportCanvas = pCanvas;
  if (scale > 1) {
    exportCanvas = document.createElement('canvas');
    exportCanvas.width = state.targetWidth * scale;
    exportCanvas.height = state.targetHeight * scale;
    const ctx = exportCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
  }

  const link = document.createElement('a');
  link.download = `${state.fileName}_frame${state.currentFrameIndex + 1}_${state.targetWidth}x${state.targetHeight}${scale > 1 ? `_${scale}x` : ''}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
  showToast(`PNG (${scale}x) downloaded!`);
}

// Generate C / ESPHome array
function updateCodeExport() {
  if (state.frames.length === 0) return;
  const currentRawFrame = state.frames[state.currentFrameIndex].canvas;
  const pCanvas = processFrameToMatrix(currentRawFrame, state.targetWidth, state.targetHeight);
  const pCtx = pCanvas.getContext('2d');
  const imgData = pCtx.getImageData(0, 0, state.targetWidth, state.targetHeight).data;
  
  const format = elements.codeArrayFormat.value;
  let code = '';

  if (format === 'rgb565') {
    code += `// ${state.targetWidth}x${state.targetHeight} Matrix Image (RGB565 uint16_t array)\n`;
    code += `// Total Pixels: ${state.targetWidth * state.targetHeight}\n`;
    code += `const uint16_t matrix_image_${state.targetWidth}x${state.targetHeight}[] PROGMEM = {\n  `;

    const values = [];
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i] >> 3;       // 5 bits (0-31)
      const g = imgData[i + 1] >> 2;   // 6 bits (0-63)
      const b = imgData[i + 2] >> 3;   // 5 bits (0-31)
      const rgb565 = (r << 11) | (g << 5) | b;
      values.push('0x' + rgb565.toString(16).padStart(4, '0').toUpperCase());
    }

    for (let i = 0; i < values.length; i++) {
      code += values[i] + ', ';
      if ((i + 1) % 16 === 0 && i !== values.length - 1) code += '\n  ';
    }
    code += '\n};\n';
  } else {
    code += `// ${state.targetWidth}x${state.targetHeight} Matrix Image (RGB888 byte array: R, G, B)\n`;
    code += `// Total Bytes: ${state.targetWidth * state.targetHeight * 3}\n`;
    code += `const uint8_t matrix_image_${state.targetWidth}x${state.targetHeight}[] PROGMEM = {\n  `;

    const bytes = [];
    for (let i = 0; i < imgData.length; i += 4) {
      bytes.push('0x' + imgData[i].toString(16).padStart(2, '0').toUpperCase());
      bytes.push('0x' + imgData[i + 1].toString(16).padStart(2, '0').toUpperCase());
      bytes.push('0x' + imgData[i + 2].toString(16).padStart(2, '0').toUpperCase());
    }

    for (let i = 0; i < bytes.length; i++) {
      code += bytes[i] + ', ';
      if ((i + 1) % 24 === 0 && i !== bytes.length - 1) code += '\n  ';
    }
    code += '\n};\n';
  }

  elements.codeArrayContent.textContent = code;
}

// ----------------------------------------------------
// iPIXEL Direct BLE Operations
// ----------------------------------------------------

async function scanBleDevices() {
  const btn = elements.btnScanBle;
  const list = elements.bleScanResults;
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  list.style.display = 'block';
  list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">Scanning nearby Bluetooth devices (4s)...</div>';

  try {
    const res = await fetch('/api/ble/scan');
    const data = await res.json();
    btn.disabled = false;
    btn.textContent = '🔍 Scan Nearby';

    if (data.devices && data.devices.length > 0) {
      list.innerHTML = '';
      data.devices.forEach(dev => {
        const item = document.createElement('div');
        item.className = 'ble-device-item';
        item.innerHTML = `
          <span><strong>${dev.name}</strong> ${dev.rssi ? `(${dev.rssi} dBm)` : ''}</span>
          <span class="ble-device-addr">${dev.address}</span>
        `;
        item.addEventListener('click', () => {
          elements.bleAddressInput.value = dev.address;
          showToast(`Selected ${dev.name}`);
        });
        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">No devices found. Make sure your matrix is powered on and within range.</div>';
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🔍 Scan Nearby';
    list.innerHTML = `<div style="color: #f87171; font-size: 0.72rem; padding: 4px;">Scan failed: ${err.message}</div>`;
  }
}

async function sendCurrentToIpixel() {
  const addr = elements.bleAddressInput.value.trim();
  if (!addr) {
    alert('Please enter or scan for your iPIXEL Bluetooth address first.');
    return;
  }

  const btn = elements.btnSendToIpixel;
  const status = elements.ipixelStatusText;
  btn.disabled = true;
  btn.textContent = 'Sending to Matrix...';
  status.className = 'status-msg';
  status.textContent = 'Preparing payload...';

  try {
    let base64Data = '';
    let ext = '.png';

    if (state.frames.length > 1) {
      // Send as animated GIF
      status.textContent = 'Encoding 64×16 GIF...';
      const processedFrames = [];
      for (let i = 0; i < state.frames.length; i++) {
        const pCanvas = processFrameToMatrix(state.frames[i].canvas, state.targetWidth, state.targetHeight);
        processedFrames.push(pCanvas.toDataURL('image/png'));
      }
      const avgDelayMs = state.frames.reduce((acc, f) => acc + (f.delay || 100), 0) / state.frames.length;
      const intervalSeconds = (avgDelayMs / 1000) / state.speedMultiplier;

      const gifObj = await new Promise((resolve) => {
        gifshot.createGIF({
          images: processedFrames,
          gifWidth: state.targetWidth,
          gifHeight: state.targetHeight,
          interval: intervalSeconds,
          numFrames: processedFrames.length,
          sampleInterval: 1
        }, resolve);
      });

      if (gifObj.error) throw new Error(gifObj.error);
      base64Data = gifObj.image;
      ext = '.gif';
    } else {
      // Send single frame PNG
      const currentRawFrame = state.frames[state.currentFrameIndex].canvas;
      const pCanvas = processFrameToMatrix(currentRawFrame, state.targetWidth, state.targetHeight);
      base64Data = pCanvas.toDataURL('image/png');
      ext = '.png';
    }

    status.textContent = 'Connecting via Bluetooth...';
    const response = await fetch('/api/ipixel/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: addr,
        image_base64: base64Data,
        extension: ext,
        save_slot: parseInt(elements.saveSlotInput.value, 10) || 0
      })
    });

    const result = await response.json();
    btn.disabled = false;
    btn.textContent = '🚀 Send to iPIXEL Matrix (BLE)';

    if (result.success) {
      status.className = 'status-msg success';
      status.textContent = `✓ Displayed! (${result.frames_sent} BLE packets)`;
      showToast('Image sent to iPIXEL matrix!');
    } else {
      status.className = 'status-msg error';
      status.textContent = `Failed: ${result.error}`;
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🚀 Send to iPIXEL Matrix (BLE)';
    status.className = 'status-msg error';
    status.textContent = `Error: ${err.message}`;
  }
}

// ----------------------------------------------------
// Demo Sample Generators (Multi-frame animated graphics)
// ----------------------------------------------------

function generateSampleHeart() {
  state.fileName = 'heart_beat';
  state.frames = [];
  const delays = [120, 100, 140, 200, 400];

  for (let f = 0; f < 5; f++) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    const ctx = c.getContext('2d');

    // Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 64, 16);

    // Heart scale pulse
    const scales = [1.0, 1.25, 1.4, 1.1, 0.95];
    const s = scales[f];

    ctx.save();
    ctx.translate(16, 8);
    ctx.scale(s, s);

    // Draw Pixel Heart
    ctx.fillStyle = f === 2 ? '#ff2a5f' : '#e11d48';
    // Simplified 9x8 pixel heart shape
    const heartGrid = [
      [0,1,1,0,0,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0]
    ];
    for (let r = 0; r < heartGrid.length; r++) {
      for (let col = 0; col < heartGrid[r].length; col++) {
        if (heartGrid[r][col]) {
          ctx.fillRect(col - 4, r - 3.5, 1, 1);
        }
      }
    }
    ctx.restore();

    // Pulse wave graph on right side of 64x16 panel
    ctx.fillStyle = '#38bdf8';
    for (let px = 28; px < 60; px++) {
      const offset = (px + f * 4) % 32;
      let py = 8;
      if (offset >= 10 && offset <= 14) py = 8 - (offset - 10) * 2;
      else if (offset > 14 && offset <= 18) py = 8 + (offset - 14) * 2;
      ctx.fillRect(px, py, 1, 1);
    }

    state.frames.push({ canvas: c, delay: delays[f] });
  }

  state.isGif = true;
  state.currentFrameIndex = 0;
  updateAnimationUI();
  rerenderAll();
  startAnimationTimer();
}

function generateSamplePacman() {
  state.fileName = 'pacman_run';
  state.frames = [];
  const numFrames = 8;

  for (let f = 0; f < numFrames; f++) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 64, 16);

    const pacX = (f * 8) % 64;
    const mouthOpen = f % 2 === 0;

    // Pacman
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    const startAngle = mouthOpen ? 0.25 * Math.PI : 0.05 * Math.PI;
    const endAngle = mouthOpen ? 1.75 * Math.PI : 1.95 * Math.PI;
    ctx.arc(pacX + 6, 8, 5.5, startAngle, endAngle);
    ctx.lineTo(pacX + 6, 8);
    ctx.fill();

    // Food Pellets
    ctx.fillStyle = '#fb923c';
    for (let pelletX = 14; pelletX < 64; pelletX += 10) {
      if (pelletX > pacX + 8) {
        ctx.fillRect(pelletX, 7, 2, 2);
      }
    }

    // Ghost chasing
    const ghostX = (pacX - 16 + 64) % 64;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(ghostX + 5, 6, 4.5, Math.PI, 0);
    ctx.lineTo(ghostX + 9.5, 12);
    ctx.lineTo(ghostX + 7, 10.5);
    ctx.lineTo(ghostX + 4.5, 12);
    ctx.lineTo(ghostX + 2, 10.5);
    ctx.lineTo(ghostX + 0.5, 12);
    ctx.closePath();
    ctx.fill();

    // Ghost eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ghostX + 2, 5, 2, 3);
    ctx.fillRect(ghostX + 6, 5, 2, 3);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(ghostX + 3, 6, 1, 2);
    ctx.fillRect(ghostX + 7, 6, 1, 2);

    state.frames.push({ canvas: c, delay: 110 });
  }

  state.isGif = true;
  state.currentFrameIndex = 0;
  updateAnimationUI();
  rerenderAll();
  startAnimationTimer();
}

function generateSampleCat() {
  state.fileName = 'pixel_cat_walk';
  state.frames = [];
  const numFrames = 6;

  for (let f = 0; f < numFrames; f++) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    const ctx = c.getContext('2d');

    // Gradient retro night sky
    const sky = ctx.createLinearGradient(0, 0, 0, 16);
    sky.addColorStop(0, '#111827');
    sky.addColorStop(1, '#1f2937');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 64, 16);

    // Stars
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, 3, 1, 1);
    ctx.fillRect(24, 2, 1, 1);
    ctx.fillRect(52, 4, 1, 1);

    // Floor line
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 14, 64, 2);

    const catX = 22 + ((f * 3) % 20);
    const bounce = (f % 2 === 0) ? 0 : 1;

    // Cat Body
    ctx.fillStyle = '#f97316';
    ctx.fillRect(catX + 4, 7 + bounce, 8, 5); // Body
    ctx.fillRect(catX + 11, 5 + bounce, 5, 5); // Head

    // Ears
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(catX + 12, 3 + bounce, 1, 2);
    ctx.fillRect(catX + 15, 3 + bounce, 1, 2);

    // Tail waving
    const tailWiggle = (f % 2 === 0) ? 0 : 1;
    ctx.fillRect(catX + 2 - tailWiggle, 6 + bounce, 2, 1);
    ctx.fillRect(catX + 1 - tailWiggle, 5 + bounce, 1, 2);

    // Legs walking
    ctx.fillStyle = '#c2410c';
    if (f % 2 === 0) {
      ctx.fillRect(catX + 4, 12, 2, 2);
      ctx.fillRect(catX + 10, 12, 2, 2);
    } else {
      ctx.fillRect(catX + 5, 12, 2, 2);
      ctx.fillRect(catX + 9, 12, 2, 2);
    }

    // Eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(catX + 14, 6 + bounce, 1, 1);

    state.frames.push({ canvas: c, delay: 130 });
  }

  state.isGif = true;
  state.currentFrameIndex = 0;
  updateAnimationUI();
  rerenderAll();
  startAnimationTimer();
}

function generateSampleWeather() {
  state.fileName = 'weather_badge';
  state.frames = [];

  for (let f = 0; f < 6; f++) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 16);

    // Rotating Sun
    ctx.save();
    ctx.translate(10, 8);
    ctx.rotate((f * Math.PI) / 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-3, -3, 6, 6);
    // Rays
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-5, -1, 10, 2);
    ctx.fillRect(-1, -5, 2, 10);
    ctx.restore();

    // Fluffy cloud
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(14, 9, 3.5, 0, Math.PI * 2);
    ctx.arc(18, 7.5, 4.5, 0, Math.PI * 2);
    ctx.arc(22, 9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Raindrops animated
    ctx.fillStyle = '#38bdf8';
    const dropY = 12 + (f % 3);
    ctx.fillRect(15, dropY, 1, 2);
    ctx.fillRect(19, ((dropY + 1) % 4) + 12, 1, 2);

    // Weather text "22°C" pixel font representation
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillText('22°C', 32, 12);

    state.frames.push({ canvas: c, delay: 150 });
  }

  state.isGif = true;
  state.currentFrameIndex = 0;
  updateAnimationUI();
  rerenderAll();
  startAnimationTimer();
}

// Start application
window.addEventListener('DOMContentLoaded', init);
