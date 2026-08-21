(() => {
  const pet = document.createElement('div');
  pet.className = 'tuanzi';
  const imageSource = document.body.dataset.petImage || '/lily-epitaph/tuanzi.png';
  pet.innerHTML = `<div class="tz-bubble" aria-live="polite"></div><img class="tuanzi-img" src="${imageSource}" alt="团子">`;
  document.body.append(pet);

  const image = pet.querySelector('.tuanzi-img');
  const bubble = pet.querySelector('.tz-bubble');
  let bubbleTimer;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  let moved = false;

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
    if (event.type === 'mousedown' && event.button !== 0) return;
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

  pet.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);
  pet.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);
})();
