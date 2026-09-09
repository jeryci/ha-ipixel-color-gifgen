/**
 * iPIXEL GIF Generator Card
 * Generate custom animated GIFs and send them to your LED matrix
 */

import { iPIXELCardBase } from '../base.js';
import { iPIXELCardStyles } from '../styles.js';
import { getDisplayState, updateDisplayState } from '../state.js';
import { LEDMatrixRenderer } from 'react-pixel-display/core';

const isHA = typeof window !== 'undefined' && (
  typeof window.hassConnection !== 'undefined' ||
  document.querySelector('home-assistant') !== null
);

const GALLERY_BASE = isHA
  ? '/ipixel_color/gallery'
  : `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}gallery`;

const EFFECTS = {
  rainbow: { name: 'Rainbow', category: 'ambient' },
  fire: { name: 'Fire', category: 'ambient' },
  matrix: { name: 'Matrix', category: 'ambient' },
  plasma: { name: 'Plasma', category: 'ambient' },
  water: { name: 'Water', category: 'ambient' },
  stars: { name: 'Stars', category: 'ambient' },
};

export class iPIXELGifGeneratorCard extends iPIXELCardBase {
  constructor() {
    super();
    this._effect = 'rainbow';
    this._speed = 50;
    this._frames = 12;
    this._previewUrl = null;
    this._sending = false;
    this._renderer = null;
  }

  connectedCallback() {
    this._initPreview();
  }

  disconnectedCallback() {
    if (this._renderer) {
      this._renderer.stop();
    }
  }

  _initPreview() {
    const container = this.shadowRoot.getElementById('preview-screen');
    if (!container) return;
    const [width, height] = this.getResolution();
    this._renderer = new LEDMatrixRenderer(container, { width, height });
    this._renderer.setData([]);
    this._renderer.setEffect('fixed', 50);
    this._renderer.renderStatic();
  }

  _updatePreview() {
    if (!this._renderer) return;
    const [width, height] = this.getResolution();
    const effect = this._effect;
    const speed = this._speed;
    const frames = this._generateFrames(effect, width, height);
    if (frames.length > 0 && this._renderer.playFrames) {
      this._renderer.playFrames(frames, Math.max(20, 100 - speed));
    } else if (frames.length > 0) {
      this._renderer.setData(frames[0]);
      this._renderer.setEffect('fixed', 50);
      this._renderer.renderStatic();
    }
  }

  _generateFrames(effect, width, height) {
    const frames = [];
    const total = this._frames;
    for (let i = 0; i < total; i++) {
      const img = this._renderFrame(effect, i, total, width, height);
      frames.push(img);
    }
    return frames;
  }

