/* =========================================================
 * Comment System - 评论系统
 * API: http://47.109.70.144:2333
 * ========================================================= */
(function() {
  'use strict';

  var API_BASE = 'http://47.109.70.144:2333';

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

  // 当前已挂载的 pageId，避免重复挂载
  var currentPageId = null;

  // 尝试挂载评论区（可能 .article 还没渲染出来）
  function tryMount() {
    // 只在文章详情页显示评论
    if (!window.location.hash.match(/^#\/post\//)) {
      unmount();
      return;
    }

    var article = document.querySelector('.article');
    if (!article) return; // 还没渲染，等下次

    var pageId = window.location.hash.replace('#/post/', '');

    // 同一篇文章且已挂载 → 跳过
    if (currentPageId === pageId && document.getElementById('comment-container')) return;

    unmount();
    currentPageId = pageId;

    // 插入评论组件
    var commentDiv = document.createElement('div');
    commentDiv.id = 'comment-container';
    commentDiv.innerHTML = commentHTML;
    article.parentNode.appendChild(commentDiv);

    // 从 localStorage 恢复昵称和邮箱
    var savedNick = localStorage.getItem('comment_nick');
    var savedMail = localStorage.getItem('comment_mail');
    if (savedNick) commentDiv.querySelector('.comment-nick').value = savedNick;
    if (savedMail) commentDiv.querySelector('.comment-mail').value = savedMail;

    // 加载评论
    loadComments(pageId);

    // 绑定提交事件
    var submitBtn = commentDiv.querySelector('.comment-submit');
    submitBtn.addEventListener('click', function() {
      submitComment(pageId);
    });
  }

  // 移除评论区
  function unmount() {
    var old = document.getElementById('comment-container');
    if (old) old.parentNode.removeChild(old);
    currentPageId = null;
  }

  // 初始化：用 MutationObserver 等待 .article 出现
  function initComments() {
    tryMount();

    // 监听 DOM 变化（app.js 异步渲染后 .article 会出现）
    var observer = new MutationObserver(function() {
      tryMount();
    });
    observer.observe(document.getElementById('app') || document.body, {
      childList: true, subtree: true
    });

    // 监听路由变化
    window.addEventListener('hashchange', function() {
      setTimeout(tryMount, 150);
    });
  }

  // 加载评论
  function loadComments(pageId) {
    var listDiv = document.querySelector('.comment-list');
    var countSpan = document.querySelector('.comment-count');
    
    fetch(API_BASE + '/comments/' + encodeURIComponent(pageId))
      .then(function(res) { return res.json(); })
      .then(function(comments) {
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
        listDiv.innerHTML = '<div class="comment-error">加载评论失败</div>';
        console.error('Load comments error:', err);
      });
  }

  // 提交评论
  function submitComment(pageId) {
    var nick = document.querySelector('.comment-nick').value.trim();
    var mail = document.querySelector('.comment-mail').value.trim();
    var content = document.querySelector('.comment-content').value.trim();
    
    if (!nick) {
      alert('请输入昵称');
      return;
    }
    if (!content) {
      alert('请输入评论内容');
      return;
    }
    
    var submitBtn = document.querySelector('.comment-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    fetch(API_BASE + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: pageId,
        nick: nick,
        mail: mail,
        content: content
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.id) {
        // 记住昵称和邮箱，下次自动填入
        localStorage.setItem('comment_nick', nick);
        if (mail) localStorage.setItem('comment_mail', mail);
        // 只清空内容
        document.querySelector('.comment-content').value = '';
        // 重新加载评论
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
      submitBtn.disabled = false;
      submitBtn.textContent = '提交评论';
    });
  }

  // HTML 转义
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComments);
  } else {
    initComments();
  }
})();
