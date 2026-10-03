/**
 * iPIXEL Cards for Home Assistant
 *
 * Two cards: a full panel that switches between text and GIF, and a text-only
 * card for dashboards that just need a message on the matrix.
 */

import { CARD_VERSION } from './version.js';
import { iPIXELControlCard } from './cards/control-card.js';
import { iPIXELTextCard } from './cards/text-card.js';
import { iPIXELSimpleEditor } from './editor.js';

import './state.js';

try {
  const registerCard = (name, clazz) => {
    if (!customElements.get(name)) {
      customElements.define(name, clazz);
    }
  };

  registerCard('ipixel-control-card', iPIXELControlCard);
  registerCard('ipixel-text-card', iPIXELTextCard);
  registerCard('ipixel-simple-editor', iPIXELSimpleEditor);

  window.customCards = window.customCards || [];
  [
    {
      type: 'ipixel-control-card',
      name: 'iPIXEL Panel',
      description: 'Send text and GIF animations to the LED matrix',
    },
    {
      type: 'ipixel-text-card',
      name: 'iPIXEL Text',
      description: 'Send text only, with colour, font, effect and speed',
    },
  ].forEach((card) => {
    try {
      window.customCards.push({
        ...card,
        preview: true,
        documentationURL: 'https://github.com/cagcoach/ha-ipixel-color',
      });
    } catch (err) {
      console.error('iPIXEL: failed to register card', card.type, err);
    }
  });
} catch (err) {
  console.error('iPIXEL: failed to initialize cards', err);
}

console.info(
  `%c iPIXEL Cards %c ${CARD_VERSION} `,
  'background:#03a9f4;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;',
  'background:#333;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0;'
);