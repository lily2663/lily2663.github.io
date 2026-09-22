import { api, trackedFetch, updateOperation } from './core/api.js';
import { $, esc, toast } from './core/dom.js';
import { allowedViews, state } from './core/state.js';
import { decorateNavigation } from './core/icons.js';
import { studioOverview } from './core/studio.js';
import { renderModules, leaveModuleEditor } from './features/module-library.js';

decorateNavigation();

let publishTracker = 0;
document.documentElement.dataset.theme = state.theme;
async function refresh() {
  const [a, s] = await Promise.all([
    api("/api/posts"),
    api("/api/status"),
  ]);
  state.posts = a.posts;
  state.status = s;
  render();
}
function nav() {
  document
    .querySelectorAll("#nav button")
    .forEach((b) => {
      const active = b.dataset.view === state.view;
      b.classList.toggle("on", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
}
function setView(view) {
  if (!allowedViews.has(view)) return;
  if (state.view === 'modules' && !leaveModuleEditor()) return;
  if (state.view === 'drawers' && view !== 'drawers' && state.drawerDirty) {
    if (!confirm('分类抽屉还有未保存的更改，确定离开并放弃吗？')) return;
    state.drawerData = null;
    state.drawerDirty = false;
  }
  if (state.view === 'friends' && view !== 'friends' && state.friendsDirty) {
    if (!confirm('友链还有未保存的更改，确定离开并放弃吗？')) return;
    state.friendsData = null;
    state.friendsDirty = false;
  }
  if (state.view === 'profile' && view !== 'profile' && state.profileDirty) {
    if (!confirm('个人资料还有未保存的更改，确定离开并放弃吗？')) return;
    state.profileData = null;
    state.profileDirty = false;
  }
  state.view = view;
  const url = new URL(location.href);
  url.searchParams.delete('module');
  if (view === "overview") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  history.replaceState(null, "", url);
  render();
}
function page(title, sub, actions = "") {
  let runtimeAlert = state.status && Number(state.status.apiVersion || 0) < 2
    ? `<div class="runtime-alert" role="alert"><span>!</span><div><b>LilyMap 前后端版本不一致</b><small>当前仍是旧后端进程，所以新媒体功能会提示“未知 API”。请关闭 LilyMap 终端后重新运行 npm run admin；仅刷新网页无法更新后端。</small></div></div>`
    : "";
  if (state.view === 'drawers' && state.status && Number(state.status.apiVersion || 0) < 3) runtimeAlert = `<div class="runtime-alert" role="alert"><span>!</span><div><b>分类功能需要新版 LilyMap 后端</b><small>请关闭旧 LilyMap 进程，重新运行 npm run admin 后刷新页面。</small></div></div>`;
  if (state.view === 'friends' && state.status && Number(state.status.apiVersion || 0) < 4) runtimeAlert = `<div class="runtime-alert" role="alert"><span>!</span><div><b>友链管理需要新版 LilyMap 后端</b><small>请关闭旧 LilyMap 进程，重新运行 npm run admin 后刷新页面。</small></div></div>`;
  if (state.view === 'profile' && state.status && Number(state.status.apiVersion || 0) < 5) runtimeAlert = `<div class="runtime-alert" role="alert"><span>!</span><div><b>个人资料管理需要新版 LilyMap 后端</b><small>请重启 LilyMap 后端并刷新页面。</small></div></div>`;
  return `<header class="top"><div><span class="top-kicker">LilyMap Workspace</span><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}<button class="btn icon" id="theme" type="button" title="切换明暗" aria-label="切换明暗主题">◐</button></div></header>${runtimeAlert}`;
}
function bindCommon() {
  $("#theme")?.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem("desk-theme", state.theme);
    document.documentElement.dataset.theme = state.theme;
  });
}
function overview() {
  let s = state.status || { changes: [] },
    lanUrl = s.blogLanUrl || s.preview?.lanUrl || "";
  $("#main").innerHTML =
    page("概览", "今天只需要知道下一步要做什么。") +
    studioOverview(state.posts, s, row);
  $("#import-action").onclick = showImporter;
  $("#open-blog").onclick = () =>
    window.open(
      (state.status && state.status.blogUrl) || "http://localhost:1414/",
      "_blank",
      "noopener",
    );
  $("#copy-lan")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lanUrl);
      toast("地址已复制；首次使用请运行 scripts/enable-lan-preview.ps1 并确认 UAC。\n手机和电脑需连接同一 Wi-Fi。");
    } catch {
      toast(`手机访问：${lanUrl}`);
    }
  });
  document.querySelectorAll("[data-go]").forEach(
    (b) =>
      (b.onclick = () => {
        setView(b.dataset.go);
      }),
  );
  bindRows();
  bindCommon();
}
function row(p) {
  return `<div class="row" data-path="${esc(p.path)}"><div><b>${esc(p.title)}</b><span class="path">${esc(p.path)}</span></div><span>${esc(String(p.date || "—").slice(0, 10))}</span><span class="hide-sm">${
    (p.tags || [])
      .slice(0, 3)
      .map((t) => `<i class="tag">#${esc(t)}</i>`)
      .join("") || "—"
  }</span><span>${p.draft ? '<i class="badge draft">草稿</i>' : '<i class="badge">发布</i>'}${p.protected ? ' <i class="badge protected">Protected</i>' : ""}</span></div>`;
}
function bindRows() {
  document
    .querySelectorAll("[data-path]")
    .forEach((e) => (e.onclick = () => openArticle(e.dataset.path)));
}
function articles() {
  let q = state.query || "",
    list = state.posts.filter((p) =>
      `${p.title} ${p.path} ${(p.tags || []).join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  $("#main").innerHTML =
    page(
      "文章",
      "管理文章属性与 Page Bundle；正文仍由 Typora 完成。",
      `<button class="btn" id="new-page">新建页面</button><button class="btn primary" id="import-top">导入 Markdown</button>`,
    ) +
    `<div class="toolbar"><input id="search" placeholder="标题、标签或文件名" value="${esc(q)}"><button class="btn" id="draft-filter">${state.onlyDraft ? "显示全部" : "仅草稿"}</button></div><div class="list">${
      list
        .filter((p) => !state.onlyDraft || p.draft)
        .map(row)
        .join("") || '<div class="empty">没有匹配文章。</div>'
    }</div>`;
  $("#search").oninput = (e) => {
    state.query = e.target.value;
    articles();
  };
  $("#draft-filter").onclick = () => {
    state.onlyDraft = !state.onlyDraft;
    articles();
  };
  $("#import-top").onclick = showImporter;
  $('#new-page').onclick = async () => {
    const title = window.prompt('页面标题（例如：项目）');
    if (!title?.trim()) return;
    const slug = window.prompt('页面路径（例如：projects，对应 /projects/）');
    if (!slug?.trim()) return;
    try {
      const result = await api('/api/pages', { method: 'POST', body: JSON.stringify({ title: title.trim(), slug: slug.trim() }) });
      toast('页面已创建为草稿，可在文章列表中编辑源码。');
      await refresh();
      await openArticle(result.path);
    } catch (error) { toast(error.message); }
  };
  bindRows();
  bindCommon();
}
async function drawers() {
  if (!state.drawerData) {
    try { state.drawerData = await api('/api/drawers'); }
    catch (error) { $('#main').innerHTML = page('分类抽屉', '无法加载分类数据。') + `<div class="empty">${esc(error.message)}。请检查 LilyMap 后端是否已重启。</div>`; bindCommon(); return; }
  }
  renderDrawers();
}
function renderDrawers() {
  const listScroll = document.querySelector('.drawer-article-list')?.scrollTop || 0;
  const data = state.drawerData;
  const collection = data.drawers;
  const selected = collection.find((item) => item.id === state.drawerEditId) || collection[0];
  if (selected) state.drawerEditId = selected.id;
  const postByPath = new Map(state.posts.map((item) => [item.path, item]));
  const cards = collection.map((item) => `<button class="drawer-card ${selected?.id === item.id ? 'on' : ''}" type="button" data-drawer-select="${esc(item.id)}"><strong>${esc(item.title)}</strong><small>${item.posts.length} 篇文章 · ${esc(item.id)}</small></button>`).join('');
  const assigned = selected?.posts.map((postPath, index) => {
    const post = postByPath.get(postPath);
    return `<li><span>${esc(post?.title || `已失效：${postPath}`)}${post?.draft ? ' <i class="badge draft">草稿</i>' : ''}</span><span class="drawer-assigned__buttons"><button class="btn" type="button" data-drawer-up="${index}" aria-label="将此文章上移">↑</button><button class="btn" type="button" data-drawer-down="${index}" aria-label="将此文章下移">↓</button><button class="btn danger" type="button" data-drawer-remove="${index}" aria-label="从抽屉移除文章">×</button></span></li>`;
  }).join('') || '<li class="muted">尚未放入文章。</li>';
  const options = state.posts.filter((post) => post.path.startsWith('content/posts/') && !post.draft).map((post) => `<label class="drawer-article" data-drawer-search="${esc(`${post.title} ${post.path}`.toLowerCase())}"><input type="checkbox" data-drawer-post="${esc(post.path)}" ${selected?.posts.includes(post.path) ? 'checked' : ''}><span><strong>${esc(post.title)}</strong><small>${esc(post.path)}</small></span></label>`).join('');
  $('#main').innerHTML = page('分类抽屉', '自由创建抽屉，手动挑选文章；一篇文章可放进多个抽屉，与标签互不影响。', `<button class="btn" id="drawer-preview" type="button">预览分类页 ↗</button><button class="btn primary" id="drawer-save" type="button" ${state.drawerDirty ? '' : 'disabled'}>保存更改</button>`) +
    `<div class="drawer-workspace"><section class="drawer-panel"><h2>你的抽屉</h2><p>可以建立多个抽屉并调整顺序。删除抽屉不会删除文章。</p><button class="btn primary" id="drawer-add" type="button">＋ 新建抽屉</button><div class="drawer-cards">${cards || '<div class="empty">还没有抽屉，先创建一个吧。</div>'}</div></section><section class="drawer-panel drawer-editor">${selected ? `<div class="drawer-editor__head"><h2>编辑抽屉</h2><span class="muted">${esc(selected.id)}</span></div><label class="field"><span>抽屉名称</span><input id="drawer-title" type="text" maxlength="60" value="${esc(selected.title)}" placeholder="例如：CTF 笔记"></label><label class="field"><span>简短说明（可选）</span><textarea id="drawer-description" maxlength="200" placeholder="这个抽屉收纳什么？">${esc(selected.description)}</textarea></label><div class="drawer-editor__actions"><span class="drawer-save-hint">抽屉在博客分类页显示；文章顺序按下方列表。</span><span><button class="btn" id="drawer-move-up" type="button">抽屉上移</button> <button class="btn" id="drawer-move-down" type="button">下移</button> <button class="btn danger" id="drawer-delete" type="button">删除抽屉</button></span></div><div><h2>已放入 · ${selected.posts.length} 篇</h2><ul class="drawer-assigned">${assigned}</ul></div><div><h2>挑选文章</h2><p>勾选即可放入，取消勾选即从这个抽屉移除。草稿发布后才会出现在博客。</p><input class="drawer-article-search" id="drawer-article-search" type="search" placeholder="搜索标题或路径" aria-label="搜索可选文章" value="${esc(state.drawerQuery || '')}"><div class="drawer-article-list">${options}</div></div>` : '<h2>选择一个抽屉</h2><p>左侧新建抽屉后，就能为它挑选文章。</p>'}</section></div>`;
  const articleList = document.querySelector('.drawer-article-list');
  if (articleList) {
    articleList.scrollTop = listScroll;
    document.querySelectorAll('[data-drawer-search]').forEach((option) => option.hidden = !option.dataset.drawerSearch.includes((state.drawerQuery || '').toLowerCase()));
  }
  $('#drawer-add').onclick = () => {
    const id = `drawer-${crypto.randomUUID().slice(0, 8)}`;
    collection.push({ id, title: '新抽屉', description: '', posts: [] });
    state.drawerEditId = id; state.drawerDirty = true; renderDrawers(); $('#drawer-title')?.focus(); $('#drawer-title')?.select();
  };
  $('#drawer-preview').onclick = () => window.open(`${state.status?.blogUrl || 'http://localhost:1414'}/categories/`, '_blank', 'noopener');
  $('#drawer-save').onclick = async () => {
    if (collection.some((item) => !item.title.trim())) return toast('每个抽屉都需要名称。');
    const button = $('#drawer-save'); button.disabled = true;
    try { state.drawerData = await api('/api/drawers', { method: 'PUT', body: JSON.stringify({ version: data.version, drawers: collection }), progressLabel: '正在保存分类抽屉' }); state.drawerDirty = false; toast('分类抽屉已保存，博客预览将在构建后更新。'); renderDrawers(); }
    catch (error) { button.disabled = false; toast(error.message); }
  };
  document.querySelectorAll('[data-drawer-select]').forEach((button) => button.onclick = () => { state.drawerEditId = button.dataset.drawerSelect; renderDrawers(); });
  if (selected) {
    const markDirty = () => { state.drawerDirty = true; $('#drawer-save').disabled = false; };
    $('#drawer-title').oninput = (event) => { selected.title = event.target.value; markDirty(); document.querySelector('.drawer-card.on strong').textContent = selected.title || '未命名抽屉'; };
    $('#drawer-description').oninput = (event) => { selected.description = event.target.value; markDirty(); };
    $('#drawer-delete').onclick = () => { if (!confirm(`删除抽屉「${selected.title}」？抽屉里的文章不会被删除。`)) return; collection.splice(collection.indexOf(selected), 1); state.drawerEditId = collection[0]?.id; state.drawerDirty = true; renderDrawers(); };
    for (const [name, offset] of [['up', -1], ['down', 1]]) $('#drawer-move-' + name).onclick = () => { const index = collection.indexOf(selected), next = index + offset; if (next < 0 || next >= collection.length) return; [collection[index], collection[next]] = [collection[next], collection[index]]; state.drawerDirty = true; renderDrawers(); };
    document.querySelectorAll('[data-drawer-post]').forEach((input) => input.onchange = () => { const postPath = input.dataset.drawerPost; if (input.checked && !selected.posts.includes(postPath)) selected.posts.push(postPath); else if (!input.checked) selected.posts = selected.posts.filter((item) => item !== postPath); state.drawerDirty = true; renderDrawers(); });
    document.querySelectorAll('[data-drawer-up], [data-drawer-down], [data-drawer-remove]').forEach((button) => button.onclick = () => { const operation = button.hasAttribute('data-drawer-up') ? 'up' : button.hasAttribute('data-drawer-down') ? 'down' : 'remove'; const index = Number(button.getAttribute(`data-drawer-${operation}`)); if (operation === 'remove') selected.posts.splice(index, 1); else { const next = index + (operation === 'up' ? -1 : 1); if (next < 0 || next >= selected.posts.length) return; [selected.posts[index], selected.posts[next]] = [selected.posts[next], selected.posts[index]]; } state.drawerDirty = true; renderDrawers(); });
    $('#drawer-article-search').oninput = (event) => { const query = event.target.value.trim().toLowerCase(); state.drawerQuery = event.target.value; document.querySelectorAll('[data-drawer-search]').forEach((option) => option.hidden = !option.dataset.drawerSearch.includes(query)); };
  }
  bindCommon();
}
async function friends() {
  if (!state.friendsData) {
    try { state.friendsData = await api('/api/friends'); }
    catch (error) { $('#main').innerHTML = page('友链', '无法加载友链数据。') + `<div class="empty">${esc(error.message)}。请确认 LilyMap 后端已重启。</div>`; bindCommon(); return; }
  }
  renderFriends();
}
function renderFriends() {
  const data = state.friendsData;
  const entries = data.friends;
  const field = (index, key, label, placeholder, required = false) => `<label class="field"><span>${label}</span><input data-friend-index="${index}" data-friend-field="${key}" type="text" value="${esc(entries[index][key] || '')}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}></label>`;
  $('#main').innerHTML = page('友链', '管理博客友链页的卡片，保存后会自动更新本地预览。', `<button class="btn" id="friend-preview" type="button">预览友链页 ↗</button><button class="btn primary" id="friend-save" type="button" ${state.friendsDirty ? '' : 'disabled'}>保存更改</button>`) +
    `<section class="section"><div class="section-heading"><div><h2>朋友们</h2><p class="muted">按下方顺序显示。头像可填图片网址或本站 /assets/ 路径；留空时显示名称首字。</p></div><button class="btn primary" id="friend-add" type="button">＋ 添加友链</button></div><div class="friend-editor-list">${entries.map((entry, index) => `<div class="friend-editor-card"><div class="friend-editor-head"><strong>${esc(entry.name || `新友链 ${index + 1}`)}</strong><div class="friend-editor-actions"><button class="btn" type="button" data-friend-move="${index}" data-offset="-1" aria-label="将${esc(entry.name || '新友链')}上移" ${index === 0 ? 'disabled' : ''}>↑</button><button class="btn" type="button" data-friend-move="${index}" data-offset="1" aria-label="将${esc(entry.name || '新友链')}下移" ${index === entries.length - 1 ? 'disabled' : ''}>↓</button><button class="btn danger" type="button" data-friend-delete="${index}">删除</button></div></div><div class="friend-editor-fields">${field(index, 'name', '名称', '博客名称', true)}${field(index, 'url', '网站地址', 'https://example.com/', true)}${field(index, 'desc', '简介（可选）', '一句话介绍')}${field(index, 'avatar', '头像地址（可选）', 'https://example.com/avatar.png')}</div></div>`).join('') || '<div class="empty">还没有友链，点击「添加友链」开始。</div>'}</div></section>`;
  $('#friend-preview').onclick = () => window.open(`${state.status?.blogUrl || 'http://localhost:1414'}/links/`, '_blank', 'noopener');
  $('#friend-add').onclick = () => { entries.push({ name: '', url: '', desc: '', avatar: '' }); state.friendsDirty = true; renderFriends(); document.querySelector(`[data-friend-index="${entries.length - 1}"][data-friend-field="name"]`)?.focus(); };
  $('#friend-save').onclick = async () => {
    if (entries.some((entry) => !entry.name.trim() || !entry.url.trim())) return toast('每条友链都需要名称和网站地址。');
    const button = $('#friend-save'); button.disabled = true;
    try { state.friendsData = await api('/api/friends', { method: 'PUT', body: JSON.stringify({ version: data.version, friends: entries }), progressLabel: '正在保存友链' }); state.friendsDirty = false; toast('友链已保存，博客预览将在构建后更新。'); renderFriends(); }
    catch (error) { button.disabled = false; toast(error.message); }
  };
  document.querySelectorAll('[data-friend-index]').forEach((input) => input.oninput = () => {
    entries[Number(input.dataset.friendIndex)][input.dataset.friendField] = input.value;
    state.friendsDirty = true;
    $('#friend-save').disabled = false;
    if (input.dataset.friendField === 'name') input.closest('.friend-editor-card').querySelector('strong').textContent = input.value || '新友链';
  });
  document.querySelectorAll('[data-friend-move]').forEach((button) => button.onclick = () => {
    const index = Number(button.dataset.friendMove), next = index + Number(button.dataset.offset);
    [entries[index], entries[next]] = [entries[next], entries[index]];
    state.friendsDirty = true; renderFriends();
  });
  document.querySelectorAll('[data-friend-delete]').forEach((button) => button.onclick = () => {
    const index = Number(button.dataset.friendDelete);
    if (!confirm(`删除友链「${entries[index].name || '新友链'}」？保存后才会从博客移除。`)) return;
    entries.splice(index, 1); state.friendsDirty = true; renderFriends();
  });
  bindCommon();
}
async function profile() {
  if (!state.profileData) {
    try { state.profileData = await api('/api/profile'); }
    catch (error) { $('#main').innerHTML = page('个人资料', '无法加载资料。') + `<div class="empty">${esc(error.message)}</div>`; bindCommon(); return; }
  }
  renderProfile();
}
function renderProfile() {
  const data = state.profileData, item = data.profile;
  $('#main').innerHTML = page('个人资料', '统一管理作者名、简介与社交链接；首页资料卡和关于页读取同一份内容。', `<button class="btn" id="profile-preview" type="button">预览关于页 ↗</button><button class="btn primary" id="profile-save" type="button" ${state.profileDirty ? '' : 'disabled'}>保存资料</button>`) +
    `<section class="section friend-editor-card"><div class="friend-editor-fields"><label class="field"><span>作者名</span><input id="profile-author" maxlength="80" value="${esc(item.author)}" required></label><label class="field"><span>关于页标题</span><input id="profile-title" maxlength="80" value="${esc(item.aboutTitle)}" placeholder="关于本站"></label></div><label class="field" style="margin-top:12px"><span>简介（每行一段）</span><textarea id="profile-about" style="min-height:130px" placeholder="介绍一下自己">${esc((item.about || []).join('\n'))}</textarea></label></section><section class="section"><div class="section-heading"><div><h2>社交链接</h2><p class="muted">会显示在资料卡和关于页；支持网站与邮箱地址。</p></div><button class="btn primary" id="profile-add-link" type="button">＋ 添加链接</button></div><div class="friend-editor-list">${item.links.map((link, index) => `<div class="friend-editor-card"><div class="friend-editor-head"><strong>${esc(link.label || `链接 ${index + 1}`)}</strong><div class="friend-editor-actions"><button class="btn" data-profile-move="${index}" data-offset="-1" type="button" ${index === 0 ? 'disabled' : ''}>↑</button><button class="btn" data-profile-move="${index}" data-offset="1" type="button" ${index === item.links.length - 1 ? 'disabled' : ''}>↓</button><button class="btn danger" data-profile-delete="${index}" type="button">删除</button></div></div><div class="friend-editor-fields"><label class="field"><span>显示名称</span><input data-profile-index="${index}" data-profile-field="label" value="${esc(link.label)}" placeholder="GitHub"></label><label class="field"><span>地址</span><input data-profile-index="${index}" data-profile-field="url" value="${esc(link.url)}" placeholder="https://example.com/ 或 mailto:you@example.com"></label></div></div>`).join('') || '<div class="empty">还没有社交链接。</div>'}</div></section>`;
  const dirty = () => { state.profileDirty = true; $('#profile-save').disabled = false; };
  $('#profile-author').oninput = (event) => { item.author = event.target.value; dirty(); };
  $('#profile-title').oninput = (event) => { item.aboutTitle = event.target.value; dirty(); };
  $('#profile-about').oninput = (event) => { item.about = event.target.value.split(/\r?\n/); dirty(); };
  $('#profile-preview').onclick = () => window.open(`${state.status?.blogUrl || 'http://localhost:1414'}/about/`, '_blank', 'noopener');
  $('#profile-add-link').onclick = () => { item.links.push({ label: '', url: '' }); state.profileDirty = true; renderProfile(); document.querySelector(`[data-profile-index="${item.links.length - 1}"][data-profile-field="label"]`)?.focus(); };
  document.querySelectorAll('[data-profile-index]').forEach((input) => input.oninput = () => { item.links[Number(input.dataset.profileIndex)][input.dataset.profileField] = input.value; dirty(); if (input.dataset.profileField === 'label') input.closest('.friend-editor-card').querySelector('strong').textContent = input.value || '新链接'; });
  document.querySelectorAll('[data-profile-move]').forEach((button) => button.onclick = () => { const index = Number(button.dataset.profileMove), next = index + Number(button.dataset.offset); [item.links[index], item.links[next]] = [item.links[next], item.links[index]]; state.profileDirty = true; renderProfile(); });
  document.querySelectorAll('[data-profile-delete]').forEach((button) => button.onclick = () => { item.links.splice(Number(button.dataset.profileDelete), 1); state.profileDirty = true; renderProfile(); });
  $('#profile-save').onclick = async () => {
    item.author = $('#profile-author').value.trim();
    item.aboutTitle = $('#profile-title').value.trim();
    item.about = $('#profile-about').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!item.author) return toast('请填写作者名。');
    const button = $('#profile-save'); button.disabled = true;
    try { state.profileData = await api('/api/profile', { method: 'PUT', body: JSON.stringify({ version: data.version, profile: item }), progressLabel: '正在保存个人资料' }); state.profileDirty = false; toast('个人资料已保存。'); renderProfile(); }
    catch (error) { button.disabled = false; toast(error.message); }
  };
  bindCommon();
}
async function showImporter() {
  setView("import");
}
function importPage() {
  $("#main").innerHTML =
    page(
      "导入 Typora Markdown",
      "拖入 .md 与其图片目录（可一起拖入整个文章文件夹），或点击下方按钮选择；正文保持原样。",
    ) +
    `<section id="drop" class="drop"><h2>拖入 Markdown / 文章目录 / 图片</h2><p>自动读取 Front Matter、识别图片引用并归位到 Page Bundle。</p><button class="btn primary" id="choose-md">选择 Markdown 与图片</button> <button class="btn" id="choose-folder">选择文章目录</button></section><div id="plan"></div>`;
  let d = $("#drop");
  ["dragenter", "dragover"].forEach((x) =>
    d.addEventListener(x, (e) => {
      e.preventDefault();
      d.classList.add("over");
    }),
  );
  ["dragleave", "drop"].forEach((x) =>
    d.addEventListener(x, (e) => {
      e.preventDefault();
      d.classList.remove("over");
    }),
  );
  d.addEventListener("drop", async (e) => {
    let items = await collectDropFiles(e.dataTransfer);
    readFiles(items);
  });
  $("#choose-md").onclick = () => $("#file-picker").click();
  $("#choose-folder").onclick = () => $("#folder-picker").click();
  bindCommon();
}
async function collectDropFiles(dt) {
  let out = [];
  let entries = [...(dt.items || [])]
    .map((i) => {
      try {
        return i.webkitGetAsEntry && i.webkitGetAsEntry();
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (entries.length) {
    for (let en of entries) await walkDropEntry(en, "", out);
    if (out.length) return out;
  }
  return [...dt.files].map((f) => ({
    file: f,
    relativePath: f.webkitRelativePath || f.name,
  }));
}
async function walkDropEntry(en, prefix, out) {
  if (en.isFile) {
    let f = await new Promise((r, j) => en.file(r, j));
    out.push({ file: f, relativePath: prefix + en.name });
  } else if (en.isDirectory) {
    let rd = en.createReader();
    let batch;
    do {
      batch = await new Promise((r, j) => rd.readEntries(r, j));
      for (let ce of batch)
        await walkDropEntry(ce, prefix + en.name + "/", out);
    } while (batch.length);
  }
}
async function readFiles(files) {
  const operation = beginOperation(`正在读取文件 0/${files.length}`);
  try {
    let payload = [];
    for (let f of files) {
      let file = f.file || f;
      payload.push({
        name: file.name,
        relativePath:
          f.relativePath || file.webkitRelativePath || file.name,
        type: file.type,
        content: await as64(file),
      });
      updateOperation(operation, `正在读取文件 ${payload.length}/${files.length}`);
    }
    state.import = { payload };
    await runInspect();
  } catch (e) {
    toast(e.message);
  } finally { endOperation(operation); }
}
async function runInspect() {
  try {
    let payload = state.import.payload;
    let plan = await api("/api/import/inspect", {
      method: "POST",
      body: JSON.stringify({ files: payload }),
    });
    state.import.plan = plan;
    let missing = plan.missing || [];
    $("#plan").innerHTML =
      `<div class="import-plan"><h2>确认导入</h2><div class="kv"><span>标题</span><b>${esc(plan.title)}</b></div><div class="kv"><span>目标路径</span><b class="path">content/posts/${esc(plan.slug)}/index.md</b></div><div class="kv"><span>Front Matter</span><b>${plan.hasFrontMatter ? "已识别，保持原样" : "未发现，将补充最小 Hugo Front Matter"}</b></div><div class="kv"><span>关联资源</span><b>${plan.assetCount} 个${missing.length ? `；<span style="color:var(--danger)">缺少 ${missing.length} 张图片</span>` : ""}</b></div>${plan.rewriteCount ? `<div class="kv"><span>本地图片引用</span><b>自动改写 ${plan.rewriteCount} 处为博客路径</b></div>` : ""}${missing.length ? `<div class="kv"><span>缺失图片</span><b class="path" style="color:var(--danger)">${esc(missing.join("<br>"))}</b></div><p><label class="btn primary" style="display:inline-block">补选缺失图片（可多选）<input id="missing-pick" type="file" accept="image/*" multiple hidden></label> <span class="muted">按文件名自动匹配归位，选完自动重新检查</span></p>` : ""}<label class="switch"><span><b>发布为草稿</b><p>没有 Front Matter 时默认安全导入为草稿</p></span><input id="import-draft" type="checkbox" checked></label><p><button class="btn primary" id="confirm-import">导入</button> <button class="btn" id="cancel-import">取消</button></p></div>`;
    let pick = $("#missing-pick");
    if (pick)
      pick.onchange = async (e) => {
        let extra = [...e.target.files];
        if (!extra.length) return;
        for (let f of extra)
          state.import.payload.push({
            name: f.name,
            relativePath: f.name,
            type: f.type,
            content: await as64(f),
          });
        toast("已补选 " + extra.length + " 张图片，重新检查引用…");
        await runInspect();
      };
    $("#confirm-import").onclick = async () => {
      try {
        let r = await api("/api/import", {
          method: "POST",
          body: JSON.stringify({
            files: payload,
            draft: $("#import-draft").checked,
          }),
        });
        toast(
          `已导入 ${r.path}${r.assetCount ? `（含 ${r.assetCount} 张图片）` : ""}`,
        );
        await refresh();
        setView("articles");
        openArticle(r.path);
      } catch (e) {
        toast(e.message);
      }
    };
    $("#cancel-import").onclick = () => {
      $("#plan").innerHTML = "";
      state.import = null;
    };
  } catch (e) {
    toast(e.message);
  }
}
async function as64(f) {
  let b = await f.arrayBuffer(),
    a = new Uint8Array(b),
    s = "";
  for (let x of a) s += String.fromCharCode(x);
  return btoa(s);
}
async function openArticle(path) {
  let d = await api("/api/post?path=" + encodeURIComponent(path)),
    p = d.article;
  let m = document.createElement("div");
  m.className = "drawer-mask";
  let w = document.createElement("section");
  w.className = "drawer";
  w.innerHTML = `<div class="drawer-head"><div><h2>${esc(p.title)}</h2><span class="path">${esc(p.path)}</span></div><div class="actions"><button class="btn" id="preview">预览</button><button class="btn" id="copy-path">复制路径</button><button class="btn danger" id="trash">删除</button><button class="btn" id="close">×</button></div></div><div class="tabs"><button class="on" data-tab="meta">博客属性</button><button data-tab="assets">图片</button><button data-tab="source">源码</button><button data-tab="diff">Diff</button></div><div id="drawer-body"></div>`;
  document.body.append(m, w);
  let tab = "meta";
  function draw() {
    w.querySelectorAll(".tabs button").forEach((x) =>
      x.classList.toggle("on", x.dataset.tab === tab),
    );
    let b = $("#drawer-body");
    if (tab === "meta")
      b.innerHTML = `<div class="form"><label class="field full"><span>标题</span><input id="f-title" value="${esc(p.title)}"></label><label class="field"><span>日期</span><input id="f-date" type="date" value="${esc(String(p.date).slice(0, 10))}"></label><label class="field"><span>Slug</span><input id="f-slug" value="${esc(p.slug)}"></label><label class="field full"><span>标签（逗号分隔）</span><input id="f-tags" value="${esc((p.tags || []).join(", "))}"></label><label class="field full"><span>摘要 / Description</span><input id="f-summary" value="${esc(p.summary || p.description || "")}"></label><label class="field full"><span>Cover</span><input id="f-cover" value="${esc(p.cover || "")}"></label><label class="switch"><span><b>草稿</b><p>暂不发布到生产构建</p></span><input id="f-draft" type="checkbox" ${p.draft ? "checked" : ""}></label><div class="field"><span>受保护文章</span><p class="muted">${p.protected ? "已加密；解除保护将使正文公开。" : "可设置密码，把正文转为加密内容。若旧版本已公开，Git 历史中的明文仍需另行处理。"}</p><input id="protection-password" type="password" autocomplete="new-password" placeholder="${p.protected ? '当前密码' : '至少 8 个字符'}"><button class="btn" id="toggle-protection" type="button">${p.protected ? "解除保护" : "设置密码并加密"}</button></div></div><p><button class="btn primary" id="save-meta">保存属性</button></p>`;
    else if (tab === "assets") {
      b.innerHTML = `<h2>文章资源</h2><p class="muted">图片上传与引用属于 Page Bundle；不会改写正文。</p><div class="asset-group"><b>${p.kind === "bundle" ? "可上传图片到此 Bundle" : "现有单 Markdown 文件；请在 Typora 或 Explorer 中整理资源。"}</b><span class="path">${esc(p.directory)}</span></div>${p.kind === "bundle" ? '<div class="asset-grid" id="bundle-imgs"></div><input id="asset-upload" type="file" accept="image/*"><pre id="asset-ref" class="path"></pre>' : ""}`;
      async function loadBundleImgs() {
        try {
          let r = await api("/api/files");
          let imgs = r.files.filter(
            (f) =>
              f.path.startsWith(p.directory + "/") &&
              /(jpe?g|png|webp|gif|svg|avif)$/i.test(f.path),
          );
          let g = $("#bundle-imgs");
          if (!g) return;
          g.innerHTML = imgs.length
            ? imgs
                .map(
                  (f) =>
                    `<div class="asset-card"><div class="asset-prev"><img src="${esc("/" + f.path)}" alt="" loading="lazy"></div><div class="asset-meta"><b>${esc(f.path.split("/").pop())}</b><div class="asset-actions"><button class="btn mini" data-copy-name="${esc(f.path.split("/").pop())}">复制文件名</button></div></div></div>`,
                )
                .join("")
            : '<div class="empty">Bundle 内暂无图片，可从下方上传。</div>';
          g.querySelectorAll("[data-copy-name]").forEach(
            (x) =>
              (x.onclick = () =>
                navigator.clipboard
                  .writeText(x.dataset.copyName)
                  .then(() => toast("文件名已复制。"))),
          );
        } catch (e) {
          toast(e.message);
        }
      }
      if (p.kind === "bundle") loadBundleImgs();
      $("#asset-upload")?.addEventListener("change", async (e) => {
        let f = e.target.files[0];
        if (!f) return;
        let r = await trackedFetch(
          "/api/post/upload?path=" +
            encodeURIComponent(p.path) +
            "&name=" +
            encodeURIComponent(f.name),
          {
            method: "POST",
            headers: { "content-type": f.type },
            body: f,
          }, "正在上传文章图片",
        );
        let j = await r.json();
        if (!r.ok) return toast(j.error);
        $("#asset-ref").textContent = j.markdown;
        toast("已上传；复制引用到 Typora 正文。");
        loadBundleImgs();
      });
    } else if (tab === "source")
      b.innerHTML = `<p class="muted">仅供应急查看和极小修正；日常正文请使用 Typora。</p><label class="field"><textarea id="raw">${esc(d.raw)}</textarea></label><p><button class="btn" id="save-raw">保存源码</button></p>`;
    else {
      b.innerHTML = '<p class="muted">读取本地 Git Diff…</p>';
      api("/api/git/diff?path=" + encodeURIComponent(p.path)).then(
        (r) =>
          (b.innerHTML = `<pre class="path">${esc(r.diff || "该文件暂无 diff。")}</pre>`),
      );
    }
    if (tab === "meta")
      $("#save-meta").onclick = async () => {
        try {
          let ch = {
            title: $("#f-title").value,
            date: $("#f-date").value,
            slug: $("#f-slug").value,
            tags: $("#f-tags")
              .value.split(/[,，]/)
              .map((x) => x.trim())
              .filter(Boolean),
            summary: $("#f-summary").value,
            cover: $("#f-cover").value,
            draft: $("#f-draft").checked,
          };
          let r = await api(
            "/api/article?path=" + encodeURIComponent(p.path),
            {
              method: "PATCH",
              body: JSON.stringify({ changes: ch, version: d.version }),
            },
          );
          Object.assign(p, r.article);
          d.version = r.version;
          toast("已最小化更新 Front Matter。");
          await refresh();
        } catch (e) {
          toast(e.message);
        }
      };
    if (tab === 'meta') $('#toggle-protection').onclick = async () => {
      const password = $('#protection-password').value;
      if (password.length < 8) return toast('密码至少需要 8 个字符。');
      if (p.protected && !confirm('解除保护后正文会公开显示；确定继续？')) return;
      if (!p.protected && !confirm('加密后原文章的历史版本仍可能含有明文；确定继续？')) return;
      try {
        const action = p.protected ? 'decrypt' : 'encrypt';
        const result = await api('/api/protected', { method: 'POST', body: JSON.stringify({ path: p.path, version: d.version, password, action }), progressLabel: action === 'encrypt' ? '正在加密文章' : '正在解除文章保护' });
        const latest = await api('/api/post?path=' + encodeURIComponent(p.path));
        d = latest; p = latest.article;
        toast(result.note || '文章保护状态已更新。');
        draw(); await refresh();
      } catch (error) { toast(error.message); }
    };
    if (tab === "source")
      $("#save-raw").onclick = async () => {
        try {
          let r = await api(
            "/api/post?path=" + encodeURIComponent(p.path),
            {
              method: "PUT",
              body: JSON.stringify({
                raw: $("#raw").value,
                version: d.version,
              }),
            },
          );
          d.raw = $("#raw").value;
          d.version = r.version;
          toast("源码已保存。");
        } catch (e) {
          toast(e.message);
        }
      };
  }
  draw();
  w.querySelectorAll("[data-tab]").forEach(
    (x) =>
      (x.onclick = () => {
        tab = x.dataset.tab;
        draw();
      }),
  );
  $("#close").onclick = () => {
    m.remove();
    w.remove();
  };
  m.onclick = (e) => {
    if (e.target === m) {
      m.remove();
      w.remove();
    }
  };
  $("#preview").onclick = () => {
    const base = (state.status && state.status.blogUrl) || 'http://localhost:1414/';
    const parts = p.path.replace(/^content\//, '').replace(/(?:\/index)?\.md$/i, '').split('/').filter((part) => part !== '_index');
    if (p.slug && parts.length) parts[parts.length - 1] = p.slug;
    window.open(new URL(parts.map(encodeURIComponent).join('/') + '/', base).href, '_blank', 'noopener');
  };
  $("#copy-path").onclick = () =>
    navigator.clipboard
      .writeText(p.path)
      .then(() => toast("路径已复制。"));
  $("#trash").onclick = async () => {
    if (!confirm(`将「${p.title}」移入 .admin-trash？`)) return;
    await api("/api/post?path=" + encodeURIComponent(p.path), {
      method: "DELETE",
    });
    m.remove();
    w.remove();
    toast("已移入回收区。");
    refresh();
  };
}
async function resources() {
  let files = await api("/api/files"),
    bundles = {};
  for (let p of state.posts.filter((x) => x.kind === "bundle"))
    bundles[p.directory] = p;
  let article = files.files.filter((f) =>
      Object.keys(bundles).some(
        (d) =>
          f.path.startsWith(d + "/") && !f.path.endsWith("/index.md"),
      ),
    ),
    site = files.files.filter((f) => f.scope === "public" && f.publicPath),
    pipeline = files.files.filter((f) => f.scope === "pipeline");
  let mediaPreview = (f, source) => {
    if (f.kind === "image") return `<img src="${esc(source)}" alt="" loading="lazy" decoding="async">`;
    if (f.kind === "video") return `<video src="${esc(source)}" muted loop playsinline preload="metadata" onpointerenter="this.play()" onpointerleave="this.pause()"></video>`;
    return `<div class="file-badge">${esc(f.extension || "file")}</div>`;
  };
  let siteCards =
    site
      .map((f) => {
        return `<div class="asset-card"><div class="asset-prev">${mediaPreview(f, f.publicPath)}</div><div class="asset-meta"><b>${esc(f.path.split("/").pop())}</b><span class="path" title="磁盘：${esc(f.path)}">公开：${esc(f.publicPath)}</span><small class="muted">${readableBytes(f.size)} · ${esc((f.extension || "file").toUpperCase())}</small><div class="asset-actions"><button class="btn mini" data-copy="${esc(f.publicPath)}">复制公开路径</button>${f.path.startsWith('static/assets/') && ['image', 'video'].includes(f.kind) ? `<button class="btn mini" data-file-action="replace" data-file-path="${esc(f.path)}">替换</button><button class="btn mini" data-file-action="rename" data-file-path="${esc(f.path)}">重命名</button><button class="btn mini danger" data-file-action="delete" data-file-path="${esc(f.path)}">删除</button>` : ''}</div></div></div>`;
      })
      .join("") || '<div class="empty">暂无站点资源。</div>';
  state.resCopy = (v) => {
    navigator.clipboard
      .writeText(v)
      .then(() => toast("已复制：" + v))
      .catch(() => toast("复制失败"));
  };
  $("#main").innerHTML =
    page(
      "资源",
      "站点资源只写入 static/assets，并自动换算为稳定的 /assets/... 公开路径。",
    ) +
    `<section class="section"><div class="security-note"><span aria-hidden="true">✓</span><p><strong>路径规则已统一</strong>磁盘位置是 static/assets/...；Hugo 与线上使用 /assets/...。源码管线 assets/ 不再伪装成可直接访问 URL。</p></div><h2>站点资源</h2><p class="muted">可以上传、替换、重命名或移入回收区。重命名及删除前请检查文章和配置中的引用。</p><label class="upload-btn btn primary">+ 上传图片<input id="res-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple hidden></label><div class="asset-grid">${siteCards}</div></section>${pipeline.length ? `<section class="section"><h2>Hugo 资源管线（不直接公开）</h2><div class="security-note"><span aria-hidden="true">i</span><p><strong>${pipeline.length} 个 assets/ 源文件</strong>这些文件需要模板处理后才有 URL，LilyMap 不再生成误导性的公开路径。</p></div></section>` : ""}<section class="section"><h2>文章图片</h2>${article.length ? `<div class="asset-grid">${article.map((f) => `<div class="asset-card"><div class="asset-prev">${mediaPreview(f, "/" + f.path)}</div><div class="asset-meta"><b>${esc(f.path.split("/").pop())}</b><span class="path">${esc(Object.entries(bundles).find(([d]) => f.path.startsWith(d + "/"))?.[1]?.title || f.path)}</span><div class="asset-actions"><button class="btn mini" data-copy="${esc(f.path.split("/").pop())}">复制文件名</button>${f.kind === 'image' ? `<button class="btn mini" data-file-action="replace" data-file-path="${esc(f.path)}">替换</button><button class="btn mini" data-file-action="rename" data-file-path="${esc(f.path)}">重命名</button><button class="btn mini danger" data-file-action="delete" data-file-path="${esc(f.path)}">删除</button>` : ''}</div></div></div>`).join("")}</div>` : '<div class="empty">尚未发现 Page Bundle 图片。</div>'}</section>`;
  bindCommon();
  document
    .querySelectorAll("[data-copy]")
    .forEach((b) => (b.onclick = () => state.resCopy(b.dataset.copy)));
  document.querySelectorAll('[data-file-action]').forEach((button) => button.onclick = async () => {
    const filePath = button.dataset.filePath, action = button.dataset.fileAction;
    try {
      if (action === 'rename') {
        const name = window.prompt('新文件名（扩展名保持不变）。引用旧路径的文章或配置需要手动更新。', filePath.split('/').pop());
        if (!name || name === filePath.split('/').pop()) return;
        await api(`/api/file?path=${encodeURIComponent(filePath)}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      } else if (action === 'delete') {
        if (!confirm(`将 ${filePath} 移入回收区？引用它的页面可能需要更新。`)) return;
        await api(`/api/file?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' });
      } else {
        const chooser = document.createElement('input'); chooser.type = 'file';
        chooser.accept = filePath.endsWith('.mp4') ? 'video/mp4' : 'image/*';
        chooser.onchange = async () => {
          const file = chooser.files?.[0]; if (!file) return;
          if (file.name.split('.').pop().toLowerCase() !== filePath.split('.').pop().toLowerCase()) return toast('替换文件需要保持原扩展名。');
          try { await trackedFetch(`/api/file?path=${encodeURIComponent(filePath)}`, { method: 'PUT', body: file }, '正在替换资源').then(async (response) => { if (!response.ok) throw Error((await response.json()).error || '替换失败'); }); toast('资源已替换，旧文件留在回收区。'); await resources(); }
          catch (error) { toast(error.message); }
        };
        chooser.click(); return;
      }
      toast('资源操作已完成。'); await resources();
    } catch (error) { toast(error.message); }
  });
  let up = $("#res-upload");
  up.onchange = async () => {
    let ok = 0,
      fail = 0;
    await Promise.all(
      [...up.files].map(async (f) => {
        try {
          let r = await trackedFetch(
            "/api/asset/upload?name=" +
              encodeURIComponent(f.name) +
              "&area=static/assets/img",
            {
              method: "POST",
              headers: { "content-type": f.type },
              body: f,
            }, `正在上传 ${f.name}`,
          );
          r.ok ? ok++ : fail++;
        } catch {
          fail++;
        }
      }),
    );
    toast(`上传完成：成功 ${ok} 个${fail ? `，失败 ${fail} 个` : ""}`);
    await resources();
  };
}
function settingField(f, v) {
  let value = v ?? f.default ?? "",
    help = f.help || f.path;
  if (f.type === "boolean")
    return `<label class="switch"><span><b>${esc(f.label)}</b><p>${esc(help)}</p></span><input data-config="${f.path}" type="checkbox" ${value ? "checked" : ""}></label>`;
  if (f.type === "select")
    return `<label class="field"><span>${esc(f.label)}</span><select data-config="${f.path}">${(f.options || []).map((o) => `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select><small class="muted">${esc(help)}</small></label>`;
  let type =
    f.type === "number"
      ? "number"
      : f.type === "color"
        ? "color"
        : "text";
  let limits = f.type === "number"
    ? ["min", "max", "step"].filter((key) => Object.hasOwn(f, key)).map((key) => `${key}="${esc(f[key])}"`).join(" ")
    : "";
  return `<label class="field"><span>${esc(f.label)}</span><input data-config="${f.path}" type="${type}" value="${esc(value)}" ${limits}><small class="muted">${esc(help)}</small></label>`;
}
async function settings() {
  let d = await api("/api/settings");
  state.settings = d;
  let fields = d.schema.sections
    .map(
      (s, i) =>
        `<details ${i < 2 || s.id === "mobileLayout" ? "open" : ""}><summary>${esc(s.label)}</summary><div class="settings-grid">${s.fields.map((f) => settingField(f, d.values[f.path])).join("")}</div></details>`,
    )
    .join("");
  $("#main").innerHTML =
    page(
      "博客设置",
      "模块化管理站点身份、视觉、阅读与交互；保存后由 Hugo 自动重建。",
    ) +
    `<div class="settings">${fields}<details><summary>导航</summary><div id="menus"></div><button class="btn" id="add-menu">添加菜单</button></details><p><button class="btn primary" id="save-settings">保存设置</button></p><details><summary>高级配置：hugo.toml 原文</summary><label class="field"><textarea id="raw-settings">${esc(d.raw)}</textarea></label><p><button class="btn" id="save-raw-settings">保存原文</button></p></details></div>`;
  function menu(m = { name: "新菜单", url: "/", weight: 60 }) {
    return `<div class="menu-item"><input data-menu="name" value="${esc(m.name)}"><input data-menu="url" value="${esc(m.url)}"><input data-menu="weight" type="number" value="${esc(m.weight)}"><button class="btn">删除</button></div>`;
  }
  let menus = $("#menus");
  menus.innerHTML = d.menus.map(menu).join("");
  $("#add-menu").onclick = () =>
    menus.insertAdjacentHTML("beforeend", menu());
  document
    .querySelectorAll(".menu-item button")
    .forEach((b) => (b.onclick = () => b.parentElement.remove()));
  $("#save-settings").onclick = async () => {
    try {
      let values = {};
      d.schema.sections
        .flatMap((s) => s.fields)
        .forEach((f) => {
          let e = document.querySelector(`[data-config="${f.path}"]`);
          values[f.path] =
            f.type === "boolean"
              ? e.checked
              : f.type === "number"
                ? Number(e.value)
                : e.value;
        });
      let nextMenus = [...document.querySelectorAll(".menu-item")].map(
        (e) => ({
          name: e.querySelector("[data-menu=name]").value,
          url: e.querySelector("[data-menu=url]").value,
          weight: Number(e.querySelector("[data-menu=weight]").value),
        }),
      );
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ values, menus: nextMenus }),
      });
      toast("模块设置已保存；Hugo 正在重建。");
      await refresh();
    } catch (e) {
      toast(e.message);
    }
  };
  $("#save-raw-settings").onclick = async () => {
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ raw: $("#raw-settings").value }),
      });
      toast("hugo.toml 已保存。");
    } catch (e) {
      toast(e.message);
    }
  };
  bindCommon();
}
function version() {
  let s = state.status || { repoRoot: "", branch: "-", changes: [] };
  let paths = s.paths || {};
  let pathRows = [
    ["博客仓库", paths.repository || s.repoRoot || "—"],
    ["文章目录", paths.content || "—"],
    ["站点资源", paths.siteAssets || "—"],
    ["本地构建", paths.public || "—"],
    ["公开 URL", paths.publicAssetPrefix || "/assets/"],
  ].map(([label, value]) => `<div class="path-map__row"><b>${esc(label)}</b><span class="path" title="${esc(value)}">${esc(value)}</span></div>`).join("");
  $("#main").innerHTML =
    page(
      "系统诊断",
      "集中核对运行版本、路径映射、工作区与构建结果。",
      `<a class="btn" href="/api/admin/export" download="lilymap-source.tar.gz">导出 LilyMap 源码包</a><button class="btn primary" id="build">重新构建</button>`,
    ) +
    `<section class="section"><div class="status"><div><b>Repository</b><small>${esc(s.repoRoot)}</small></div><div><b>${esc(s.branch)}</b><small>当前分支</small></div><div><b>${s.changes.length} Changes</b><small>不会 Push / Pull</small></div><div><b>${s.mediaTools?.available ? "✓ FFmpeg" : "! FFmpeg"}</b><small>${s.mediaTools?.available ? `动态壁纸可用 · ${esc(s.mediaTools.version || "已检测")}` : "动态壁纸转换不可用"}</small></div></div></section><section class="section"><h2>路径映射</h2><div class="path-map">${pathRows}</div><p class="muted">唯一规则：文件写入 static/assets/...，配置和文章引用 /assets/...；assets/ 仅用于 Hugo 资源管线。</p></section><section class="section"><h2>工作区变更</h2><pre class="path">${esc(s.changes.map((x) => x.status.padEnd(3) + " " + x.path).join("\n") || "工作区干净。")}</pre></section>`;
  $("#build").onclick = async () => {
    try {
      let r = await api("/api/build", { method: "POST", progressLabel: "正在重新构建博客" });
      toast(r.ok ? "Hugo 构建成功。" : "构建失败。");
      await refresh();
    } catch (e) {
      toast(e.message);
    }
  };
  bindCommon();
}
async function layouts() {
  const d = await api("/api/layouts");
  if (!state.lbrd || !d.layouts.some((l) => l.name === state.lbrd.name))
    state.lbrd = { name: d.layouts[0].name, data: d };
  let L = d.layouts.find((l) => l.name === state.lbrd.name);
  $("#main").innerHTML =
    page("布局", "可视化组合首页与页面的模块槽位（Slot）。") +
      `<div class="lbrd-top"><select id="lbrd-select">${d.layouts.map((l) => `<option value="${l.name}" ${l.name === L.name ? "selected" : ""}>${esc(l.parsed.title || l.name)} · ${l.name}</option>`).join("")}</select><button class="btn primary" id="lbrd-save">保存布局</button><button class="btn" id="lbrd-history">历史版本</button>${L.source === "site" ? '<button class="btn danger" id="lbrd-theme-default">恢复主题默认</button>' : ""}<button class="btn" id="lbrd-reset">放弃修改</button></div><p class="muted">${esc(L.parsed.description || "")} · 直接拖动左侧模块到模拟博客页，点击模块后在右侧改属性。</p><div class="lbrd-studio"><aside class="lbrd-palette">${renderPalette(L.parsed, d.modules)}</aside><section class="lbrd-device"><div class="lbrd-device-bar"><i class="lbrd-device-dot"></i><i class="lbrd-device-dot"></i><i class="lbrd-device-dot"></i><span>博客布局 · 画布预览</span></div><div class="lbrd-canvas">${renderSlots(L.parsed, d.modules)}</div></section><aside class="lbrd-inspector">${renderInspector(L.parsed, d.modules)}</aside></div>`;
  state.lbrd.data = d;
  bindCommon();
  $("#lbrd-select").onchange = (e) => {
    state.lbrd.name = e.target.value;
    layouts();
  };
  $("#lbrd-save").onclick = async () => {
    try {
      await api("/api/layouts", {
        method: "PUT",
        body: JSON.stringify({
          name: state.lbrd.name,
          parsed: state.lbrd.data.layouts.find(
            (l) => l.name === state.lbrd.name,
          ).parsed,
        }),
      });
      toast("布局已保存；博客已实时重建，可从历史版本恢复。");
    } catch (e) {
      toast(e.message);
    }
  };
  $("#lbrd-history").onclick = async () => {
    try {
      const { history } = await api(`/api/layouts/history?name=${encodeURIComponent(state.lbrd.name)}`);
      if (!history.length) return toast("还没有可恢复的自定义布局版本。");
      const choices = history.map((item, index) => `${index + 1}. ${new Date(item.savedAt).toLocaleString()}`).join("\n");
      const answer = window.prompt(`输入要恢复的版本编号：\n${choices}`, "1");
      const item = history[Number(answer) - 1];
      if (!item) return;
      if (!confirm(`恢复到 ${new Date(item.savedAt).toLocaleString()}？当前布局会先自动备份。`)) return;
      await api("/api/layouts/restore", { method: "POST", body: JSON.stringify({ name: state.lbrd.name, revision: item.revision }) });
      state.lbrd.data = null;
      toast("布局已恢复，并已备份恢复前版本。");
      await layouts();
    } catch (error) { toast(error.message); }
  };
  const themeDefault = $("#lbrd-theme-default");
  if (themeDefault) themeDefault.onclick = async () => {
    if (!confirm("恢复主题默认布局？当前自定义覆盖层会移入可恢复回收站。")) return;
    try {
      await api("/api/layouts/reset", { method: "POST", body: JSON.stringify({ name: state.lbrd.name }) });
      state.lbrd.data = null;
      toast("已恢复主题默认布局；原自定义覆盖层可从回收站找回。");
      await layouts();
    } catch (error) { toast(error.message); }
  };
  $("#lbrd-reset").onclick = () => {
    state.lbrd.data = null;
    state.lbrd.name = state.lbrd.name;
    layouts();
  };
  document.querySelectorAll("[data-lbrd-move]").forEach(
    (b) =>
      (b.onclick = () => {
        moveBlock(b.dataset.lbrdMove, b.dataset.dir, b.dataset.index);
      }),
  );
  document.querySelectorAll("[data-lbrd-del]").forEach(
    (b) =>
      (b.onclick = () => {
        delBlock(b.dataset.lbrdDel, b.dataset.index);
      }),
  );
  document.querySelectorAll("[data-lbrd-add]").forEach(
    (b) =>
      (b.onclick = () => {
        startAdd(b.dataset.lbrdAdd);
      }),
  );
  document.querySelectorAll("[data-lbrd-field]").forEach(
    (i) =>
      (i.onchange = (e) => {
        let [slot, idx, key] = e.target.dataset.lbrdField.split("::");
        let P = state.lbrd.data.layouts.find(
          (l) => l.name === state.lbrd.name,
        ).parsed;
        let module = state.lbrd.data.modules[P.slots[slot][+idx].module];
        let type = module?.schema?.[key]?.type || "string";
        P.slots[slot][+idx].config[key] =
          type === "boolean"
            ? e.target.checked
            : type === "number"
              ? Number(e.target.value)
              : e.target.value;
      }),
  );
  document.querySelectorAll("[data-lbrd-select]").forEach((block) => block.onclick = (event) => {
    if (event.target.closest("button")) return;
    state.lbrd.selected = { slot: block.dataset.lbrdSelect, index: Number(block.dataset.index) };
    layouts();
  });
  document.querySelectorAll("[data-lbrd-palette]").forEach((card) => card.ondragstart = () => { state.lbrd.drag = { module: card.dataset.lbrdPalette }; });
  document.querySelectorAll(".lbrd-block[draggable=true]").forEach((block) => block.ondragstart = () => { state.lbrd.drag = { slot: block.dataset.slot, index: Number(block.dataset.index), module: block.dataset.module }; });
  document.querySelectorAll(".lbrd-slot").forEach((slot) => {
    slot.ondragover = (event) => { event.preventDefault(); slot.classList.add("drag-over"); };
    slot.ondragleave = () => slot.classList.remove("drag-over");
    slot.ondrop = (event) => { event.preventDefault(); slot.classList.remove("drag-over"); dropModule(slot.dataset.slot); };
  });
  function renderSlots(P, mods) {
    return P.slotOrder
      .map(function (slot) {
        let blocks = P.slots[slot] || [];
        let mobileHint = slot === "sidebar" ? '<small class="muted">手机端会按这里的顺序自动进入团子工具面板</small>' : "";
        return `<div class="lbrd-slot" data-slot="${slot}"><div class="lbrd-slot-head"><span><b>${slot}</b> · ${blocks.length} 个模块 ${mobileHint}</span></div><div class="lbrd-blocks">${blocks.map((blk, i) => renderBlock(slot, blk, i, mods[blk.module])).join("") || '<div class="empty">把左侧模块拖到这里</div>'}</div><button class="lbrd-add" data-lbrd-add="${slot}">+ 添加模块</button><div id="pick-${slot}"></div></div>`;
      })
      .join("");
  }
  function renderLayoutField(slot, index, key, value, definition = {}) {
    let type = definition.type || "string";
    let label = definition.label || key;
    let help = definition.help ? `<small class="muted">${esc(definition.help)}</small>` : "";
    let data = `data-lbrd-field="${slot}::${index}::${key}"`;
    if (type === "boolean")
      return `<label class="switch"><span><b>${esc(label)}</b>${help}</span><input ${data} type="checkbox" ${value ? "checked" : ""}></label>`;
    if (type === "select")
      return `<label class="field"><span>${esc(label)}</span><select ${data}>${(definition.options || []).map((option) => `<option value="${esc(option.value)}" ${option.value === value ? "selected" : ""}>${esc(option.label || option.value)}</option>`).join("")}</select>${help}</label>`;
    let inputType = type === "number" ? "number" : type === "color" ? "color" : type === "url" ? "url" : "text";
    return `<label class="field"><span>${esc(label)}</span><input ${data} type="${inputType}" value="${esc(value ?? "")}">${help}</label>`;
  }
  function renderBlock(slot, blk, i, mod) {
    let active = state.lbrd.selected?.slot === slot && state.lbrd.selected?.index === i;
    return `<div class="lbrd-block ${active ? "selected" : ""}" draggable="true" data-lbrd-select="${slot}" data-slot="${slot}" data-index="${i}" data-module="${esc(blk.module)}"><div class="lbrd-block-head"><b>${esc(mod?.icon || "◆")} ${esc(mod?.name || blk.module)}</b><span class="muted">${esc(blk.module)} · v${esc(mod?.version || "0.1")}</span><span class="lbrd-mini"><button data-lbrd-move="${slot}" data-dir="-1" data-index="${i}">↑</button><button data-lbrd-move="${slot}" data-dir="1" data-index="${i}">↓</button><button class="del" data-lbrd-del="${slot}" data-index="${i}">删</button></span></div></div>`;
  }
  function renderPalette(P, mods) {
    let slotNames = P.slotOrder.map((slot) => `${P.kind}.${slot}`);
    let available = Object.values(mods).filter((mod) => mod.allowedSlots.some((slot) => slotNames.includes(slot)));
    return `<h2>模块抽屉</h2><p class="muted">拖到中间画布的目标区域。</p><div class="lbrd-palette-list">${available.map((mod) => `<button class="lbrd-palette-card" draggable="true" data-lbrd-palette="${esc(mod.id)}"><b>${esc(mod.icon || "◆")} ${esc(mod.name)}</b><small>${esc(mod.id)}</small></button>`).join("")}</div>`;
  }
  function renderInspector(P, mods) {
    let selected = state.lbrd.selected;
    let block = selected && P.slots[selected.slot]?.[selected.index];
    if (!block) return `<h2>属性面板</h2><p class="muted">点击画布中的模块，可在这里修改属性。</p>`;
    let mod = mods[block.module]; let merged = { ...(mod?.defaults || {}), ...(block.config || {}) };
    let keys = [...new Set([...Object.keys(mod?.schema || {}), ...Object.keys(merged)])];
    return `<h2>${esc(mod?.icon || "◆")} ${esc(mod?.name || block.module)}</h2><p class="muted">${esc(block.module)} · ${esc(mod?.description || "")}</p><div class="lbrd-fields">${keys.map((key) => renderLayoutField(selected.slot, selected.index, key, merged[key], mod?.schema?.[key])).join("") || '<span class="muted">该模块没有可配置属性。</span>'}</div>`;
  }
  function moveBlock(slot, dir, index) {
    let L = state.lbrd.data.layouts.find(
      (l) => l.name === state.lbrd.name,
    );
    let arr = L.parsed.slots[slot];
    let j = +index,
      k = j + +dir;
    if (k < 0 || k >= arr.length) return;
    [arr[j], arr[k]] = [arr[k], arr[j]];
    layouts();
  }
  function delBlock(slot, index) {
    let L = state.lbrd.data.layouts.find(
      (l) => l.name === state.lbrd.name,
    );
    L.parsed.slots[slot].splice(+index, 1);
    if (state.lbrd.selected?.slot === slot && state.lbrd.selected?.index === +index) state.lbrd.selected = null;
    layouts();
  }
  function dropModule(slot) {
    let L = state.lbrd.data.layouts.find((l) => l.name === state.lbrd.name);
    let dragged = state.lbrd.drag;
    if (!dragged || !L.parsed.slots[slot]) return;
    let module = state.lbrd.data.modules[dragged.module];
    if (!module?.allowedSlots?.includes(`${L.parsed.kind}.${slot}`)) return toast(`${dragged.module} 不能放入 ${L.parsed.kind}.${slot}`);
    if (dragged.slot) {
      let source = L.parsed.slots[dragged.slot];
      let [block] = source.splice(dragged.index, 1);
      L.parsed.slots[slot].push(block);
      state.lbrd.selected = { slot, index: L.parsed.slots[slot].length - 1 };
    } else {
      L.parsed.slots[slot].push({ id: `${slot}-${dragged.module}-${Date.now().toString(36)}`, module: dragged.module, config: { ...module.defaults } });
      state.lbrd.selected = { slot, index: L.parsed.slots[slot].length - 1 };
    }
    state.lbrd.drag = null;
    layouts();
  }
  function startAdd(slot) {
    let d = state.lbrd.data;
    let opts = d.modules;
    let layout = d.layouts.find((l) => l.name === state.lbrd.name).parsed;
    let box = $("#pick-" + slot);
    let used = new Set(
      (
        layout.slots[slot] || []
      ).map((b) => b.module),
    );
    let pick = Object.values(opts).filter((m) =>
      m.allowedSlots.includes(`${layout.kind}.${slot}`),
    );
    if (box.innerHTML) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = `<div class="lbrd-pick">${pick.length ? pick.map((m) => `<button class="btn" data-add-mod="${m.id}">${esc(m.name)} · ${esc(m.id)}</button>`).join("") : '<span class="muted">该槽位暂无可用模块</span>'}</div>`;
    document.querySelectorAll("[data-add-mod]").forEach(
      (b) =>
        (b.onclick = () => {
          addBlock(slot, b.dataset.addMod);
          box.innerHTML = "";
        }),
    );
  }
  function addBlock(slot, moduleId) {
    let L = state.lbrd.data.layouts.find(
      (l) => l.name === state.lbrd.name,
    );
    if (!L.parsed.slots[slot]) L.parsed.slots[slot] = [];
    let m = state.lbrd.data.modules[moduleId];
    L.parsed.slots[slot].push({
      id: `${slot}-${moduleId}-${Date.now().toString(36)}`,
      module: moduleId,
      config: { ...m?.defaults },
    });
    layouts();
  }
}
async function modules() {
  await renderModules({ page, bindCommon, navigate: setView });
}
async function appearance() {
  let d = await Promise.all([api("/api/settings"), api("/api/files")]);
  state.settings = d[0];
  let files = d[1].files.filter(
    (f) => f.publicPath && ["image", "video"].includes(f.kind),
  );
  let assets = files.map((f) => f.publicPath);
  let wv = d[0].values || {};
  let optimizeUploads = wv["params.performance.optimizeUploads"] !== false;
  let imageQuality = wv["params.performance.imageQuality"] || "high";
  let qualityNames = { compact: "轻量", high: "高清", ultra: "超清" };
  let curW =
    wv["params.welcome.background"] ||
    wv["welcome.background"] ||
    wv["welcome.bg"] ||
    assets.find((p) =>
      /welcome.*(day|light)|welcome-watercolor|background(?!Dark)/i.test(
        p,
      ),
    ) ||
    "";
  let curN =
    wv["params.welcome.backgroundDark"] ||
    wv["welcome.backgroundDark"] ||
    assets.find((p) => /night|dark/i.test(p)) ||
    "";
  let curA =
    wv["params.avatar"] ||
    wv.avatar ||
    assets.find((p) => /avatar|author|profile/i.test(p)) ||
    "";
  state.appr = { files, curW, curN, curA, dirty: false };
  let card = (id, label, caption, ph) => {
    let key =
      id === "welcome" ? "curW" : id === "night" ? "curN" : "curA";
    let current = state.appr[key];
    let accept = id === "avatar"
      ? "image/png,image/jpeg,image/webp,image/gif,image/avif"
      : "image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,.m4v,.mkv,.avi";
    return `<article class="appearance-card"><header class="appearance-card__head"><div><b>${label}</b><small>${caption}</small></div><span class="appearance-card__type" data-media-type="${id}">${current ? (isVideoPath(current) ? "动态视频" : "静态图片") : "未设置"}</span></header><div class="appr-preview" data-target="${id}">${appearanceMediaMarkup(current)}<figcaption>${label}</figcaption></div><div class="appearance-card__body"><div class="appearance-card__actions"><label class="btn primary" for="appr-${id}">${current ? "更换媒体" : "选择媒体"}</label><span class="muted">${id === "avatar" ? "PNG / JPG / WebP / GIF / AVIF" : "图片或视频"}</span><input type="file" id="appr-${id}" accept="${accept}" hidden></div><code class="appearance-card__path" data-current="${id}" title="${esc(current || "未设置")}">${esc(current || "未设置")}</code></div></article>`;
  };
  $("#main").innerHTML =
    page(
      "外观",
      "集中管理全站壁纸与头像；选择、预览、应用三步完成。",
      '<button class="btn primary" id="appr-save" type="button">保存并应用</button>',
    ) +
    `<div class="appearance-workflow" aria-label="外观设置流程"><div><i>1</i><span><b>选择</b><small>上传文件或粘贴路径</small></span></div><div><i>2</i><span><b>预览</b><small>确认日间与夜间效果</small></span></div><div><i>3</i><span><b>应用</b><small>一次保存到博客配置</small></span></div></div><div class="security-note"><span aria-hidden="true">${optimizeUploads ? "✓" : "i"}</span><p><strong>${optimizeUploads ? `本机优化已开启 · 图片${qualityNames[imageQuality] || "高清"} / 视频 1080p` : "自动图片优化已关闭"}</strong>图片在浏览器本机压缩；视频由 FFmpeg 转为 H.264 MP4、30fps 并保留比例，所有处理均留在这台电脑。</p></div><section class="section"><div class="section-heading"><div><h2>主题背景</h2><p class="muted">欢迎页和博客内页共用下面这组日间/夜间媒体。</p></div></div><div class="appearance-grid">${card("welcome", "日间壁纸", "浅色主题", "/assets/img/welcome-watercolor.jpg")}${card("night", "夜间壁纸", "深色主题", "/assets/img/night-watercolor.jpg")}</div></section><section class="section feature-card"><div class="feature-card__intro"><span class="feature-card__icon" aria-hidden="true">⌁</span><div><h2>从本机路径快速导入</h2><p>适合视频和大文件：跳过浏览器上传，直接读取本机文件并生成网页版本。</p></div></div><div class="media-import"><label class="field"><span>文件完整路径</span><input id="media-local-path" spellcheck="false" placeholder="D:\\Wallpapers\\scene.mp4"><small class="muted">支持 PNG / JPG / WebP / GIF / AVIF / MP4 / WebM / MOV / M4V / MKV / AVI。</small></label><div><button class="btn primary" data-media-import="welcome">导入到日间</button> <button class="btn" data-media-import="night">导入到夜间</button></div><p class="media-import__state" id="media-import-state">导入完成后会先进入上方预览，最后点击“保存并应用”。</p></div></section><section class="section"><div class="section-heading"><div><h2>站点身份</h2><p class="muted">头像用于作者卡片和个人信息模块。</p></div></div><div class="appearance-avatar">${card("avatar", "作者头像", "侧边作者卡片", "/assets/img/avatar.jpg")}</div></section>`;
  bindCommon();
  $("#appr-welcome").onchange = (e) => uploadAsset(e, "welcome");
  $("#appr-night").onchange = (e) => uploadAsset(e, "night");
  $("#appr-avatar").onchange = (e) => uploadAsset(e, "avatar");
  document.querySelectorAll("[data-media-import]").forEach((button) => {
    button.onclick = () => importMediaPath(button.dataset.mediaImport);
  });
  $("#appr-save").onclick = async () => {
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          values: {
            "params.welcome.background": state.appr.curW,
            "params.welcome.backgroundDark": state.appr.curN,
            "params.avatar": state.appr.curA,
          },
        }),
      });
      state.appr.dirty = false;
      $("#appr-save").textContent = "已应用";
      setTimeout(() => { if ($("#appr-save")) $("#appr-save").textContent = "保存并应用"; }, 1200);
      toast("外观已应用，欢迎页与内页背景已更新。");
    } catch (e) {
      toast(e.message);
    }
  };
}
function isVideoPath(value) {
  return /\.(mp4|webm)(?:[?#].*)?$/i.test(String(value || ""));
}
function appearanceMediaMarkup(source) {
  if (!source) return '<div class="file-badge" style="height:220px">未设置媒体</div>';
  if (isVideoPath(source)) return `<video src="${esc(source)}" poster="${esc(source.replace(/\.(mp4|webm)$/i, ".poster.webp"))}" muted loop playsinline controls preload="metadata"></video>`;
  return `<img src="${esc(source)}" alt="">`;
}
function setAppearanceMedia(target, source) {
  let key = target === "welcome" ? "curW" : target === "night" ? "curN" : "curA";
  state.appr[key] = source;
  let preview = document.querySelector(`.appr-preview[data-target="${target}"]`);
  preview?.querySelector("img,video,.file-badge")?.remove();
  preview?.insertAdjacentHTML("afterbegin", appearanceMediaMarkup(source));
  let current = document.querySelector(`[data-current="${target}"]`);
  if (current) { current.textContent = source; current.title = source; }
  let type = document.querySelector(`[data-media-type="${target}"]`);
  if (type) type.textContent = isVideoPath(source) ? "动态视频" : "静态图片";
  state.appr.dirty = true;
  if ($("#appr-save")) $("#appr-save").textContent = "保存并应用 · 有修改";
}
async function importMediaPath(target) {
  let input = $("#media-local-path"), stateNode = $("#media-import-state");
  let sourcePath = input?.value.trim();
  if (!sourcePath) return toast("请先粘贴完整的本机文件路径。");
  let buttons = [...document.querySelectorAll("[data-media-import]")];
  buttons.forEach((button) => button.disabled = true);
  stateNode.textContent = "正在检查文件并优化媒体；4K 视频通常需要几十秒…";
  try {
    let result = await api("/api/media/import", {
      method: "POST",
      body: JSON.stringify({ sourcePath, target }),
    });
    setAppearanceMedia(target, result.path);
    let saving = result.sourceSize > 0 ? Math.max(0, Math.round((1 - result.outputSize / result.sourceSize) * 100)) : 0;
    stateNode.textContent = `${result.kind === "video" ? "视频已转为 1080p H.264 MP4" : "图片已复制"}：${readableBytes(result.sourceSize)} → ${readableBytes(result.outputSize)}${saving ? `（-${saving}%）` : ""}。点击“应用外观”写入配置。`;
    toast("媒体导入完成；点击“应用外观”生效。");
  } catch (error) {
    let message = /未知 API|Unknown API/i.test(error.message)
      ? "当前是旧版 LilyMap 后端。请关闭 LilyMap 终端并重新运行 npm run admin，然后再导入。"
      : error.message;
    stateNode.textContent = message;
    toast(message);
  } finally {
    buttons.forEach((button) => button.disabled = false);
  }
}
function readableBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
async function optimizeAppearanceImage(file, target) {
  let settings = state.settings?.values || {};
  let isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
  if (settings["params.performance.optimizeUploads"] === false || isGif) {
    return { body: file, name: file.name, before: file.size, after: file.size, optimized: false };
  }
  let preset = settings["params.performance.imageQuality"] || "high";
  let profiles = {
    compact: { maxEdge: 1920, quality: 0.74 },
    high: { maxEdge: 2560, quality: 0.82 },
    ultra: { maxEdge: 3200, quality: 0.9 },
  };
  let profile = profiles[preset] || profiles.high;
  if (target === "avatar") profile = { ...profile, maxEdge: Math.min(profile.maxEdge, 768) };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // 浏览器暂时无法解码的合法格式（常见于较旧内核的 AVIF）仍可原样保存；
    // 服务端会继续做文件签名校验，不因优化失败而误伤正常素材。
    return { body: file, name: file.name, before: file.size, after: file.size, optimized: false };
  }
  let scale = Math.min(1, profile.maxEdge / Math.max(bitmap.width, bitmap.height));
  let canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  let context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", profile.quality));
  if (!blob) throw new Error("浏览器无法生成 WebP，请换用 PNG 或 JPG 后重试。");
  let useOptimized = blob.size <= file.size * 1.05;
  let body = useOptimized ? blob : file;
  let extension = useOptimized ? "webp" : (file.name.split(".").pop() || "png").toLowerCase();
  return {
    body,
    name: `${target}-${Date.now()}.${extension}`,
    before: file.size,
    after: body.size,
    optimized: useOptimized,
    dimensions: `${canvas.width}×${canvas.height}`,
  };
}
async function uploadAsset(e, target) {
  let f = e.target.files[0];
  if (!f) return;
  const mediaOperation = beginOperation("正在准备媒体文件");
  try {
    let isVideo = f.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(f.name);
    if (isVideo) {
      if (target === "avatar") throw new Error("头像只支持图片；动态壁纸请上传到日间或夜间。");
      if (f.size > 160 * 1024 * 1024) throw new Error("视频超过 160 MB，请改用下方“从本机完整路径导入”。");
      toast("正在上传并转换视频，请保持 LilyMap 页面打开…");
      let response = await trackedFetch(
        "/api/media/upload?name=" + encodeURIComponent(f.name) + "&target=" + encodeURIComponent(target),
        { method: "POST", headers: { "content-type": f.type || "application/octet-stream" }, body: f },
        "正在上传并转换视频",
      );
      let result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "视频上传失败。");
      setAppearanceMedia(target, result.path);
      let saving = result.sourceSize > 0 ? Math.max(0, Math.round((1 - result.outputSize / result.sourceSize) * 100)) : 0;
      toast(`视频已优化 ${readableBytes(result.sourceSize)} → ${readableBytes(result.outputSize)}${saving ? `（-${saving}%）` : ""}；点击“应用外观”生效。`);
      return;
    }
    toast(/\.gif$/i.test(f.name) || f.type === "image/gif" ? "正在读取 GIF，动画帧会原样保留…" : "正在本机优化图片…");
    let prepared = await optimizeAppearanceImage(f, target);
    let area = prepared.optimized
      ? `static/assets/img/optimized/${target === "avatar" ? "avatars" : "wallpapers"}`
      : "static/assets/img";
    let r = await trackedFetch(
      "/api/asset/upload?name=" +
        encodeURIComponent(prepared.name) +
        "&area=" + encodeURIComponent(area),
      { method: "POST", headers: { "content-type": prepared.body.type || f.type }, body: prepared.body },
      "正在上传优化后的图片",
    );
    let j = await r.json();
    if (!r.ok) throw new Error(j.error || "上传失败。");
    let newPath = j.path;
    setAppearanceMedia(target, newPath);
    let saving = prepared.before > 0 ? Math.max(0, Math.round((1 - prepared.after / prepared.before) * 100)) : 0;
    toast(prepared.optimized
      ? `已优化 ${readableBytes(prepared.before)} → ${readableBytes(prepared.after)}（-${saving}% · ${prepared.dimensions}）；点击「应用外观」生效。`
      : `已上传 ${f.name}；点击「应用外观」生效。`);
  } catch (error) {
    let message = /未知 API|Unknown API/i.test(error.message || "")
      ? "当前是旧版 LilyMap 后端。请关闭 LilyMap 终端并重新运行 npm run admin。"
      : error.message || "媒体处理失败。";
    toast(message);
  } finally {
    endOperation(mediaOperation);
    e.target.value = "";
  }
}
async function publish() {
  let s = await api("/api/publish/status");
  let ok = s.tokenPresent && s.remoteOk && s.workflowPresent;
  let chg = s.changes.length;
  let card = (a, b) => {
    let on = a === true,
      c = a === false ? "danger" : "";
    return `<div><b class="${c}">${b}</b><small>${a === true ? "已就绪" : a === false ? "未就绪" : a}</small></div>`;
  };
  $("#main").innerHTML =
    page(
      "发布",
      "把 Hugo 源码推送到选定的 GitHub 仓库，触发仓库中的构建工作流。",
      `<button class="btn" id="pub-refresh">刷新状态</button>`,
    ) +
    `<div class="publish-setup"><section class="section"><span class="publish-step">01 / DESTINATION</span><h2>发布目标</h2><p class="muted">选择你有写入权限的 GitHub 仓库；仓库中还需配置适用的构建工作流。</p><label class="field"><span>GitHub 仓库地址</span><input id="pub-target" value="${esc(s.allowedRemote)}" placeholder="https://github.com/owner/repo.git" autocomplete="off" spellcheck="false"></label><p><button class="btn" id="pub-target-save" type="button">保存发布目标</button></p></section><section class="section"><span class="publish-step">02 / CREDENTIAL</span><h2>认证令牌</h2><p class="muted">只写入本机忽略的 .token 文件，不会回显、导出或提交到 Git。更换时输入新令牌即可。</p><label class="field"><span>GitHub Token · ${s.tokenPresent ? "已配置" : "未配置"}</span><input id="pub-token" type="password" autocomplete="new-password" spellcheck="false" placeholder="粘贴新的 token（留空表示不更改）"></label><p><button class="btn" id="pub-token-save" type="button">保存认证令牌</button></p></section></div><section class="section"><span class="publish-step">03 / READINESS</span><h2>部署前置检查</h2><div class="status">${card(ok, "整体就绪")}${card(s.remoteOk, "目标仓库 " + esc(s.allowedRemote))}${card(s.tokenPresent, "认证 token")}${card(s.systemProxyDetected ? "已接入" : "直连", "GitHub 网络")}${card(s.workflowPresent, "Actions Workflow")}${card("分支 " + esc(s.branch), "当前分支")}${card(chg + " 处变更", "工作区")}</div></section><section class="section"><h2>本次推送内容</h2><pre class="path">${esc(s.changes.map((x) => x.status.padEnd(3) + " " + x.path).join("\n") || "（工作区干净，无新增变更）")}</pre></section><section class="section"><span class="publish-step">04 / DEPLOY</span><h2>发布操作</h2><p class="muted">提交信息可选；留空使用默认信息。普通发布会先同步远程 main；强制替换只用于你明确要覆盖目标仓库时。</p><label class="field"><span>提交信息</span><input id="pub-msg" placeholder="e.g. chore: publish blog updates"></label><p><button class="btn primary" id="pub-go">发布</button> <button class="btn danger" id="pub-force">⚠ 首次上线（强制替换）</button></p><div class="publish-progress" id="pub-progress" role="status" aria-live="polite" aria-atomic="true" hidden><div class="publish-progress__head"><b id="pub-stage">正在准备发布</b><span id="pub-percent">0%</span></div><div class="publish-progress__track" id="pub-track" role="progressbar" aria-label="发布进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="publish-progress__bar" id="pub-bar"></i></div><p id="pub-detail">正在连接发布服务…</p></div><p class="muted">发布会自动沿用 Windows 系统代理，并推送到上方选定的仓库。</p></section>`;
  bindCommon();
  $("#pub-refresh").onclick = () => publish();
  $('#pub-target').closest('.section').querySelector('label.field').insertAdjacentHTML('afterend', `<label class="field"><span>目标分支</span><input id="pub-branch" value="${esc(s.allowedBranch || 'main')}" autocomplete="off" spellcheck="false" placeholder="main"></label>`);
  $('#pub-target-save').onclick = async () => {
    const remote = $('#pub-target').value.trim();
    const branch = $('#pub-branch').value.trim();
    if (!confirm(`将 LilyMap 发布目标改为 ${remote} 的 ${branch} 分支？`)) return;
    try { await api('/api/publish/target', { method: 'PUT', body: JSON.stringify({ remote, branch }) }); toast('发布目标已保存到本机。'); await publish(); }
    catch (error) { toast(error.message); }
  };
  $('#pub-token-save').onclick = async () => {
    const token = $('#pub-token').value.trim();
    if (!token) return toast('请先输入新的认证令牌。');
    if (!confirm('替换本机的 GitHub 认证令牌？旧令牌将被覆盖。')) return;
    try {
      await api('/api/publish/token', { method: 'PUT', body: JSON.stringify({ token }) });
      $('#pub-token').value = '';
      toast('认证令牌已保存到本机。');
      await publish();
    } catch (error) { $('#pub-token').value = ''; toast(error.message); }
  };
  const progressBox = $("#pub-progress");
  const setBusy = (busy) => {
    $("#pub-go").disabled = busy;
    $("#pub-force").disabled = busy;
    $("#pub-msg").disabled = busy;
    if (!busy) {
      $("#pub-force").dataset.armed = "";
      $("#pub-force").textContent = "⚠ 首次上线（强制替换）";
    }
  };
  const showProgress = (job) => {
    if (!job) return;
    const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
    progressBox.hidden = false;
    progressBox.classList.toggle("is-complete", job.status === "complete");
    progressBox.classList.toggle("is-failed", job.status === "failed");
    $("#pub-stage").textContent = job.stage || "正在发布";
    $("#pub-percent").textContent = `${Math.round(progress)}%`;
    $("#pub-track").setAttribute("aria-valuenow", String(Math.round(progress)));
    $("#pub-bar").style.transform = `scaleX(${progress / 100})`;
    $("#pub-detail").textContent = job.status === "failed"
      ? job.error || "发布未完成，请检查配置后重试。"
      : job.status === "complete"
        ? `${job.message || "源码已推送。"} GitHub Actions 已接手线上构建。`
        : job.force
          ? "首次上线模式：完成前请不要关闭 LilyMap。"
          : `正在安全提交并同步 ${s.allowedBranch || 'main'} 分支，请不要重复点击。`;
  };
  const track = async (id) => {
    const tracker = ++publishTracker;
    while (tracker === publishTracker && state.view === "publish") {
      try {
        const job = await api(`/api/publish/progress?id=${encodeURIComponent(id)}`, { silentProgress: true });
        showProgress(job);
        if (job.status !== "running") {
          setBusy(false);
          toast(job.status === "complete" ? "发布完成，GitHub Actions 正在构建。" : `发布失败：${job.error || "未知错误"}`);
          return;
        }
      } catch (error) {
        showProgress({ status: "failed", progress: Number($("#pub-track").getAttribute("aria-valuenow")), stage: "无法读取发布进度", error: error.message });
        setBusy(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  };
  async function run(force) {
    let msg = $("#pub-msg").value.trim();
    if (
      force &&
      !confirm(
        "这会把线上 main 强制替换为当前 Hugo 源码。\n确定要继续吗？",
      )
    )
      return;
    if (force && $("#pub-force").dataset.armed !== "1") {
      $("#pub-force").dataset.armed = "1";
      $("#pub-force").textContent = "再次点击确认强制替换";
      return;
    }
    setBusy(true);
    showProgress({ status: "running", progress: 1, stage: "正在连接发布服务", force });
    try {
      const job = await api("/api/publish", {
        method: "POST",
        body: JSON.stringify({ commit: msg, force }),
        silentProgress: true,
      });
      showProgress(job);
      track(job.id);
    } catch (error) {
      showProgress({ status: "failed", progress: 1, stage: "发布未能开始", error: error.message });
      setBusy(false);
      toast("发布失败：" + error.message);
    }
  }
  $("#pub-go").onclick = () => run(false);
  $("#pub-force").onclick = () => run(true);
  if (s.publishJob) {
    showProgress(s.publishJob);
    if (s.publishJob.status === "running") {
      setBusy(true);
      track(s.publishJob.id);
    }
  }
}
async function render() {
  nav();
  if (state.view === "overview") overview();
  else if (state.view === "articles") articles();
  else if (state.view === "drawers") await drawers();
  else if (state.view === "friends") await friends();
  else if (state.view === "profile") await profile();
  else if (state.view === "import") importPage();
  else if (state.view === "layouts") await layouts();
  else if (state.view === "modules") await modules();
  else if (state.view === "appearance") await appearance();
  else if (state.view === "resources") await resources();
  else if (state.view === "settings") await settings();
  else if (state.view === "publish") await publish();
  else version();
}
document.querySelectorAll("#nav button").forEach(
  (b) =>
    (b.onclick = () => {
      setView(b.dataset.view);
    }),
);
$("#file-picker").onchange = (e) => readFiles([...e.target.files]);
$("#folder-picker").onchange = (e) => readFiles([...e.target.files]);
refresh().catch((e) => {
  $("#main").innerHTML =
    '<div class="empty">无法连接 lilymap API：' +
    esc(e.message) +
    "</div>";
});