  _renderFrame(effect, frameIndex, totalFrames, width, height) {
    const data = [];
    const effectKey = (effect || 'rainbow').trim().toLowerCase();
    if (effectKey === 'rainbow') {
      for (let y = 0; y < height; y++) {
        const hue = (frameIndex / totalFrames + y / Math.max(height - 1, 1) * 0.4) % 1;
        const r = Math.floor((Math.sin(hue * Math.PI * 2) + 1) * 127);
        const g = Math.floor((Math.sin(hue * Math.PI * 2 + 2.094) + 1) * 127);
        const b = Math.floor((Math.sin(hue * Math.PI * 2 + 4.188) + 1) * 127);
        for (let x = 0; x < width; x++) {
          data.push([x, y, r, g, b]);
        }
      }
    } else if (effectKey === 'fire') {
      for (let y = 0; y < height; y++) {
        const t = (y + frameIndex * 2) % height;
        const intensity = Math.floor((1 - t / Math.max(height - 1, 1)) * 255);
        for (let x = 0; x < width; x++) {
          data.push([x, y, intensity, Math.floor(intensity * 0.35), 0]);
        }
      }
    } else if (effectKey === 'matrix') {
      const particles = [];
      const count = Math.max(8, Math.floor(width * height / 8));
      for (let p = 0; p < count; p++) {
        particles.push({
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        });
      }
      for (const p of particles) {
        const head = (p.y + frameIndex * 4) % height;
        const tail = (head - 3 + height) % height;
        const intensity = Math.floor((1 - head / Math.max(height - 1, 1)) * 255);
        data.push([p.x, head, 0, 255, 0]);
        data.push([p.x, tail, 0, Math.max(0, Math.floor(intensity / 4)), 0]);
      }
    } else if (effectKey === 'plasma') {
      const offset = frameIndex * 0.5;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const v1 = Math.sin(x * 0.1 + offset);
          const v2 = Math.sin(y * 0.1 + offset);
          const v3 = Math.sin((x + y) * 0.1 + offset);
          const v = (v1 + v2 + v3 + 3) / 6;
          const r = Math.floor(v * 255);
          const g = Math.floor(((Math.sin(x * 0.2 + offset) + 1) / 2) * 255);
          const b = Math.floor(((Math.cos(y * 0.2 + offset) + 1) / 2) * 255);
          data.push([x, y, r, g, b]);
        }
      }
    } else if (effectKey === 'water') {
      for (let y = 0; y < height; y++) {
        const wave = Math.sin(y * 0.4 + frameIndex * 0.6) * 0.5 + 0.5;
        const intensity = Math.floor(40 + 215 * wave);
        for (let x = 0; x < width; x++) {
          data.push([x, y, 0, intensity, intensity]);
        }
      }
    } else if (effectKey === 'stars') {
      const particles = [];
      const count = Math.max(8, Math.floor(width * height / 8));
      for (let p = 0; p < count; p++) {
        particles.push({
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        });
      }
      for (const p of particles) {
        const phase = (p.y * 0.3 + frameIndex * 0.8) % (Math.PI * 2);
        const bright = Math.floor((Math.sin(phase) * 0.5 + 0.5) * 255);
        data.push([p.x, p.y, bright, bright, bright]);
        if (bright > 200) {
          data.push([p.x, (p.y - 1 + height) % height, Math.floor(bright / 2), Math.floor(bright / 2), Math.floor(bright / 2)]);
        }
      }
    }
    return data;
  }

  _sendToDevice() {
    if (this._sending) return;
    this._sending = true;
    this.render();

    updateDisplayState({
      mode: 'ambient',
      effect: this._effect,
      speed: this._speed,
    });

    this._callService('display_ambient', {
      effect: this._effect,
      speed: this._speed,
    });

    setTimeout(() => {
      this._sending = false;
      this.render();
    }, 1000);
  }

  render() {
    if (!this._hass && !this.isInTestMode()) return;
    const [width, height] = this.getResolution();
    const isOn = this.isOn();
    const name = this._config.name || this.getEntity()?.attributes?.friendly_name || 'iPIXEL Display';

    this._updatePreview();

    this.shadowRoot.innerHTML = `
      <style>${iPIXELCardStyles}
        .preview-container {
          background: #000;
          border-radius: 8px;
          padding: 8px;
          border: 2px solid #222;
          margin-bottom: 12px;
        }
        .preview-screen {
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          min-height: 60px;
        }
        .control-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .control-row label {
          min-width: 60px;
          font-size: 0.85em;
          opacity: 0.8;
        }
        .slider {
          flex: 1;
          height: 4px;
        }
        .slider-value {
          min-width: 35px;
          text-align: right;
          font-size: 0.85em;
        }
        .effect-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .effect-btn {
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          color: var(--ipixel-text);
          cursor: pointer;
          font-size: 0.8em;
          transition: all 0.2s;
        }
        .effect-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .effect-btn.active {
          background: var(--ipixel-primary);
          border-color: var(--ipixel-primary);
          color: #fff;
        }
        .send-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: var(--ipixel-primary);
          color: #fff;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .send-btn:hover {
          opacity: 0.9;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="card-header">
            <div class="card-title">
              <span class="status-dot ${isOn ? '' : 'off'}"></span>
              ${name}
            </div>
          </div>
          <div class="preview-container">
            <div class="preview-screen" id="preview-screen"></div>
          </div>
          <div class="subsection-title">Effect</div>
          <div class="effect-grid">
            ${Object.entries(EFFECTS).map(([key, info]) => `
              <button class="effect-btn ${this._effect === key ? 'active' : ''}" data-effect="${key}">
                ${info.name}
              </button>
            `).join('')}
          </div>
          <div class="subsection-title">Speed</div>
          <div class="control-row">
            <input type="range" class="slider" id="effect-speed" min="1" max="100" value="${this._speed}">
            <span class="slider-value" id="effect-speed-val">${this._speed}</span>
          </div>
          <button class="send-btn" id="send-btn" ${this._sending ? 'disabled' : ''}>
            ${this._sending ? 'Sending...' : 'Send to Device'}
          </button>
        </div>
      </ha-card>`;

    this._initPreview();
    this._attachListeners();
  }

  _attachListeners() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    this.shadowRoot.querySelectorAll('[data-effect]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._effect = btn.dataset.effect;
        updateDisplayState({ mode: 'ambient', effect: this._effect });
        this.render();
      });
    });

    const speedEl = $('effect-speed');
    if (speedEl) {
      speedEl.addEventListener('input', (e) => {
        this._speed = parseInt(e.target.value);
        const label = $('effect-speed-val');
        if (label) label.textContent = this._speed;
        updateDisplayState({ speed: this._speed });
        this._updatePreview();
      });
    }

    $('send-btn')?.addEventListener('click', () => this._sendToDevice());
  }

  static getConfigElement() { return document.createElement('ipixel-simple-editor'); }
  static getStubConfig() { return { entity: '' }; }
}
