(() => {
  const box = document.querySelector('[data-protected-id]');
  if (!box) return;
  const status = box.querySelector('.lock-status');
  const body = box.querySelector('.protected-body');
  const password = box.querySelector('#protected-password');
  const id = box.dataset.protectedId;
  const bytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  async function unlock() {
    const value = password.value;
    if (!value) { status.textContent = '请输入密码。'; return; }
    status.textContent = '正在解锁…';
    try {
      const payload = await (await fetch(box.dataset.payload, { cache: 'no-store' })).json();
      if (!crypto?.subtle || payload.version !== 2) throw new Error('unsupported');
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(payload.kdf.salt), iterations: payload.kdf.iterations, hash: payload.kdf.hash }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const joined = new Uint8Array(bytes(payload.cipher.data).length + bytes(payload.cipher.tag).length);
      joined.set(bytes(payload.cipher.data)); joined.set(bytes(payload.cipher.tag), bytes(payload.cipher.data).length);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(payload.cipher.iv) }, key, joined);
      const markdown = new TextDecoder().decode(plain);
      body.innerHTML = marked.parse(markdown, { gfm: true, breaks: false });
      body.hidden = false;
      box.querySelector('.lock-form').hidden = true;
      password.closest('label').hidden = true;
      status.textContent = '已解锁，本次会话有效。';
      sessionStorage.setItem(`lily:unlocked:${id}`, '1');
      body.querySelectorAll('pre code').forEach((code) => window.hljs?.highlightElement(code));
    } catch { status.textContent = '密码错误或文章数据无法解锁。'; }
  }
  box.querySelector('[data-unlock]').addEventListener('click', unlock);
  password.addEventListener('keydown', (event) => { if (event.key === 'Enter') unlock(); });
})();
