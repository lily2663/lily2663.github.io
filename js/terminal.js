/**
 * lily's house — Fullscreen Pseudo-Terminal
 * Inspired by 0ops.sjtu.cn
 */
(function() {
  var T = {
    posts: [],
    cwd: '/home/lilyzero',
    history: [],
    histIdx: -1,
    container: null,
    output: null,
    input: null,

    // Virtual filesystem: path -> content
    vfs: {
      '/galf': 'NSSCTF{6b130663a215e405ca4fa7fd5bf441e5}'
    },

    init: function(postsData) {
      this.posts = postsData || [];
      this.container = document.getElementById('term-container');
      this.output = document.getElementById('term-output');
      if (!this.container || !this.output) return;

      this.input = document.createElement('input');
      this.input.type = 'text';
      this.input.id = 'term-input';
      this.input.spellcheck = false;
      this.input.autocomplete = 'off';
      this.input.addEventListener('keydown', this.onKey.bind(this));
      this.container.addEventListener('click', function() { T.input.focus(); });

      this.welcome();
      this.newPrompt();
      this.input.focus();
    },

    // === Output helpers ===

    write: function(html) {
      var div = document.createElement('div');
      div.className = 'term-line';
      div.innerHTML = html;
      this.output.appendChild(div);
    },

    esc: function(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    scroll: function() {
      var self = this;
      setTimeout(function() {
        self.container.scrollTop = self.container.scrollHeight;
      }, 20);
    },

    // === Welcome ===

    welcome: function() {
      var banner = [
        '<span class="term-green">',
        '    __    _ __ __        ______ ______ ____   ____  ',
        '   / /   (_) / /_  __   /_  __// ____// __ \\ / __ \\ ',
        '  / /   / / / / / / /    / /  / __/  / /_/ // /_/ / ',
        ' / /___/ / / / /_/ /    / /  / /___ / _, _// ____/  ',
        '/_____/_/ /_/__, /    /_/  /_____//_/ |_|/_/       ',
        '           /____/                                   ',
        '',
        '╔══════════════════════════════════════════════════════╗',
        '║  <span class="term-cmd">lilyzero\'s house</span> — CTF WriteUps & Security Notes ║',
        '║  Type <span class="term-cmd">help</span> to see available commands.           ║',
        '╚══════════════════════════════════════════════════════╝',
        '</span>'
      ].join('\n');
      this.write(banner);
      this.write('');
    },

    // === Prompt ===

    fmtDir: function() {
      if (this.cwd === '/home/lilyzero') return '~';
      if (this.cwd === '/') return '/';
      return this.cwd.replace('/home/lilyzero', '~');
    },

    newPrompt: function() {
      var line = document.createElement('div');
      line.className = 'term-line term-prompt-line';
      line.innerHTML = '<span class="term-prompt">lilyzero@house:' + this.esc(this.fmtDir()) + '$ </span>';
      line.appendChild(this.input);
      this.output.appendChild(line);
      this.scroll();
      this.input.focus();
    },

    // === Keyboard ===

    onKey: function(e) {
      if (e.key === 'Enter') {
        var cmd = this.input.value.trim();
        if (cmd) {
          this.history.push(cmd);
          this.histIdx = this.history.length;
          this.input.value = '';
          this.dispatch(cmd);
        }
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.histIdx > 0) {
          this.histIdx--;
          this.input.value = this.history[this.histIdx];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.histIdx < this.history.length - 1) {
          this.histIdx++;
          this.input.value = this.history[this.histIdx];
        } else {
          this.histIdx = this.history.length;
          this.input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.tabComplete(this.input.value);
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.cmdClear();
      }
    },

    tabComplete: function(val) {
      var cmds = ['ls', 'cat', 'cd', 'help', 'clear', 'whoami', 'date', 'neofetch', 'banner', 'pwd', 'echo', 'find', 'music'];
      var v = val.trim();
      if (!v) return;
      var parts = v.split(/\s+/);
      if (parts.length === 1) {
        for (var i = 0; i < cmds.length; i++) {
          if (cmds[i].startsWith(parts[0])) { this.input.value = cmds[i]; return; }
        }
      }
    },

    // === Dispatch ===

    dispatch: function(raw) {
      var prompt = '<span class="term-prompt">lilyzero@house:' + this.esc(this.fmtDir()) + '$ </span>';
      this.write(prompt + '<span class="term-input-echo">' + this.esc(raw) + '</span>');

      // Remove prompt-line class from last line
      var last = this.output.querySelector('.term-prompt-line:last-child');
      if (last) last.classList.remove('term-prompt-line');

      var parts = raw.split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var args = parts.slice(1);

      switch (cmd) {
        case 'help':    this.help(); break;
        case 'ls':      this.ls(args); break;
        case 'cat':     this.cat(args); break;
        case 'cd':      this.cd(args); break;
        case 'whoami':  this.whoami(); break;
        case 'pwd':     this.pwd(); break;
        case 'date':    this.date(); break;
        case 'neofetch':this.neofetch(); break;
        case 'banner':  this.welcome(); break;
        case 'clear':   this.cmdClear(); break;
        case 'echo':    this.echo(args); break;
        case 'find':    this.find(args); break;
        case 'music':   this.music(args); break;
        case '':        break;
        default:
          this.write('<span class="term-err">zsh: command not found: ' + this.esc(cmd) + '</span>');
      }
      this.newPrompt();
    },

    // === Commands ===

    help: function() {
      this.write('<span class="term-green">Available commands:</span>');
      this.write('');
      this.write('  <span class="term-cmd">ls</span>               List all posts');
      this.write('  <span class="term-cmd">ls</span> Security       List posts in category Security');
      this.write('  <span class="term-cmd">ls</span> Life           List posts in category Life');
      this.write('  <span class="term-cmd">cat</span> &lt;keyword&gt;     Open a post by title keyword');
      this.write('  <span class="term-cmd">cd</span> Security       Enter Security category');
      this.write('  <span class="term-cmd">cd</span>               Go back to home directory');
      this.write('  <span class="term-cmd">find</span> &lt;keyword&gt;   Search posts by keyword');
      this.write('  <span class="term-cmd">music</span>             Toggle music play/pause');
      this.write('  <span class="term-cmd">music</span> play        Start playing');
      this.write('  <span class="term-cmd">music</span> stop        Stop playing');
      this.write('  <span class="term-cmd">music</span> next        Next track');
      this.write('  <span class="term-cmd">music</span> prev        Previous track');
      this.write('  <span class="term-cmd">music</span> info        Show current track');
      this.write('  <span class="term-cmd">whoami</span>           About me');
      this.write('  <span class="term-cmd">neofetch</span>         System info');
      this.write('  <span class="term-cmd">clear</span>            Clear screen (or Ctrl+L)');
      this.write('  <span class="term-cmd">pwd</span> / <span class="term-cmd">date</span> / <span class="term-cmd">echo</span> / <span class="term-cmd">banner</span>');
    },

    ls: function(args) {
      var self = this;
      var targetDir = this.cwd;
      if (args.length > 0) targetDir = args[0];
      // Resolve relative paths
      if (targetDir === '..' || targetDir === '/') targetDir = '/';
      else if (!targetDir.startsWith('/')) targetDir = this.cwd + '/' + targetDir;

      // Root directory: show virtual files only
      if (targetDir === '/') {
        this.write('<span class="term-green">total 1</span>');
        this.write('<span class="term-dim">-rw-r--r--</span>  1 root root   42  Apr  3  2026  <span class="term-link" style="cursor:pointer" onclick="Terminal.cat([\'galf\'])">galf</span>');
        return;
      }

      // Home directory: show all posts
      // Subdirectories: filter by category
      var posts = this.posts.slice();
      if (targetDir !== '/home/lilyzero') {
        var filterCat = targetDir.split('/').pop();
        if (filterCat) {
          posts = posts.filter(function(p) { return p.category === filterCat; });
        }
      }

      if (posts.length === 0) {
        this.write('<span class="term-dim">(empty directory)</span>');
        return;
      }

      this.write('<span class="term-green">total ' + posts.length + '</span>');
      posts.forEach(function(p) {
        var d = p.date || '----';
        var line = '<span class="term-dim">' + d + '</span>  ';
        line += '<a href="' + p.path + '" class="term-link">' + self.esc(p.title) + '.md</a>';
        if (p.tags && p.tags.length) {
          line += '  <span class="term-tag">' + p.tags.map(function(t) { return '#' + t; }).join(' ') + '</span>';
        }
        self.write(line);
      });
    },

    cat: function(args) {
      if (args.length === 0) {
        this.write('<span class="term-err">cat: missing operand</span>');
        return;
      }
      var target = args[0];

      // Check virtual filesystem
      var vpath = target;
      if (!vpath.startsWith('/')) vpath = this.cwd + '/' + vpath;
      if (this.vfs[vpath] !== undefined) {
        this.write('<span class="term-green">' + this.esc(this.vfs[vpath]) + '</span>');
        return;
      }

      var kw = args.join(' ').toLowerCase();
      for (var i = 0; i < this.posts.length; i++) {
        var p = this.posts[i];
        if (p.title.toLowerCase().indexOf(kw) !== -1 || (p.slug && p.slug.toLowerCase().indexOf(kw) !== -1)) {
          this.write('<span class="term-green">Opening: ' + this.esc(p.title) + '</span>');
          this.write('  └─ <a href="' + p.path + '" class="term-link">' + this.esc(p.path) + '</a>');
          if (p.excerpt) {
            this.write('');
            this.write('<span class="term-dim">  ' + this.esc(p.excerpt) + '...</span>');
          }
          window.location.href = p.path;
          return;
        }
      }
      this.write('<span class="term-err">cat: ' + this.esc(args[0]) + ': No such file or directory</span>');
    },

    cd: function(args) {
      if (args.length === 0 || args[0] === '~') {
        this.cwd = '/home/lilyzero';
      } else if (args[0] === '/') {
        this.cwd = '/';
      } else if (args[0] === '..') {
        if (this.cwd === '/home/lilyzero/Security' || this.cwd === '/home/lilyzero/Life') this.cwd = '/home/lilyzero';
        else if (this.cwd === '/home/lilyzero') this.cwd = '/';
      } else if (args[0] === 'Security' || args[0] === 'Life') {
        this.cwd = '/home/lilyzero/' + args[0];
      } else if (args[0] === 'home') {
        this.cwd = '/home/lilyzero';
      } else {
        this.write('<span class="term-err">cd: no such file or directory: ' + this.esc(args[0]) + '</span>');
      }
    },

    whoami: function() {
      this.write('<span class="term-green">lily2663</span>');
      this.write('CTF Player · Web Security Researcher');
      this.write('Email: 2139186436@qq.com');
      this.write('GitHub: <a href="https://github.com/lily2663" class="term-link" target="_blank">github.com/lily2663</a>');
      this.write('Blog: <a href="https://lily2663.github.io" class="term-link" target="_blank">lily2663.github.io</a>');
    },

    pwd: function() {
      this.write(this.cwd);
    },

    date: function() {
      this.write(new Date().toString());
    },

    neofetch: function() {
      var t = [
        '<span class="term-green">',
        '       ▄▄▄▄▄▄▄      lilyzero@house',
        '     ▄██████████    ────────────',
        '    ███▀     ▀███   <span class="term-cmd">OS:</span> Hexo Blog 8.1.1',
        '   ██▀  ▄▄▄  ▀██   <span class="term-cmd">Shell:</span> zsh (web pseudo-terminal)',
        '   ██  █▀ ▀█  ██   <span class="term-cmd">Theme:</span> terminal dark by lily',
        '   ██  ▀▄▄▄▀  ██   <span class="term-cmd">Posts:</span> ' + this.posts.length,
        '   ▀██▄     ▄██▀    <span class="term-cmd">Uptime:</span> ' + this.uptime(),
        '     ▀████████▀     <span class="term-cmd">Categories:</span> Security, Life',
        '       ▀▀▀▀▀▀',
        '</span>'
      ];
      this.write(t.join('\n'));
    },

    uptime: function() {
      var d = Math.floor((new Date() - new Date('2026-04-03')) / 86400000);
      return d + ' days';
    },

    cmdClear: function() {
      this.output.innerHTML = '';
    },

    getAplayer: function() {
      var el = document.querySelector('.aplayer');
      if (!el) return null;
      // Aplayer stores instance on the parent meting-js or as aprop on DOM
      var ap = document.querySelector('meting-js');
      if (ap && ap.aplayer) return ap.aplayer;
      // fallback: find via data attribute
      var list = document.querySelectorAll('.aplayer');
      for (var i = 0; i < list.length; i++) {
        if (list[i].aplayerInstance) return list[i].aplayerInstance;
      }
      return null;
    },

    music: function(args) {
      var ap = this.getAplayer();
      if (!ap) {
        this.write('<span class="term-dim">Music player loading... try again in a moment.</span>');
        return;
      }
      var sub = args.length > 0 ? args[0].toLowerCase() : 'toggle';

      switch (sub) {
        case 'play':
          ap.play();
          this.write('<span class="term-green">▶ Playing</span>');
          break;
        case 'stop':
        case 'pause':
          ap.pause();
          this.write('<span class="term-dim">⏸ Paused</span>');
          break;
        case 'next':
          ap.skipForward();
          this.write('<span class="term-green">⏭ Next track</span>');
          break;
        case 'prev':
          ap.skipBack();
          this.write('<span class="term-green">⏮ Previous track</span>');
          break;
        case 'info':
          var c = ap.list.audios[ap.list.index];
          if (c) {
            this.write('<span class="term-green">Now Playing:</span>');
            this.write('  ' + this.esc(c.title) + ' — ' + this.esc(c.artist));
            this.write('  Track ' + (ap.list.index + 1) + ' / ' + ap.list.audios.length);
          } else {
            this.write('<span class="term-dim">No track info available</span>');
          }
          break;
        default: // toggle
          if (ap.paused) {
            ap.play();
            this.write('<span class="term-green">▶ Playing</span>');
          } else {
            ap.pause();
            this.write('<span class="term-dim">⏸ Paused</span>');
          }
          break;
      }
    },

    echo: function(args) {
      this.write(this.esc(args.join(' ')));
    },

    find: function(args) {
      if (args.length === 0) {
        this.write('<span class="term-err">find: missing search term</span>');
        return;
      }
      var kw = args.join(' ').toLowerCase();
      var results = [];
      for (var i = 0; i < this.posts.length; i++) {
        var p = this.posts[i];
        if (p.title.toLowerCase().indexOf(kw) !== -1) results.push(p);
        else if (p.tags) {
          for (var j = 0; j < p.tags.length; j++) {
            if (p.tags[j].toLowerCase().indexOf(kw) !== -1) { results.push(p); break; }
          }
        }
      }
      if (results.length === 0) {
        this.write('<span class="term-dim">No matches for "' + this.esc(kw) + '"</span>');
        return;
      }
      this.write('<span class="term-green">Found ' + results.length + ' result(s):</span>');
      var self = this;
      results.forEach(function(p) {
        self.write('  <a href="' + p.path + '" class="term-link">' + self.esc(p.title) + '.md</a>  <span class="term-dim">[' + (p.category || '') + ']</span>');
      });
    }
  };

  window.Terminal = T;
})();
