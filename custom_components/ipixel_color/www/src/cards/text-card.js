/**
 * iPIXEL Text Card
 *
 * Single-purpose card for the LED matrix: text content, colour, effect and
 * speed. Everything runs on the device, so scrolling and blink stay smooth.
 */

import { iPIXELCardBase } from '../base.js';
import { iPIXELCardStyles } from '../styles.js';
import { updateDisplayState, getDisplayState } from '../state.js';
import {
  renderSlider, attachSlider,
  renderColorRow, attachColorRow,
} from '../components/index.js';

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

const DEFAULTS = {
  text: '',
  effect: 'auto',
  speed: 50,
  fgColor: '#ffffff',
  bgColor: '#000000',
  rainbowMode: 0,
  fontSize: 16,
};

export class iPIXELTextCard extends iPIXELCardBase {
  constructor() {
    super();
    this._form = { ...DEFAULTS, ...getDisplayState() };
    this._error = '';
  }

  getCardSize() { return 3; }

  _update(patch) {
    this._form = { ...this._form, ...patch };
    updateDisplayState({
      text: this._form.text,
      mode: 'text',
      effect: this._form.effect,
      speed: this._form.speed,
      fgColor: this._form.fgColor,
      bgColor: this._form.bgColor,
      rainbowMode: this._form.rainbowMode,
      fontSize: this._form.fontSize,
    });
    this._restoreFormValues();
  }

  _restoreFormValues() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const f = this._form;

    if ($('text-input')) $('text-input').value = f.text;
    if ($('text-effect')) $('text-effect').value = f.effect;
    if ($('rainbow-mode')) $('rainbow-mode').value = String(f.rainbowMode);
    if ($('font-size')) $('font-size').value = String(f.fontSize);
    if ($('text-speed')) {
      $('text-speed').value = f.speed;
      $('text-speed').style.setProperty('--value', `${f.speed}%`);
      const val = $('text-speed-val');
      if (val) val.textContent = `${f.speed}`;
    }
    if ($('text-color')) $('text-color').value = f.fgColor;
    if ($('bg-color')) $('bg-color').value = f.bgColor;
  }

  render() {
    if (!this._hass) return;

    const f = this._form;
    const rainbow = f.rainbowMode > 0;

    this.shadowRoot.innerHTML = `
      <style>${iPIXELCardStyles}
        .text-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .text-row .text-input { flex: 1; }
        .send-btn { min-width: 84px; }
        .hint { font-size: 0.75em; opacity: 0.6; margin: -8px 0 16px; }
        .error { color: var(--error-color, #db4437); font-size: 0.8em; margin-top: 8px; }
        .note { font-size: 0.75em; opacity: 0.6; margin-top: 4px; }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="text-row">
            <input type="text" class="text-input" id="text-input"
                   placeholder="Text to show on the matrix"
                   maxlength="120">
            <button class="btn btn-primary send-btn" id="send-btn">Send</button>
          </div>

          <div class="two-col">
            <div>
              <div class="section-title">Effect</div>
              <div class="control-row">
                <select class="dropdown" id="text-effect">
                  ${EFFECTS.map(e => `<option value="${e.value}">${e.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <div class="section-title">Font size</div>
              <div class="control-row">
                <select class="dropdown" id="font-size">
                  ${FONT_SIZES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="section-title">Speed</div>
          <div class="control-row">
            ${renderSlider({ id: 'text-speed', min: 0, max: 100, value: f.speed })}
          </div>
          <div class="hint">Scroll speed and blink rate.</div>

          <div class="section-title">Colour</div>
          <div class="control-row">
            ${renderColorRow([
              { id: 'text-color', label: 'Text', value: f.fgColor },
              { id: 'bg-color', label: 'Background', value: f.bgColor },
            ])}
          </div>
          ${rainbow ? '<div class="note">A rainbow mode is active, so the device cycles colours and ignores the text colour.</div>' : ''}

          <div class="section-title">Rainbow</div>
          <div class="control-row">
            <select class="dropdown" id="rainbow-mode">
              ${RAINBOW_MODES.map(m => `<option value="${m.value}">${m.name}</option>`).join('')}
            </select>
          </div>

          ${this._error ? `<div class="error">${this.escapeHtml(this._error)}</div>` : ''}
        </div>
      </ha-card>`;

    this._restoreFormValues();
    this._attachListeners();
  }

  _attachListeners() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    $('text-input')?.addEventListener('input', (e) => this._update({ text: e.target.value }));
    $('text-effect')?.addEventListener('change', (e) => this._update({ effect: e.target.value }));
    $('font-size')?.addEventListener('change', (e) => this._update({ fontSize: parseInt(e.target.value, 10) }));
    $('rainbow-mode')?.addEventListener('change', (e) => {
      this._update({ rainbowMode: parseInt(e.target.value, 10) || 0 });
      this.render();
    });

    attachSlider(this.shadowRoot, 'text-speed', {
      onInput: (value) => this._update({ speed: value }),
    });

    attachColorRow(this.shadowRoot, ['text-color', 'bg-color'], (id, value) => {
      this._update(id === 'text-color' ? { fgColor: value } : { bgColor: value });
    });

    $('send-btn')?.addEventListener('click', () => this._send());
    $('text-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._send();
    });
  }

  async _send() {
    const f = this._form;

    if (!f.text) {
      this._error = 'Enter some text first.';
      this.render();
      return;
    }

    this._error = '';

    if (this._config.entity && this._hass && !this.isInTestMode()) {
      try {
        await this._hass.callService('text', 'set_value', {
          entity_id: this._config.entity,
          value: f.text,
        });
      } catch (err) {
        console.warn('iPIXEL: could not update text entity', err);
      }
    }

    await this.callService('ipixel_color', 'set_matrix_text', {
      text: f.text,
      effect: f.effect,
      speed: f.speed,
      font_size: f.fontSize,
      color_fg: this.hexToRgb(f.fgColor),
      color_bg: this.hexToRgb(f.bgColor),
      rainbow_mode: f.rainbowMode,
    });
  }

  static getConfigElement() { return document.createElement('ipixel-simple-editor'); }
  static getStubConfig() { return { entity: '' }; }
}