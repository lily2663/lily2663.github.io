(() => {
  const pet = document.createElement('button');
  pet.type = 'button';
  pet.className = 'tuanzi';
  pet.setAttribute('aria-label', '戳戳团子');
  pet.setAttribute('aria-expanded', 'false');
  const imageSource = document.body.dataset.petImage || '/lily-epitaph/tuanzi.png';
  pet.innerHTML = `<span class="tz-bubble" aria-live="polite"></span><img class="tuanzi-img" src="${imageSource}" alt="" draggable="false">`;
  document.body.append(pet);

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'mobile-hub-backdrop';
  backdrop.setAttribute('aria-label', '关闭侧栏工具');
  backdrop.tabIndex = -1;
  document.body.append(backdrop);

  const image = pet.querySelector('.tuanzi-img');
  const bubble = pet.querySelector('.tz-bubble');
  const mobileQuery = matchMedia('(max-width: 900px)');
  const mobileHubEnabled = document.body.dataset.mobileHub !== 'false';
  const rememberTab = document.body.dataset.mobileHubRemember !== 'false';
  const defaultModule = document.body.dataset.mobileHubDefault || 'profile';
  const rememberedModuleKey = 'lily-mobile-hub-tab';
  const moduleLabels = {
    profile: '我',
    weather: '天气',
    quote: '语录',
    music: '音乐',
    tags: '标签',
    toc: '目录',
    map: '地图'
  };
  let bubbleTimer;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  let moved = false;
  let activeSidebar = null;

  const pointOf = (event) => event.touches?.length
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
    : { x: event.clientX, y: event.clientY };

  function move(point) {
    const width = image.offsetWidth;
    const height = image.offsetHeight;
    const left = Math.max(0, Math.min(innerWidth - width, point.x - offsetX));
    const top = Math.max(0, Math.min(innerHeight - height, point.y - offsetY));
    pet.style.left = `${left}px`;
    pet.style.top = `${top}px`;
    pet.style.right = 'auto';
    pet.style.bottom = 'auto';
  }

  function startDrag(event) {
    if (mobileQuery.matches || (event.type === 'mousedown' && event.button !== 0)) return;
    event.preventDefault();
    const point = pointOf(event);
    const rect = pet.getBoundingClientRect();
    offsetX = point.x - rect.left;
    offsetY = point.y - rect.top;
    startX = point.x;
    startY = point.y;
    moved = false;
    dragging = true;
    pet.classList.add('dragging');
  }

  function drag(event) {
    if (!dragging) return;
    event.preventDefault();
    const point = pointOf(event);
    if (Math.abs(point.x - startX) > 3 || Math.abs(point.y - startY) > 3) moved = true;
    move(point);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    pet.classList.remove('dragging');
    if (!moved) poke();
  }

  function showBubble(text) {
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.classList.add('show');
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1800);
  }

  function spawnNuo() {
    for (let index = 0; index < 3; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'tz-nuo';
      particle.textContent = '糯~';
      particle.style.left = `${30 + Math.random() * 80}px`;
      particle.style.top = `${20 + Math.random() * 40}px`;
      particle.style.animationDelay = `${index * 0.12}s`;
      pet.append(particle);
      setTimeout(() => particle.remove(), 1200);
    }
  }

  function poke() {
    image.classList.remove('poke');
    void image.offsetWidth;
    image.classList.add('poke');
    setTimeout(() => image.classList.remove('poke'), 450);
    showBubble('糯~');
    spawnNuo();
  }

  function rememberModule(module) {
    if (!rememberTab) return;
    try { localStorage.setItem(rememberedModuleKey, module.dataset.lilyModule || module.dataset.lilyInstance || ''); } catch {}
  }

  function preferredModule() {
    if (!rememberTab) return defaultModule;
    try { return localStorage.getItem(rememberedModuleKey) || defaultModule; } catch { return defaultModule; }
  }

  function setSelectedModule(sidebar, selected, persist = true) {
    const modules = Array.from(sidebar.querySelectorAll(':scope > .lily-module'));
    const tabs = Array.from(sidebar.querySelectorAll('.mobile-hub-tab'));
    modules.forEach((module) => {
      const isSelected = module === selected;
      module.hidden = !isSelected;
      module.setAttribute('aria-hidden', String(!isSelected));
    });
    if (selected.dataset.lilyModule === 'toc') {
      selected.querySelector('.toc-wrap')?.classList.add('open');
      selected.querySelector('.toc-toggle')?.setAttribute('aria-expanded', 'true');
    }
    if (persist) rememberModule(selected);
    tabs.forEach((tab) => {
      const isSelected = tab.dataset.target === selected.dataset.lilyInstance;
      tab.classList.toggle('is-active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
  }

  function closeHub({ returnFocus = false } = {}) {
    const wasOpen = document.body.classList.contains('mobile-hub-open');
    document.body.classList.remove('mobile-hub-open');
    pet.setAttribute('aria-expanded', 'false');
    activeSidebar?.setAttribute('aria-hidden', 'true');
    if (returnFocus && wasOpen) pet.focus({ preventScroll: true });
  }

  function openHub() {
    if (!activeSidebar) return;
    document.body.classList.add('mobile-hub-open');
    pet.setAttribute('aria-expanded', 'true');
    activeSidebar.setAttribute('aria-hidden', 'false');
    activeSidebar.querySelector('.mobile-hub-tab.is-active')?.focus({ preventScroll: true });
  }

  function resetSidebar(sidebar) {
    sidebar?.querySelector('.mobile-hub-bar')?.remove();
    sidebar?.querySelectorAll(':scope > .lily-module').forEach((module) => {
      module.hidden = false;
      module.removeAttribute('aria-hidden');
    });
    sidebar?.removeAttribute('aria-hidden');
  }

  function syncMobileHub() {
    closeHub();
    resetSidebar(activeSidebar);
    const attachedMusic = activeSidebar?.querySelector(':scope > .lily-module.is-persistent-music');
    if (attachedMusic) {
      const musicDock = document.querySelector('.lily-music-dock');
      attachedMusic.classList.remove('is-persistent-music');
      musicDock?.append(attachedMusic);
      document.dispatchEvent(new Event('lily:music-dock-sync'));
    }
    activeSidebar = null;
    document.body.classList.remove('mobile-hub-ready');
    pet.removeAttribute('aria-controls');
    pet.style.removeProperty('left');
    pet.style.removeProperty('top');
    pet.style.removeProperty('right');
    pet.style.removeProperty('bottom');

    if (!mobileHubEnabled || !mobileQuery.matches) {
      pet.setAttribute('aria-label', '戳戳团子');
      return;
    }

    const sidebar = document.querySelector('#app .lily-slot[data-lily-slot$=".sidebar"]');
    const musicDock = document.querySelector('.lily-music-dock');
    const dockedMusic = musicDock?.querySelector(':scope > .lily-module[data-lily-module="music"]:not([hidden])');
    if (sidebar && dockedMusic && !sidebar.querySelector(':scope > .lily-module[data-lily-module="music"]')) {
      dockedMusic.classList.add('is-persistent-music');
      sidebar.append(dockedMusic);
      document.dispatchEvent(new Event('lily:music-dock-sync'));
    }
    const modules = sidebar ? Array.from(sidebar.querySelectorAll(':scope > .lily-module')) : [];
    if (!sidebar || modules.length === 0) {
      pet.setAttribute('aria-label', '戳戳团子');
      return;
    }

    activeSidebar = sidebar;
    if (!sidebar.id) sidebar.id = 'mobile-lily-hub';
    const bar = document.createElement('div');
    bar.className = 'mobile-hub-bar';
    const tabs = document.createElement('div');
    tabs.className = 'mobile-hub-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '侧栏工具');

    modules.forEach((module, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'mobile-hub-tab';
      tab.dataset.target = module.dataset.lilyInstance || `module-${index}`;
      if (!module.dataset.lilyInstance) module.dataset.lilyInstance = tab.dataset.target;
      tab.textContent = moduleLabels[module.dataset.lilyModule] || module.dataset.lilyModuleLabel || module.dataset.lilyModule || `模块 ${index + 1}`;
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => setSelectedModule(sidebar, module));
      tabs.append(tab);
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mobile-hub-close';
    close.setAttribute('aria-label', '关闭侧栏工具');
    close.textContent = '×';
    close.addEventListener('click', () => closeHub({ returnFocus: true }));
    bar.append(tabs, close);
    sidebar.prepend(bar);
    const preferred = preferredModule();
    const selected = modules.find((module) => module.dataset.lilyModule === preferred || module.dataset.lilyInstance === preferred)
      || modules.find((module) => module.dataset.lilyModule === defaultModule || module.dataset.lilyInstance === defaultModule)
      || modules[0];
    setSelectedModule(sidebar, selected, false);
    sidebar.setAttribute('aria-hidden', 'true');
    pet.setAttribute('aria-controls', sidebar.id);
    pet.setAttribute('aria-label', '打开侧栏工具');
    document.body.classList.add('mobile-hub-ready');
  }

  pet.addEventListener('click', () => {
    if (!mobileQuery.matches || !activeSidebar) return;
    if (document.body.classList.contains('mobile-hub-open')) closeHub();
    else openHub();
  });
  backdrop.addEventListener('click', () => closeHub({ returnFocus: true }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHub({ returnFocus: true });
  });
  pet.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);
  pet.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);
  document.addEventListener('lily:page-ready', syncMobileHub);
  mobileQuery.addEventListener('change', syncMobileHub);
  syncMobileHub();
})();
