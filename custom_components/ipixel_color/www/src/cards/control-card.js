/**
 * iPIXEL Control Card
 * Unified control panel with preview, quick actions, and text/ambient controls
 */

import { iPIXELCardBase } from '../base.js';
import { iPIXELCardStyles } from '../styles.js';
import { getDisplayState, updateDisplayState, isTestMode, setTestMode } from '../state.js';
import {
  textToPixels, textToScrollPixels,
  textToPixelsCanvas, textToScrollPixelsCanvas, loadFont, isFontLoaded,
  textToPixelsBdf, textToScrollPixelsBdf, loadBdfFont, isBdfFontLoaded, getHeightKey,
  LEDMatrixRenderer, EFFECTS, EFFECT_CATEGORIES, configureFonts,
} from 'react-pixel-display/core';

const isHA = typeof window !== 'undefined' && (
  typeof window.hassConnection !== 'undefined' ||
  document.querySelector('home-assistant') !== null
);

if (isHA) {
  configureFonts({
    ttfResolver: (name) => `/hacsfiles/ipixel_color/fonts/${name}.ttf`,
    bdfResolver: (_name, file) => `/hacsfiles/ipixel_color/fonts/${file || _name}`,
  });
} else if (typeof window !== 'undefined') {
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  configureFonts({ baseUrl: `${basePath}fonts` });
}

const rendererCache = new Map();

export class iPIXELControlCard extends iPIXELCardBase {
  constructor() {
    super();
    this._renderer = null;
    this._displayContainer = null;
    this._lastState = null;
    this._cachedResolution = null;
    this._rendererId = null;
    this._activeTab = 'quick';
    this._selectedAmbient = 'rainbow';
    this._rhythmLevels = new Array(11).fill(0);
    this._selectedRhythmStyle = 0;

    this._handleDisplayUpdate = (e) => {
      this._updateDisplay(e.detail);
    };
    window.addEventListener('ipixel-display-update', this._handleDisplayUpdate);
  }

