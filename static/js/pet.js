(() => {
  const pet = document.createElement('aside');
  pet.className = 'tuanzi';
  pet.tabIndex = 0;
  pet.setAttribute('role', 'button');
  pet.setAttribute('aria-label', '团子宠物。点击互动，拖动移动位置。');
  pet.innerHTML = '<div class="tz-bubble" aria-live="polite"></div><img class="tuanzi-img" src="/assets/img/pet/tuanzi.png" alt="团子"><button class="tz-reset" type="button" aria-label="重置团子位置">↺</button>';
  document.body.append(pet);
  const image = pet.querySelector('img'), bubble = pet.querySelector('.tz-bubble');
  const saved = JSON.parse(localStorage.getItem('lily:pet-position') || 'null');
  const compact = () => matchMedia('(max-width: 620px)').matches;
  function clamp(left, top) { return { left: Math.max(8, Math.min(innerWidth - image.offsetWidth - 8, left)), top: Math.max(8, Math.min(innerHeight - image.offsetHeight - 8, top)) }; }
  function move(left, top, save = true) { const point = clamp(left, top); pet.style.left = `${point.left}px`; pet.style.top = `${point.top}px`; pet.style.right = 'auto'; pet.style.bottom = 'auto'; if (save) localStorage.setItem('lily:pet-position', JSON.stringify(point)); }
  function applyViewportMode() {
    const docked = compact();
    pet.classList.toggle('mobile-docked', docked);
    if (docked) {
      pet.removeAttribute('style');
    } else if (saved) {
      requestAnimationFrame(() => move(saved.left, saved.top, false));
    }
  }
  applyViewportMode();
  let start, offset, moved = false;
  pet.addEventListener('pointerdown', (event) => { if (event.target.closest('.tz-reset')) return; if (compact()) { moved = false; return; } pet.setPointerCapture(event.pointerId); const rect = pet.getBoundingClientRect(); start = { x: event.clientX, y: event.clientY }; offset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; moved = false; pet.classList.add('dragging'); });
  pet.addEventListener('pointermove', (event) => { if (!offset) return; moved ||= Math.abs(event.clientX - start.x) > 3 || Math.abs(event.clientY - start.y) > 3; move(event.clientX - offset.x, event.clientY - offset.y); });
  pet.addEventListener('pointerup', () => { pet.classList.remove('dragging'); if (!moved) poke(); offset = null; });
  function poke() { image.classList.remove('poke'); void image.offsetWidth; image.classList.add('poke'); bubble.textContent = '糯～'; bubble.classList.add('show'); setTimeout(() => bubble.classList.remove('show'), 1500); }
  pet.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); poke(); } });
  pet.querySelector('.tz-reset').addEventListener('click', () => { localStorage.removeItem('lily:pet-position'); pet.removeAttribute('style'); bubble.textContent = '回家啦～'; bubble.classList.add('show'); setTimeout(() => bubble.classList.remove('show'), 1500); });
  addEventListener('resize', () => { if (compact()) { applyViewportMode(); return; } const rect = pet.getBoundingClientRect(); if (rect.left !== 0 || rect.top !== 0) move(rect.left, rect.top); });
})();
