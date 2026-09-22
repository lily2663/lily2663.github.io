export function initSiteShell({ root, siteHeader }) {
  const syncHeaderClearance = () => {
    if (siteHeader) root.style.setProperty('--header-clearance', `${Math.ceil(siteHeader.getBoundingClientRect().height) + 16}px`);
  };
  syncHeaderClearance();
  if (siteHeader && 'ResizeObserver' in window) new ResizeObserver(syncHeaderClearance).observe(siteHeader);
  else addEventListener('resize', syncHeaderClearance, { passive: true });

  const themeButton = document.querySelector('#theme-toggle');
  const backgroundVideos = [...document.querySelectorAll('.site-background-video')];
  const staticBackgroundPreferred = matchMedia('(prefers-reduced-motion: reduce)').matches
    || Boolean((navigator.connection || navigator.mozConnection || navigator.webkitConnection)?.saveData);
  const syncBackgroundVideos = () => {
    const dark = root.dataset.theme === 'dark';
    backgroundVideos.forEach((video) => {
      const active = dark ? video.classList.contains('site-background-video--night') : video.classList.contains('site-background-video--day');
      if (active && !document.hidden && !staticBackgroundPreferred) video.play().catch(() => {});
      else video.pause();
    });
  };
  syncBackgroundVideos();
  document.addEventListener('visibilitychange', syncBackgroundVideos);

  if (location.hash.startsWith('#/')) {
    const parts = location.hash.slice(2).split('/').filter(Boolean);
    const route = parts.shift();
    let target = '';
    if (route === 'post' && parts.length) {
      try {
        const routes = JSON.parse(document.querySelector('#legacy-hash-routes')?.textContent || '{}');
        target = routes[decodeURIComponent(parts.join('/'))] || '';
      } catch {}
    } else if (route === 'tag' && parts.length) target = `/tags/${encodeURIComponent(decodeURIComponent(parts.join('/')))}/`;
    else if (route === 'tags') target = '/tags/';
    else if (route === 'about') target = '/about/';
    else if (route === 'links') target = '/links/';
    else if (!route || route === 'home') target = '/';
    if (target) location.replace(target);
  }

  const splash = document.querySelector('#welcome-splash');
  if (splash && !sessionStorage.getItem('lily-welcomed')) {
    let dismissed = false;
    const previousActiveElement = document.activeElement;
    splash.hidden = false;
    document.body.classList.add('splash-active');
    splash.querySelector('#welcome-enter')?.focus({ preventScroll: true });
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      sessionStorage.setItem('lily-welcomed', '1');
      document.body.classList.remove('splash-active');
      splash.classList.add('hidden');
      if (previousActiveElement instanceof HTMLElement && previousActiveElement !== document.body && previousActiveElement.isConnected) {
        previousActiveElement.focus({ preventScroll: true });
      }
      setTimeout(() => { splash.style.display = 'none'; }, 1200);
    };
    splash.querySelector('#welcome-enter')?.addEventListener('click', dismiss);
    splash.addEventListener('click', (event) => { if (event.target === splash) dismiss(); });
    document.addEventListener('keydown', dismiss, { once: true });
  }

  const applyTheme = (theme, event) => {
    const swap = () => {
      root.dataset.theme = theme;
      localStorage.setItem('blog-theme', theme);
      if (themeButton) themeButton.setAttribute('aria-label', theme === 'dark' ? '切换到日间模式' : '切换到夜间模式');
      syncBackgroundVideos();
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
        { duration: 480, easing: 'cubic-bezier(0.3, 0, 0.15, 1)', pseudoElement: '::view-transition-new(root)', fill: 'forwards' }
      );
    });
    transition.finished.finally(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-vt')));
    });
  };

  if (themeButton) {
    themeButton.setAttribute('aria-label', root.dataset.theme === 'dark' ? '切换到日间模式' : '切换到夜间模式');
    themeButton.addEventListener('click', (event) => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', event));
  }
}
