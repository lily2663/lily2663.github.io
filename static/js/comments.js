(() => {
  const host = document.querySelector('#comment-container');
  if (!host) return;
  const api = 'https://api.lily2663.top';
  const page = host.dataset.commentId;
  host.innerHTML = '<section class="comment-section"><h2>评论 <span class="comment-count">(0)</span></h2><div class="comment-form"><label>昵称 <input class="comment-nick" required></label><label>邮箱（选填）<input class="comment-mail" type="email"></label><label>评论 <textarea class="comment-content" rows="4" required></textarea></label><button class="comment-submit" type="button">提交评论</button><p class="comment-status" aria-live="polite"></p></div><div class="comment-list"></div></section>';
  const $ = (selector) => host.querySelector(selector);
  const escape = (value) => { const e = document.createElement('div'); e.textContent = value; return e.innerHTML; };
  function render(items) {
    $('.comment-count').textContent = `(${items.length})`;
    $('.comment-list').innerHTML = items.length ? items.map((item) => `<article class="comment-item"><span class="comment-avatar">${escape(item.nick[0]?.toUpperCase() || '?')}</span><div><strong>${escape(item.nick)}</strong><time>${new Date(item.created_at).toLocaleString('zh-CN')}</time><p>${escape(item.content)}</p></div></article>`).join('') : '<p class="comment-empty">还没有评论，来抢沙发吧～</p>';
  }
  async function load() { try { render(await (await fetch(`${api}/comments/${encodeURIComponent(page)}`)).json()); } catch { $('.comment-list').innerHTML = '<p class="comment-error">评论暂时不可用，不影响文章阅读。</p>'; } }
  $('.comment-submit').addEventListener('click', async () => {
    const nick = $('.comment-nick').value.trim(), mail = $('.comment-mail').value.trim(), content = $('.comment-content').value.trim();
    if (!nick || !content) { $('.comment-status').textContent = '请填写昵称和评论。'; return; }
    const button = $('.comment-submit'); button.disabled = true; button.textContent = '提交中…';
    try { const result = await fetch(`${api}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, nick, mail, content }) }); if (!result.ok) throw new Error(); localStorage.setItem('comment_nick', nick); $('.comment-content').value = ''; $('.comment-status').textContent = '评论已提交。'; await load(); } catch { $('.comment-status').textContent = '提交失败，请稍后再试。'; } finally { button.disabled = false; button.textContent = '提交评论'; }
  });
  $('.comment-nick').value = localStorage.getItem('comment_nick') || '';
  load();
})();
