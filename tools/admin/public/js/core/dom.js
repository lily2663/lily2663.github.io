export const $ = (selector) => document.querySelector(selector);

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function toast(message) {
  const notification = document.createElement('div');
  notification.className = 'toast';
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.textContent = message;
  document.body.append(notification);
  setTimeout(() => notification.remove(), 2600);
}
