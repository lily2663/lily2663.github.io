(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('#theme-toggle');
  const topButton = document.querySelector('#to-top');
  const progress = document.querySelector('#reading-progress');
  const search = document.querySelector('#search');
  const grid = document.querySelector('[data-post-grid]');
  let mode = 'article';

  const splash = document.querySelector('#welcome-splash');
  if (splash && !sessionStorage.getItem('lily-welcomed')) {
    let dismissed = false;
    splash.hidden = false;
    document.body.classList.add('splash-active');
    const colors = ['var(--mint)', 'var(--pink)', 'var(--mint-light)', 'var(--pink-light)'];
    for (let index = 0; index < 30; index++) {
      const dot = document.createElement('div');
      const size = Math.random() * 100 + 50;
      dot.className = 'watercolor-dot';
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDuration = `${Math.random() * 6 + 6}s`;
      dot.style.animationDelay = `${Math.random() * 4}s`;
      dot.style.filter = `blur(${Math.random() * 20 + 10}px)`;
      splash.append(dot);
    }
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      sessionStorage.setItem('lily-welcomed', '1');
      document.body.classList.remove('splash-active');
      splash.classList.add('hidden');
      setTimeout(() => { splash.style.display = 'none'; }, 1200);
    };
    splash.querySelector('#welcome-enter')?.addEventListener('click', dismiss);
    splash.addEventListener('click', (event) => { if (event.target === splash) dismiss(); });
    document.addEventListener('keydown', dismiss, { once: true });
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem('blog-theme', theme);
    if (themeButton) themeButton.textContent = theme === 'dark' ? '亮' : '暗';
  }
  if (themeButton) {
    themeButton.textContent = root.dataset.theme === 'dark' ? '亮' : '暗';
    themeButton.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  }

  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (topButton) topButton.classList.toggle('show', scrollY > 500);
  }
  function onScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  addEventListener('scroll', onScroll, { passive: true });
  updateScroll();
  topButton?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  document.querySelectorAll('[data-search-mode]').forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.searchMode;
    document.querySelectorAll('[data-search-mode]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    if (search) {
      search.placeholder = mode === 'text' ? '搜索公开文章全文…' : '搜索文章标题/标签…';
      filterPosts();
    }
  }));
  let searchIndex;
  let searchTimer;
  async function filterPosts() {
    if (!grid || !search) return;
    const q = search.value.trim().toLowerCase();
    const cards = [...grid.querySelectorAll('[data-search]')];
    if (mode === 'article' || !q) {
      let visible = 0;
      cards.forEach((card) => { const hit = !q || card.dataset.search.includes(q); card.hidden = !hit; if (hit) visible++; });
      document.querySelector('.search-empty')?.toggleAttribute('hidden', visible !== 0);
      return;
    }
    searchIndex ||= fetch('/index.json').then((response) => response.json());
    const entries = await searchIndex;
    if (mode !== 'text' || q !== search.value.trim().toLowerCase()) return;
    const visibleUrls = new Set(entries.filter((item) => `${item.title} ${item.tags.join(' ')} ${item.summary} ${item.text}`.toLowerCase().includes(q)).map((item) => item.url));
    let visible = 0;
    cards.forEach((card) => { const hit = visibleUrls.has(card.querySelector('a')?.getAttribute('href')); card.hidden = !hit; if (hit) visible++; });
    document.querySelector('.search-empty')?.toggleAttribute('hidden', visible !== 0);
  }
  search?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => void filterPosts(), 80); });

  function makeLightbox() {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<button type="button" aria-label="关闭图片">×</button><img alt="">';
    const close = () => { box.classList.remove('active'); box.querySelector('img').src = ''; };
    box.querySelector('button').addEventListener('click', close);
    box.addEventListener('click', (event) => { if (event.target === box) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    document.body.append(box);
    return box;
  }
  const lightbox = makeLightbox();
  document.addEventListener('click', (event) => {
    const image = event.target.closest('.article-body img');
    if (!image) return;
    lightbox.querySelector('img').src = image.currentSrc || image.src;
    lightbox.classList.add('active');
  });

  document.querySelectorAll('pre').forEach((pre) => {
    const button = document.createElement('button'); button.className = 'code-copy'; button.type = 'button'; button.textContent = '复制';
    button.addEventListener('click', async () => { await navigator.clipboard?.writeText(pre.innerText); button.textContent = '已复制'; setTimeout(() => { button.textContent = '复制'; }, 1200); });
    pre.append(button);
  });

  const legacyRoutes = Object.freeze({
    '0XGAME2024': '/posts/0xgame2024/', 'BASECTF2024': '/posts/basectf2024/', 'BroncoCTF': '/posts/broncoctf/',
    'Core_lily2663': '/posts/core_lily2663/', 'JinjaMark': '/posts/jinjamark/', 'Md_lily2663': '/posts/md_lily2663/',
    'PCTF2025web': '/posts/pctf2025web/', 'PICKLE': '/posts/pickle/', 'POLARIS-web简单': '/posts/polaris-web简单/',
    'Publish': '/posts/publish/', 'SSRF基础': '/posts/ssrf基础/', 'SSTI': '/posts/ssti/',
    'Tran_lily2663': '/posts/tran_lily2663/', 'back_to_the_future': '/posts/back_to_the_future/',
    'js-event-loop': '/posts/js-event-loop/', 'orchard_lily2663': '/posts/orchard_lily2663/',
    'wellplayed_lily2663': '/posts/wellplayed_lily2663/', '宽字节注入': '/posts/宽字节注入/'
  });
  const legacy = location.hash.replace(/^#/, '');
  if (legacy.startsWith('/post/')) {
    const legacyId = decodeURIComponent(legacy.slice(6).split('?')[0]);
    location.replace(legacyRoutes[legacyId] || `/posts/${encodeURIComponent(legacyId)}/`);
  }
  if (legacy === '/tags') location.replace('/tags/');
  if (legacy === '/links') location.replace('/links/');
  if (legacy === '/about') location.replace('/about/');
})();
