/* ChessForge landing v4 — behaviour.
   The hero is the only thing here with real logic: a board, three cards that
   land on it, and a line you can play out. Everything else is reveals, the
   menu, the live player count and the legal modals. */
(function () {
  'use strict';
  var RM = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* nav gets its border once you have left the top */
  var nav = $('#nav');
  addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('stuck', scrollY > 12);
  }, { passive: true });

  /* menu — phones only, but it closes every way somebody would expect */
  (function () {
    var b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    function set(open) {
      m.hidden = !open;
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(m.hidden); });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', function (e) {
      if (!m.hidden && !m.contains(e.target) && e.target !== b) set(false);
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* Count a figure up to its data-count once, when it is first seen. */
  function countUp(el) {
    /* liveCount hands this whatever querySelector found, which is null once the
       figure it counted is no longer on the page. A function that takes an
       element has to survive not being given one -- this threw on the first
       line and took the rest of the script with it, which is how deleting a
       section stopped three chessboards from painting. */
    if (!el || el._ran) return; el._ran = 1;
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (RM) { el.textContent = String(to); return; }
    var t0 = 0, D = 900;
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    });
  }
  function liveCount(done) {
    var el = document.querySelector('.stat-n[data-live="users"]');
    if (!el || !window.fetch) { done && done(el); return; }
    var settled = false;
    function finish() { if (!settled) { settled = true; done && done(el); } }
    /* A hanging request must not stop the animation from ever running. */
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
  liveCount(countUp);

  /* reveals. The sweep is not optional: without it an anchor jump past a
     section leaves that section invisible for good, because it never
     intersects and so never reveals. */
  /* Reveals. Cards get their own observer with a short stagger, so a row
     settles instead of six things arriving one at a time over three seconds. */
  var blocks = $$('.reveal, .shot, .quote, .closer-in');
  var cards = $$('.fcard, .plan');
  if (RM || !('IntersectionObserver' in window)) {
    blocks.concat(cards).forEach(function (el) { el.classList.add('in'); });
  } else {
    var pending = new Set(blocks);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); io.unobserve(e.target); pending.delete(e.target);
      });
    }, { threshold: .1, rootMargin: '0px 0px -6% 0px' });
    blocks.forEach(function (el) { io.observe(el); });

    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var row = $$('.fcard, .plan', e.target.parentNode);
        var i = row.indexOf(e.target);
        setTimeout(function () { e.target.classList.add('in'); }, Math.max(0, i) * 55);
        cio.unobserve(e.target);
      });
    }, { threshold: .1, rootMargin: '0px 0px -4% 0px' });
    cards.forEach(function (el) { cio.observe(el); });

    /* The sweep is not optional: an anchor jump past a section leaves it
       invisible for good, because it never intersects and so never reveals. */
    var sweep = function () {
      cards.forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); cio.unobserve(el); }
      });
      if (!pending.size) return;
      Array.from(pending).forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) {
          el.classList.add('in'); io.unobserve(el); pending.delete(el);
        }
      });
    };
    addEventListener('scroll', sweep, { passive: true });
    addEventListener('resize', sweep);
    addEventListener('hashchange', sweep);
    requestAnimationFrame(sweep); setTimeout(sweep, 400);
  }

  /* the live player count — typed numbers are how the old page claimed 31
     players for months while the real figure climbed */
  (function () {
    if (!window.fetch) return;
    fetch('https://app.chessforge.org/public/stats', { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var n = d && d.users;
        if (typeof n === 'number' && n > 0)
          $$('[data-live-users]').forEach(function (t) { t.textContent = String(n); });
          /* The hero figure counts up to the live number rather than the one
             typed into the HTML, so the claim cannot go stale as people join. */
          var sn = document.querySelector('.stat-n[data-live="users"]');
          if (sn) { sn.setAttribute('data-count', String(n)); countUp(sn); }
      }).catch(function () {});
  })();

  /* ── the endgame judgement ────────────────────────────────────────────────
     What replaced the coached-play board. That demo let you play a move and had
     a coach grade it, which was the old product: there is no coach in the app
     now, and grading a move is not what it does.

     This is the moment every endgame in the app opens on, and the answer is not
     ours -- it is what Stockfish said at depth when the position was built.
     Nothing is fetched and no engine runs here; there is one fact and it is
     already known. */
  (function () {
    var wrap = $('#judge');
    if (!wrap) return;
    var ask = $('#judgeAsk'), said = $('#judgeSaid');
    var TRUTH = 'win';           // verified: white wins, mate in 13

    function answer(pick) {
      var right = pick === TRUTH;
      $('#jVerdict').textContent = right
        ? 'Right \u2014 it is a win.'
        : 'Not quite. It is a win.';
      $('#jVerdict').className = 'j-verdict ' + (right ? 'good' : 'bad');
      $('#jWhy').textContent = right
        ? 'One pawn and the kings, and it is winning for the side to move \u2014 but '
          + 'only played in the right order. Most players push the pawn here and draw it.'
        : 'This one IS winnable, and that matters: a player who thinks it is drawn '
          + 'stops trying and draws it. The pawn is not the problem \u2014 the order is.';
      ask.hidden = true;
      said.hidden = false;
      said.classList.remove('in'); void said.offsetWidth; said.classList.add('in');
    }

    $$('[data-judge]', wrap).forEach(function (b) {
      b.addEventListener('click', function () { answer(b.getAttribute('data-judge')); });
    });
    var again = $('#jAgain');
    if (again) again.addEventListener('click', function () {
      said.hidden = true; ask.hidden = false;
      ask.classList.remove('in'); void ask.offsetWidth; ask.classList.add('in');
    });
  })();


  /* modals */
  var open = null;
  function shut() { if (open) { open.hidden = true; open = null; document.body.style.overflow = ''; } }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-legal]');
    if (t) {
      var m = document.getElementById('lg-' + t.dataset.legal);
      if (m) { shut(); m.hidden = false; open = m; document.body.style.overflow = 'hidden'; }
      return;
    }
    if (e.target.closest('[data-close]') || (open && e.target === open)) shut();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
})();

