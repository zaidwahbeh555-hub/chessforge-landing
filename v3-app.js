/* ChessForge landing v3 — behaviour.
   Reveals, cursor light, the tilting app window, the 3D knight, and the live
   player count. Every animated thing here is decoration, so all of it is off
   under prefers-reduced-motion. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ── the player count, read from the app ──────────────────────────────────
     Hardcoding it is how the old page ended up claiming 31 players for months.
     The number in the HTML is the fallback: if this is slow, blocked, or the
     app is down, the page reads exactly as it did before. */
  function liveCount(done) {
    var el = $('[data-count][data-live="users"]');
    if (!el || !window.fetch) { done(); return; }
    var settled = false;
    function finish() { if (!settled) { settled = true; done(); } }
    setTimeout(finish, 2500);
    fetch('https://app.chessforge.org/public/stats', { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var n = d && d.users;
        if (typeof n === 'number' && n > 0) {
          el.setAttribute('data-count', String(n));
          $$('[data-live-users]').forEach(function (t) { t.textContent = String(n); });
        }
      })
      .catch(function () {})
      .then(finish);
  }

  function countUp() {
    var stats = $('#stats');
    if (!stats || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        $$('[data-count]', e.target).forEach(function (el) {
          var target = parseInt(el.getAttribute('data-count'), 10) || 0;
          if (RM) { el.textContent = String(target); return; }
          var t0 = null;
          (function step(now) {
            if (t0 === null) t0 = now;
            var p = Math.min(1, (now - t0) / 1300);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
          })(performance.now());
        });
      });
    }, { threshold: 0.4 });
    io.observe(stats);
  }
  liveCount(countUp);

  /* ── reveals ──────────────────────────────────────────────────────────────
     The sweep is not optional. Without it an anchor link that jumps past a
     section, or a restored scroll position on reload, leaves that section
     invisible for good — it never intersects, so it never reveals. */
  var pending = new Set($$('.reveal'));
  if (RM || !('IntersectionObserver' in window)) {
    pending.forEach(function (el) { el.classList.add('in'); });
  } else {
    var groups = new Map();
    $$('.reveal').forEach(function (el) {
      var p = el.parentNode;
      groups.set(p, (groups.get(p) || 0) + 1);
      el.style.transitionDelay = ((groups.get(p) - 1) * 90) + 'ms';
    });
    var show = function (el, instant) {
      if (instant) el.style.transitionDelay = '0ms';
      el.classList.add('in');
      rio.unobserve(el);
      pending.delete(el);
    };
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    pending.forEach(function (el) { rio.observe(el); });
    var sweep = function () {
      if (!pending.size) return;
      Array.from(pending).forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) show(el, true);
      });
    };
    addEventListener('scroll', sweep, { passive: true });
    addEventListener('resize', sweep);
    addEventListener('hashchange', sweep);
    requestAnimationFrame(sweep);
    setTimeout(sweep, 400);
  }

  /* menu: one control, every width. Closes on choose, on Escape and on a
     click anywhere else -- a menu you can only shut with the button it opened
     from is a trap on a phone. */
  (function menu() {
    var b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    function set(open) {
      m.hidden = !open;
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      set(m.hidden);
    });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', function (e) {
      if (!m.hidden && !m.contains(e.target) && e.target !== b) set(false);
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* progress bar */
  var prog = $('#prog');
  function onScroll() {
    if (!prog) return;
    var h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (h > 0 ? Math.min(1, scrollY / h) * 100 : 0).toFixed(2) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* cursor light + window tilt. Written straight to style, never through
     state — this fires on every pointer move. */
  if (!RM) {
    var glow = $('#glow'), win = $('#win'), tilt = $('#tilt');
    addEventListener('pointermove', function (e) {
      if (glow) glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      if (!win || !tilt) return;
      var r = tilt.getBoundingClientRect();
      var near = e.clientX > r.left - 200 && e.clientX < r.right + 200 &&
                 e.clientY > r.top - 200 && e.clientY < r.bottom + 200;
      if (!near) { win.style.transform = 'rotateY(0deg) rotateX(0deg)'; return; }
      var px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      var py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      win.style.transform = 'rotateY(' + (px * 7) + 'deg) rotateX(' + (-py * 4.2) + 'deg)';
    }, { passive: true });
  }

  /* The rail switches the pane. It used to move a highlight and nothing else,
     which is a picture of a rail rather than a rail. */
  $$('.rail-i').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.dataset.i;
      $$('.rail-i').forEach(function (o) { o.classList.toggle('on', o === b); });
      $$('.pane').forEach(function (p) { p.hidden = p.dataset.pane !== i; });
    });
  });
  var hb = $('#hb');
  if (hb) hb.addEventListener('click', function (e) {
    var sq = e.target.closest('.sq'); if (!sq) return;
    var was = sq.classList.contains('sel');
    $$('.sq.sel', hb).forEach(function (o) { o.classList.remove('sel'); });
    if (!was) sq.classList.add('sel');
  });

  /* Every answer below is one GM Forge actually gives, in his actual voice —
     the phrasing is lifted from the offline answer templates in coach.py. */
  var ANSWERS = [
    'If you passed here, Black would play Nxe4 — that is a capture where they have ' +
    'more attackers than you have defenders, so it simply wins the pawn.',
    'Nf3. It works because of what follows: Nf3 Nc6 c3. Count the material at the end of ' +
    'it and you come out level, which is the most this position offers.',
    'Your rook on a1. It has 0 squares to go to — but it has not moved yet, so it is ' +
    'boxed in by your OWN pieces. That is a development problem, not a danger.'
  ];
  var BUBBLES = [
    'Every answer is read straight off the engine for the position on your board.',
    'He is not allowed to name a move Stockfish did not return. That is checked.',
    'Six buttons, not a text box. A confident wrong answer is worse than none.'
  ];
  var msg = $('#forgemsg'), bubble = $('#bubble');
  function pick(i) {
    if (msg) msg.textContent = ANSWERS[i] || ANSWERS[0];
    if (bubble) bubble.textContent = BUBBLES[i] || BUBBLES[0];
  }
  $$('.ask').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.ask').forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on');
      pick(+b.dataset.i);
    });
  });
  $$('.chip').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.chip').forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on');
      pick(+b.dataset.i);
    });
  });
  var explain = $('#explain');
  if (explain) explain.addEventListener('click', function () {
    explain.textContent = 'Nf3 keeps the pawn ✓';
    if (msg) msg.textContent = 'Ng5 loses a pawn for nothing: Ng5 Nxe4 and f7 was never ' +
      'the weakness you thought it was. Nf3 first, and the square stops mattering.';
  });

  /* modals */
  var open = null;
  function shut() { if (open) { open.hidden = true; open = null; document.body.style.overflow = ''; } }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-legal]');
    if (t) { var m = document.getElementById('lg-' + t.dataset.legal);
             if (m) { shut(); m.hidden = false; open = m; document.body.style.overflow = 'hidden'; } return; }
    if (e.target.closest('[data-close]') || (open && e.target === open)) shut();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });

})();
