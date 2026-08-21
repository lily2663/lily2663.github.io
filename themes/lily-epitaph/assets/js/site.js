(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('#theme-toggle');
  const topButton = document.querySelector('#to-top');
  const progress = document.querySelector('#reading-progress');
  const search = document.querySelector('#search');
  // 页面级引用：pjax 替换 #app 后由 initPage() 重新获取
  let grid = document.querySelector('[data-post-grid]');
  const searchStatus = document.querySelector('#search-status');
  let searchTitle = document.querySelector('[data-search-title]');
  let searchCount = document.querySelector('[data-search-count]');
  let searchEmpty = document.querySelector('.search-empty');
  let mode = 'article';

  // A site can retain incoming links from a former hash-router simply by
  // setting `params.legacyId` on its content. The map is rendered by Hugo,
  // so this theme does not carry a site's article list.
  function migrateLegacyHash() {
    if (!location.hash.startsWith('#/')) return;
    const parts = location.hash.slice(2).split('/').filter(Boolean);
    const route = parts.shift();
    let target = '';
    if (route === 'post' && parts.length) {
      try {
        const routes = JSON.parse(document.querySelector('#legacy-hash-routes')?.textContent || '{}');
        target = routes[decodeURIComponent(parts.join('/'))] || '';
      } catch { return; }
    } else if (route === 'tag' && parts.length) {
      target = `/tags/${encodeURIComponent(decodeURIComponent(parts.join('/')))}/`;
    } else if (route === 'tags') target = '/tags/';
    else if (route === 'about') target = '/about/';
    else if (route === 'links') target = '/links/';
    else if (!route || route === 'home') target = '/';
    if (target) location.replace(target);
  }
  migrateLegacyHash();

  const splash = document.querySelector('#welcome-splash');
  if (splash && !sessionStorage.getItem('lily-welcomed')) {
    let dismissed = false;
    splash.hidden = false;
    document.body.classList.add('splash-active');
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

  function applyTheme(theme, event) {
    const swap = () => {
      root.dataset.theme = theme;
      localStorage.setItem('blog-theme', theme);
      if (themeButton) themeButton.setAttribute('aria-label', theme === 'dark' ? '切换到日间模式' : '切换到夜间模式');
    };
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      swap();
      return;
    }
    const rect = themeButton?.getBoundingClientRect();
    const x = event?.clientX ?? (rect ? rect.left + rect.width / 2 : innerWidth - 40);
    const y = event?.clientY ?? (rect ? rect.top + rect.height / 2 : 40);
    root.classList.add('theme-vt');
    const transition = document.startViewTransition(swap);
    transition.ready.then(() => {
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 480,
          easing: 'cubic-bezier(0.3, 0, 0.15, 1)',
          pseudoElement: '::view-transition-new(root)',
          fill: 'forwards'
        }
      );
    });
    // 双 rAF：等浏览器清理完 transition 伪元素再摘类，避免同帧样式突变造成末尾卡顿
    transition.finished.finally(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-vt')));
    });
  }
  if (themeButton) {
    themeButton.setAttribute('aria-label', root.dataset.theme === 'dark' ? '切换到日间模式' : '切换到夜间模式');
    themeButton.addEventListener('click', (event) => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', event));
  }

  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? scrollY / max : 0;
    if (progress) {
      progress.style.width = `${pct * 100}%`;
      progress.classList.toggle('show', !!document.querySelector('article.article') && pct > 0.02);
    }
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
  function updateSearchState(query, visible, total) {
    if (!query) {
      if (searchTitle) searchTitle.textContent = '全部文章';
      if (searchCount) searchCount.textContent = `${total} 篇`;
      if (searchEmpty) searchEmpty.hidden = true;
      if (searchStatus) searchStatus.textContent = '';
      return;
    }
    if (searchTitle) searchTitle.textContent = `“${query}”`;
    if (searchCount) searchCount.textContent = `${visible} 个结果`;
    if (searchEmpty) {
      searchEmpty.hidden = visible !== 0;
      searchEmpty.textContent = `没有找到与 “${query}” 匹配的文章。`;
    }
    if (searchStatus) searchStatus.textContent = `找到 ${visible} 篇文章。`;
  }
  async function filterPosts() {
    if (!grid || !search) return;
    const q = search.value.trim().toLowerCase();
    const cards = [...grid.querySelectorAll('[data-search]')];
    if (mode === 'article' || !q) {
      let visible = 0;
      cards.forEach((card) => { const hit = !q || card.dataset.search.includes(q); card.hidden = !hit; if (hit) visible++; });
      updateSearchState(search.value.trim(), visible, cards.length);
      return;
    }
    searchIndex ||= fetch('/index.json').then((response) => response.ok ? response.json() : []).catch(() => []);
    const entries = await searchIndex;
    if (mode !== 'text' || q !== search.value.trim().toLowerCase()) return;
    const visibleUrls = new Set(entries.filter((item) => `${item.title} ${item.tags.join(' ')} ${item.summary} ${item.text}`.toLowerCase().includes(q)).map((item) => item.url));
    let visible = 0;
    cards.forEach((card) => { const hit = visibleUrls.has(card.querySelector('a')?.getAttribute('href')); card.hidden = !hit; if (hit) visible++; });
    updateSearchState(search.value.trim(), visible, cards.length);
  }
  search?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => void filterPosts(), 80); });
  search?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return;
    const firstResult = grid?.querySelector('[data-search]:not([hidden]) a');
    if (firstResult) { event.preventDefault(); firstResult.focus(); }
  });
  document.addEventListener('keydown', (event) => {
    if (!search || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const editable = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
    if (event.key === '/' && !editable) { event.preventDefault(); search.focus(); }
    if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; void filterPosts(); search.blur(); }
  });

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

  function ensureHeadingIds(articleBody) {
    const used = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));
    return [...articleBody.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading, index) => {
      if (!heading.id) {
        const base = heading.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || `section-${index + 1}`;
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        heading.id = id;
        used.add(id);
      }
      return heading;
    });
  }

  function enhanceArticleBody(articleBody) {
    if (!articleBody) return;
    ensureHeadingIds(articleBody);
    articleBody.querySelectorAll('img').forEach((image) => {
      if (!image.hasAttribute('loading')) image.loading = 'lazy';
      if (!image.hasAttribute('decoding')) image.decoding = 'async';
    });
    if (document.body.dataset.codeCopy === 'false') return;
    articleBody.querySelectorAll('pre').forEach((pre) => {
      if (pre.dataset.codeEnhanced === 'true') return;
      pre.dataset.codeEnhanced = 'true';
      const button = document.createElement('button'); button.className = 'code-copy'; button.type = 'button'; button.textContent = '复制';
      const code = pre.querySelector('code');
      const language = code ? [...code.classList].find((name) => name.startsWith('language-'))?.slice(9) : '';
      if (language) pre.dataset.language = language;
      button.addEventListener('click', async () => {
        try { await navigator.clipboard?.writeText(pre.innerText); button.textContent = '已复制'; }
        catch { button.textContent = '复制失败'; }
        setTimeout(() => { button.textContent = '复制'; }, 1200);
      });
      pre.append(button);
    });
  }

  function buildArticleToc(articleBody, toc) {
    if (!articleBody || !toc) return false;
    const headings = ensureHeadingIds(articleBody);
    const wrapper = toc.closest('[data-protected-toc]');
    toc.replaceChildren();
    if (!headings.length) { if (wrapper) wrapper.hidden = true; return false; }
    const list = document.createElement('ol');
    headings.forEach((heading) => {
      const item = document.createElement('li');
      item.className = `toc-level-${heading.tagName.slice(1)}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.append(link); list.append(item);
    });
    toc.append(list);
    if (wrapper) wrapper.hidden = false;
    return true;
  }

  window.LilyArticle = Object.freeze({ enhance: enhanceArticleBody, buildToc: buildArticleToc });

  // 像素小画：以文章标题为种子生成稳定的对称像素精灵，贴在卡片右上角
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function seedRandom(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const spritePalettes = [
    ['#7FB5B0', '#E8839B'], ['#A8D5D1', '#E8839B'], ['#E8839B', '#7FB5B0'],
    ['#F4A7B9', '#A8D5D1'], ['#7FB5B0', '#F4A7B9'], ['#5A8F8A', '#C96B82']
  ];
  function makePixelSprite(title) {
    const rand = seedRandom(hashString(title || 'lily'));
    const palette = spritePalettes[Math.floor(rand() * spritePalettes.length)];
    let cells = '';
    for (let y = 0; y < 8; y++) {
      const half = [];
      for (let x = 0; x < 4; x++) half.push(rand() < 0.48 ? (rand() < 0.3 ? 2 : 1) : 0);
      const row = half.concat(half.slice().reverse());
      row.forEach((cell, x) => {
        if (cell) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="${cell === 2 ? palette[1] : palette[0]}"/>`;
      });
    }
    if (!cells) return '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${cells}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  function attachPixelSprite(card) {
    const src = makePixelSprite(card.querySelector('.item-title')?.textContent || '');
    if (!src) return;
    const sprite = document.createElement('div');
    sprite.className = 'pixel-sprite';
    sprite.setAttribute('aria-hidden', 'true');
    sprite.style.backgroundImage = `url("${src}")`;
    card.append(sprite);
  }

  // 页面级初始化：首次加载与每次 pjax 替换 #app 后都要执行
  function initPage() {
    grid = document.querySelector('[data-post-grid]');
    searchTitle = document.querySelector('[data-search-title]');
    searchCount = document.querySelector('[data-search-count]');
    searchEmpty = document.querySelector('.search-empty');
    document.querySelectorAll('.article-body').forEach(enhanceArticleBody);
    document.querySelectorAll('.front-grid .post-item').forEach(attachPixelSprite);
    if (grid && search?.value.trim()) void filterPosts();
    updateScroll();
  }

  /* ---------- PJAX：拦截站内导航只替换 #app，永不整页刷新（3-hexo 同款机制） ---------- */
  const app = document.getElementById('app');
  let navToken = 0;
  let navAbort = null;
  history.scrollRestoration = 'manual';

  // comments / protected 是每页执行的脚本：pjax 后重新注入运行（site/pet 只跑一次，绝不重复）
  function syncPageScripts(newDoc) {
    const rerun = /\/js\/(comments|protected)\./;
    Array.from(newDoc.scripts).forEach((script) => {
      if (!script.src || !rerun.test(script.src)) return;
      document.querySelector(`script[src="${script.src}"]`)?.remove();
      const clone = document.createElement('script');
      clone.src = script.src;
      document.body.append(clone);
    });
  }

  // 与 Hugo 服务端渲染同一逻辑：命中菜单项标记 aria-current，其余移除
  function syncNav(pathname) {
    document.querySelectorAll('.nav a').forEach((link) => {
      if (new URL(link.href, location.href).pathname === pathname) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // 入场动画结束后摘掉 .fade：动画期间内容区毛玻璃是关闭的（见 CSS），不能一直留着
  let fadeTimer = 0;
  function flashFade() {
    app.classList.remove('fade');
    void app.offsetWidth;
    app.classList.add('fade');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      if (!app.classList.contains('leaving')) app.classList.remove('fade');
    }, 420);
  }

  async function pjaxNavigate(url, { push = true, restore = 0 } = {}) {
    const token = ++navToken;
    navAbort?.abort();
    navAbort = new AbortController();
    app.classList.add('leaving');
    const started = performance.now();
    let doc;
    try {
      const response = await fetch(url, { signal: navAbort.signal });
      if (!response.ok) throw new Error('bad response');
      doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!doc.getElementById('app')) throw new Error('no app container');
    } catch (error) {
      if (token !== navToken || error.name === 'AbortError') return;
      location.href = url;
      return;
    }
    if (token !== navToken) return;
    // 出场动画保底 200ms，与旧站 setTimeout(200) 完全一致：fetch 再快也不抢拍
    const elapsed = performance.now() - started;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 200 - elapsed)));
    if (token !== navToken) return;
    if (push) history.replaceState({ scroll: scrollY }, '', location.href);
    app.classList.remove('leaving');
    // 直接移入已解析节点，避免 innerHTML 字符串二次解析挤占换帧
    app.replaceChildren(...doc.getElementById('app').childNodes);
    document.title = doc.title;
    if (push) history.pushState({ scroll: 0 }, '', url);
    scrollTo(0, push ? 0 : restore);
    flashFade();
    syncNav(new URL(url, location.href).pathname);
    updateScroll();
    // 像素画/代码增强/评论脚本推迟到浏览器空闲帧，不与入场动画抢帧
    const settle = () => {
      if (token !== navToken) return;
      initPage();
      syncPageScripts(doc);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(settle, { timeout: 300 });
    else setTimeout(settle, 120);
  }

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const href = link.getAttribute('href') || '';
    if (/^(mailto:|tel:|javascript:)/.test(href)) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    pjaxNavigate(url.href);
  });
  addEventListener('popstate', (event) => {
    pjaxNavigate(location.href, { push: false, restore: event.state?.scroll || 0 });
  });

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const canPrefetch = document.body.dataset.prefetch !== 'false' && !connection?.saveData && !/2g/.test(connection?.effectiveType || '');
  const prefetched = new Set();
  function prefetch(link) {
    if (!canPrefetch || !link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || url.hash) return;
    const key = `${url.pathname}${url.search}`;
    if (prefetched.has(key)) return;
    prefetched.add(key);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.href = url.href; hint.as = 'document';
    document.head.append(hint);
  }
  document.addEventListener('pointerover', (event) => prefetch(event.target.closest('a[href]')), { capture: true, passive: true });
  document.addEventListener('focusin', (event) => prefetch(event.target.closest('a[href]')));

  initPage();
  flashFade();
})();
