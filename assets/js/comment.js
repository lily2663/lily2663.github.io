/* =========================================================
 * Comment System - 评论系统
 * API: https://api.lily2663.top
 * ========================================================= */
(function() {
  'use strict';

  var API_BASE = 'https://api.lily2663.top';
  var currentPageId = null;
  var pollTimer = null;
  var container = null; // 缓存评论容器引用

  // 评论组件 HTML
  var commentHTML = 
    '<div class="comment-section">' +
      '<h3 class="comment-title">评论 <span class="comment-count">(0)</span></h3>' +
      '<div class="comment-form">' +
        '<div class="comment-input-row">' +
          '<input type="text" class="comment-nick" placeholder="昵称 *" />' +
          '<input type="email" class="comment-mail" placeholder="邮箱 (选填)" />' +
        '</div>' +
        '<textarea class="comment-content" placeholder="写下你的评论..." rows="4"></textarea>' +
        '<button class="comment-submit">提交评论</button>' +
      '</div>' +
      '<div class="comment-list"></div>' +
    '</div>';

  // 邮箱格式校验
  function isValidEmail(email) {
    if (!email) return true; // 邮箱选填，空值合法
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // 尝试挂载评论区
  function tryMount() {
    if (!window.location.hash.match(/^#\/post\//)) {
      unmount();
      return false;
    }

    var article = document.querySelector('.article');
    if (!article) return false;

    var pageId = decodeURIComponent(window.location.hash.replace('#/post/', ''));

    if (currentPageId === pageId && document.getElementById('comment-container')) return true;

    unmount();
    currentPageId = pageId;

    container = document.createElement('div');
    container.id = 'comment-container';
    container.innerHTML = commentHTML;
    article.parentNode.appendChild(container);

    // 恢复已保存的用户信息
    var savedNick = localStorage.getItem('comment_nick');
    var savedMail = localStorage.getItem('comment_mail');
    if (savedNick) container.querySelector('.comment-nick').value = savedNick;
    if (savedMail) container.querySelector('.comment-mail').value = savedMail;

    loadComments(pageId);

    container.querySelector('.comment-submit').addEventListener('click', function() {
      submitComment(pageId);
    });

    return true;
  }

  // 移除评论区
  function unmount() {
    var old = document.getElementById('comment-container');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    currentPageId = null;
    container = null;
  }

  // 启动轮询：每 200ms 检查一次 .article 是否出现，最多等 10 秒
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    var attempts = 0;
    pollTimer = setInterval(function() {
      attempts++;
      if (tryMount() || attempts > 50) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 200);
  }

  // 加载评论（DOM 查询限定在 container 内）
  function loadComments(pageId) {
    if (!container) return;
    var listDiv = container.querySelector('.comment-list');
    var countSpan = container.querySelector('.comment-count');
    if (!listDiv) return;
    
    listDiv.innerHTML = '<div class="comment-empty">加载中...</div>';

    fetch(API_BASE + '/comments/' + encodeURIComponent(pageId))
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(comments) {
        if (!container) return; // 可能已被卸载
        if (countSpan) countSpan.textContent = '(' + comments.length + ')';
        
        if (comments.length === 0) {
          listDiv.innerHTML = '<div class="comment-empty">还没有评论，来抢沙发吧~</div>';
          return;
        }
        
        var html = '';
        comments.forEach(function(c) {
          var date = new Date(c.created_at).toLocaleString('zh-CN');
          html += 
            '<div class="comment-item">' +
              '<div class="comment-avatar">' + escapeHtml(c.nick.charAt(0).toUpperCase()) + '</div>' +
              '<div class="comment-body">' +
                '<div class="comment-header">' +
                  '<span class="comment-nick">' + escapeHtml(c.nick) + '</span>' +
                  '<span class="comment-date">' + date + '</span>' +
                '</div>' +
                '<div class="comment-text">' + escapeHtml(c.content) + '</div>' +
              '</div>' +
            '</div>';
        });
        listDiv.innerHTML = html;
      })
      .catch(function(err) {
        if (listDiv) listDiv.innerHTML = '<div class="comment-error">加载评论失败，请刷新重试</div>';
        console.error('Load comments error:', err);
      });
  }

  // 提交评论（DOM 查询限定在 container 内）
  function submitComment(pageId) {
    if (!container) return;
    var nickEl = container.querySelector('.comment-nick');
    var mailEl = container.querySelector('.comment-mail');
    var contentEl = container.querySelector('.comment-content');
    var btn = container.querySelector('.comment-submit');

    var nick = nickEl.value.trim();
    var mail = mailEl.value.trim();
    var content = contentEl.value.trim();
    
    if (!nick) { alert('请输入昵称'); return; }
    if (!content) { alert('请输入评论内容'); return; }
    if (!isValidEmail(mail)) { alert('邮箱格式不正确'); return; }
    
    btn.disabled = true;
    btn.textContent = '提交中...';
    
    fetch(API_BASE + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pageId, nick: nick, mail: mail, content: content })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data.id) {
        localStorage.setItem('comment_nick', nick);
        if (mail) localStorage.setItem('comment_mail', mail);
        contentEl.value = '';
        loadComments(pageId);
      } else {
        alert('提交失败: ' + (data.error || '未知错误'));
      }
    })
    .catch(function(err) {
      alert('提交失败，请稍后重试');
      console.error('Submit comment error:', err);
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = '提交评论';
    });
  }

  // HTML 转义
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 暴露全局钩子，让 app.js 渲染完文章后直接调用
  window.__commentMount = function() {
    setTimeout(tryMount, 50);
  };

  // 路由变化时重新启动轮询
  window.addEventListener('hashchange', function() {
    unmount();
    startPolling();
  });

  // 启动
  startPolling();
})();
