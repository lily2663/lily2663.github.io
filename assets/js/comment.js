/* =========================================================
 * Comment System - 评论系统
 * API: http://47.109.70.144:2333
 * ========================================================= */
(function() {
  'use strict';

  var API_BASE = 'https://api.lily2663.top';
  var currentPageId = null;
  var pollTimer = null;

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

  // 尝试挂载评论区
  function tryMount() {
    if (!window.location.hash.match(/^#\/post\//)) {
      unmount();
      return;
    }

    var article = document.querySelector('.article');
    if (!article) return false;

    var pageId = decodeURIComponent(window.location.hash.replace('#/post/', ''));

    if (currentPageId === pageId && document.getElementById('comment-container')) return true;

    unmount();
    currentPageId = pageId;

    var commentDiv = document.createElement('div');
    commentDiv.id = 'comment-container';
    commentDiv.innerHTML = commentHTML;
    article.parentNode.appendChild(commentDiv);

    var savedNick = localStorage.getItem('comment_nick');
    var savedMail = localStorage.getItem('comment_mail');
    if (savedNick) commentDiv.querySelector('.comment-nick').value = savedNick;
    if (savedMail) commentDiv.querySelector('.comment-mail').value = savedMail;

    loadComments(pageId);

    commentDiv.querySelector('.comment-submit').addEventListener('click', function() {
      submitComment(pageId);
    });

    return true;
  }

  // 移除评论区
  function unmount() {
    var old = document.getElementById('comment-container');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    currentPageId = null;
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

  // 加载评论
  function loadComments(pageId) {
    var listDiv = document.querySelector('.comment-list');
    var countSpan = document.querySelector('.comment-count');
    if (!listDiv) return;
    
    fetch(API_BASE + '/comments/' + encodeURIComponent(pageId))
      .then(function(res) { return res.json(); })
      .then(function(comments) {
        if (!countSpan) return;
        countSpan.textContent = '(' + comments.length + ')';
        
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
        if (listDiv) listDiv.innerHTML = '<div class="comment-error">加载评论失败</div>';
        console.error('Load comments error:', err);
      });
  }

  // 提交评论
  function submitComment(pageId) {
    var nick = document.querySelector('.comment-nick').value.trim();
    var mail = document.querySelector('.comment-mail').value.trim();
    var content = document.querySelector('.comment-content').value.trim();
    
    if (!nick) { alert('请输入昵称'); return; }
    if (!content) { alert('请输入评论内容'); return; }
    
    var btn = document.querySelector('.comment-submit');
    btn.disabled = true;
    btn.textContent = '提交中...';
    
    fetch(API_BASE + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pageId, nick: nick, mail: mail, content: content })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.id) {
        localStorage.setItem('comment_nick', nick);
        if (mail) localStorage.setItem('comment_mail', mail);
        document.querySelector('.comment-content').value = '';
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
