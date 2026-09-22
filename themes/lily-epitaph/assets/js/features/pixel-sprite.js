function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seedRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const palettes = [
  ['#7FB5B0', '#E8839B'], ['#A8D5D1', '#E8839B'], ['#E8839B', '#7FB5B0'],
  ['#F4A7B9', '#A8D5D1'], ['#7FB5B0', '#F4A7B9'], ['#5A8F8A', '#C96B82']
];

export function makePixelSprite(title) {
  const random = seedRandom(hashString(title || 'lily'));
  const palette = palettes[Math.floor(random() * palettes.length)];
  let cells = '';
  for (let y = 0; y < 8; y++) {
    const half = [];
    for (let x = 0; x < 4; x++) half.push(random() < 0.48 ? (random() < 0.3 ? 2 : 1) : 0);
    half.concat(half.slice().reverse()).forEach((cell, x) => {
      if (cell) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="${cell === 2 ? palette[1] : palette[0]}"/>`;
    });
  }
  if (!cells) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${cells}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function attachPixelSprite(card) {
  if (card.querySelector('.pixel-sprite')) return;
  const source = makePixelSprite(card.querySelector('.item-title')?.textContent || '');
  if (!source) return;
  const sprite = document.createElement('div');
  sprite.className = 'pixel-sprite';
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.backgroundImage = `url("${source}")`;
  card.append(sprite);
}