/* ══ Yearly / monthly ═══════════════════════════════════════════════════════
   $4.99 a month, or $29.99 for the whole year -- half the price, and not a
   countdown: yearly is a permanent option, so nothing here expires.

   The figures below are only the fallback. If the app answers, its numbers
   win, which means a price change on Railway reaches this page without
   touching this file -- and the page can never advertise a price Stripe has
   not been told about. `ends` is kept because the route still returns it: a
   future limited offer sets it and the clock comes back on its own. */
(function () {
  var API = 'https://app.chessforge.org/plan/pricing';
  var P = { monthly: 4.99, monthly_was: 9.99, yearly: 29.99, yearly_off_pct: 50,
            ends: 0, now: Math.floor(Date.now() / 1000),
            yearly_available: true };
  var interval = 'yearly', skew = 0, tick = null;

  var sw    = document.getElementById('billSwitch');
  var price = document.getElementById('planPrice');
  var note  = document.getElementById('offerNote');
  if (!sw || !price || !note) return;

  function left() { return P.ends ? (P.ends * 1000) - (Date.now() + skew) : 0; }
  /* No deadline means no deadline. Yearly is on whenever the app says it is. */
  function live()  { return !!P.yearly_available && (!P.ends || left() > 0); }

  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return Math.floor(s / 86400) + 'd ' + p(Math.floor(s % 86400 / 3600)) + 'h '
         + p(Math.floor(s % 3600 / 60)) + 'm ' + p(s % 60) + 's';
  }
  function weeksLeft() {
    var w = Math.ceil(left() / (7 * 864e5));
    return w <= 1 ? 'Last week' : 'Only here for ' + w + ' more weeks';
  }

  function render() {
    var on = live();
    if (!on && interval === 'yearly') interval = 'monthly';
    sw.hidden = !on;
    Array.prototype.forEach.call(sw.querySelectorAll('.bs-b'), function (b) {
      b.classList.toggle('on', b.dataset.interval === interval);
      b.setAttribute('aria-pressed', b.dataset.interval === interval ? 'true' : 'false');
    });

    if (interval === 'yearly') {
      price.innerHTML = '$' + P.yearly.toFixed(2)
        + '<span class="save">save ' + P.yearly_off_pct + '%</span>'
        + '<small>CAD for the year &mdash; $' + (P.yearly / 12).toFixed(2)
        + ' a month, billed once</small>';
    } else {
      price.innerHTML = '<s>$' + P.monthly_was.toFixed(2) + '</s>$' + P.monthly.toFixed(2)
        + '<small>CAD a month</small>';
    }
    clock();
  }

  function clock() {
    var ms = left();
    /* The note belongs to the yearly price. On Monthly there is nothing to
       explain, so anything sitting under $4.99 a month is just an unexplained
       line. */
    if (interval !== 'yearly' || !live()) {
      note.hidden = true;
      if (tick) { clearInterval(tick); tick = null; }
      if (P.ends && P.yearly_available && ms <= 0) { P.yearly_available = false; render(); }
      return;
    }
    note.hidden = false;
    if (!P.ends) {
      /* The permanent case, which is the one that ships. No clock, because
         nothing is running out -- just the saving, stated plainly. */
      note.innerHTML = 'Save <b>' + P.yearly_off_pct + '%</b> against paying monthly. '
        + 'One payment, cancel any time.';
      if (tick) { clearInterval(tick); tick = null; }
      return;
    }
    note.innerHTML = weeksLeft() + ' &mdash; ends in <b>' + fmt(ms) + '</b>';
    if (!tick) tick = setInterval(clock, 1000);
  }

  sw.addEventListener('click', function (e) {
    var b = e.target.closest('.bs-b'); if (!b) return;
    interval = b.dataset.interval; render();
  });

  render();
  if (window.fetch) {
    fetch(API, { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || typeof d.monthly !== 'number') return;
        P = d;
        skew = (d.now * 1000) - Date.now();
        if (!d.yearly_available) interval = 'monthly';
        render();
      })
      .catch(function () {});
  }
})();

