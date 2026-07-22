/* ══════════════════════════════════════════════════════════════════
   ChessForge — Landing interactions (vanilla, no libraries)
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Footer year ─────────────────────────────────────────────────── */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ── Nav: solidify on scroll ─────────────────────────────────────── */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ─────────────────────────────────────────────────── */
  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.classList.toggle('x', open);
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        burger.classList.remove('x');
      });
    });
  }

  /* ── Scroll reveal ───────────────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Coach board demo ────────────────────────────────────────────── */
  // A small tactical position. Black just played ...Ng4 hitting f2/e4-ish;
  // coach points at the defensive resource. Purely illustrative.
  var boardEl = document.getElementById('demoBoard');
  var arrowEl = document.getElementById('demoArrow');
  var coachTextEl = document.getElementById('demoCoachText');

  // rank 8 (top) → rank 1 (bottom); '' = empty
  var POSITION = [
    ['br','','bb','bq','bk','bb','','br'],
    ['bp','bp','bp','','','bp','bp','bp'],
    ['','','bn','bp','','bn','',''],
    ['','','','','bp','','',''],
    ['','','bl','','bp','bl','n4',''], // decorative-ish middlegame cluster
    ['','','wn','','','wn','',''],
    ['wp','wp','wp','wp','','wp','wp','wp'],
    ['wr','','wb','wq','wk','wb','','wr']
  ];
  // Clean the fantasy tokens ('bl','n4','wl') to valid or empty so it still reads as chess
  var GLYPH = {
    wp:'♙', wn:'♘', wb:'♗', wr:'♖', wq:'♕', wk:'♔',
    bp:'♟', bn:'♞', bb:'♝', br:'♜', bq:'♛', bk:'♚'
  };

  function buildBoard() {
    if (!boardEl) return;
    var frag = document.createDocumentFragment();
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = document.createElement('div');
        var isLight = (r + f) % 2 === 0;
        sq.className = 'sq ' + (isLight ? 'light' : 'dark');
        var code = POSITION[r][f];
        if (GLYPH[code]) {
          sq.textContent = GLYPH[code];
          sq.classList.add(code[0] === 'w' ? 'pc-w' : 'pc-b');
        }
        // mark a "hot" square (a hanging piece) — f-file, rank shown as hot
        if (r === 2 && f === 5) sq.classList.add('hot'); // black knight on f6-ish
        sq.dataset.rc = r + '-' + f;
        frag.appendChild(sq);
      }
    }
    boardEl.appendChild(frag);
  }

  // draw an arrow between two [row,col] cells using 0-100 coords
  function centre(rc) {
    return { x: rc[1] * 12.5 + 6.25, y: rc[0] * 12.5 + 6.25 };
  }
  function drawArrow(from, to) {
    if (!arrowEl) return;
    var a = centre(from), b = centre(to);
    // shorten toward target so head clears the piece
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var tx = b.x - (dx / len) * 6, ty = b.y - (dy / len) * 6;
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', tx); line.setAttribute('y2', ty);
    line.setAttribute('marker-end', 'url(#ah)');
    arrowEl.appendChild(line);
  }

  var CUES = [
    { text: 'Watching your position…', arrow: null },
    { text: '⚠️ Your knight on <b>f6</b> looks loose — count the attackers first.', arrow: [[5,5],[2,5]], hot: [2,5] },
    { text: 'Before you move — what is your opponent actually threatening?', arrow: null },
    { text: '💡 There is one clearly best move here. Checks, captures, threats — in that order.', arrow: [[5,2],[3,3]] }
  ];

  var step = 0;
  function cycle() {
    if (!coachTextEl) return;
    var cue = CUES[step % CUES.length];
    coachTextEl.innerHTML = cue.text;
    // reset arrows
    if (arrowEl) {
      arrowEl.classList.remove('show');
      while (arrowEl.querySelector('line')) arrowEl.removeChild(arrowEl.querySelector('line'));
    }
    // reset hot squares
    boardEl && boardEl.querySelectorAll('.hot').forEach(function (s) { s.classList.remove('hot'); });
    if (cue.hot) {
      var hs = boardEl && boardEl.querySelector('[data-rc="' + cue.hot[0] + '-' + cue.hot[1] + '"]');
      if (hs) hs.classList.add('hot');
    }
    if (cue.arrow) {
      drawArrow(cue.arrow[0], cue.arrow[1]);
      requestAnimationFrame(function () { arrowEl && arrowEl.classList.add('show'); });
    }
    step++;
  }

  if (boardEl) {
    buildBoard();
    // only animate the coach loop when the demo is on screen
    var demoVisible = true;
    if ('IntersectionObserver' in window) {
      var demoWrap = document.querySelector('.hero-demo');
      if (demoWrap) {
        new IntersectionObserver(function (ents) {
          demoVisible = ents[0].isIntersecting;
        }, { threshold: 0.2 }).observe(demoWrap);
      }
    }
    setTimeout(cycle, 900);
    setInterval(function () { if (demoVisible) cycle(); }, 3200);
  }
})();
