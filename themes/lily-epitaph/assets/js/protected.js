(() => {
  const box = document.querySelector('[data-protected-id]');
  if (!box) return;
  const status = box.querySelector('.lock-status');
  const body = document.querySelector('[data-protected-body]');
  const layout = document.querySelector('[data-protected-layout]');
  const toc = document.querySelector('[data-protected-toc] .toc');
  const password = box.querySelector('#protected-password');
  const unlockButton = box.querySelector('[data-unlock]');
  const bytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  let busy = false;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.async = true;
    script.onload = resolve; script.onerror = reject;
    document.head.append(script);
  });
  async function unlock() {
    if (busy) return;
    const value = password.value;
    if (!value) { status.textContent = '请输入密码。'; return; }
    busy = true;
    unlockButton.disabled = true;
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
      status.textContent = '正在渲染文章…';
      await Promise.all([loadScript('/assets/vendor/marked.min.js'), loadScript('/assets/vendor/highlight.min.js')]);
      body.innerHTML = window.marked.parse(markdown, { gfm: true, breaks: false });
      body.querySelectorAll('pre code').forEach((code) => window.hljs?.highlightElement(code));
      if (!window.LilyArticle) throw new Error('article helpers unavailable');
      window.LilyArticle.enhance(body);
      window.LilyArticle.buildToc(body, toc);
      layout.hidden = false;
      box.hidden = true;
    } catch {
      status.textContent = '密码错误或文章数据无法解锁。';
      busy = false;
      unlockButton.disabled = false;
    }
  }
  unlockButton.addEventListener('click', unlock);
  password.addEventListener('keydown', (event) => { if (event.key === 'Enter') unlock(); });
})();
