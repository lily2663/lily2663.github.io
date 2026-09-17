(() => {
  'use strict';

  const players = new Set();
  const persistentPlayers = new Map();
  let dock = null;
  function ensureDock() {
    if (dock) return dock;
    dock = document.createElement('aside');
    dock.className = 'lily-music-dock';
    dock.setAttribute('aria-label', '持续播放的音乐');
    dock.dataset.expanded = 'false';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lily-music-dock__toggle';
    toggle.textContent = '♫';
    toggle.setAttribute('aria-label', '展开持续播放的音乐');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const expanded = dock.dataset.expanded !== 'true';
      dock.dataset.expanded = String(expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? '收起音乐播放器' : '展开持续播放的音乐');
    });
    dock.append(toggle);
    dock.hidden = true;
    document.body.append(dock);
    return dock;
  }
  function syncDock() {
    if (!dock) return;
    for (const player of persistentPlayers.values()) {
      const docked = dock.contains(player.module);
      player.module.hidden = docked && !player.engaged;
    }
    dock.hidden = ![...persistentPlayers.values()].some((player) => player.engaged && dock.contains(player.module));
    dock.classList.toggle('is-playing', [...persistentPlayers.values()].some((player) => !player.audio.paused && dock.contains(player.module)));
  }
  function reconcilePlayers() {
    for (const player of persistentPlayers.values()) {
      const fresh = [...document.querySelectorAll('#app [data-lily-module="music"]')]
        .find((module) => module.dataset.lilyInstance === player.id && module !== player.module);
      if (fresh) fresh.replaceWith(player.module);
    }
    syncDock();
  }
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
        id: /^\d{1,20}$/.test(String(track.id || '')) ? String(track.id) : '',
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
    const official = root.querySelector('.lily-music__official');
    const progress = root.querySelector('.lily-music__progress');
    const currentTime = root.querySelector('.lily-music__time--current');
    const duration = root.querySelector('.lily-music__time--duration');
    const playButton = root.querySelector('[data-player-action="toggle"]');
    const queueButton = root.querySelector('[data-player-action="queue"]');
    const modeButton = root.querySelector('[data-player-action="mode"]');
    const queue = root.querySelector('.lily-music__queue');
    const storageKey = `lily-player:${String(payload.playlistId || 'direct')}`;
    const module = root.closest('[data-lily-module="music"]');
    const instanceId = module?.dataset.lilyInstance || '';
    let index = 0;
    let resumeAt = 0;
    let saveTimer = 0;
    let mode = 'list';
    const history = [];

    if (!tracks.length || !audio) return;
    root.dataset.lilyPlayerReady = 'true';
    // 音频节点必须留在 #app 外：PJAX 更换文章内容时不能销毁它。
    document.body.append(audio);
    const persistent = module && instanceId ? { id: instanceId, module, audio, engaged: false } : null;
    if (persistent) persistentPlayers.set(instanceId, persistent);

    if (payload.rememberPlayback) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (Number.isInteger(saved.index)) index = Math.min(Math.max(saved.index, 0), tracks.length - 1);
        if (Number.isFinite(saved.time) && saved.time > 0) resumeAt = saved.time;
        if (['list', 'one', 'shuffle'].includes(saved.mode)) mode = saved.mode;
      } catch {}
    }

    const save = () => {
      if (!payload.rememberPlayback) return;
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        try { localStorage.setItem(storageKey, JSON.stringify({ index, time: audio.currentTime || 0, mode })); } catch {}
      }, 250);
    };
    const syncQueue = () => queue?.querySelectorAll('.lily-music__track').forEach((button, itemIndex) => {
      button.setAttribute('aria-current', String(itemIndex === index));
      button.querySelector('.lily-music__track-index').textContent = itemIndex === index && !audio.paused ? '♫' : String(itemIndex + 1).padStart(2, '0');
    });
    const syncPlay = () => {
      const playing = !audio.paused;
      if (playing && persistent) persistent.engaged = true;
      root.dataset.playing = String(playing);
      playButton.textContent = playing ? 'Ⅱ' : '▶';
      playButton.setAttribute('aria-label', playing ? '暂停' : '播放');
      playButton.setAttribute('aria-pressed', String(playing));
      syncQueue();
      syncDock();
    };
    const syncMode = () => {
      const labels = { list: '列表循环', one: '单曲循环', shuffle: '随机播放' };
      const icons = { list: '↻', one: '↺₁', shuffle: '⤨' };
      modeButton.textContent = icons[mode];
      modeButton.setAttribute('aria-label', labels[mode]);
      modeButton.title = `${labels[mode]}，点击切换播放模式`;
      modeButton.dataset.mode = mode;
    };
    const nextIndex = () => {
      if (mode !== 'shuffle' || tracks.length < 2) return (index + 1) % tracks.length;
      const offset = 1 + Math.floor(Math.random() * (tracks.length - 1));
      return (index + offset) % tracks.length;
    };
    const load = (nextIndex, autoplay = false, recordHistory = true) => {
      const resolved = (nextIndex + tracks.length) % tracks.length;
      if (recordHistory && resolved !== index) history.push(index);
      index = resolved;
      const track = tracks[index];
      audio.src = track.source;
      if (official) {
        official.hidden = true;
        if (track.id) official.href = `https://music.163.com/#/song?id=${encodeURIComponent(track.id)}`;
        else official.removeAttribute('href');
      }
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
        button.addEventListener('click', () => { if (persistent) persistent.engaged = true; load(trackIndex, true); syncDock(); });
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
          if (persistent) persistent.engaged = true;
          players.forEach((other) => { if (other !== audio) other.pause(); });
          audio.play().catch(() => {
            status.textContent = '这首歌的公开音源不可用；可切换下一首或在网易云播放。';
            if (official?.hasAttribute('href')) official.hidden = false;
          });
        } else audio.pause();
        syncDock();
      }
      if (action === 'previous') {
        if (mode === 'shuffle' && history.length) load(history.pop(), !audio.paused, false);
        else load(index - 1, !audio.paused);
      }
      if (action === 'next') load(nextIndex(), !audio.paused);
      if (action === 'mode') {
        mode = mode === 'list' ? 'one' : mode === 'one' ? 'shuffle' : 'list';
        syncMode(); save();
        status.textContent = `${modeButton.getAttribute('aria-label')} · 共 ${tracks.length} 首`;
      }
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
    audio.addEventListener('play', () => { if (official) official.hidden = true; syncPlay(); });
    audio.addEventListener('pause', syncPlay);
    audio.addEventListener('ended', () => {
      if (mode === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); }
      else load(nextIndex(), true);
    });
    audio.addEventListener('error', () => {
      status.textContent = '这首歌的公开音源不可用；可切换下一首或在网易云播放。';
      if (official?.hasAttribute('href')) official.hidden = false;
      syncPlay();
    });
    players.add(audio);
    syncMode();
    load(index);
  }

  function initPlayers() {
    reconcilePlayers();
    players.forEach((audio) => { if (!audio.isConnected) players.delete(audio); });
    document.querySelectorAll('[data-lily-player]').forEach(createPlayer);
  }

  initPlayers();
  document.addEventListener('lily:before-page-swap', () => {
    if (dock) {
      dock.dataset.expanded = 'false';
      const toggle = dock.querySelector('.lily-music-dock__toggle');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.setAttribute('aria-label', '展开持续播放的音乐');
    }
    for (const player of persistentPlayers.values()) {
      if (!document.querySelector('#app')?.contains(player.module)) continue;
      player.module.querySelector('.lily-music__queue')?.setAttribute('hidden', '');
      player.module.querySelector('[data-player-action="queue"]')?.setAttribute('aria-expanded', 'false');
      ensureDock().append(player.module);
    }
    syncDock();
  });
  document.addEventListener('lily:page-ready', initPlayers);
  document.addEventListener('lily:music-dock-sync', syncDock);
})();