/* ══ Reviews ════════════════════════════════════════════════════════════════
   What players actually wrote, straight from the app. These are published
   without anyone reading them first, so every value below goes in as text and
   never as markup -- a review is a stranger's words, and the one thing that
   must never happen on a page that also takes card details is a <script> that
   arrived through a comment box. */
/* The published-reviews block lived here. It filled a section that has been
   removed from the page, so it fetched, parsed and rendered into nothing. */


/* ── the staged positions ────────────────────────────────────────────────────
   Three real positions out of the app's library, painted from FEN. Static, and
   deliberately so: three boards animating themselves while someone is trying to
   read a headline is decoration fighting the copy.

   They fade and rise once, on entry, staggered, with a spring settle -- and not
   at all for anyone who has asked their system to stop animating things. */
(function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function boardHTML(fen) {
    var rows = fen.split(' ')[0].split('/'), out = '';
    for (var r = 0; r < 8; r++) {
      var file = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r][i];
        if (ch >= '1' && ch <= '8') {
          for (var n = 0; n < +ch; n++, file++)
            out += '<span class="ps ' + (((file + r) % 2) ? 'd' : 'l') + '"></span>';
        } else {
          var p = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
          out += '<span class="ps ' + (((file + r) % 2) ? 'd' : 'l') + '">'
               + '<img src="pieces/' + p + '.svg" alt="" loading="lazy" decoding="async">'
               + '</span>';
          file++;
        }
      }
    }
    return out;
  }

  /* Every figure carrying a position, not only the three in the hero -- the
     phase rows each hold one too, and scoping this to .stage3 left those three
     boards empty. */
  var figs = [].slice.call(document.querySelectorAll('[data-fen]'));
  figs.forEach(function (f) {
    var host = f.querySelector('.pos-b');
    if (host) host.innerHTML = boardHTML(f.getAttribute('data-fen') || '8/8/8/8/8/8/8/8');
  });

  if (RM || !('IntersectionObserver' in window)) {
    figs.forEach(function (f) { f.classList.add('in'); });
    return;
  }
  var io2 = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = figs.indexOf(e.target);
      setTimeout(function () { e.target.classList.add('in'); }, i * 110);
      io2.unobserve(e.target);
    });
  }, { threshold: .18 });
  figs.forEach(function (f) { io2.observe(f); });
})();
