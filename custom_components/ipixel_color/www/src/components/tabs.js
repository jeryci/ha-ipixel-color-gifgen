/**
 * Tab bar primitive
 *
 * Renders a row of tab buttons and wires click handlers. The card itself is
 * responsible for showing/hiding content panels (typically by re-rendering
 * after updating its active tab state).
 *
 * `attr` distinguishes nested tab rows: a card with a top-level tab bar and a
 * second one inside a panel must not wire both onto `data-tab`.
 */

export function renderTabs(tabs, active, attr = 'data-tab') {
  const body = tabs.map((t) => {
    const cls = t.id === active ? 'tab active' : 'tab';
    return `<button class="${cls}" ${attr}="${t.id}">${t.label}</button>`;
  }).join('');
  return `<div class="tabs">${body}</div>`;
}

export function attachTabs(root, onChange, attr = 'data-tab') {
  root.querySelectorAll(`[${attr}]`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute(attr);
      onChange?.(id, e);
    });
  });
}

/**
 * Render a panel wrapper that shows only when `visible` is true.
 * Used to wrap tab contents.
 */
export function renderPanel(id, visible, inner) {
  return `<div class="tab-panel${visible ? ' active' : ''}" id="panel-${id}" ${visible ? '' : 'hidden'}>${inner}</div>`;
}