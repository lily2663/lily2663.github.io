import { $ } from './dom.js';

const activeOperations = new Map();
let operationSequence = 0;
let operationShowTimer = 0;
let operationHideTimer = 0;

function operationLabel(url, method = 'GET') {
  if (url.includes('/music/netease/import')) return '正在同步网易云歌单';
  if (url.includes('/music/netease/status')) return '正在检查歌单快照';
  if (url.includes('/media/')) return '正在处理媒体文件';
  if (url.includes('/upload')) return '正在上传文件';
  if (url.includes('/publish')) return '正在检查发布状态';
  if (method !== 'GET') return '正在保存更改';
  if (url.includes('/layouts')) return '正在加载页面布局';
  if (url.includes('/modules')) return '正在加载模块库';
  if (url.includes('/files')) return '正在扫描资源文件';
  return '正在加载数据';
}

function syncOperationProgress() {
  const box = $('#operation-progress');
  if (!activeOperations.size) return;
  box.hidden = false;
  box.classList.remove('is-complete');
  $('#operation-label').textContent = [...activeOperations.values()].at(-1);
  $('#operation-count').textContent = activeOperations.size > 1 ? `${activeOperations.size} 项任务` : '进行中';
}

function beginOperation(label) {
  const id = ++operationSequence;
  clearTimeout(operationHideTimer);
  activeOperations.set(id, label);
  clearTimeout(operationShowTimer);
  operationShowTimer = setTimeout(syncOperationProgress, 120);
  return id;
}

function endOperation(id) {
  if (id == null) return;
  activeOperations.delete(id);
  if (activeOperations.size) { syncOperationProgress(); return; }
  clearTimeout(operationShowTimer);
  const box = $('#operation-progress');
  if (box.hidden) return;
  box.classList.add('is-complete');
  $('#operation-count').textContent = '已完成';
  operationHideTimer = setTimeout(() => { if (!activeOperations.size) box.hidden = true; }, 500);
}

export function updateOperation(id, label) {
  if (activeOperations.has(id)) {
    activeOperations.set(id, label);
    syncOperationProgress();
  }
}

export async function trackedFetch(url, options = {}, label) {
  const operation = beginOperation(label || operationLabel(url, options.method || 'GET'));
  try { return await fetch(url, options); }
  finally { endOperation(operation); }
}

export async function api(url, options = {}) {
  const { progressLabel, silentProgress, ...requestOptions } = options;
  const operation = silentProgress ? null : beginOperation(progressLabel || operationLabel(url, options.method || 'GET'));
  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || '请求失败');
    return data;
  } finally {
    endOperation(operation);
  }
}
