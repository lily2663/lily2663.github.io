import { api } from '../core/api.js';
import { $, esc, toast } from '../core/dom.js';
import { state } from '../core/state.js';
import { icon } from '../core/icons.js';
import { renderMusicModule } from './music-module.js';
import { renderModuleInstaller } from './module-installer.js';

let configDirty = false;
let musicDirty = false;
let saving = false;
let revision = 0;
const names = { music: 'Lily Radio', weather: '天气', map: '地图', quote: '语录', profile: '个人资料卡', tags: '标签云', 'recent-posts': '文章列表', welcome: '欢迎页', toc: '文章目录', header: '页眉导航', footer: '页脚', comments: '评论', 'article-content': '文章正文', 'article-meta': '文章信息', 'not-found': '404 页面', 'taxonomy-terms': '分类与标签列表' };
const moduleIcons = { music: 'modules', weather: 'version', map: 'overview', quote: 'articles', profile: 'profile', tags: 'drawers', welcome: 'appearance', header: 'layouts', footer: 'layouts', comments: 'friends' };
const displayName = (module) => names[module.id] || module.name;

export function leaveModuleEditor() {
  if (saving) { toast('正在保存模块，请稍候。'); return false; }
  if ((configDirty || musicDirty) && !confirm('模块还有未保存的修改，确定离开并放弃吗？')) return false;
  configDirty = musicDirty = false;
  revision++;
  return true;
}
window.addEventListener('beforeunload', (event) => {
  if (configDirty || musicDirty || saving) { event.preventDefault(); event.returnValue = ''; }
});

