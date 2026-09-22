import { api } from '../core/api.js';
import { esc, toast } from '../core/dom.js';
import { state } from '../core/state.js';

function musicStatusMarkup(status) {
  const activeId = status.activePlaylistId || "未设置";
  const detail = status.exists
    ? `<strong>${esc(status.name)}</strong><small>博客播放 ${status.playableCount ?? status.trackCount}/${status.trackCount} 首 · 最近同步 ${esc(new Date(status.importedAt).toLocaleString())}</small>`
    : `<strong>该歌单尚无快照</strong><small>同步后可用于博客。</small>`;
  return `<span class="state-chip ${status.active ? "state-chip--ok" : ""}">${status.active ? "博客正在使用" : status.exists ? "已导入，未启用" : "尚未导入"}</span><span class="music-import__copy">${detail}<small>博客当前歌单：${esc(activeId)}</small></span>`;
}

export async function renderMusicModule(root, { onDirty = () => {}, onSaved = () => {} } = {}) {
  const $ = (selector) => root.querySelector(selector);
  const musicCatalog = await api('/api/music/netease/list');
  if (!root.isConnected) return;
  const savedPlaylistId = musicCatalog.activePlaylistId || musicCatalog.playlists[0]?.playlistId || "2672160214";
  const musicStatus = musicCatalog.playlists.find((item) => item.playlistId === savedPlaylistId)
    || { exists: false, playlistId: savedPlaylistId, trackCount: 0, activePlaylistId: musicCatalog.activePlaylistId, active: musicCatalog.activePlaylistId === savedPlaylistId };
  const musicState = musicStatusMarkup(musicStatus);
  root.innerHTML = `<section class="section feature-card music-import"><div class="feature-card__intro"><span class="feature-card__icon" aria-hidden="true">♫</span><div><h2>网易云音乐</h2><p>把网易云歌单安全转换成 Lily Radio 可读取的静态快照。</p></div><div class="music-import__state">${musicState}</div></div><div class="security-note"><span aria-hidden="true">✓</span><p><strong>凭据只使用一次</strong>Cookie 只随本次请求发送给网易云，不写入磁盘、Git 或博客页面；导入完成后输入框立即清空。</p></div><div class="form-grid music-import__form"><label class="field"><span>歌单 ID 或链接</span><input id="netease-playlist-id" value="${esc(savedPlaylistId)}" autocomplete="off" spellcheck="false"><small class="muted">可粘贴数字 ID 或 music.163.com 的歌单链接。</small></label><label class="field"><span>登录 Cookie <em>私密歌单才需要</em></span><input id="netease-cookie" type="password" value="" autocomplete="off" spellcheck="false"><small class="muted">仅在本机内存中使用，不会保存；须来自能访问该歌单的账号。</small></label></div><div class="music-import__actions"><button class="btn primary" id="netease-import">同步歌单</button><span class="muted" id="netease-import-state">${musicStatus.exists ? "再次同步会安全覆盖旧快照。" : "导入后到“页面布局”添加 Lily Radio。"}</span></div></section>`;
  const musicCard = $(".music-import");
  musicCard.insertAdjacentHTML("beforebegin", `<section class="module-steps" aria-label="音乐模块使用流程"><div><span>01 / 导入</span><b>读取歌单</b><small>保存音乐快照</small></div><div><span>02 / 启用</span><b>切换博客歌单</b><small>写入首页 Lily Radio</small></div><div><span>03 / 预览</span><b>确认本地效果</b><small>自动重建后刷新博客</small></div></section>`);
  musicCard.insertAdjacentHTML("afterend", `<details class="section music-track-editor" id="music-track-editor"><summary><span><b>歌曲筛选与音源检测</b><small>一键精简不可用音源，也可逐首恢复；原歌单和快照不会删除。</small></span></summary><div class="music-track-editor__body"><p class="music-track-editor__note">检测的是<strong>未登录访客能否从公开音频地址获取声音</strong>，不代表你的网易云会员账号无法在官方客户端播放。网络异常会标为“待确认”，不会自动剔除。</p><div class="music-track-editor__toolbar"><button class="btn primary" id="music-track-auto" type="button">一键检测并精简</button><button class="btn" id="music-track-scan" type="button">仅检测</button><input id="music-track-search" type="search" placeholder="搜索歌曲或歌手" aria-label="搜索歌曲或歌手"><span class="muted" id="music-track-summary">展开后加载歌曲</span></div><progress class="music-track-editor__progress" id="music-track-progress" max="100" value="0" hidden></progress><div class="music-track-editor__list" id="music-track-list"></div><div class="music-track-editor__footer"><button class="btn primary" id="music-track-save" type="button">保存剔除设置</button><button class="btn" id="music-track-mark-bad" type="button" disabled>标记检测到的不可用歌曲</button><button class="btn" id="music-track-restore" type="button">恢复全部歌曲</button><span class="muted" id="music-track-hint">勾选表示从博客播放器中排除。</span></div></div></details>`);
  if (musicCatalog.playlists.length) {
    $(".music-import__form").insertAdjacentHTML("beforebegin", `<label class="music-picker"><span>已导入歌单</span><select id="netease-snapshot-picker"><option value="">选择快照…</option>${musicCatalog.playlists.map((item) => `<option value="${esc(item.playlistId)}" ${item.playlistId === savedPlaylistId ? "selected" : ""}>${esc(item.name)} · ${item.trackCount} 首${item.active ? " · 博客当前" : ""}</option>`).join("")}</select></label>`);
    $("#netease-snapshot-picker").onchange = (event) => {
      if (!event.target.value) return;
      $("#netease-playlist-id").value = event.target.value;
      $("#netease-playlist-id").dispatchEvent(new Event("input"));
    };
  }
  $("#netease-import").textContent = "同步并启用";
  $("#netease-import").insertAdjacentHTML("afterend", `<button class="btn" id="netease-activate" type="button" ${musicStatus.exists && !musicStatus.active ? "" : "disabled"}>启用已导入快照</button>`);
  $("#netease-activate").insertAdjacentHTML("afterend", `<button class="btn" id="netease-preview" type="button">预览博客 ↗</button>`);
  $("#netease-preview").onclick = () => window.open(state.status?.blogUrl || "http://127.0.0.1:1414/", "_blank", "noopener");
  $("#netease-import-state").textContent = musicStatus.active
    ? "当前歌单已在博客中使用。重新同步会更新歌曲快照。"
    : musicStatus.exists ? "已有快照；点击「启用已导入快照」即可切换，不必重新同步。"
      : "同步成功后会自动设为博客当前歌单。";
  const playlistField = $("#netease-playlist-id");
  const trackEditor = { playlistId: "", tracks: [], excluded: new Set(), availability: new Map() };
  const selectedPlaylistId = () => playlistField.dataset.playlistId || playlistField.value.trim();
  function updateTrackSummary() {
    const unavailable = [...trackEditor.availability.values()].filter((state) => state === "unavailable").length;
    const playable = [...trackEditor.availability.values()].filter((state) => state === "playable").length;
    $("#music-track-summary").textContent = `${trackEditor.tracks.length} 首 · 博客保留 ${trackEditor.tracks.length - trackEditor.excluded.size} 首 · 已排除 ${trackEditor.excluded.size} 首${trackEditor.availability.size ? ` · 可播 ${playable} / 不可用 ${unavailable}` : ""}`;
    $("#music-track-mark-bad").disabled = unavailable === 0;
    $("#music-track-mark-bad").textContent = unavailable ? `标记 ${unavailable} 首不可用` : "标记检测到的不可用歌曲";
  }
  function filterTrackRows() {
    const query = $("#music-track-search").value.trim().toLowerCase();
    root.querySelectorAll(".music-track-row").forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
  }
  function renderTrackRows() {
    const stateNames = { playable: "可播放", unavailable: "不可用", unknown: "待确认" };
    $("#music-track-list").innerHTML = trackEditor.tracks.map((track, index) => {
      const state = trackEditor.availability.get(track.id) || "unchecked";
      const checked = trackEditor.excluded.has(track.id);
      return `<div class="music-track-row ${checked ? "is-excluded" : ""}" data-search="${esc(`${track.title} ${track.artist}`.toLowerCase())}"><input id="music-exclude-${index}" type="checkbox" data-track-id="${esc(track.id)}" ${checked ? "checked" : ""} aria-label="从博客排除 ${esc(track.title)}"><span class="music-track-row__number">${String(index + 1).padStart(2, "0")}</span><label class="music-track-row__copy" for="music-exclude-${index}"><b title="${esc(track.title)}">${esc(track.title)}</b><small title="${esc(track.artist)}">${esc(track.artist || "未知艺术家")}</small></label><span class="music-track-row__state" data-state="${state}">${stateNames[state] || "未检测"}</span><a href="https://music.163.com/#/song?id=${encodeURIComponent(track.id)}" target="_blank" rel="noopener noreferrer" aria-label="在网易云打开 ${esc(track.title)}">网易云 ↗</a></div>`;
    }).join("");
    root.querySelectorAll("#music-track-list [data-track-id]").forEach((input) => {
      input.onchange = () => {
        if (input.checked) trackEditor.excluded.add(input.dataset.trackId);
        else trackEditor.excluded.delete(input.dataset.trackId);
        input.closest(".music-track-row").classList.toggle("is-excluded", input.checked);
        onDirty();
        updateTrackSummary();
        $("#music-track-hint").textContent = "选择已更改；点击「保存剔除设置」才会更新博客。";
      };
    });
    filterTrackRows();
    updateTrackSummary();
  }
  async function loadTrackEditor() {
    const id = selectedPlaylistId();
    if (!/^\d{5,20}$/.test(id)) { $("#music-track-list").innerHTML = '<p class="empty">请先选择已导入的歌单。</p>'; return; }
    $("#music-track-list").innerHTML = '<p class="empty">正在读取歌曲列表…</p>';
    try {
      const data = await api(`/api/music/netease/tracks?id=${encodeURIComponent(id)}`);
      if (!$("#music-track-editor")?.isConnected || selectedPlaylistId() !== id) return;
      trackEditor.playlistId = id;
      trackEditor.tracks = data.tracks;
      trackEditor.excluded = new Set(data.excludedTrackIds);
      trackEditor.availability = new Map();
      $("#music-track-progress").hidden = true;
      $("#music-track-hint").textContent = "勾选表示从博客播放器中排除；原快照保留，可随时恢复。";
      renderTrackRows();
    } catch (error) { $("#music-track-list").innerHTML = `<p class="empty">${esc(error.message)}</p>`; }
  }
  $("#music-track-editor").addEventListener("toggle", (event) => { if (event.target.open) void loadTrackEditor(); });
  $("#music-track-search").addEventListener("input", filterTrackRows);
  $("#music-track-scan").onclick = async () => {
    if (!trackEditor.tracks.length) return false;
    const button = $("#music-track-scan");
    const progress = $("#music-track-progress");
    const scanPlaylistId = trackEditor.playlistId;
    const scanTracks = [...trackEditor.tracks];
    button.disabled = true;
    playlistField.disabled = true;
    if ($("#netease-snapshot-picker")) $("#netease-snapshot-picker").disabled = true;
    progress.hidden = false;
    progress.max = scanTracks.length;
    progress.value = 0;
    trackEditor.availability.clear();
    try {
      for (let index = 0; index < scanTracks.length; index += 8) {
        if (trackEditor.playlistId !== scanPlaylistId || !$("#music-track-editor")?.isConnected) break;
        const batch = scanTracks.slice(index, index + 8);
        const result = await api("/api/music/netease/check", {
          method: "POST",
          body: JSON.stringify({ playlistId: scanPlaylistId, trackIds: batch.map((track) => track.id) }),
          progressLabel: `正在检测音源 ${index + 1}–${Math.min(index + 8, scanTracks.length)}/${scanTracks.length}`,
        });
        if (trackEditor.playlistId !== scanPlaylistId || !$("#music-track-editor")?.isConnected) break;
        result.results.forEach((item) => trackEditor.availability.set(item.id, item.state));
        progress.value = Math.min(index + 8, scanTracks.length);
        $("#music-track-hint").textContent = `已检测 ${progress.value}/${scanTracks.length} 首；结果仅反映当前公开音源。`;
        renderTrackRows();
      }
      toast("音源检测完成；可标记不可用歌曲后保存。");
      return progress.value === scanTracks.length;
    } catch (error) { toast(`检测中断：${error.message}`); return false; }
    finally {
      button.disabled = false;
      playlistField.disabled = false;
      if ($("#netease-snapshot-picker")) $("#netease-snapshot-picker").disabled = false;
    }
  };
  $("#music-track-auto").onclick = async () => {
    if (!trackEditor.tracks.length) return toast("请先选择已导入的歌单。");
    if (!confirm("检测全部公开音源，并从博客播放器排除明确不可用的歌曲？网络异常和待确认歌曲会保留，原歌单不会删除。")) return;
    const auto = $("#music-track-auto");
    auto.disabled = true;
    try {
      if (!(await $("#music-track-scan").onclick())) return;
      const bad = [...trackEditor.availability].filter(([, state]) => state === "unavailable").map(([id]) => id);
      if (!bad.length) return toast("未发现明确不可用的音源，歌单未改变。");
      if (new Set([...trackEditor.excluded, ...bad]).size >= trackEditor.tracks.length) return toast("所有歌曲都显示不可用，已保留原设置供人工确认。");
      bad.forEach((id) => trackEditor.excluded.add(id));
      renderTrackRows();
      if (await saveTrackExclusions()) toast(`已从博客播放器精简 ${bad.length} 首；可随时恢复。`);
    } finally { auto.disabled = false; }
  };
  $("#music-track-mark-bad").onclick = () => {
    for (const [id, availability] of trackEditor.availability) if (availability === "unavailable") trackEditor.excluded.add(id);
    onDirty();
    renderTrackRows();
    $("#music-track-hint").textContent = "不可用歌曲已标记；点击「保存剔除设置」更新博客。";
  };
  async function saveTrackExclusions() {
    if (!trackEditor.playlistId) return false;
    const button = $("#music-track-save");
    const restoreButton = $("#music-track-restore");
    button.disabled = true;
    restoreButton.disabled = true;
    try {
      const result = await api("/api/music/netease/exclusions", {
        method: "POST",
        body: JSON.stringify({ playlistId: trackEditor.playlistId, excludedTrackIds: [...trackEditor.excluded] }),
        progressLabel: "正在保存剔除设置并重建博客",
      });
      $("#music-track-hint").textContent = `已保存：博客播放 ${result.playableCount}/${result.total} 首。`;
      const status = await api(`/api/music/netease/status?id=${encodeURIComponent(trackEditor.playlistId)}`);
      $(".music-import__state").innerHTML = musicStatusMarkup(status);
      onSaved();
      toast("剔除设置已保存，博客已重建。");
      return true;
    } catch (error) { toast(error.message); return false; }
    finally { button.disabled = false; restoreButton.disabled = false; }
  }
  $("#music-track-save").onclick = saveTrackExclusions;
  $("#music-track-restore").onclick = async () => {
    const previous = new Set(trackEditor.excluded);
    trackEditor.excluded.clear();
    renderTrackRows();
    if (!(await saveTrackExclusions())) {
      trackEditor.excluded = previous;
      renderTrackRows();
    }
  };
  let statusTimer = 0;
  playlistField.addEventListener("input", () => {
    clearTimeout(statusTimer);
    const input = playlistField.value.trim();
    const id = /^\d{5,20}$/.test(input) ? input : (() => {
      try { const url = new URL(input); return url.searchParams.get("id") || url.hash.match(/[?&]id=(\d+)/)?.[1] || ""; }
      catch { return ""; }
    })();
    playlistField.dataset.playlistId = id;
    if (!/^\d{5,20}$/.test(id)) {
      $(".music-import__state").innerHTML = '<span class="state-chip">填写歌单 ID 后检查快照</span>';
      $("#netease-activate").disabled = true;
      return;
    }
    statusTimer = setTimeout(async () => {
      try {
        const status = await api(`/api/music/netease/status?id=${encodeURIComponent(id)}`);
        if (playlistField.value.trim() !== input) return;
        $(".music-import__state").innerHTML = musicStatusMarkup(status);
        $("#netease-activate").disabled = !status.exists || status.active;
        if ($("#music-track-editor").open) void loadTrackEditor();
      } catch { /* 输入期间不打断编辑。 */ }
    }, 350);
  });
  $("#netease-activate").onclick = async () => {
    const button = $("#netease-activate");
    const stateNode = $("#netease-import-state");
    button.disabled = true;
    stateNode.textContent = "正在切换博客歌单并重建…";
    try {
      const result = await api("/api/music/netease/activate", {
        method: "POST",
        body: JSON.stringify({ playlistId: playlistField.dataset.playlistId || playlistField.value.trim() }),
        progressLabel: "正在启用歌单并重建博客",
      });
      toast("已切换博客歌单；刷新博客即可查看。");
      onSaved();
      await renderMusicModule(root, { onDirty, onSaved });
    } catch (error) { stateNode.textContent = error.message; toast(error.message); button.disabled = false; }
  };
  $("#netease-import").onclick = async () => {
    const button = $("#netease-import");
    const stateNode = $("#netease-import-state");
    const cookieNode = $("#netease-cookie");
    button.disabled = true;
    stateNode.textContent = "正在从网易云读取歌单…";
    try {
      const result = await api("/api/music/netease/import", { method: "POST", body: JSON.stringify({ playlistId: playlistField.value.trim(), cookie: cookieNode.value, activate: true }), progressLabel: "正在同步、启用并重建歌单" });
      cookieNode.value = "";
      playlistField.value = result.playlistId;
      stateNode.textContent = `已导入并启用「${result.name}」的 ${result.trackCount} 首音乐，博客已重建。`;
      toast(`歌单已启用：${result.trackCount} 首音乐。`);
      onSaved();
      await renderMusicModule(root, { onDirty, onSaved });
    } catch (error) {
      cookieNode.value = "";
      stateNode.textContent = error.message;
      toast(error.message);
    } finally { button.disabled = false; }
  };

}
