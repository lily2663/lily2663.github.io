(() => {
  const container = document.querySelector('#github-stats');
  if (!container) return;
  const username = 'lily2663';
  const articleCount = document.querySelectorAll('[data-post-grid] [data-search]').length || 18;
  container.innerHTML = `<h3>代码统计</h3><div class="stats-grid"><div class="stat-item"><div class="stat-value" data-stat="commits">-</div><div class="stat-label">今年提交</div></div><div class="stat-item"><div class="stat-value">${articleCount}</div><div class="stat-label">篇文章</div></div><div class="stat-item"><div class="stat-value" data-stat="repos">-</div><div class="stat-label">公开仓库</div></div><div class="stat-item"><div class="stat-value" data-stat="followers">-</div><div class="stat-label">关注者</div></div></div><div class="contribution-graph"><img src="https://ghchart.rshah.org/7FB5B0/${username}" alt="GitHub 贡献图" loading="lazy"></div><div class="top-languages"><h4>常用语言</h4><div class="lang-bars" data-languages><div class="stats-loading">加载中...</div></div></div>`;
  const stat = (name) => container.querySelector(`[data-stat="${name}"]`);
  fetch(`https://api.github.com/users/${username}`).then((response) => response.json()).then((data) => {
    if (Number.isFinite(data.public_repos)) stat('repos').textContent = data.public_repos;
    if (Number.isFinite(data.followers)) stat('followers').textContent = data.followers;
  }).catch(() => {});
  fetch(`https://api.github.com/users/${username}/events?per_page=100`).then((response) => response.json()).then((events) => {
    if (!Array.isArray(events)) return;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const commits = events.filter((event) => event.type === 'PushEvent' && event.created_at >= yearStart).reduce((total, event) => total + (event.payload?.commits?.length || 0), 0);
    stat('commits').textContent = commits ? `${commits}+` : '-';
  }).catch(() => {});
  fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`).then((response) => response.json()).then((repos) => {
    if (!Array.isArray(repos)) return;
    const sizes = new Map();
    for (const repo of repos) if (repo.language && repo.size) sizes.set(repo.language, (sizes.get(repo.language) || 0) + repo.size);
    const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
    const colors = { JavaScript:'#f1e05a', Python:'#3572A5', HTML:'#e34c26', CSS:'#563d7c', Java:'#b07219', PHP:'#4F5D95', C:'#555555', 'C++':'#f34b7d', 'C#':'#178600', Go:'#00ADD8', Ruby:'#701516', Rust:'#dea584', TypeScript:'#2b7489', Shell:'#89e051', Vue:'#41b883', Lua:'#000080' };
    const bars = [...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([language, size]) => { const percent = total ? (size / total * 100).toFixed(1) : '0.0'; const color = colors[language] || '#7FB5B0'; return `<div class="lang-bar"><div class="lang-bar-info"><span class="lang-dot" style="background:${color}"></span><span class="lang-name">${language}</span><span class="lang-pct">${percent}%</span></div><div class="lang-bar-track"><div class="lang-bar-fill" style="width:${percent}%;background:${color}"></div></div></div>`; }).join('');
    container.querySelector('[data-languages]').innerHTML = bars || '<div class="stats-loading">暂无数据</div>';
  }).catch(() => { container.querySelector('[data-languages]').innerHTML = '<div class="stats-loading">暂无数据</div>'; });
})();