export async function renderModules({ page, bindCommon, navigate }) {
  const currentRevision = ++revision;
  const moduleId = new URL(location.href).searchParams.get('module');
  const current = () => currentRevision === revision && state.view === 'modules';
  const open = (id = '') => {
    if (!leaveModuleEditor()) return;
    const url = new URL(location.href);
    id ? url.searchParams.set('module', id) : url.searchParams.delete('module');
    history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
    void renderModules({ page, bindCommon, navigate });
  };
  try {
    const data = await api('/api/modules');
    if (!current()) return;
    const module = data.modules.find((item) => item.id === moduleId);
    if (moduleId && !module) {
      $('#main').innerHTML = page('模块不存在', '这个模块可能已经卸载。', '<button class="btn" id="module-back">返回模块库</button>');
      $('#module-back').onclick = () => open(); bindCommon(); return;
    }
    if (module) {
      const layouts = await api('/api/layouts');
      if (!current()) return;
      renderDetail(module, layouts);
      return;
    }
    $('#main').innerHTML = page('模块库', '每个模块都是独立的积木。进入模块，配置内容、显示方式和使用位置。') +
      `<section class="module-catalog"><div class="module-catalog__toolbar"><div><strong>${data.modules.length} 个模块</strong><span>同级管理 · 按需组合</span></div><label><span class="sr-only">搜索模块</span><input id="module-search" type="search" placeholder="搜索名称、功能或模块 ID"></label></div><div class="module-catalog__filters" role="group" aria-label="按使用状态筛选"><button type="button" class="module-filter on" data-module-filter="all" aria-pressed="true">全部模块</button><button type="button" class="module-filter" data-module-filter="used" aria-pressed="false">已加入页面</button><button type="button" class="module-filter" data-module-filter="unused" aria-pressed="false">尚未使用</button><span id="module-result-count" role="status" aria-live="polite">显示 ${data.modules.length} 个模块</span></div><div class="asset-grid">${data.modules.map((item) => {
        const used = data.usage[item.id] || [];
        const fieldCount = Object.keys(item.schema || {}).length;
        return `<article class="asset-card module-card" data-module-used="${used.length > 0}" data-module-search="${esc(`${displayName(item)} ${item.name} ${item.id} ${item.description}`.toLowerCase())}"><div class="asset-meta"><header class="module-card__head"><span class="module-card__icon">${icon(moduleIcons[item.id] || 'modules')}</span><div><b>${esc(displayName(item))}</b><span class="path">${esc(item.name)} · v${esc(item.version)}</span></div></header><p class="module-card__description">${esc(item.description)}</p><div class="module-card__caps"><span>${fieldCount} 项参数</span><span>${used.length ? `${used.length} 处使用` : '尚未使用'}</span>${item.id === 'music' ? '<span>歌单管理</span>' : ''}</div><div class="asset-actions module-card__actions"><button class="btn primary" data-module-open="${esc(item.id)}" aria-label="配置${esc(displayName(item))}">配置模块 <span aria-hidden="true">↗</span></button>${item.source === 'site' ? `<button class="btn danger" data-module-remove="${esc(item.id)}" ${used.length ? 'disabled title="先从布局移除所有实例再卸载"' : ''}>卸载</button>` : ''}</div></div></article>`;
      }).join('')}</div><p class="empty" id="module-no-results" hidden>没有找到匹配模块，试试其他关键词。</p></section><div id="module-installer"></div>`;
    bindCommon();
    let activeFilter = 'all';
    const filterModules = () => {
      const query = $('#module-search').value.trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('[data-module-search]').forEach((card) => { card.hidden = !card.dataset.moduleSearch.includes(query) || (activeFilter !== 'all' && card.dataset.moduleUsed !== String(activeFilter === 'used')); if (!card.hidden) visible++; });
      $('#module-no-results').hidden = visible > 0;
      $('#module-result-count').textContent = `显示 ${visible} / ${data.modules.length} 个模块`;
    };
    $('#module-search').oninput = filterModules;
    document.querySelectorAll('[data-module-filter]').forEach((button) => button.onclick = () => {
      activeFilter = button.dataset.moduleFilter;
      document.querySelectorAll('[data-module-filter]').forEach((item) => {
        const active = item === button; item.classList.toggle('on', active); item.setAttribute('aria-pressed', String(active));
      });
      filterModules();
    });
    document.querySelectorAll('[data-module-open]').forEach((button) => button.onclick = () => open(button.dataset.moduleOpen));
    document.querySelectorAll('[data-module-remove]').forEach((button) => button.onclick = async () => {
      if (!confirm(`将 ${button.dataset.moduleRemove} 移入可恢复回收站？`)) return;
      try { await api(`/api/modules?id=${encodeURIComponent(button.dataset.moduleRemove)}`, { method: 'DELETE' }); if (current()) open(); }
      catch (error) { toast(error.message); }
    });
    renderModuleInstaller($('#module-installer'), () => { if (current()) open(); });
  } catch (error) {
    if (!current()) return;
    $('#main').innerHTML = page('模块库', '模块数据暂时无法加载。') + `<p class="empty">${esc(error.message)}</p><button class="btn" id="modules-retry">重试</button>`;
    bindCommon(); $('#modules-retry').onclick = () => open(moduleId);
  }

  function renderDetail(module, data) {
    let selected = 0;
    const placements = [];
    for (const layout of [...data.layouts].sort((a, b) => (a.name === 'home' ? -1 : b.name === 'home' ? 1 : a.name.localeCompare(b.name)))) {
      for (const [slot, blocks] of Object.entries(layout.parsed.slots)) {
        blocks.filter((block) => block.module === module.id).forEach((block) => placements.push({ layout: layout.name, label: layout.parsed.title || layout.name, slot, block }));
      }
    }
    const targets = data.layouts.flatMap((layout) => Object.keys(layout.parsed.slots).filter((slot) => module.allowedSlots.includes(`${layout.parsed.kind}.${slot}`)).map((slot) => ({ layout: layout.name, label: layout.parsed.title || layout.name, slot })));
    $('#main').innerHTML = page(displayName(module), module.description, '<button class="btn" id="module-back">← 模块库</button><button class="btn" id="module-preview">预览博客 ↗</button>') +
      `<section class="module-detail-intro"><span class="module-card__icon">${icon(moduleIcons[module.id] || 'modules')}</span><div><strong>${esc(module.name)}</strong><small>${esc(module.id)} · ${Object.keys(module.schema).length} 项参数 · ${placements.length} 处使用</small></div><span class="state-chip">${module.source === 'site' ? '本地模块' : '主题内置'}</span></section>${module.id === 'music' ? '<div class="module-tabs" role="tablist" aria-label="音乐模块设置"><button type="button" id="module-tab-settings" role="tab" aria-selected="true" aria-controls="module-settings" data-module-tab="settings">显示与位置</button><button type="button" id="module-tab-playlist" role="tab" aria-selected="false" aria-controls="module-playlist" tabindex="-1" data-module-tab="playlist">歌单与音源</button></div>' : ''}<div class="module-detail-grid" id="module-settings" ${module.id === 'music' ? 'role="tabpanel" aria-labelledby="module-tab-settings"' : ''}><aside class="module-placements"><h2>使用位置</h2><p>选择要修改的页面。同一模块在不同位置可以使用不同配置。</p><div id="module-placement-list"></div><button class="btn" id="module-add-placement" ${targets.length ? '' : 'disabled'}>＋ 添加到页面</button><p class="muted">保存前不会改动博客。已有布局会自动备份。</p></aside><section class="module-config-panel" id="module-config-panel"></section></div>${module.id === 'music' ? '<section class="module-specialized" id="module-playlist" role="tabpanel" aria-labelledby="module-tab-playlist" hidden><div class="studio-section-head"><h2>歌单与音源</h2><span class="muted">Lily Radio 专属功能</span></div><p class="muted">此处管理共享歌单快照；同步或启用会更新首页播放器。其他使用位置可在“显示与位置”中分别选择歌单 ID。</p><div id="module-music-tools"><p class="empty">正在读取歌单…</p></div></section>' : ''}`;
    bindCommon();
    $('#module-back').onclick = () => open();
    $('#module-preview').onclick = () => window.open(state.status?.blogUrl || 'http://localhost:1414/', '_blank', 'noopener');
    $('#module-add-placement').onclick = () => changePlacement(-1);
    paintPlacements();
    paintForm();
    if (module.id === 'music') {
      const tabs = [...document.querySelectorAll('[data-module-tab]')];
      const selectTab = (selectedTab) => {
        tabs.forEach((button) => {
          const active = button === selectedTab;
          button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
          document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
        });
      };
      tabs.forEach((button, index) => {
        button.onclick = () => selectTab(button);
        button.onkeydown = (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
          selectTab(next); next.focus();
        };
      });
      const root = $('#module-music-tools');
      void renderMusicModule(root, { onDirty: () => { musicDirty = true; }, onSaved: () => { musicDirty = false; } }).catch((error) => {
        if (root.isConnected) root.innerHTML = `<p class="empty">歌单加载失败：${esc(error.message)}。可返回模块库重新打开；上方参数仍可编辑。</p>`;
      });
    }

    function changePlacement(index) {
      if (saving) return toast('正在保存，请稍候。');
      if (configDirty && !confirm('当前参数尚未保存，放弃修改并切换位置？')) return;
      configDirty = false; selected = index; paintPlacements(); paintForm();
    }
    function paintPlacements() {
      $('#module-placement-list').innerHTML = placements.map((item, index) => `<button class="module-placement ${index === selected ? 'on' : ''}" data-placement="${index}" ${index === selected ? 'aria-current="true"' : ''}><b>${esc(item.label)}</b><span>${esc(item.layout)} / ${esc(item.slot)}</span><small>${item.block.enabled === false ? '已停用' : '已启用'} · ${esc(item.block.id)}</small></button>`).join('') || '<p class="empty">还没有使用位置。选择页面并保存，即可加入。</p>';
      document.querySelectorAll('[data-placement]').forEach((button) => button.onclick = () => changePlacement(Number(button.dataset.placement)));
    }
    function paintForm() {
      const placement = placements[selected];
      const inherited = data.layouts.find((entry) => entry.name === placement?.layout)?.parsed.moduleDefaults?.[module.id] || {};
      const values = { ...module.defaults, ...module.siteDefaults, ...inherited, ...placement?.block.config };
      const keys = Object.keys(module.schema);
      const shared = { profile: ['profile', '编辑共享资料', '名字、简介和社交链接来自个人资料；这里控制资料卡的显示方式。'], comments: ['settings', '评论服务设置', '评论 API 等站点级设置由博客设置统一管理。'], header: ['settings', '编辑导航菜单', '导航内容来自博客菜单设置。'], footer: ['settings', '编辑站点信息', '版权与备注内容来自博客设置。'] }[module.id];
      $('#module-config-panel').innerHTML = `<form id="module-config-form"><div class="module-config-heading"><div><h2>${placement ? '编辑模块参数' : '配置并添加模块'}</h2><p>${placement ? `${esc(placement.label)} · ${esc(placement.slot)}，只影响此位置。` : '先选一个可用位置，再调整内容和显示方式。'}</p></div><span class="state-chip" id="module-save-state" role="status">未修改</span></div>${!placement ? `<label class="field"><span>添加位置</span><select id="module-target" required>${targets.map((target, index) => `<option value="${index}">${esc(target.label)} · ${esc(target.layout)} / ${esc(target.slot)}</option>`).join('')}</select></label>` : ''}<label class="switch module-enabled"><span><b>在这个位置启用模块</b><small>停用后保留配置，博客不显示这个实例。</small></span><input id="module-enabled" type="checkbox" ${placement?.block.enabled !== false ? 'checked' : ''}></label><div class="module-config-fields">${keys.map((key) => field(key, values[key], module.schema[key])).join('') || '<p class="muted">此模块未声明专属参数，可以调整启用状态与使用位置。</p>'}</div>${shared ? `<div class="module-shared-source"><p>${shared[2]}</p><button class="btn" type="button" id="module-shared-source">${shared[1]} ↗</button></div>` : ''}<footer class="module-config-footer"><button class="btn primary" type="submit" ${!placement && !targets.length ? 'disabled' : ''}>${placement ? '保存此位置的配置' : '保存并添加到页面'}</button><button class="btn" type="button" id="module-defaults">填入默认值</button><small>保存后将触发本地博客重建。</small></footer></form>`;
      const form = $('#module-config-form');
      const changed = () => { configDirty = true; $('#module-save-state').textContent = '有未保存修改'; };
      form.addEventListener('input', changed); form.addEventListener('change', changed);
      $('#module-defaults').onclick = () => {
        form.querySelectorAll('[data-module-field]').forEach((input) => {
          const value = module.defaults[input.dataset.moduleField];
          if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value ?? '';
        });
        changed();
      };
      if (shared) $('#module-shared-source').onclick = () => navigate(shared[0]);
      form.onsubmit = async (event) => {
        event.preventDefault(); if (saving || !form.reportValidity()) return;
        const target = placement || targets[Number($('#module-target')?.value)];
        if (!target) return toast('请先选择可用的页面位置。');
        const config = {};
        form.querySelectorAll('[data-module-field]').forEach((input) => {
          const key = input.dataset.moduleField;
          config[key] = module.schema[key].type === 'boolean' ? input.checked : module.schema[key].type === 'number' ? Number(input.value) : input.value;
        });
        const enabled = $('#module-enabled').checked;
        saving = true;
        const controls = [...form.querySelectorAll('button,input,select,textarea')];
        controls.forEach((control) => { control.disabled = true; });
        $('#module-save-state').textContent = '正在保存…';
        try {
          const result = await api('/api/modules/config', { method: 'PUT', body: JSON.stringify({ module: module.id, layout: target.layout, slot: target.slot, instanceId: placement?.block.id, expected: placement?.block, config, enabled }) });
          configDirty = false;
          if (placement) placement.block = result.placement;
          else { placements.push({ ...target, block: result.placement }); selected = placements.length - 1; }
          state.lbrd = null;
          paintPlacements(); paintForm();
          $('#module-save-state').textContent = '已保存';
          toast('模块配置已保存，正在重建本地博客。');
        } catch (error) {
          $('#module-save-state').textContent = '保存失败，修改已保留'; toast(error.message);
          controls.forEach((control) => { control.disabled = false; });
        } finally { saving = false; }
      };
    }
  }
}

