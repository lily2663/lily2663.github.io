/* =========================================================
 * lily'epitaph · 纯静态博客引擎
 * 依赖：marked.js（全局 marked）、highlight.js（全局 hljs）
 * 数据：window.BLOG（见 assets/data/articles.js）
 * ========================================================= */
(function () {
  "use strict";

  var BLOG = window.BLOG || { meta: {}, articles: [] };
  var app = document.getElementById("app");
  var searchInput = document.getElementById("search");
  var nav = document.getElementById("nav");
  var themeToggle = document.getElementById("theme-toggle");
  var readingBar = document.getElementById("reading-progress");
  var toTopBtn = document.getElementById("to-top");
  var isPostView = false;

  // 文章目录（TOC）滚动跟随
  var tocLinks = null;
  var tocHeadings = null;
  var tocActiveId = null;

  var searchQuery = "";
  var searchMode = "article"; // "article" 搜标题/标签/摘要  |  "text" 搜全文内容

  /* ---------- 滚动相关：进度条 + 返回顶部 ---------- */
  function onScroll() {
    var doc = document.documentElement;
    var top = doc.scrollTop || document.body.scrollTop;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? top / max : 0;
    if (readingBar) {
      readingBar.style.width = (pct * 100) + "%";
      readingBar.classList.toggle("show", isPostView && pct > 0.02);
    }
    if (toTopBtn) toTopBtn.classList.toggle("show", top > 400);

    // 目录跟随：高亮当前所在章节
    if (isPostView && tocHeadings && tocHeadings.length) {
      var offset = 120;
      var current = tocHeadings[0].id;
      for (var i = 0; i < tocHeadings.length; i++) {
        var r = tocHeadings[i].getBoundingClientRect();
        if (r.top - offset <= 0) current = tocHeadings[i].id;
        else break;
      }
      setActiveToc(current);
    }
  }

  function flashFade() {
    if (!app) return;
    app.classList.remove("fade");
    void app.offsetWidth; // 触发重排以重启动画
    app.classList.add("fade");
  }

  /* ---------- 工具函数 ---------- */
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(d) {
    if (!d) return "";
    var m = String(d).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return m[1] + "年" + parseInt(m[2], 10) + "月" + parseInt(m[3], 10) + "日";
    return d;
  }

  function tagChip(tag, extraClass) {
    var cls = "tag" + (extraClass ? " " + extraClass : "");
    return (
      '<a class="' + cls + '" href="#/tag/' +
      encodeURIComponent(tag) + '">' + escapeHtml(tag) + "</a>"
    );
  }

  function excerptFrom(md) {
    var text = md
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#>*_`~\-]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    return text.slice(0, 120);
  }

  /* ---------- 加密文章（AES-256-GCM 客户端解密） ---------- */
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // 用密码派生密钥并解密；返回明文 Markdown 字符串，密码错误返回 null
  function decryptArticle(art, password) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error("no-subtle"));
    var enc = new TextEncoder();
    var salt = b64ToBytes(art.salt);
    var iv = b64ToBytes(art.iv);
    var data = b64ToBytes(art.cipher);
    return crypto.subtle
      .importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (km) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
          km,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      })
      .then(function (buf) {
        var text = new TextDecoder().decode(buf);
        if (text.indexOf("SSE1::") !== 0) return null; // 验证头不符 => 密码错
        return text.slice(6);
      })
      .catch(function () { return null; }); // GCM 校验失败 => 密码错 / 环境不支持
  }

  /* ---------- 图片路径归一化 ----------
     博客用 hash 路由，文档基址恒为站点根。
     Typora 生成的相对路径常带 `./assets/img`、`../assets/img` 或 `posts/assets/img`，
     统一折算成站点根绝对路径 `/assets/img/...`，保证本地与 GitHub Pages 都能正确加载。
     外链(http/https)、data:/blob: 原样保留。 */
  function normalizeImgSrc(src) {
    if (!src) return src;
    if (/^https?:\/\//i.test(src) || /^\/\//.test(src) ||
        /^data:/i.test(src) || /^blob:/i.test(src)) return src;
    var m = src.match(/assets\/img\/.+$/i);
    return m ? "/" + m[0] : src;
  }

  /* ---------- Markdown 渲染 ---------- */
  function renderMarkdown(md) {
    marked.setOptions({ breaks: false, gfm: true });
    var html = marked.parse(md);
    html = html.replace(/<img\b([^>]*?)src="([^"]*)"([^>]*)>/gi,
      function (full, pre, src, post) {
        return "<img" + pre + 'src="' + normalizeImgSrc(src) + '"' + post + ">";
      }
    );
    return html;
  }

  function highlightWithin(root) {
    if (window.hljs) {
      root.querySelectorAll("pre code").forEach(function (block) {
        try { window.hljs.highlightElement(block); } catch (e) {}
      });
    }
  }

  // 给每个代码块加一键复制按钮
  function addCopyButtons(root) {
    root.querySelectorAll("pre").forEach(function (pre) {
      if (pre.querySelector(".code-copy")) return;
      var btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "复制";
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = code ? code.innerText : pre.innerText;
        var done = function () {
          btn.textContent = "已复制";
          btn.classList.add("done");
          setTimeout(function () { btn.textContent = "复制"; btn.classList.remove("done"); }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () { btn.textContent = "失败"; });
        } else {
          btn.textContent = "不支持";
        }
      });
      pre.appendChild(btn);
    });
  }

  /* ---------- 各视图 ---------- */
  // 头版文章块：头条(isLead) 与 分栏条目
  function postItemHtml(p, isLead) {
    var kicker = p.tags[0] || "笔记";
    var lock = p.encrypted ? '<span class="lock-chip">加密</span>' : "";
    if (isLead) {
      return '<article class="post-lead">' +
        '<a class="post-link" href="#/post/' + p.id + '">' +
        '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<h2 class="lead-title">' + escapeHtml(p.title) + lock + '</h2>' +
        '<div class="dateline">' + fmtDate(p.date) + '</div>' +
        '<p class="standfirst">' + escapeHtml(p.excerpt || excerptFrom(p.content)) + '</p>' +
        '<div class="pc-tags">' + p.tags.map(function (t) { return tagChip(t, "ghost"); }).join("") + '</div>' +
        '</a></article>';
    }
    return '<article class="post-item">' +
      '<a class="post-link" href="#/post/' + p.id + '">' +
      '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
      '<h3 class="item-title">' + escapeHtml(p.title) + lock + '</h3>' +
      '<div class="dateline">' + fmtDate(p.date) + '</div>' +
      '<p class="item-excerpt">' + escapeHtml(p.excerpt || excerptFrom(p.content)) + '</p>' +
      '</a></article>';
  }

  // 按当前模式匹配：article = 标题/标签/摘要；text = 全文内容
  function matchesSearch(p, q) {
    if (searchMode === "text") {
      return (p.content || "").toLowerCase().indexOf(q) !== -1;
    }
    return (
      p.title.toLowerCase().indexOf(q) !== -1 ||
      (p.excerpt || "").toLowerCase().indexOf(q) !== -1 ||
      p.tags.join(" ").toLowerCase().indexOf(q) !== -1
    );
  }

  function viewHome() {
    var list = BLOG.articles.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      list = list.filter(function (p) { return matchesSearch(p, q); });
    }

    var html = "";
    if (!list.length) {
      html += '<div class="empty">没有找到匹配的文章。</div>';
    } else {
      html += postItemHtml(list[0], true);
      if (list.length > 1) {
        html += '<h2 class="section-title">更多报道' +
          '<span class="count">' + list.length + " 篇</span></h2>";
        html += '<div class="front-grid">';
        for (var i = 1; i < list.length; i++) {
          html += postItemHtml(list[i], false);
        }
        html += "</div>";
      }
    }
    app.innerHTML = html;
  }

  /* ---------- 文章目录（TOC） ---------- */
  function slugify(text, i) {
    var s = text.trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5\-]/g, "");
    if (!s) s = "sec";
    return s + "-" + i;
  }

  // 扫描 .article 内 h1~h6，分配锚点 id，并生成目录 HTML
  function buildToc(articleEl) {
    var heads = articleEl.querySelectorAll("h1,h2,h3,h4,h5,h6");
    if (!heads.length) return null;
    var used = {};
    var items = [];
    Array.prototype.forEach.call(heads, function (h, i) {
      var text = h.textContent.trim();
      if (!text) return;
      var id = slugify(text, i);
      while (used[id]) id += "-";
      used[id] = true;
      h.id = id;
      var lvl = parseInt(h.tagName.charAt(1), 10) || 1;
      items.push({ id: id, text: text, lvl: lvl });
    });
    if (!items.length) return null;
    var html = '<div class="toc-title">目录 · Contents</div><ul class="toc-list">';
    items.forEach(function (it) {
      html += '<li class="toc-item" style="--lvl:' + it.lvl + '">' +
        '<a class="toc-link" href="#' + it.id + '" data-target="' + it.id + '">' +
        escapeHtml(it.text) + "</a></li>";
    });
    html += "</ul>";
    return { html: html, items: items };
  }

  function setActiveToc(id) {
    if (!tocLinks || id === tocActiveId) return;
    tocActiveId = id;
    Array.prototype.forEach.call(tocLinks, function (a) {
      a.classList.toggle("active", a.getAttribute("data-target") === id);
    });
  }

  function setupToc(items) {
    var wrap = document.getElementById("toc-wrap");
    var nav = document.getElementById("toc");
    var toggle = document.getElementById("toc-toggle");
    tocLinks = nav ? nav.querySelectorAll(".toc-link") : [];
    tocHeadings = items.map(function (it) { return document.getElementById(it.id); })
      .filter(function (el) { return !!el; });

    if (tocLinks) {
      Array.prototype.forEach.call(tocLinks, function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var id = a.getAttribute("data-target");
          var el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          if (wrap) wrap.classList.remove("open");
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
            var c = toggle.querySelector(".toc-caret");
            if (c) c.textContent = "＋";
          }
          setActiveToc(id);
        });
      });
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = wrap.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        var c = toggle.querySelector(".toc-caret");
        if (c) c.textContent = open ? "－" : "＋";
      });
    }
    tocActiveId = null;
    setActiveToc(tocHeadings && tocHeadings.length ? tocHeadings[0].id : null);
  }

  function renderArticle(post, md) {
    // 先在临时容器里渲染并抽取标题锚点
    var articleHtml = renderMarkdown(md);
    var tmp = document.createElement("div");
    tmp.innerHTML = articleHtml;
    var toc = buildToc(tmp);
    articleHtml = tmp.innerHTML;

    var tocHtml = toc
      ? '<aside class="toc-wrap" id="toc-wrap">' +
          '<button class="toc-toggle" id="toc-toggle" type="button" aria-expanded="false" aria-controls="toc">' +
            '目录 <span class="toc-caret">＋</span></button>' +
          '<nav class="toc" id="toc" aria-label="文章目录">' + toc.html + "</nav>" +
        "</aside>"
      : "";

    var html =
      '<a class="back-link" href="#/">← 返回文章列表</a>' +
      '<header class="post-header">' +
      '<div class="dateline">' + fmtDate(post.date) +
      (post.encrypted ? ' <span class="lock-chip">已解锁</span>' : "") + '</div>' +
      "<h1>" + escapeHtml(post.title) + "</h1>" +
      '<div class="pc-tags">' + post.tags.map(function (t) { return tagChip(t); }).join("") + "</div>" +
      "</header>" +
      '<div class="post-layout">' +
      '<div class="post-main">' +
      '<article class="article">' + articleHtml + "</article>" +
      '<div class="tag-bar">' +
      post.tags.map(function (t) { return tagChip(t); }).join("") +
      "</div>" +
      "</div>" +
      tocHtml +
      "</div>";
    app.innerHTML = html;
    highlightWithin(app);
    addCopyButtons(app);
    if (toc) setupToc(toc.items);
    window.scrollTo(0, 0);
  }

  function renderLock(post) {
    // 已在本会话解锁过则直接渲染（sessionStorage 缓存）
    var cached = null;
    try { cached = sessionStorage.getItem("unlocked:" + post.id); } catch (e) {}
    if (cached) { renderArticle(post, cached); return; }

    var html =
      '<a class="back-link" href="#/">← 返回文章列表</a>' +
      '<header class="post-header">' +
      '<div class="dateline">' + fmtDate(post.date) + ' <span class="lock-chip">加密文章</span></div>' +
      "<h1>" + escapeHtml(post.title) + "</h1>" +
      '<div class="pc-tags">' + post.tags.map(function (t) { return tagChip(t); }).join("") + "</div>" +
      "</header>" +
      '<div class="lock-box">' +
      '<div class="lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></div>' +
      "<p>这是一篇加密文章，请输入密码查看。</p>" +
      '<div class="lock-form">' +
      '<input id="lock-input" type="password" placeholder="请输入密码" autocomplete="off" />' +
      '<button id="lock-btn" class="btn">解锁</button>' +
      "</div>" +
      '<div id="lock-err" class="lock-err"></div>' +
      "</div>";
    app.innerHTML = html;
    window.scrollTo(0, 0);

    var input = document.getElementById("lock-input");
    var btn = document.getElementById("lock-btn");
    var err = document.getElementById("lock-err");
    if (input) input.focus();

    function tryUnlock() {
      var pw = input.value;
      if (!pw) { err.textContent = "请输入密码"; return; }
      err.textContent = "解密中…";
      decryptArticle(post, pw).then(function (md) {
        if (md == null) { err.textContent = "密码错误，请重试"; return; }
        try { sessionStorage.setItem("unlocked:" + post.id, md); } catch (e) {}
        renderArticle(post, md);
      }).catch(function () {
        err.textContent = "当前环境不支持解密（请通过 http/https 或 localhost 访问加密文章）。";
      });
    }
    if (btn) btn.addEventListener("click", tryUnlock);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); });
  }

  function viewPost(id) {
    var post = BLOG.articles.filter(function (p) { return p.id === id; })[0];
    if (!post) {
      app.innerHTML = '<div class="empty">文章不存在。<a href="#/">返回首页</a></div>';
      return;
    }
    if (post.encrypted) { renderLock(post); return; }
    renderArticle(post, post.content);
  }

  function viewTag(tag) {
    var list = BLOG.articles.filter(function (p) {
      return p.tags.indexOf(tag) !== -1;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    var html =
      '<a class="back-link" href="#/tags">← 全部标签</a>' +
      '<h2 class="section-title">标签：' + escapeHtml(tag) +
      '<span class="count">' + list.length + " 篇</span></h2>";

    if (!list.length) {
      html += '<div class="empty">该标签下暂无文章。</div>';
    } else {
      html += '<div class="front-grid">';
      list.forEach(function (p) {
        html += postItemHtml(p, false);
      });
      html += "</div>";
    }
    app.innerHTML = html;
  }

  function viewTags() {
    var counts = {};
    BLOG.articles.forEach(function (p) {
      p.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    var tags = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    });

    var html =
      '<h2 class="section-title">标签云</h2>' +
      '<div class="tag-cloud">';
    if (!tags.length) {
      html += '<div class="empty">暂无标签。</div>';
    } else {
      tags.forEach(function (t) {
        html +=
          '<a class="tag" href="#/tag/' + encodeURIComponent(t) + '">' +
          escapeHtml(t) + '<span class="tcount">' + counts[t] + "</span></a>";
      });
    }
    html += "</div>";
    app.innerHTML = html;
  }

  function viewAbout() {
    var meta = BLOG.meta || {};
    var html = '<section class="about">';
    if (meta.avatar) {
      html += '<img class="avatar-img" src="' + escapeHtml(meta.avatar) + '" alt="' + escapeHtml(meta.author || "头像") + '" />';
    } else {
      html += '<div class="avatar">' + escapeHtml(meta.avatarText || "·") + "</div>";
    }
    html += "<h1>关于本站</h1>";
    (meta.about || []).forEach(function (line) {
      html += "<p>" + escapeHtml(line) + "</p>";
    });
    if (meta.links && meta.links.length) {
      html += '<p style="margin-top:18px">';
      html += meta.links.map(function (l) {
        return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + "</a>";
      }).join(" · ");
      html += "</p>";
    }
    html += "</section>";
    app.innerHTML = html;
  }

  /* ---------- 友链 ---------- */
  function viewLinks() {
    var meta = BLOG.meta || {};
    var friends = meta.friends || [];
    var html = '<section class="links"><h1 class="section-title">友链</h1>';
    if (!friends.length) {
      html += '<p class="muted">暂无友链。</p>';
    } else {
      html += '<div class="friend-grid">';
      friends.forEach(function (f) {
        html += '<a class="friend-card" href="' + escapeHtml(f.url) + '" target="_blank" rel="noopener">';
        if (f.avatar) {
          html += '<img class="friend-avatar" src="' + escapeHtml(f.avatar) + '" alt="' + escapeHtml(f.name) + '" loading="lazy" />';
        } else {
          html += '<div class="friend-avatar friend-avatar--text">' + escapeHtml((f.name || "?").charAt(0)) + "</div>";
        }
        html += '<div class="friend-meta">';
        html += '<div class="friend-name">' + escapeHtml(f.name) + "</div>";
        html += '<div class="friend-desc">' + escapeHtml(f.desc || "") + "</div>";
        html += "</div></a>";
      });
      html += "</div>";
    }
    html += "</section>";
    app.innerHTML = html;
  }

  /* ---------- 路由 ---------- */
  function router() {
    var hash = location.hash || "#/";
    var path = hash.replace(/^#\/?/, ""); // 去掉 "#/" 前缀
    var parts = path.split("/").filter(Boolean);

    var route = parts[0] || "home";
    setActiveNav(route);
    isPostView = false;
    tocHeadings = null;
    tocLinks = null;
    tocActiveId = null;

    if (route === "post" && parts[1]) {
      isPostView = true;
      viewPost(decodeURIComponent(parts[1]));
    } else if (route === "tag" && parts[1]) {
      viewTag(decodeURIComponent(parts[1]));
    } else if (route === "tags") {
      viewTags();
    } else if (route === "about") {
      viewAbout();
    } else if (route === "links") {
      viewLinks();
    } else {
      viewHome();
    }
    flashFade();
    onScroll();
  }

  function setActiveNav(route) {
    if (!nav) return;
    nav.querySelectorAll("a").forEach(function (a) {
      var r = a.getAttribute("data-route");
      var match = (r === route) ||
        (r === "tags" && route === "tag") ||
        (r === "home" && (route === "home" || route === "post"));
      a.classList.toggle("active", match);
    });
  }

  /* ---------- 主题切换 ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggle) themeToggle.textContent = theme === "dark" ? "亮" : "暗";
    var hljsLink = document.getElementById("hljs-theme");
    if (hljsLink) {
      hljsLink.href = theme === "dark"
        ? "assets/vendor/highlight.github-dark.min.css"
        : "assets/vendor/highlight.github.min.css";
    }
    try { localStorage.setItem("blog-theme", theme); } catch (e) {}
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("blog-theme"); } catch (e) {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme");
        applyTheme(cur === "dark" ? "light" : "dark");
      });
    }
  }

  /* ---------- 搜索（文章 / 文字 两种模式） ---------- */
  function initSearch() {
    if (!searchInput) return;
    var modeBtns = document.querySelectorAll(".search-mode-btn");

    function setMode(mode) {
      searchMode = mode;
      Array.prototype.forEach.call(modeBtns, function (b) {
        var on = b.getAttribute("data-mode") === mode;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      searchInput.placeholder = mode === "text" ? "搜索全文内容…" : "搜索文章标题/标签…";
      searchInput.setAttribute("aria-label", mode === "text" ? "搜索全文" : "搜索文章");
      if (searchQuery) viewHome(); // 切换模式时若已有输入，立即按新模式重筛
    }

    Array.prototype.forEach.call(modeBtns, function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
    });

    searchInput.addEventListener("input", function (e) {
      searchQuery = e.target.value.trim();
      if ((location.hash || "#/").replace(/^#\/?/, "").split("/")[0] !== "post") {
        // 在首页/标签/关于等视图下，搜索即回到首页并筛选
        if (location.hash.indexOf("#/tag/") === 0) {
          location.hash = "#/";
        } else {
          viewHome();
        }
      }
    });
  }

  /* ---------- 实时读取 .md（部署/本地服务器时） ---------- */
  function stripFrontMatter(txt) {
    txt = txt.replace(/^\uFEFF/, "");
    var m = txt.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?([\s\S]*)$/);
    return m ? m[1] : txt;
  }

  // 在 http(s) 下，直接 fetch 每个 .md 覆盖正文（改 md 刷新即见，无需重跑生成器）；
  // file:// 下跳过（CORS 限制），沿用 generate.js 生成的数据。
  function maybeLoadLive() {
    if (location.protocol === "file:" || !window.fetch) return Promise.resolve();
    var jobs = (BLOG.articles || []).map(function (p) {
      if (!p.file || p.encrypted) return Promise.resolve(); // 加密文章用密文，不拉明文 .md
      return fetch(p.file)
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (txt) { if (txt) p.content = stripFrontMatter(txt); })
        .catch(function () {});
    });
    return Promise.all(jobs);
  }

  /* ---------- 启动 ---------- */
  function init() {
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    // 报纸刊头：站点名 / 副标题 / 日期线
    var meta = BLOG.meta || {};
    var mt = document.getElementById("masthead-title");
    if (mt) mt.textContent = meta.title || "lily'epitaph";
    var ms = document.getElementById("masthead-sub");
    if (ms) ms.textContent = meta.subtitle || "";
    var mdEl = document.getElementById("masthead-date");
    if (mdEl) {
      var now = new Date();
      mdEl.textContent = now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日";
    }
    initTheme();
    initSearch();
    window.addEventListener("hashchange", router);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (toTopBtn) {
      toTopBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    maybeLoadLive().then(router).catch(router);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
