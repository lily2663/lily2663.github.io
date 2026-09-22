import { attachPixelSprite } from './features/pixel-sprite.js';
import { initSiteShell } from './features/site-shell.js';

(() => {
  'use strict';
  const root = document.documentElement;
  const siteHeader = document.querySelector('.site-header');
  initSiteShell({ root, siteHeader });
  const topButton = document.querySelector('#to-top');
  const progress = document.querySelector('#reading-progress');
  const navigationProgress = document.querySelector('#navigation-progress');
  const search = document.querySelector('#search');
  // 页面级引用：pjax 替换 #app 后由 initPage() 重新获取
  let grid = document.querySelector('[data-post-grid]');
  const searchStatus = document.querySelector('#search-status');
  let searchTitle = document.querySelector('[data-search-title]');
  let searchCount = document.querySelector('[data-search-count]');
  let searchEmpty = document.querySelector('.search-empty');
  let mode = 'article';
  // 当前文章正文与目录引用：initPage 设置，受保护文章解锁后由 setupTocSpy 接管
  let articleBody = null;
  let articleToc = null;
  let articleHeadings = [];

  let scrollFrame = 0;
  let tocLastUpdate = 0;
  function updateScroll() {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? scrollY / max : 0;
    if (progress) {
      progress.style.width = `${pct * 100}%`;
      progress.classList.toggle('show', !!document.querySelector('article.article') && pct > 0.02);
    }
    if (topButton) topButton.classList.toggle('show', scrollY > 500);
    // TOC highlighting reads every heading's layout box. Keep the progress
    // indicator frame-accurate, but cap this layout-heavy work while scrolling.
    const now = performance.now();
    if (!tocLastUpdate || now - tocLastUpdate >= 80) {
      tocLastUpdate = now;
      updateTocActive();
    }
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
      item.setAttribute('aria-pressed', String(active));
    });
    if (search) {
      search.placeholder = mode === 'text' ? '搜索公开文章全文…' : '搜索文章标题/标签…';
      filterPosts();
    }
  }));
  let searchIndex;
  let searchTimer;
  let searchGrid = null;
  let originalPostCards = [];
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
    if (searchGrid !== grid) { searchGrid = grid; originalPostCards = [...grid.children]; }
    const pagination = document.querySelector('[data-post-pagination]');
    if (!q) {
      grid.replaceChildren(...originalPostCards);
      if (pagination) pagination.hidden = false;
      updateSearchState('', originalPostCards.length, Number(grid.dataset.postTotal) || originalPostCards.length);
      return;
    }
    if (pagination) pagination.hidden = true;
    const activeMode = mode;
    searchIndex ||= fetch('/index.json').then((response) => response.ok ? response.json() : []).catch(() => []);
    const entries = await searchIndex;
    if (grid !== searchGrid || q !== search.value.trim().toLowerCase() || mode !== activeMode) return;
    const matches = entries.filter((item) => {
      const base = `${item.title || ''} ${(item.tags || []).join(' ')} ${item.summary || ''}`;
      return `${base} ${activeMode === 'text' ? item.text || '' : ''}`.toLowerCase().includes(q);
    });
    const cards = matches.map((item) => {
      const card = document.createElement('article');
      card.className = 'post-item';
      card.dataset.search = '';
      const link = document.createElement('a');
      link.className = 'post-link';
      const url = new URL(item.url || '/', location.origin);
      link.href = url.origin === location.origin ? url.pathname + url.search + url.hash : '/';
      const kicker = document.createElement('div');
      kicker.className = 'kicker';
      kicker.textContent = item.tags?.[0] || '随笔';
      const title = document.createElement('h3');
      title.className = 'item-title';
      title.textContent = item.title || '未命名文章';
      const excerpt = document.createElement('p');
      excerpt.className = 'item-excerpt';
      excerpt.textContent = item.protected ? '该文章已加密，需输入密码查看。' : (item.summary || '').slice(0, 140);
      link.append(kicker, title, excerpt);
      card.append(link);
      attachPixelSprite(card);
      return card;
    });
    grid.replaceChildren(...cards);
    updateSearchState(search.value.trim(), matches.length, Number(grid.dataset.postTotal) || originalPostCards.length);
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
    const box = document.createElement('dialog');
    box.className = 'lightbox';
    box.setAttribute('aria-label', '图片预览');
    box.innerHTML = '<button type="button" aria-label="关闭图片">×</button><img alt="">';
    let trigger = null;
    const restoreTrigger = () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
      trigger = null;
    };
    box.addEventListener('close', () => {
      box.classList.remove('active');
      box.querySelector('img').removeAttribute('src');
      restoreTrigger();
    });
    box.querySelector('button').addEventListener('click', () => box.close());
    box.addEventListener('click', (event) => { if (event.target === box) box.close(); });
    document.body.append(box);
    return {
      open(image) {
        trigger = image;
        const preview = box.querySelector('img');
        preview.src = image.currentSrc || image.src;
        preview.alt = image.alt || '图片预览';
        box.showModal();
        box.classList.add('active');
        box.querySelector('button')?.focus({ preventScroll: true });
      }
    };
  }
  const lightbox = makeLightbox();
  document.addEventListener('click', (event) => {
    const image = event.target.closest('.article-body img');
    if (!image || image.closest('a[href]')) return;
    lightbox.open(image);
  });
  document.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key) || !(event.target instanceof HTMLImageElement)) return;
    const image = event.target.closest('.article-body img');
    if (!image || image.closest('a[href]')) return;
    event.preventDefault();
    lightbox.open(image);
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
      if (!image.closest('a[href]')) {
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-haspopup', 'dialog');
        image.setAttribute('aria-label', image.alt ? `查看大图：${image.alt}` : '查看大图');
      }
    });
    if (document.body.dataset.codeCopy === 'false') return;
    articleBody.querySelectorAll('pre').forEach((pre) => {
      if (pre.dataset.codeEnhanced === 'true') return;
      pre.dataset.codeEnhanced = 'true';
      const button = document.createElement('button'); button.className = 'code-copy'; button.type = 'button'; button.textContent = '复制';
      const code = pre.querySelector('code');
      let language = code ? [...code.classList].find((name) => name.startsWith('language-'))?.slice(9) : '';
      if (!language && code && window.hljs && !code.dataset.highlighted) {
        window.hljs.highlightElement(code);
        language = code.result?.language || '';
      }
      if (language) pre.dataset.language = language;
      button.addEventListener('click', async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          const copy = pre.cloneNode(true);
          copy.querySelectorAll('.code-copy').forEach((control) => control.remove());
          await navigator.clipboard.writeText(code?.textContent ?? copy.textContent);
          button.textContent = '已复制';
        }
        catch { button.textContent = '请手动复制'; }
        setTimeout(() => { button.textContent = '复制'; }, 1200);
      });
      pre.append(button);
    });
  }

  // 完整保留 H1-H6，但目录本身是扁平阅读列表：层级由颜色表达，不用缩进制造树状噪音。
  function tocHeadings(articleBody) { return ensureHeadingIds(articleBody); }

  // 生成扁平目录。data-level 供 CSS 将 H1（最深绿）渐变到 H6（最浅绿）。
  function buildArticleToc(articleBody, toc) {
    if (!articleBody || !toc) return false;
    const headings = tocHeadings(articleBody);
    const wrapper = toc.closest('.toc-wrap');
    toc.replaceChildren();
    if (!headings.length) { if (wrapper) wrapper.hidden = true; return false; }
    const root = document.createElement('ol');
    root.className = 'toc-list';
    headings.forEach((heading) => {
      const item = document.createElement('li');
      item.className = 'toc-item';
      item.dataset.level = heading.tagName.slice(1);
      const link = document.createElement('a');
      link.className = 'toc-link';
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.append(link);
      root.append(item);
    });
    toc.append(root);
    if (wrapper) {
      wrapper.hidden = false;
      if (!wrapper.querySelector('.toc-toggle')) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'toc-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '展开文章目录';
        toggle.addEventListener('click', () => {
          const open = wrapper.classList.toggle('open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.textContent = open ? '收起文章目录' : '展开文章目录';
        });
        wrapper.insertBefore(toggle, toc);
        wrapper.classList.add('has-toc-toggle');
      }
    }
    return true;
  }

  // 滚动定位：当前阅读到的标题在目录中高亮
  function updateTocActive() {
    const body = articleBody;
    const toc = articleToc;
    if (!body || !toc) return;
    const headings = articleHeadings;
    const links = toc.querySelectorAll('.toc-link');
    if (!headings.length || !links.length) return;
    let current = '';
    const threshold = (siteHeader?.getBoundingClientRect().height || 64) + 20;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= threshold) current = heading.id;
      else break;
    }
    links.forEach((link) => {
      const active = link.getAttribute('href') === `#${current}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  // 受保护文章解锁后由 protected.js 调用，接入同一套滚动定位
  function setupTocSpy(body, toc) {
    articleBody = body;
    articleToc = toc;
    articleHeadings = tocHeadings(body);
    updateTocActive();
  }

  window.LilyArticle = Object.freeze({ enhance: enhanceArticleBody, buildToc: buildArticleToc, setupTocSpy });

  function setupDrawerPagination() {
    document.querySelectorAll('[data-drawer-pagination]').forEach((pagination) => {
      const drawer = pagination.closest('.drawer');
      const cards = [...drawer.querySelectorAll('[data-drawer-grid] > .post-item')];
      const totalPages = Math.ceil(cards.length / 10);
      let page = 1;
      const renderPage = () => {
        cards.forEach((card, index) => { card.hidden = index < (page - 1) * 10 || index >= page * 10; });
        pagination.querySelector('[data-drawer-page]').textContent = `${page} / ${totalPages}`;
        pagination.querySelector('[data-drawer-prev]').disabled = page === 1;
        pagination.querySelector('[data-drawer-next]').disabled = page === totalPages;
      };
      pagination.querySelector('[data-drawer-prev]').onclick = () => { if (page > 1) { page--; renderPage(); drawer.querySelector('summary')?.scrollIntoView({ block: 'start' }); } };
      pagination.querySelector('[data-drawer-next]').onclick = () => { if (page < totalPages) { page++; renderPage(); drawer.querySelector('summary')?.scrollIntoView({ block: 'start' }); } };
      renderPage();
    });
  }

  // 页面级初始化：首次加载与每次 pjax 替换 #app 后都要执行
  function initPage() {
    tocLastUpdate = 0;
    grid = document.querySelector('[data-post-grid]');
    searchTitle = document.querySelector('[data-search-title]');
    searchCount = document.querySelector('[data-search-count]');
    searchEmpty = document.querySelector('.search-empty');
    document.querySelectorAll('.article-body').forEach(enhanceArticleBody);
    // 非受保护文章：用 JS 统一重建目录（与受保护文章一致），
    // 替换 Hugo 原生目录的嵌套 nav/空 li/类名不匹配，并接入滚动定位
    articleBody = document.querySelector('.article-body:not([data-protected-body])');
    articleHeadings = articleBody ? tocHeadings(articleBody) : [];
    articleToc = document.querySelector('.toc-wrap:not([data-protected-toc]) .toc');
    if (articleBody && articleToc) window.LilyArticle.buildToc(articleBody, articleToc);
    document.querySelectorAll('.front-grid .post-item').forEach(attachPixelSprite);
    setupDrawerPagination();
    if (grid && search?.value.trim()) void filterPosts();
    updateScroll();
    document.dispatchEvent(new CustomEvent('lily:page-ready'));
  }

  /* ---------- PJAX：拦截站内导航只替换 #app，永不整页刷新（3-hexo 同款机制） ---------- */
  const app = document.getElementById('app');
  let navToken = 0;
  let navAbort = null;
  let navProgressTimer = 0;
  const pageCache = new Map();
  history.scrollRestoration = 'manual';
  // Identifies the page currently rendered inside #app. Fragment-only history
  // moves (TOC anchors) keep this key unchanged, real page navigations do not.
  let pathKey = location.pathname + location.search;

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

  function pageKey(input) {
    const url = new URL(input, location.href);
    return `${url.pathname}${url.search}`;
  }

  function fetchPage(input, signal) {
    const key = pageKey(input);
    const cached = pageCache.get(key);
    if (cached) return cached;
    let request = fetch(input, { signal, credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .catch((error) => {
        if (pageCache.get(key) === request) pageCache.delete(key);
        throw error;
      });
    pageCache.set(key, request);
    while (pageCache.size > 8) pageCache.delete(pageCache.keys().next().value);
    return request;
  }

  function beginNavigation() {
    clearTimeout(navProgressTimer);
    app.classList.remove('leaving', 'fade');
    root.classList.add('is-navigating');
    app.setAttribute('aria-busy', 'true');
    if (!navigationProgress) return;
    navigationProgress.classList.remove('active', 'complete');
    void navigationProgress.offsetWidth;
    navigationProgress.classList.add('active');
  }

  function completeNavigation(token) {
    if (token !== navToken) return;
    app.removeAttribute('aria-busy');
    navigationProgress?.classList.add('complete');
    navProgressTimer = setTimeout(() => {
      if (token !== navToken) return;
      navigationProgress?.classList.remove('active', 'complete');
      root.classList.remove('is-navigating');
    }, 220);
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
    }, 260);
  }

  async function pjaxNavigate(url, { push = true, restore = 0 } = {}) {
    const token = ++navToken;
    navAbort?.abort();
    navAbort = new AbortController();
    beginNavigation();
    let doc;
    try {
      const html = await fetchPage(url, navAbort.signal);
      doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc.getElementById('app')) throw new Error('no app container');
    } catch (error) {
      if (token !== navToken || error.name === 'AbortError') return;
      completeNavigation(token);
      location.href = url;
      return;
    }
    if (token !== navToken) return;
    // 请求期间保留旧内容；数据就绪后才进行一次短淡出，避免慢网下出现空白页。
    app.classList.add('leaving');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    if (token !== navToken) return;
    if (push) history.replaceState({ scroll: scrollY }, '', location.href);
    app.classList.remove('leaving');
    document.dispatchEvent(new CustomEvent('lily:before-page-swap'));
    // 直接移入已解析节点，避免 innerHTML 字符串二次解析挤占换帧
    app.replaceChildren(...doc.getElementById('app').childNodes);
    document.title = doc.title;
    if (push) history.pushState({ scroll: 0 }, '', url);
    const navigated = new URL(url, location.href);
    pathKey = navigated.pathname + navigated.search;
    scrollTo(0, push ? 0 : restore);
    flashFade();
    syncNav(new URL(url, location.href).pathname);
    updateScroll();
    app.focus({ preventScroll: true });
    completeNavigation(token);
    // 像素画/代码增强/评论脚本推迟到浏览器空闲帧，不与入场动画抢帧
    const settle = () => {
      if (token !== navToken) return;
      initPage();
      if (push && navigated.hash) {
        const anchor = document.getElementById(decodeURIComponent(navigated.hash.slice(1)));
        anchor?.scrollIntoView({ block: 'start' });
      }
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
    if (url.pathname === location.pathname && url.search === location.search) {
      // Same-page fragment link (TOC anchor). Handle it manually: a native hash
      // change also fires popstate, which pjaxNavigate would mistake for a page
      // navigation and reset the scroll to the top, cancelling the anchor jump.
      if (url.hash) {
        const anchorTarget = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (anchorTarget) {
          event.preventDefault();
          history.replaceState({ scroll: scrollY }, '', location.href);
          history.pushState({ anchor: url.hash }, '', url.href);
          anchorTarget.scrollIntoView();
        }
      }
      return;
    }
    event.preventDefault();
    pjaxNavigate(url.href);
  });
  addEventListener('popstate', (event) => {
    // Fragment-only history move (TOC anchor entries): stay on the current page,
    // re-jump to the anchor or restore the scroll offset saved before the jump.
    if (location.pathname + location.search === pathKey) {
      if (event.state?.anchor) {
        document.getElementById(decodeURIComponent(event.state.anchor.slice(1)))?.scrollIntoView();
      } else if (typeof event.state?.scroll === 'number') {
        scrollTo(0, event.state.scroll);
      }
      updateScroll();
      return;
    }
    pjaxNavigate(location.href, { push: false, restore: event.state?.scroll || 0 });
  });

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const canPrefetch = document.body.dataset.prefetch !== 'false' && !coarsePointer && !connection?.saveData && !/2g/.test(connection?.effectiveType || '');
  const prefetched = new Set();
  const pendingPrefetch = new WeakMap();
  function prefetch(link) {
    if (!canPrefetch || !link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || url.hash) return;
    const key = `${url.pathname}${url.search}`;
    if (prefetched.has(key)) return;
    prefetched.add(key);
    // 显式缓存 HTML，点击时直接复用，不依赖浏览器是否执行 rel=prefetch。
    void fetchPage(url.href).catch(() => prefetched.delete(key));
  }
  function schedulePrefetch(link, delay = 120) {
    if (!canPrefetch || !link || pendingPrefetch.has(link)) return;
    const timer = setTimeout(() => {
      pendingPrefetch.delete(link);
      prefetch(link);
    }, delay);
    pendingPrefetch.set(link, timer);
  }
  document.addEventListener('pointerover', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
    schedulePrefetch(link);
  }, { capture: true, passive: true });
  document.addEventListener('pointerout', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
    const timer = pendingPrefetch.get(link);
    if (timer) { clearTimeout(timer); pendingPrefetch.delete(link); }
  }, { capture: true, passive: true });
  document.addEventListener('focusin', (event) => schedulePrefetch(event.target.closest('a[href]'), 0));

  // GitHub Pages 的静态资源缓存时间较短。生产环境用轻量 Service Worker
  // 把访问过的页面与资源留在本机，后续访问先显示缓存、后台再更新。
  const isLocalPreview = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocalPreview) {
    addEventListener('load', () => {
      const syncOfflineCache = async () => {
        if (document.body.dataset.offlineCache !== 'false') {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration('/');
        await registration?.unregister();
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith('lily-runtime-')).map((key) => caches.delete(key)));
        }
      };
      const run = () => syncOfflineCache().catch(() => {});
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
      else setTimeout(run, 800);
    }, { once: true });
  }

  initPage();
  flashFade();
})();
