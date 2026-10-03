/**
 * iPIXEL Control Card
 *
 * The whole panel in one card: a Text tab for the native text protocol and a
 * GIF tab for preconfigured, created and uploaded animations.
 */

import { iPIXELCardBase } from '../base.js';
import { iPIXELCardStyles } from '../styles.js';
import { createStorage, getDisplayState, updateDisplayState } from '../state.js';
import { encodeGif } from '../gif-encoder.js';
import { LEDMatrixRenderer } from 'react-pixel-display/core';
import {
  renderSlider, attachSlider,
  renderColorRow, attachColorRow,
  renderGridSelector, attachGridSelector,
  renderTabs, attachTabs, renderPanel,
} from '../components/index.js';

const isHA = typeof window !== 'undefined' && (
  typeof window.hassConnection !== 'undefined' ||
  document.querySelector('home-assistant') !== null
);

const GALLERY_BASE = isHA
  ? '/ipixel_color/gallery'
  : `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}gallery`;

const storedGifs = createStorage('iPIXEL_StoredGIFs', () => []);

const TABS = [
  { id: 'text', label: 'Text' },
  { id: 'gif', label: 'GIF' },
];

const GIF_TABS = [
  { id: 'library', label: 'Library' },
  { id: 'create', label: 'Create' },
  { id: 'mine', label: 'Mine' },
];

const EFFECTS = [
  { value: 'auto', label: 'Auto (scroll only if too wide)' },
  { value: 'static', label: 'Static' },
  { value: 'scroll_left', label: 'Scroll right to left' },
  { value: 'scroll_right', label: 'Scroll left to right' },
  { value: 'blink', label: 'Blink' },
  { value: 'breeze', label: 'Breeze' },
  { value: 'snow', label: 'Snow' },
  { value: 'laser', label: 'Laser' },
];

const FONTS = [
  { value: 'cusong', label: 'CUSONG (app default)' },
  { value: 'pixeloid', label: 'Pixeloid' },
  { value: 'cusong_italic', label: 'CUSONG Italic' },
  { value: 'vcr', label: 'VCR OSD Mono' },
  { value: 'simsun', label: 'SimSun' },
  { value: 'arial', label: 'Arial' },
  { value: 'arial_bold', label: 'Arial Nova Bold' },
  { value: 'google_sans', label: 'Google Sans' },
];

const RAINBOW_MODES = [
  { value: 0, name: 'Off (use text colour)' },
  { value: 1, name: 'Rainbow Wave' },
  { value: 2, name: 'Rainbow Cycle' },
  { value: 3, name: 'Rainbow Pulse' },
  { value: 4, name: 'Rainbow Fade' },
  { value: 5, name: 'Rainbow Chase' },
  { value: 6, name: 'Rainbow Sparkle' },
  { value: 7, name: 'Rainbow Gradient' },
  { value: 8, name: 'Rainbow Theater' },
  { value: 9, name: 'Rainbow Fire' },
];

const FONT_SIZES = [
  { value: 8, label: '8px small' },
  { value: 16, label: '16px medium' },
  { value: 32, label: '32px large' },
];

const GIF_EFFECTS = [
  { value: 'rainbow', name: 'Rainbow' },
  { value: 'fire', name: 'Fire' },
  { value: 'matrix', name: 'Matrix' },
  { value: 'plasma', name: 'Plasma' },
  { value: 'water', name: 'Water' },
  { value: 'stars', name: 'Stars' },
];

const GIF_TEXT_DEFAULTS = {
  text: '',
  font: 'cusong',
  fontSize: 16,
  effect: 'auto',
  speed: 50,
  fgColor: '#ffffff',
  bgColor: '#000000',
  rainbowMode: 0,
};

const GIF_DEFAULTS = {
  effect: 'rainbow',
  speed: 50,
  frames: 12,
};

export class iPIXELControlCard extends iPIXELCardBase {
  constructor() {
    super();
    const saved = getDisplayState();
    this._text = { ...GIF_TEXT_DEFAULTS, ...saved };
    this._gif = { ...GIF_DEFAULTS };
    this._tab = 'text';
    this._gifTab = 'library';
    this._error = '';
    this._sending = null;

    this._manifest = null;
    this._size = null;
    this._filter = 'all';
    this._renderer = null;
  }