function field(key, value, definition) {
  const label = esc(definition.label || key);
  const help = definition.help ? `<small>${esc(definition.help)}</small>` : '';
  const attr = `data-module-field="${esc(key)}"`;
  if (definition.type === 'boolean') return `<label class="switch"><span><b>${label}</b>${help}</span><input ${attr} type="checkbox" ${value ? 'checked' : ''}></label>`;
  if (definition.type === 'select') return `<label class="field"><span>${label}</span><select ${attr}>${(definition.options || []).map((option) => `<option value="${esc(option.value)}" ${option.value === value ? 'selected' : ''}>${esc(option.label || option.value)}</option>`).join('')}</select>${help}</label>`;
  if (['text','description','subtitle','hint','pinned'].includes(key) || definition.type === 'textarea') return `<label class="field"><span>${label}</span><textarea ${attr} rows="3">${esc(value ?? '')}</textarea>${help}</label>`;
  const type = definition.type === 'number' ? 'number' : definition.type === 'color' ? 'color' : 'text';
  const limits = type === 'number' ? `required step="${esc(definition.step ?? 'any')}" ${Number.isFinite(definition.min) ? `min="${definition.min}"` : ''} ${Number.isFinite(definition.max) ? `max="${definition.max}"` : ''}` : '';
  return `<label class="field"><span>${label}</span><input ${attr} type="${type}" value="${esc(value ?? '')}" ${limits} ${definition.type === 'url' ? 'spellcheck="false" placeholder="https://… 或 /assets/…"' : ''}>${help}</label>`;
}