  connectedCallback() {
    if (!this._rendererId) {
      this._rendererId = `renderer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (rendererCache.has(this._rendererId)) {
      this._renderer = rendererCache.get(this._rendererId);
    }
    loadBdfFont('VCR_OSD_MONO', 16).then(() => {
      if (this._lastState) this._updateDisplay(this._lastState);
    });
    loadBdfFont('VCR_OSD_MONO', 24);
    loadBdfFont('VCR_OSD_MONO', 32);
    loadBdfFont('CUSONG', 16);
    loadBdfFont('CUSONG', 24);
    loadBdfFont('CUSONG', 32);
    loadFont('VCR_OSD_MONO');
    loadFont('CUSONG');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('ipixel-display-update', this._handleDisplayUpdate);
    if (this._renderer && this._rendererId) {
      this._renderer.stop();
      rendererCache.set(this._rendererId, this._renderer);
    }
  }

  _getResolutionCached() {
    const [sensorWidth, sensorHeight] = this.getResolution();
    if (sensorWidth > 0 && sensorHeight > 0) {
      this._cachedResolution = [sensorWidth, sensorHeight];
      try {
        localStorage.setItem('iPIXEL_Resolution', JSON.stringify([sensorWidth, sensorHeight]));
      } catch (e) { }
      return this._cachedResolution;
    }
    try {
      const saved = localStorage.getItem('iPIXEL_Resolution');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && parsed[0] > 0 && parsed[1] > 0) {
          this._cachedResolution = parsed;
          return parsed;
        }
      }
    } catch (e) { }
    if (this._cachedResolution) return this._cachedResolution;
    if (this._config?.width && this._config?.height) return [this._config.width, this._config.height];
    return [sensorWidth || 64, sensorHeight || 16];
  }

  _updateDisplay(state) {
    if (!this._displayContainer) return;
    const [width, height] = this._getResolutionCached();
    const isOn = this.isOn();
    if (!this._renderer) {
      this._renderer = new LEDMatrixRenderer(this._displayContainer, { width, height });
      if (this._rendererId) rendererCache.set(this._rendererId, this._renderer);
    } else {
      this._renderer.setContainer(this._displayContainer);
      if (this._renderer.width !== width || this._renderer.height !== height) {
        this._renderer.setDimensions(width, height);
      }
    }
    if (!isOn) {
      this._renderer.setData([]);
      this._renderer.setEffect('fixed', 50);
      this._renderer.stop();
      this._renderer.renderStatic();
      return;
    }
    const text = state?.text || '';
    const effect = state?.effect || 'fixed';
    const speed = state?.speed || 50;
    const fgColor = state?.fgColor || '#ff6600';
    const bgColor = state?.bgColor || '#000000';
    const mode = state?.mode || 'text';
    const font = state?.font || 'VCR_OSD_MONO';
    this._lastState = state;
    let displayText = text;
    let displayFg = fgColor;
    if (mode === 'clock') {
      const now = new Date();
      displayText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      displayFg = '#00ff88';
    } else if (mode === 'gif') {
      displayText = 'GIF';
      displayFg = '#ff44ff';
    } else if (mode === 'rhythm') {
      displayText = '***';
      displayFg = '#44aaff';
    }
    const effectInfo = EFFECTS[effect];
    const isAmbient = effectInfo?.category === 'ambient';
    if (isAmbient) {
      this._renderer.setData([], [], width);
    } else {
      const heightKey = getHeightKey(height);
      const useBdfFont = font !== 'LEGACY' && isBdfFontLoaded(font, heightKey);
      const useCanvasFont = font !== 'LEGACY' && isFontLoaded(font);
      const getPixels = (text, w, h, fg, bg) => {
        if (useBdfFont) {
          const bdfPixels = textToPixelsBdf(text, w, h, fg, bg, font);
          if (bdfPixels) return bdfPixels;
        }
        if (useCanvasFont) {
          const canvasPixels = textToPixelsCanvas(text, w, h, fg, bg, font);
          if (canvasPixels) return canvasPixels;
        }
        return textToPixels(text, w, h, fg, bg);
      };
      const getScrollPixels = (text, displayW, h, fg, bg) => {
        if (useBdfFont) {
          const bdfResult = textToScrollPixelsBdf(text, displayW, h, fg, bg, font);
          if (bdfResult) return bdfResult;
        }
        if (useCanvasFont) {
          const canvasResult = textToScrollPixelsCanvas(text, displayW, h, fg, bg, font);
          if (canvasResult) return canvasResult;
        }
        return textToScrollPixels(text, displayW, h, fg, bg);
      };
      const textPixelWidth = useCanvasFont ? displayText.length * 10 : displayText.length * 6;
      const needsScroll = (effect === 'scroll_ltr' || effect === 'scroll_rtl' || effect === 'bounce') && textPixelWidth > width;
      if (needsScroll) {
        const scrollResult = getScrollPixels(displayText, width, height, displayFg, bgColor);
        const displayPixels = getPixels(displayText, width, height, displayFg, bgColor);
        this._renderer.setData(displayPixels, scrollResult.pixels, scrollResult.width);
      } else {
        const pixels = getPixels(displayText, width, height, displayFg, bgColor);
        this._renderer.setData(pixels);
      }
    }
    this._renderer.setEffect(effect, speed);
    if (effect === 'fixed') {
      this._renderer.stop();
      this._renderer.renderStatic();
    } else {
      this._renderer.start();
    }
  }

  _getTestModeState() {
    const demos = [
      { text: 'iPIXEL', effect: 'scroll_ltr', speed: 40, fgColor: '#ff6600', bgColor: '#000000', mode: 'text', font: 'VCR_OSD_MONO' },
      { text: 'Hello!', effect: 'rainbow_cycle', speed: 50, fgColor: '#00ff88', bgColor: '#000000', mode: 'text', font: 'VCR_OSD_MONO' },
      { text: 'TEST', effect: 'fixed', speed: 50, fgColor: '#03a9f4', bgColor: '#111111', mode: 'text', font: 'VCR_OSD_MONO' },
      { text: '', effect: 'rainbow', speed: 60, fgColor: '#ffffff', bgColor: '#000000', mode: 'ambient', font: 'VCR_OSD_MONO' },
    ];
    const idx = Math.floor(Date.now() / 10000) % demos.length;
    return demos[idx];
  }

  _callService(service, data = {}) {
    if (!this._hass) return;
    if (this.isInTestMode()) {
      console.info(`iPIXEL [Test Mode]: ipixel_color.${service}`, data);
      return;
    }
    this.callService('ipixel_color', service, data);
  }

  _sendText() {
    const text = this.shadowRoot.getElementById('control-text')?.value || '';
    const effect = this.shadowRoot.getElementById('control-effect')?.value || 'fixed';
    const speed = parseInt(this.shadowRoot.getElementById('control-speed')?.value || '50');
    const fgColor = this.shadowRoot.getElementById('control-fg-color')?.value || '#ff6600';
    const bgColor = this.shadowRoot.getElementById('control-bg-color')?.value || '#000000';
    const font = this.shadowRoot.getElementById('control-font')?.value || 'VCR_OSD_MONO';
    const rainbowMode = parseInt(this.shadowRoot.getElementById('control-rainbow')?.value || '0');
    if (!text) return;
    updateDisplayState({ text, mode: 'text', effect, speed, fgColor, bgColor, font, rainbowMode });
    this._callService('display_text', {
      text, effect, speed,
      color_fg: this.hexToRgb(fgColor),
      color_bg: this.hexToRgb(bgColor),
      font: font === 'LEGACY' ? 'CUSONG' : font,
      rainbow_mode: rainbowMode,
    });
  }

  _applyAmbient() {
    const effect = this._selectedAmbient || 'rainbow';
    const speed = parseInt(this.shadowRoot.getElementById('ambient-speed')?.value || '50');
    updateDisplayState({ text: '', mode: 'ambient', effect, speed, fgColor: '#ffffff', bgColor: '#000000' });
    this._callService('display_native_text', {
      text: '',
      effect: '0',
      speed: speed.toString(),
      color_fg: [255, 255, 255],
      color_bg: [0, 0, 0],
    });
    this._callService('draw_visuals', {
      elements: [{ type: 'ambient', effect, speed }],
    });
  }

  _applyRhythm() {
    const style = this._selectedRhythmStyle || 0;
    const levels = this._rhythmLevels.join(',');
    updateDisplayState({ text: '', mode: 'rhythm', rhythmStyle: style, rhythmLevels: this._rhythmLevels });
    this._callService('set_rhythm_mode_advanced', { style, levels });
  }

  _applyGfx() {
    const gfxJson = this.shadowRoot.getElementById('gfx-json')?.value || '';
    let gfxData = null;
    try { gfxData = JSON.parse(gfxJson); } catch { }
    if (!gfxData) return;
    updateDisplayState({ text: '', mode: 'gfx', gfxData });
    this._callService('render_gfx', { data: gfxData });
  }

  _sendMulticolor() {
    const text = this.shadowRoot.getElementById('multicolor-text')?.value || '';
    const colors = (this.shadowRoot.getElementById('multicolor-colors')?.value || '')
      .split(',').map(c => c.trim()).filter(Boolean);
    if (!text || !colors.length) return;
    updateDisplayState({ text, mode: 'multicolor', colors });
    this._callService('display_multicolor_text', {
      text,
      colors: colors.map(c => this.hexToRgb(c)),
    });
  }

  _buildQuickActions() {
    const modes = [
      { id: 'text', label: 'Text', icon: 'T' },
      { id: 'clock', label: 'Clock', icon: '🕒' },
      { id: 'gif', label: 'GIF', icon: '🎞' },
      { id: 'ambient', icon: '✨', label: 'Ambient' },
    ];
    return `
      <div class="subsection">
        <div class="subsection-title">Quick Actions</div>
        <div class="button-grid button-grid-4">
          ${modes.map(m => `
            <button class="mode-btn" data-mode="${m.id}">
              <div style="font-size:1.2em;margin-bottom:4px;">${m.icon}</div>
              <div>${m.label}</div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="subsection">
        <div class="subsection-title">Power</div>
        <div class="button-grid button-grid-2">
          <button class="btn btn-success" id="power-on-btn">Power ON</button>
          <button class="btn btn-danger" id="power-off-btn">Power OFF</button>
        </div>
      </div>
      <div class="subsection">
        <div class="subsection-title">Update</div>
        <div class="button-grid button-grid-1">
          <button class="btn btn-primary" id="update-btn">Refresh Display</button>
        </div>
      </div>
    `;
  }

  _buildTextTab() {
    return `
      <div class="subsection">
        <div class="subsection-title">Display Text</div>
        <div class="input-row">
          <input type="text" class="text-input" id="control-text" placeholder="Enter text to display..." value="Hello">
          <button class="btn btn-primary" id="send-text-btn">Send</button>
        </div>
        <div class="two-col" style="margin-top:12px;">
          <div>
            <div class="subsection-title">Effect</div>
            <select class="dropdown" id="control-effect">
              ${Object.entries(EFFECTS).filter(([_, info]) => info.category === EFFECT_CATEGORIES.TEXT).map(([name, info]) => `<option value="${name}">${info.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <div class="subsection-title">Rainbow Mode</div>
            <select class="dropdown" id="control-rainbow">
              ${[0,1,2,3,4,5,6,7,8,9].map(v => `<option value="${v}">${v === 0 ? 'None' : 'Mode ' + v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="subsection-title" style="margin-top:12px;">Speed</div>
        <div class="control-row">
          <input type="range" class="slider" id="control-speed" min="1" max="100" value="50">
          <span class="slider-value" id="control-speed-val">50</span>
        </div>
        <div class="subsection-title" style="margin-top:12px;">Font</div>
        <div class="control-row">
          <select class="dropdown" id="control-font">
            <option value="VCR_OSD_MONO">VCR OSD Mono</option>
            <option value="CUSONG">CUSONG</option>
            <option value="LEGACY">Legacy (Bitmap)</option>
          </select>
        </div>
        <div class="subsection-title" style="margin-top:12px;">Colors</div>
        <div class="color-row">
          <input type="color" class="color-picker" id="control-fg-color" value="#ff6600">
          <span style="font-size:0.85em;">Text</span>
          <input type="color" class="color-picker" id="control-bg-color" value="#000000">
          <span style="font-size:0.85em;">Background</span>
        </div>
      </div>
    `;
  }

  _buildAmbientTab() {
    const ambientEffects = Object.entries(EFFECTS)
      .filter(([_, info]) => info.category === EFFECT_CATEGORIES.AMBIENT)
      .map(([name, info]) => ({ value: name, name: info.name }));
    return `
      <div class="subsection">
        <div class="subsection-title">Ambient Effect</div>
        <div class="button-grid button-grid-3">
          ${ambientEffects.map(e => `
            <button class="mode-btn" data-ambient="${e.value}">
              <div style="font-size:1.1em;">${e.name}</div>
            </button>
          `).join('')}
        </div>
        <div class="subsection-title" style="margin-top:12px;">Speed</div>
        <div class="control-row">
          <input type="range" class="slider" id="ambient-speed" min="1" max="100" value="50">
          <span class="slider-value" id="ambient-speed-val">50</span>
        </div>
        <button class="btn btn-primary" id="apply-ambient-btn" style="width:100%;margin-top:12px;">Apply Effect</button>
      </div>
    `;
  }

  _buildRhythmTab() {
    const RHYTHM_STYLES = [
      { value: 0, name: 'Classic Bars' },
      { value: 1, name: 'Mirrored Bars' },
      { value: 2, name: 'Center Out' },
      { value: 3, name: 'Wave Style' },
      { value: 4, name: 'Particle Style' },
    ];
    const BAND_LABELS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '12kHz', '16kHz'];
    return `
      <div class="subsection">
        <div class="subsection-title">Visualization Style</div>
        <div class="button-grid button-grid-3">
          ${RHYTHM_STYLES.map(s => `
            <button class="mode-btn ${this._selectedRhythmStyle === s.value ? 'active' : ''}" data-rhythm-style="${s.value}">
              <div style="font-size:0.9em;">${s.name}</div>
            </button>
          `).join('')}
        </div>
        <div class="subsection-title" style="margin-top:12px;">Frequency Levels (0-15)</div>
        <div class="rhythm-container">
          ${this._rhythmLevels.map((level, i) => `
            <div class="rhythm-band">
              <label>${BAND_LABELS[i]}</label>
              <input type="range" class="rhythm-slider" data-band="${i}" min="0" max="15" value="${level}">
              <span class="rhythm-val">${level}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary" id="apply-rhythm-btn" style="width:100%;margin-top:12px;">Apply Rhythm</button>
      </div>
    `;
  }

  _buildGfxTab() {
    return `
      <div class="subsection">
        <div class="subsection-title">GFX JSON Data</div>
        <textarea class="gfx-textarea" id="gfx-json" placeholder='Enter GFX JSON data...'></textarea>
        <button class="btn btn-primary" id="apply-gfx-btn" style="width:100%;margin-top:12px;">Render GFX</button>
        <div class="subsection-title" style="margin-top:16px;">Per-Character Colors</div>
        <div class="input-row">
          <input type="text" class="text-input" id="multicolor-text" placeholder="Text (e.g., HELLO)">
        </div>
        <div class="input-row">
          <input type="text" class="text-input" id="multicolor-colors" placeholder="Colors (e.g., #ff0000,#00ff00,#0000ff)">
        </div>
        <button class="btn btn-primary" id="apply-multicolor-btn" style="width:100%;margin-top:8px;">Send Multicolor Text</button>
      </div>
    `;
  }

  render() {
    const testMode = this.isInTestMode();
    if (!this._hass && !testMode) return;
    const [width, height] = this._getResolutionCached();
    const isOn = this.isOn();
    const name = this._config.name || this.getEntity()?.attributes?.friendly_name || 'iPIXEL Display';
    const sharedState = getDisplayState();
    const modeEntity = this.getRelatedEntity('select', '_mode');
    const currentMode = modeEntity?.state || sharedState.mode || 'text';
    const currentText = sharedState.text || 'Hello';
    const currentEffect = sharedState.effect || 'fixed';
    const currentSpeed = sharedState.speed || 50;
    const fgColor = sharedState.fgColor || '#ff6600';
    const bgColor = sharedState.bgColor || '#000000';
    const currentFont = sharedState.font || 'VCR_OSD_MONO';

    let testModeBanner = '';
    if (testMode) {
      testModeBanner = `
        <div class="test-mode-banner">
          <div class="test-mode-header">
            <span class="test-mode-label">Test Mode</span>
            <button class="test-mode-toggle ${testMode ? 'active' : ''}" id="test-mode-toggle">${testMode ? 'ON' : 'OFF'}</button>
          </div>
          <div class="test-mode-desc">Preview display without a device</div>
        </div>`;
    } else {
      testModeBanner = `
        <div class="test-mode-hint">
          <button class="test-mode-hint-btn" id="test-mode-toggle" title="Enable test mode for preview without a device">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15Z"/></svg>
            Test
          </button>
        </div>`;
    }

    const textEffects = Object.entries(EFFECTS)
      .filter(([_, info]) => info.category === EFFECT_CATEGORIES.TEXT)
      .map(([name, info]) => `<option value="${name}">${info.name}</option>`)
      .join('');
    const ambientEffects = Object.entries(EFFECTS)
      .filter(([_, info]) => info.category === EFFECT_CATEGORIES.AMBIENT)
      .map(([name, info]) => `<option value="${name}">${info.name}</option>`)
      .join('');

    this.shadowRoot.innerHTML = `
      <style>${iPIXELCardStyles}
        .display-container { background: #000; border-radius: 8px; padding: 8px; border: 2px solid #222; }
        .display-screen {
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          min-height: 60px;
        }
        .display-footer { display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.75em; opacity: 0.6; }
        .mode-badge { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; text-transform: capitalize; }
        .effect-badge { background: rgba(100,149,237,0.2); padding: 2px 6px; border-radius: 3px; margin-left: 4px; }
        .test-mode-banner {
          background: linear-gradient(135deg, rgba(255,152,0,0.15), rgba(255,87,34,0.1));
          border: 1px solid rgba(255,152,0,0.3);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .test-mode-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .test-mode-label { font-size: 0.85em; font-weight: 600; color: #ff9800; }
        .test-mode-toggle { padding: 3px 10px; border: 1px solid rgba(255,152,0,0.4); border-radius: 12px; background: rgba(255,152,0,0.1); color: #ff9800; cursor: pointer; font-size: 0.75em; font-weight: 600; transition: all 0.2s; }
        .test-mode-toggle.active { background: #ff9800; color: #000; }
        .test-mode-desc { font-size: 0.75em; opacity: 0.7; }
        .test-mode-hint { display: flex; justify-content: flex-end; margin-bottom: 8px; }
        .test-mode-hint-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid rgba(255,152,0,0.3); border-radius: 10px; background: rgba(255,152,0,0.08); color: #ff9800; cursor: pointer; font-size: 0.75em; opacity: 0.85; transition: opacity 0.2s, background 0.2s; -webkit-tap-highlight-color: rgba(255,152,0,0.2); }
        .test-mode-hint-btn:hover, .test-mode-hint-btn:active { opacity: 1; background: rgba(255,152,0,0.15); }
        .tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .tab { flex: 1; padding: 10px 8px; border: none; background: rgba(255,255,255,0.05); color: var(--ipixel-text); cursor: pointer; border-radius: 8px; font-size: 0.8em; font-weight: 500; transition: all 0.2s ease; }
        .tab:hover { background: rgba(255,255,255,0.1); }
        .tab.active { background: var(--ipixel-primary); color: #fff; }
        .tab-panel { display: block; }
        .tab-panel[hidden] { display: none; }
        .rhythm-band { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .rhythm-band label { width: 50px; font-size: 0.75em; opacity: 0.8; }
        .rhythm-slider { flex: 1; height: 4px; }
        .rhythm-val { width: 20px; font-size: 0.75em; text-align: right; }
        .rhythm-container { max-height: 300px; overflow-y: auto; padding-right: 8px; }
        .gfx-textarea { width: 100%; min-height: 150px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--ipixel-text); font-family: monospace; font-size: 0.8em; padding: 12px; resize: vertical; }
        .gfx-textarea:focus { outline: none; border-color: var(--ipixel-primary); }
        .input-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .input-row .text-input { flex: 1; }
      </style>
      <ha-card>
        <div class="card-content">
          ${testModeBanner}
          <div class="card-header">
            <div class="card-title">
              <span class="status-dot ${isOn ? '' : 'off'}"></span>
              ${name}
              ${testMode ? '<span class="test-mode-badge">Demo</span>' : ''}
            </div>
            <button class="icon-btn ${isOn ? 'active' : ''}" id="power-btn">
              <svg viewBox="0 0 24 24"><path d="M13,3H11V13H13V3M17.83,5.17L16.41,6.59C18.05,7.91 19,9.9 19,12A7,7 0 0,1 12,19A7,7 0 0,1 5,12C5,9.9 5.95,7.91 7.59,6.59L6.17,5.17C4.23,6.82 3,9.26 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12C21,9.26 19.77,6.82 17.83,5.17Z"/></svg>
            </button>
          </div>
          <div class="display-container">
            <div class="display-screen" id="display-screen"></div>
            <div class="display-footer">
              <span>${width} x ${height}</span>
              <span>
                <span class="mode-badge">${isOn ? currentMode : 'Off'}</span>
                ${isOn && currentEffect !== 'fixed' ? `<span class="effect-badge">${EFFECTS[currentEffect]?.name || currentEffect}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="tabs" style="margin-top:12px;">
            <button class="tab ${this._activeTab === 'quick' ? 'active' : ''}" data-tab="quick">Quick</button>
            <button class="tab ${this._activeTab === 'text' ? 'active' : ''}" data-tab="text">Text</button>
            <button class="tab ${this._activeTab === 'ambient' ? 'active' : ''}" data-tab="ambient">Ambient</button>
            <button class="tab ${this._activeTab === 'rhythm' ? 'active' : ''}" data-tab="rhythm">Rhythm</button>
            <button class="tab ${this._activeTab === 'gfx' ? 'active' : ''}" data-tab="gfx">GFX</button>
          </div>
          <div class="tab-panel" ${this._activeTab !== 'quick' ? 'hidden' : ''}>
            ${this._buildQuickActions()}
          </div>
          <div class="tab-panel" ${this._activeTab !== 'text' ? 'hidden' : ''}>
            ${this._buildTextTab()}
          </div>
          <div class="tab-panel" ${this._activeTab !== 'ambient' ? 'hidden' : ''}>
            ${this._buildAmbientTab()}
          </div>
          <div class="tab-panel" ${this._activeTab !== 'rhythm' ? 'hidden' : ''}>
            ${this._buildRhythmTab()}
          </div>
          <div class="tab-panel" ${this._activeTab !== 'gfx' ? 'hidden' : ''}>
            ${this._buildGfxTab()}
          </div>
        </div>
      </ha-card>`;

    this._displayContainer = this.shadowRoot.getElementById('display-screen');
    const displayState = (testMode && !sharedState.text && sharedState.effect === 'fixed')
      ? this._getTestModeState()
      : {
          text: currentText,
          effect: currentEffect,
          speed: currentSpeed,
          fgColor: fgColor,
          bgColor: bgColor,
          mode: currentMode,
          font: currentFont
        };
    this._updateDisplay(displayState);
    this._attachListeners();
  }

  _attachListeners() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    this.shadowRoot.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this.render();
      });
    });
    $('power-btn')?.addEventListener('click', () => {
      if (this.isInTestMode()) {
        this._testPowerState = !this._testPowerState;
        this.render();
        return;
      }
      let switchId = this._switchEntityId;
      if (!switchId) {
        const sw = this.getRelatedEntity('switch');
        if (sw) { this._switchEntityId = sw.entity_id; switchId = sw.entity_id; }
      }
      if (switchId && this._hass?.states[switchId]) {
        this._hass.callService('switch', 'toggle', { entity_id: switchId });
      } else {
        const allSwitches = Object.keys(this._hass?.states || {}).filter(e => e.startsWith('switch.'));
        const baseName = this._config.entity?.replace(/^[^.]+\./, '').replace(/_?(text|display|gif_url)$/i, '') || '';
        const match = allSwitches.find(s => s.includes(baseName.substring(0, 10)));
        if (match) {
          this._switchEntityId = match;
          this._hass.callService('switch', 'toggle', { entity_id: match });
        } else {
          console.warn('iPIXEL: No switch found. Entity:', this._config.entity, 'Available:', allSwitches);
        }
      }
    });
    $('power-on-btn')?.addEventListener('click', () => this._callService('set_power', { power: true }));
    $('power-off-btn')?.addEventListener('click', () => this._callService('set_power', { power: false }));
    $('update-btn')?.addEventListener('click', () => this._callService('update_display'));
    $('send-text-btn')?.addEventListener('click', () => this._sendText());
    $('control-speed')?.addEventListener('input', (e) => {
      const val = e.target.value;
      const label = $('control-speed-val');
      if (label) label.textContent = val;
      const text = $('control-text')?.value || '';
      if (text) {
        const effect = $('control-effect')?.value || 'fixed';
        const fgColor = $('control-fg-color')?.value || '#ff6600';
        const bgColor = $('control-bg-color')?.value || '#000000';
        const font = $('control-font')?.value || 'VCR_OSD_MONO';
        updateDisplayState({ text, mode: 'text', effect, speed: parseInt(val), fgColor, bgColor, font });
      }
    });
    $('test-mode-toggle')?.addEventListener('click', () => setTestMode(!isTestMode()));
    this.shadowRoot.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        updateDisplayState({ mode });
        if (mode === 'text') {
          this._callService('set_mode', { mode: 'textimage' });
        } else if (mode === 'clock') {
          this._callService('set_clock_mode', { style: 1, show_date: true, format_24: true });
        } else if (mode === 'gif') {
          const gifUrl = this.shadowRoot.getElementById('control-gif-url')?.value || '';
          if (gifUrl) {
            this._callService('display_image_url', { url: gifUrl });
          } else {
            this._callService('display_local_gallery', { size: '64x64', filename: '64x64_0.gif', buffer_slot: 1 });
          }
        } else if (mode === 'ambient') {
          this._selectedAmbient = 'rainbow';
          this._callService('display_native_text', { text: '', effect: '0', speed: '50', color_fg: [255,255,255], color_bg: [0,0,0] });
        }
      });
    });
    this.shadowRoot.querySelectorAll('[data-ambient]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._selectedAmbient = btn.dataset.ambient;
        this.render();
      });
    });
    $('apply-ambient-btn')?.addEventListener('click', () => this._applyAmbient());
    this.shadowRoot.querySelectorAll('[data-rhythm-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._selectedRhythmStyle = parseInt(btn.dataset.rhythmStyle);
        this.render();
      });
    });
    this.shadowRoot.querySelectorAll('.rhythm-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const band = parseInt(e.target.dataset.band);
        const value = parseInt(e.target.value);
        this._rhythmLevels[band] = value;
        e.target.nextElementSibling.textContent = value;
      });
    });
    $('apply-rhythm-btn')?.addEventListener('click', () => this._applyRhythm());
    $('apply-gfx-btn')?.addEventListener('click', () => this._applyGfx());
    $('apply-multicolor-btn')?.addEventListener('click', () => this._sendMulticolor());
    const ambientSpeed = $('ambient-speed');
    if (ambientSpeed) {
      ambientSpeed.addEventListener('input', (e) => {
        const val = e.target.value;
        const label = $('ambient-speed-val');
        if (label) label.textContent = val;
      });
    }
  }

  static getConfigElement() { return document.createElement('ipixel-simple-editor'); }
  static getStubConfig() { return { entity: '' }; }
}
