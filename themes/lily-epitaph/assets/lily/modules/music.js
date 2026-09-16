(() => {
  'use strict';

  const players = new Set();
  const safeSource = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  function createPlayer(root) {
    if (root.dataset.lilyPlayerReady === 'true') return;
    const dataNode = root.querySelector('.lily-music__data');
    const audio = root.querySelector('.lily-music__audio');
    let payload = {};
    try {
      payload = JSON.parse(dataNode?.textContent || '{}');
      // Hugo's HTML minifier may serialize application/json contents as a
      // JSON string. Accept both representations without evaluating code.
      if (typeof payload === 'string') payload = JSON.parse(payload);
    } catch { payload = {}; }
    const tracks = (Array.isArray(payload.tracks) ? payload.tracks : [])
      .map((track) => ({
        title: String(track.title || '未命名音乐'),
        artist: String(track.artist || '未知艺术家'),
        cover: safeSource(track.cover),
        source: safeSource(track.source),
      }))
      .filter((track) => track.source);
    const title = root.querySelector('.lily-music__title');
    const artist = root.querySelector('.lily-music__artist');
    const cover = root.querySelector('.lily-music__cover');
    const status = root.querySelector('.lily-music__status');
    const progress = root.querySelector('.lily-music__progress');
    const currentTime = root.querySelector('.lily-music__time--current');
    const duration = root.querySelector('.lily-music__time--duration');
    const playButton = root.querySelector('[data-player-action="toggle"]');
    const queueButton = root.querySelector('[data-player-action="queue"]');
    const queue = root.querySelector('.lily-music__queue');
    const storageKey = `lily-player:${String(payload.playlistId || 'direct')}`;
    let index = 0;
    let resumeAt = 0;
    let saveTimer = 0;

    if (!tracks.length || !audio) return;
    root.dataset.lilyPlayerReady = 'true';

    if (payload.rememberPlayback) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (Number.isInteger(saved.index)) index = Math.min(Math.max(saved.index, 0), tracks.length - 1);
        if (Number.isFinite(saved.time) && saved.time > 0) resumeAt = saved.time;
      } catch {}
    }

    const save = () => {
      if (!payload.rememberPlayback) return;
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        try { localStorage.setItem(storageKey, JSON.stringify({ index, time: audio.currentTime || 0 })); } catch {}
      }, 250);
    };
    const syncQueue = () => queue?.querySelectorAll('.lily-music__track').forEach((button, itemIndex) => {
      button.setAttribute('aria-current', String(itemIndex === index));
      button.querySelector('.lily-music__track-index').textContent = itemIndex === index && !audio.paused ? '♫' : String(itemIndex + 1).padStart(2, '0');
    });
    const syncPlay = () => {
      const playing = !audio.paused;
      root.dataset.playing = String(playing);
      playButton.textContent = playing ? 'Ⅱ' : '▶';
      playButton.setAttribute('aria-label', playing ? '暂停' : '播放');
      playButton.setAttribute('aria-pressed', String(playing));
      syncQueue();
    };
    const load = (nextIndex, autoplay = false) => {
      index = (nextIndex + tracks.length) % tracks.length;
      const track = tracks[index];
      audio.src = track.source;
      title.textContent = track.title;
      artist.textContent = track.artist;
      if (track.cover) {
        cover.src = track.cover;
        cover.hidden = false;
      } else {
        cover.removeAttribute('src');
        cover.hidden = true;
      }
      progress.value = '0';
      currentTime.textContent = '0:00';
      duration.textContent = '0:00';
      status.textContent = `第 ${index + 1} 首，共 ${tracks.length} 首`;
      syncQueue();
      if (autoplay) audio.play().catch(() => { status.textContent = '浏览器阻止了自动播放，请手动点击播放。'; });
      save();
    };

    if (queue) {
      const fragment = document.createDocumentFragment();
      tracks.forEach((track, trackIndex) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lily-music__track';
        button.innerHTML = '<span class="lily-music__track-index"></span><span class="lily-music__track-copy"><span class="lily-music__track-title"></span><span class="lily-music__track-artist"></span></span>';
        button.querySelector('.lily-music__track-title').textContent = track.title;
        button.querySelector('.lily-music__track-artist').textContent = track.artist;
        button.addEventListener('click', () => load(trackIndex, true));
        item.append(button);
        fragment.append(item);
      });
      queue.append(fragment);
    }

    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-player-action]')?.dataset.playerAction;
      if (!action) return;
      if (action === 'toggle') {
        if (audio.paused) {
          players.forEach((other) => { if (other !== audio) other.pause(); });
          audio.play().catch(() => { status.textContent = '这首音乐暂时无法播放，请尝试下一首。'; });
        } else audio.pause();
      }
      if (action === 'previous') load(index - 1, !audio.paused);
      if (action === 'next') load(index + 1, !audio.paused);
      if (action === 'queue' && queue) {
        const expanded = queue.hidden;
        queue.hidden = !expanded;
        queueButton.setAttribute('aria-expanded', String(expanded));
      }
    });
    progress.addEventListener('input', () => {
      if (Number.isFinite(audio.duration)) audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
    });
    audio.addEventListener('loadedmetadata', () => {
      duration.textContent = formatTime(audio.duration);
      if (resumeAt > 0 && resumeAt < audio.duration - 3) audio.currentTime = resumeAt;
      resumeAt = 0;
    });
    audio.addEventListener('timeupdate', () => {
      currentTime.textContent = formatTime(audio.currentTime);
      progress.value = Number.isFinite(audio.duration) && audio.duration > 0 ? String(Math.round((audio.currentTime / audio.duration) * 1000)) : '0';
      save();
    });
    audio.addEventListener('play', syncPlay);
    audio.addEventListener('pause', syncPlay);
    audio.addEventListener('ended', () => load(index + 1, true));
    audio.addEventListener('error', () => {
      status.textContent = '当前歌曲不可用，可切换下一首。';
      syncPlay();
    });
    players.add(audio);
    load(index);
  }

  function initPlayers() {
    players.forEach((audio) => { if (!audio.isConnected) players.delete(audio); });
    document.querySelectorAll('[data-lily-player]').forEach(createPlayer);
  }

  initPlayers();
  document.addEventListener('lily:page-ready', initPlayers);
})();