  getCardSize() { return 4; }

  connectedCallback() {
    this._loadManifest();
  }

  disconnectedCallback() {
    this._renderer?.stop();
    super.disconnectedCallback();
  }

  // ── Text ──────────────────────────────────────────────────────────────────

  _updateText(patch) {
    this._text = { ...this._text, ...patch };
    updateDisplayState({ ...this._text, mode: 'text' });
    this._restoreTextValues();
  }

  _restoreTextValues() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const t = this._text;
    if ($('text-input')) $('text-input').value = t.text;
    if ($('text-font')) $('text-font').value = t.font;
    if ($('text-font-size')) $('text-font-size').value = String(t.fontSize);
    if ($('text-effect')) $('text-effect').value = t.effect;
    if ($('rainbow-mode')) $('rainbow-mode').value = String(t.rainbowMode);
    if ($('text-color')) $('text-color').value = t.fgColor;
    if ($('bg-color')) $('bg-color').value = t.bgColor;
    if ($('text-speed')) {
      $('text-speed').value = t.speed;
      $('text-speed').style.setProperty('--value', `${t.speed}%`);
      const val = $('text-speed-val');
      if (val) val.textContent = `${t.speed}`;
    }
  }

  async _sendText() {
    const t = this._text;

    if (!t.text) {
      this._error = 'Enter some text first.';
      this.render();
      return;
    }

    this._error = '';

    if (this._config.entity && this._hass && !this.isInTestMode()) {
      try {
        await this._hass.callService('text', 'set_value', {
          entity_id: this._config.entity,
          value: t.text,
        });
      } catch (err) {
        console.warn('iPIXEL: could not update the text entity', err);
      }
    }

    await this.callService('ipixel_color', 'set_matrix_text', {
      text: t.text,
      effect: t.effect,
      speed: t.speed,
      font: t.font,
      font_size: t.fontSize,
      color_fg: this.hexToRgb(t.fgColor),
      color_bg: this.hexToRgb(t.bgColor),
      rainbow_mode: t.rainbowMode,
    });
  }

  _renderTextTab() {
    const t = this._text;
    const rainbow = t.rainbowMode > 0;

    return `
      <div class="input-row">
        <input type="text" class="text-input" id="text-input"
               placeholder="Text to show on the matrix" maxlength="120">
        <button class="btn btn-primary" id="send-text-btn">Send</button>
      </div>

      <div class="two-col">
        <div>
          <div class="section-title">Font</div>
          <div class="control-row">
            <select class="dropdown" id="text-font">
              ${FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <div class="section-title">Font size</div>
          <div class="control-row">
            <select class="dropdown" id="text-font-size">
              ${FONT_SIZES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="section-title">Effect</div>
      <div class="control-row">
        <select class="dropdown" id="text-effect">
          ${EFFECTS.map(e => `<option value="${e.value}">${e.label}</option>`).join('')}
        </select>
      </div>

      <div class="section-title">Speed</div>
      <div class="control-row">
        ${renderSlider({ id: 'text-speed', min: 0, max: 100, value: t.speed })}
      </div>
      <div class="hint">Scroll speed and blink rate.</div>

      <div class="section-title">Colour</div>
      <div class="control-row">
        ${renderColorRow([
          { id: 'text-color', label: 'Text', value: t.fgColor },
          { id: 'bg-color', label: 'Background', value: t.bgColor },
        ])}
      </div>
      ${rainbow ? '<div class="note">A rainbow mode is active, so the panel cycles the colours and ignores the text colour.</div>' : ''}

      <div class="section-title">Rainbow</div>
      <div class="control-row">
        <select class="dropdown" id="rainbow-mode">
          ${RAINBOW_MODES.map(m => `<option value="${m.value}">${m.name}</option>`).join('')}
        </select>
      </div>`;
  }

  _attachTextListeners() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    $('text-input')?.addEventListener('input', (e) => this._updateText({ text: e.target.value }));
    $('text-font')?.addEventListener('change', (e) => this._updateText({ font: e.target.value }));
    $('text-font-size')?.addEventListener('change', (e) => this._updateText({ fontSize: parseInt(e.target.value, 10) }));
    $('text-effect')?.addEventListener('change', (e) => this._updateText({ effect: e.target.value }));
    $('rainbow-mode')?.addEventListener('change', (e) => {
      this._updateText({ rainbowMode: parseInt(e.target.value, 10) || 0 });
      this.render();
    });

    attachSlider(this.shadowRoot, 'text-speed', {
      onInput: (value) => this._updateText({ speed: value }),
    });

    attachColorRow(this.shadowRoot, ['text-color', 'bg-color'], (id, value) => {
      this._updateText(id === 'text-color' ? { fgColor: value } : { bgColor: value });
    });

    $('send-text-btn')?.addEventListener('click', () => this._sendText());
    $('text-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendText();
    });
  }

  // ── GIF: library ──────────────────────────────────────────────────────────

  async _loadManifest() {
    if (this._manifest) return;
    try {
      const resp = await fetch(`${GALLERY_BASE}/manifest.json`);
      this._manifest = await resp.json();
    } catch (err) {
      console.error('iPIXEL: could not load the GIF library', err);
      this._manifest = {};
    }
    this._autoSelectSize();
    this.render();
  }

  _autoSelectSize() {
    if (!this._manifest || this._size) return;
    const [w, h] = this.getResolution();
    const sizeKey = `${w}x${h}`;
    const sizes = Object.keys(this._manifest);
    this._size = this._manifest[sizeKey] ? sizeKey : sizes[0] || null;
  }

  _sizes() {
    if (!this._manifest) return [];
    return Object.keys(this._manifest).sort((a, b) => {
      const [aw, ah] = a.split('x').map(Number);
      const [bw, bh] = b.split('x').map(Number);
      return (ah - bh) || (aw - bw);
    });
  }

  _libraryItems() {
    const data = this._manifest?.[this._size];
    const items = [];
    if (data?.animations && this._filter !== 'eyes') {
      data.animations.forEach((a) => items.push({ ...a, kind: 'animation' }));
    }
    if (data?.eyes && this._filter !== 'animations') {
      data.eyes.forEach((e) => items.push({ ...e, kind: 'eye' }));
    }
    return items;
  }

  _renderLibraryTab() {
    if (!this._manifest) return '<div class="empty-state">Loading library...</div>';

    const [w, h] = this.getResolution();
    const sizes = this._sizes();
    const data = this._manifest[this._size];

    const filters = [
      { value: 'all', name: 'All' },
      { value: 'animations', name: 'Animations', show: (data?.animations?.length || 0) > 0 },
      { value: 'eyes', name: 'Eyes', show: (data?.eyes?.length || 0) > 0 },
    ].filter((f) => f.show !== false);

    return `
      <div class="section-title">Panel size</div>
      ${renderGridSelector(
        sizes.map((s) => ({ value: s, name: s, isMatch: s === `${w}x${h}` })),
        {
          selected: this._size,
          itemClass: 'chip',
          gridClass: 'chips',
          dataAttr: 'size',
          extraClass: (item) => (item.isMatch ? 'match' : ''),
        }
      )}

      <div class="section-title" style="margin-top:12px;">Category</div>
      ${renderGridSelector(filters, {
        selected: this._filter,
        itemClass: 'chip',
        gridClass: 'chips',
        dataAttr: 'filter',
      })}

      ${this._renderLibraryItems()}`;
  }

  _renderLibraryItems() {
    const items = this._libraryItems();
    if (items.length === 0) {
      return '<div class="empty-state">No animations for this category.</div>';
    }

    return `<div class="gif-grid">${items.map((item) => {
      const sending = this._sending === item.file;
      const label = item.kind === 'eye'
        ? `Eye ${item.side.toUpperCase()} #${item.num}`
        : item.name || `#${item.num}`;
      return `
        <div class="gif-item${sending ? ' sending' : ''}" data-file="${item.file}"
             title="${this.escapeHtml(label)}">
          <img src="${GALLERY_BASE}/${this._size}/${item.file}" loading="lazy"
               alt="${this.escapeHtml(label)}">
          <div class="gif-label">${this.escapeHtml(label)}</div>
          ${sending ? '<div class="gif-overlay">Sending...</div>' : ''}
        </div>`;
    }).join('')}</div>`;
  }

  async _sendLibraryGif(file) {
    this._sending = file;
    this._error = '';
    this.render();

    const data = { size: this._size, filename: file };
    if (this._config.entity) data.entity_id = this._config.entity;
    await this.callService('ipixel_color', 'display_local_gallery', data);

    this._sending = null;
    this.render();
  }

  // ── GIF: create ───────────────────────────────────────────────────────────

  _initPreview() {
    const container = this.shadowRoot.getElementById('gif-preview');
    if (!container) return;
    // Re-rendering replaces the container, so the renderer has to follow it.
    if (this._renderer && this._rendererContainer === container) return;
    this._renderer?.stop();
    const [width, height] = this.getResolution();
    this._renderer = new LEDMatrixRenderer(container, { width, height });
    this._rendererContainer = container;
  }

  _gifFrames() {
    const [width, height] = this.getResolution();
    const total = Math.max(2, Math.min(30, parseInt(this._gif.frames, 10) || 12));
    const frames = [];

    for (let f = 0; f < total; f++) {
      const buf = new Uint8Array(width * height * 3);
      const put = (x, y, r, g, b) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = (y * width + x) * 3;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
      };

      if (this._gif.effect === 'rainbow') {
        for (let y = 0; y < height; y++) {
          const hue = (f / total + (y / Math.max(height - 1, 1)) * 0.5) % 1;
          const r = Math.round((Math.sin(hue * 6.283) + 1) * 127);
          const g = Math.round((Math.sin(hue * 6.283 + 2.094) + 1) * 127);
          const b = Math.round((Math.sin(hue * 6.283 + 4.188) + 1) * 127);
          for (let x = 0; x < width; x++) put(x, y, r, g, b);
        }
      } else if (this._gif.effect === 'fire') {
        for (let y = 0; y < height; y++) {
          const t = (y + f * 1.5) % height;
          const i = Math.round((1 - t / Math.max(height - 1, 1)) * 255);
          for (let x = 0; x < width; x++) {
            put(x, y, i, Math.round(i * 0.35), Math.round(i * 0.08));
          }
        }
      } else if (this._gif.effect === 'plasma') {
        const off = f * 0.4;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const v = (Math.sin(x * 0.16 + off) + Math.sin(y * 0.22 + off) + Math.sin((x + y) * 0.12 + off) + 3) / 6;
            put(x, y,
              Math.round(v * 255),
              Math.round((Math.sin(x * 0.3 + off) + 1) * 127),
              Math.round((Math.cos(y * 0.3 + off) + 1) * 127));
          }
        }
      } else if (this._gif.effect === 'water') {
        for (let y = 0; y < height; y++) {
          const v = Math.sin(y * 0.4 + f * 0.55) * 0.5 + 0.5;
          const i = Math.round(30 + 225 * v);
          for (let x = 0; x < width; x++) {
            put(x, y, Math.round(i * 0.2), Math.round(i * 0.75), i);
          }
        }
      } else if (this._gif.effect === 'matrix') {
        const cols = Math.max(4, Math.floor(width / 2));
        for (let c = 0; c < cols; c++) {
          const seed = (c * 37) % 11;
          const head = (f * 2 + seed * 3) % (height + 6);
          for (let t = 0; t < 5; t++) {
            const y = head - t;
            if (y < 0 || y >= height) continue;
            const i = Math.round((1 - t / 5) * 255);
            put(Math.floor(c * (width / cols)), y, 0, i, Math.round(i * 0.25));
          }
        }
      } else {
        const cols = Math.max(4, Math.floor(width / 3));
        for (let c = 0; c < cols; c++) {
          const phase = (f * 0.35 + c * 0.45) % (Math.PI * 2);
          const v = (Math.sin(phase) + 1) * 0.5;
          const i = Math.round(v * 255);
          const x = Math.floor(c * (width / cols));
          put(x, height - 1, i, i, i);
          if (v > 0.7) put(x, height - 2, Math.round(i * 0.5), Math.round(i * 0.5), Math.round(i * 0.5));
        }
      }

      frames.push(buf);
    }

    return frames;
  }

  _frameDelay() {
    return Math.max(2, Math.round(20 - (this._gif.speed / 100) * 17));
  }

  _updatePreview() {
    if (!this._renderer) return;
    const [width, height] = this.getResolution();
    const hex = this._gifFrames().map((buf) => {
      const out = new Array(width * height);
      for (let p = 0; p < out.length; p++) {
        const i = p * 3;
        out[p] = '#' + [buf[i], buf[i + 1], buf[i + 2]]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('');
      }
      return out;
    });

    if (this._renderer.playFrames) {
      this._renderer.playFrames(hex, this._frameDelay() * 10);
    } else if (hex.length > 0) {
      this._renderer.setData(hex[0]);
      this._renderer.setEffect('fixed', 50);
      this._renderer.renderStatic();
    }
  }

  _renderCreateTab() {
    const g = this._gif;
    return `
      <div class="preview-box">
        <div class="preview-screen" id="gif-preview"></div>
      </div>

      <div class="section-title">Animation</div>
      ${renderGridSelector(GIF_EFFECTS, {
        selected: g.effect,
        itemClass: 'chip',
        gridClass: 'chips',
        dataAttr: 'effect',
      })}

      <div class="section-title" style="margin-top:12px;">Speed</div>
      <div class="control-row">
        ${renderSlider({ id: 'gif-speed', min: 0, max: 100, value: g.speed })}
      </div>

      <div class="section-title">Frames</div>
      <div class="control-row">
        ${renderSlider({ id: 'gif-frames', min: 2, max: 30, value: g.frames })}
      </div>

      <div class="button-grid button-grid-2" style="margin-top:8px;">
        <button class="btn btn-secondary" id="gif-save-btn">Save</button>
        <button class="btn btn-primary" id="gif-send-btn">Send</button>
      </div>
      <div class="hint">Saving keeps the animation in this browser so you can send it again later.</div>`;
  }

  _encodeGif() {
    const [width, height] = this.getResolution();
    return encodeGif(this._gifFrames(), width, height, this._frameDelay(), 0);
  }

  async _saveGif() {
    const name = `${this._gif.effect}_${this._gifFrames}_f.gif`;
    try {
      const bytes = this._encodeGif();
      const blob = new Blob([bytes], { type: 'image/gif' });
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const gifs = storedGifs.load();
      const entry = { name, dataUrl, addedAt: Date.now() };
      const existing = gifs.findIndex((g) => g.name === name);
      if (existing >= 0) gifs[existing] = entry;
      else gifs.push(entry);
      storedGifs.save(gifs);

      this._gifTab = 'mine';
      this._error = '';
      this.render();
    } catch (err) {
      console.error('iPIXEL: could not save the generated GIF', err);
      this._error = 'Could not save the animation. Try fewer frames.';
      this.render();
    }
  }

  async _sendGeneratedGif() {
    const bytes = this._encodeGif();
    const name = `${this._gif.effect}_${this._gif.frames}_f.gif`;
    const dataUrl = `data:image/gif;base64,${this._bytesToBase64(bytes)}`;

    const gifs = storedGifs.load();
    const entry = { name, dataUrl, addedAt: Date.now() };
    const existing = gifs.findIndex((g) => g.name === name);
    if (existing >= 0) gifs[existing] = entry;
    else gifs.push(entry);
    storedGifs.save(gifs);

    this._error = '';
    await this.callService('ipixel_color', 'display_gif_data', {
      gif_data: dataUrl,
    });
  }

  _bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  _attachCreateListeners() {
    attachGridSelector(this.shadowRoot, '[data-effect]', {
      onSelect: (value) => {
        this._gif = { ...this._gif, effect: value };
        this._updatePreview();
        this.render();
      },
      attr: 'effect',
    });

    attachSlider(this.shadowRoot, 'gif-speed', {
      onInput: (value) => {
        this._gif = { ...this._gif, speed: value };
        this._updatePreview();
      },
    });

    attachSlider(this.shadowRoot, 'gif-frames', {
      onInput: (value) => {
        this._gif = { ...this._gif, frames: value };
        this._updatePreview();
      },
    });

    this.shadowRoot.getElementById('gif-save-btn')?.addEventListener('click', () => this._saveGif());
    this.shadowRoot.getElementById('gif-send-btn')?.addEventListener('click', () => this._sendGeneratedGif());
  }

  // ── GIF: mine ─────────────────────────────────────────────────────────────

  _renderMineTab() {
    const gifs = storedGifs.load();
    return `
      <div class="drop-zone" id="drop-zone">
        <div class="drop-text">Drop a GIF here or tap to upload</div>
        <input type="file" id="file-input" accept="image/gif,.gif" multiple>
      </div>

      ${gifs.length === 0
        ? '<div class="empty-state">Nothing stored yet. Create one in the Create tab, or upload a GIF.</div>'
        : `<div class="gif-grid">${gifs.map((g) => {
            const sending = this._sending === g.name;
            return `
              <div class="gif-item stored${sending ? ' sending' : ''}" data-name="${this.escapeHtml(g.name)}"
                   title="${this.escapeHtml(g.name)}">
                <img src="${g.dataUrl}" loading="lazy" alt="${this.escapeHtml(g.name)}">
                <div class="gif-label">${this.escapeHtml(g.name.replace(/\.gif$/i, ''))}</div>
                <button class="gif-delete" data-delete="${this.escapeHtml(g.name)}">x</button>
                ${sending ? '<div class="gif-overlay">Sending...</div>' : ''}
              </div>`;
          }).join('')}</div>`}`;
  }

  _storeFiles(files) {
    const gifs = storedGifs.load();
    let pending = 0;
    let done = 0;

    for (const file of files) {
      if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) continue;
      pending++;
      const reader = new FileReader();
      reader.onload = () => {
        const entry = { name: file.name, dataUrl: reader.result, addedAt: Date.now() };
        const existing = gifs.findIndex((g) => g.name === file.name);
        if (existing >= 0) gifs[existing] = entry;
        else gifs.push(entry);
        if (++done === pending) {
          storedGifs.save(gifs);
          this.render();
        }
      };
      reader.onerror = () => {
        if (++done === pending) {
          storedGifs.save(gifs);
          this.render();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async _sendStoredGif(name) {
    const item = storedGifs.load().find((g) => g.name === name);
    if (!item) return;

    this._sending = name;
    this._error = '';
    this.render();

    await this.callService('ipixel_color', 'display_gif_data', {
      gif_data: item.dataUrl,
    });

    this._sending = null;
    this.render();
  }

  _attachMineListeners() {
    const dropZone = this.shadowRoot.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer?.files?.length) this._storeFiles(e.dataTransfer.files);
      });
      dropZone.addEventListener('click', () => {
        this.shadowRoot.getElementById('file-input')?.click();
      });
    }

    this.shadowRoot.getElementById('file-input')?.addEventListener('change', (e) => {
      if (e.target.files?.length) this._storeFiles(e.target.files);
    });

    this.shadowRoot.querySelectorAll('.gif-item.stored').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('gif-delete')) return;
        this._sendStoredGif(el.dataset.name);
      });
    });

    this.shadowRoot.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.delete;
        storedGifs.save(storedGifs.load().filter((g) => g.name !== name));
        this.render();
      });
    });
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  _renderGifTab() {
    return `
      ${renderTabs(GIF_TABS, this._gifTab, 'data-gif-tab')}
      ${renderPanel('library', this._gifTab === 'library', this._renderLibraryTab())}
      ${renderPanel('create', this._gifTab === 'create', this._renderCreateTab())}
      ${renderPanel('mine', this._gifTab === 'mine', this._renderMineTab())}`;
  }

  render() {
    if (!this._hass && !this.isInTestMode()) return;

    this.shadowRoot.innerHTML = `
      <style>${iPIXELCardStyles}
        .input-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .input-row .text-input { flex: 1; }
        .hint { font-size: 0.75em; opacity: 0.6; margin: -8px 0 16px; }
        .note { font-size: 0.75em; opacity: 0.6; margin-top: 4px; }
        .error { color: var(--error-color, #db4437); font-size: 0.8em; margin-top: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .chip {
          padding: 5px 12px; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px; background: rgba(255,255,255,0.05);
          color: inherit; cursor: pointer; font-size: 0.75em; transition: all 0.2s;
        }
        .chip:hover { background: rgba(255,255,255,0.1); }
        .chip.active { background: var(--ipixel-primary); border-color: var(--ipixel-primary); color: #fff; }
        .chip.match { border-color: rgba(76,175,80,0.6); }
        .gif-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px; margin-top: 8px;
        }
        .gif-item {
          position: relative; background: #000; border: 2px solid rgba(255,255,255,0.1);
          border-radius: 8px; overflow: hidden; cursor: pointer;
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s;
        }
        .gif-item:hover { border-color: var(--ipixel-primary); transform: scale(1.04); }
        .gif-item.sending { opacity: 0.7; border-color: var(--ipixel-accent, #ff9800); }
        .gif-item.stored { border-color: rgba(255,152,0,0.35); }
        .gif-item img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
        .gif-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,0.7); font-size: 0.6em; padding: 2px 4px;
          text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gif-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7em; color: var(--ipixel-accent, #ff9800);
        }
        .gif-delete {
          position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
          background: rgba(244,67,54,0.85); border: none; border-radius: 50%;
          color: #fff; font-size: 11px; line-height: 18px; text-align: center;
          cursor: pointer; padding: 0; display: none;
        }
        .gif-item:hover .gif-delete { display: block; }
        .preview-box {
          background: #000; border-radius: 8px; padding: 8px;
          border: 2px solid #222; margin-bottom: 12px;
        }
        .preview-screen { background: #000; border-radius: 4px; overflow: hidden; min-height: 60px; }
        .drop-zone {
          border: 2px dashed rgba(255,255,255,0.2); border-radius: 10px;
          padding: 16px; text-align: center; margin-bottom: 12px;
          transition: all 0.2s; cursor: pointer;
        }
        .drop-zone:hover, .drop-zone.drag-over {
          border-color: var(--ipixel-primary); background: rgba(3,169,244,0.05);
        }
        .drop-zone input[type="file"] { display: none; }
        .drop-text { font-size: 0.8em; opacity: 0.6; }
      </style>
      <ha-card>
        <div class="card-content">
          ${renderTabs(TABS, this._tab)}
          ${renderPanel('text', this._tab === 'text', this._renderTextTab())}
          ${renderPanel('gif', this._tab === 'gif', this._renderGifTab())}
          ${this._error ? `<div class="error">${this.escapeHtml(this._error)}</div>` : ''}
        </div>
      </ha-card>`;

    if (this._tab === 'text') {
      this._restoreTextValues();
      this._attachTextListeners();
    } else {
      this._attachGifListeners();
      if (this._gifTab === 'create') {
        this._initPreview();
        this._updatePreview();
      }
    }

    attachTabs(this.shadowRoot, (id) => {
      this._tab = id;
      this._error = '';
      this.render();
    });
  }

  _attachGifListeners() {
    attachTabs(this.shadowRoot, (id) => {
      this._gifTab = id;
      this.render();
    }, 'data-gif-tab');

    if (this._gifTab === 'library') {
      attachGridSelector(this.shadowRoot, '[data-size]', {
        onSelect: (value) => {
          this._size = value;
          this._filter = 'all';
          this.render();
        },
        attr: 'size',
      });
      attachGridSelector(this.shadowRoot, '[data-filter]', {
        onSelect: (value) => {
          this._filter = value;
          this.render();
        },
        attr: 'filter',
      });
      this.shadowRoot.querySelectorAll('.gif-item[data-file]').forEach((el) => {
        el.addEventListener('click', () => this._sendLibraryGif(el.dataset.file));
      });
    } else if (this._gifTab === 'create') {
      this._attachCreateListeners();
    } else {
      this._attachMineListeners();
    }
  }

  static getConfigElement() { return document.createElement('ipixel-simple-editor'); }
  static getStubConfig() { return { entity: '' }; }
}