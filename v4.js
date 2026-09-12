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
    if (el._ran) return; el._ran = 1;
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

  /* ── the hero: a board you actually play ──────────────────────────────────
     The pitch is "a coach who is there while you play", so the hero lets you
     play. Every legal move in this position was analysed by Stockfish when the
     page was built (v4-hero.json: 37 moves, each with its evaluation, the
     opponent's best reply, and how much it loses against the best move), which
     is why this needs no engine in the browser and still answers honestly.

     Only eight moves have a hand-written line, and those name a real idea --
     the knight on f3 is the only guard on d1, so moving it hangs the queen to
     Bxd1. Everything else is phrased from the numbers, so no move can be given
     a verdict the analysis does not support. */
  (function hero() {
    var board = $('#board'), shot = $('#shotBoard');
    if (!board || !window.fetch) return;
    var D = null, sel = null, played = null;

    /* The data is written a8-first; the player is Black here, so the board is
       drawn from Black's side -- you cannot ask somebody to find a move while
       looking at it upside down. */
    function cells(list) {
      var flip = D && D.side === 'black';
      return (flip ? list.slice().reverse() : list).map(function (p, i) {
        var f = flip ? 7 - (i % 8) : i % 8;
        var rank = flip ? 1 + Math.floor(i / 8) : 8 - Math.floor(i / 8);
        var sq = 'abcdefgh'[f] + rank;
        return '<i class="sq ' + ((f + rank) % 2 ? 'l' : 'd') + '" data-sq="' + sq + '">'
             + (p ? '<img loading="lazy" decoding="async" src="pieces/' + p + '.svg" alt="">' : '')
             + '</i>';
      }).join('');
    }
    function paint(list) { board.innerHTML = cells(list); }

    /* The labels have to follow the board.
       Drawn from Black's side, h1 sits bottom-left -- so the files read h to a
       and the ranks 1 to 8. Static a-h / 8-1 labels would name every square
       wrong, which is worse than no labels at all when the coach is telling you
       to look at f7. */
    function coords() {
      var flip = D && D.side === 'black';
      var f = 'abcdefgh'.split(''), r = '87654321'.split('');
      if (flip) { f.reverse(); r.reverse(); }
      var fe = $('#files'), re = $('#ranks');
      if (fe) fe.innerHTML = f.map(function (c) { return '<i>' + c + '</i>'; }).join('');
      if (re) re.innerHTML = r.map(function (c) { return '<i>' + c + '</i>'; }).join('');
    }
    function clearMarks() {
      $$('.sq', board).forEach(function (s) {
        s.classList.remove('pick', 'target', 'from', 'to', 'bad');
      });
    }
    function movesFrom(sq) { return D.moves.filter(function (m) { return m.from === sq; }); }

    function setEval(cp) {
      var f = $('#evalFill'); if (!f) return;
      // Clamped: past about six pawns the bar stops meaning anything.
      var pct = 50 + Math.max(-50, Math.min(50, (cp / 600) * 50));
      f.style.width = pct.toFixed(1) + '%';
      f.className = cp >= 0 ? 'good' : 'bad';
    }

    var GRADE_WORD = { best: 'Best move', good: 'Good', inaccuracy: 'Inaccuracy',
                       mistake: 'Mistake', blunder: 'Blunder' };

    function line(m) {
      if (D.says[m.san]) return D.says[m.san];
      if (m.mated && D.says.__mated) return D.says.__mated;
      var pawns = (Math.abs(m.loss) / 100).toFixed(1);
      if (m.grade === 'best') return m.san + ' is the move. Nothing else here keeps as much.';
      if (m.grade === 'good')
        return m.san + ' is playable — it gives up about ' + pawns + ' of a pawn against the best move, '
             + 'which is not the kind of gap that decides a game.';
      return m.san + ' costs you about ' + pawns + ' of a pawn'
           + (m.reply ? ', and the answer is ' + m.reply + '.' : '.')
           + ' That is the sort of move that decides the game two moves from now.';
    }

    function respond(m) {
      played = m;
      paint(m.cells);
      clearMarks();
      var a = board.querySelector('[data-sq="' + m.from + '"]');
      var b2 = board.querySelector('[data-sq="' + m.to + '"]');
      if (a) a.classList.add('from');
      if (b2) b2.classList.add(m.grade === 'blunder' || m.grade === 'mistake' ? 'bad' : 'to');
      setEval(m.cp);
      var g = $('#grade');
      g.textContent = GRADE_WORD[m.grade] || '';
      g.className = 'grade ' + m.grade;
      $('#coachSay').textContent = line(m);
      $('#coachAct').hidden = false;
      $('#showBest').hidden = m.grade === 'best';
      var box = $('#coachBox');
      box.classList.add('spoke');
      box.classList.remove('right', 'wrong');
      box.classList.add(m.grade === 'best' || m.grade === 'good' ? 'right' : 'wrong');
      // The figure changes face the way it does in the app.
      var dock = $('#forgeDock');
      if (dock) dock.dataset.expr = (D.expr && D.expr[m.grade]) || 'neutral';
      // The read-out beside the board, in the app's own language.
      $('#evalTxt').textContent = m.mated ? '#' : (m.cp >= 0 ? '+' : '') + (m.cp / 100).toFixed(1);
      $('#evalSub').textContent = m.mated ? 'Checkmate next move'
        : m.cp > 120 ? 'You are better' : m.cp > -120 ? 'Roughly level' : 'You are worse';
      $('#moveTxt').textContent = m.san;
      $('#moveSub').textContent = m.grade === 'best' ? 'nothing keeps more'
        : 'gives up ' + (Math.abs(m.loss) / 100).toFixed(1) + ' of a pawn';
      var cb = $('#candBox');
      if (cb) { cb.hidden = false; $('#candV').textContent = m.san
        + (m.reply ? '  \u2192  ' + m.reply : ''); }
      var tm = $('#tryme');
      if (tm) tm.classList.add('gone');
      runFlow(m);
    }

    /* ── what the app does with that move ─────────────────────────────────
       Not a diagram of the loop: it runs. Each step fills its own bar and
       hands to the next, and the captions name what actually came out of the
       move you played -- the pattern, the position, the interval. A static
       list of four features says the same words and proves none of it. */
    var flowTimers = [];
    function stopFlow() {
      flowTimers.forEach(clearTimeout); flowTimers = [];
      var f = $('#flow');
      if (f) $$('li', f).forEach(function (li) { li.className = ''; });
      var fn = $('#flowNext');
      if (fn) { fn.classList.remove('in'); fn.setAttribute('aria-hidden', 'true'); }
    }
    /* Only when the board goes back to the start -- stopFlow also runs at the
       top of every move, where undoing these would cancel them instantly. */
    function restoreIdle() {
      var tm = $('#tryme'); if (tm) tm.classList.remove('gone');
      var l = $('#procLede');
      if (l) l.textContent = 'Play a move on the board above and watch what the app does '
        + 'with it. Nothing here is a mock-up of a loading bar: these are the four things '
        + 'ChessForge actually runs after every game you finish.';
    }
    function runFlow(m) {
      var f = $('#flow'); if (!f) return;
      stopFlow();
      /* The panel is a section of its own now, below the fold, so running it
         where you cannot see it would be running it for nobody. Scrolled to on
         every move rather than only the best one: 23 of the 31 legal moves here
         are mate, so gating this on a correct answer would hide it from most
         people who touch the board.

         Held first. Scrolling the instant the move lands takes his answer off
         the screen before it can be read -- and his answer is the reason the
         board is on the page. A wrong move gets longer, because the line
         explaining what it ran into is the longer one. */
      var hold = RM ? 0 : (m.grade === 'best' || m.grade === 'good' ? 2400 : 3400);
      flowTimers.push(setTimeout(function () {
        var sec = document.getElementById('process');
        if (sec) sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
      }, hold));
      var lede = $('#procLede');
      if (lede) lede.textContent = m.mated
        ? 'You played ' + m.san + ', and it is mate next move. Here is what ChessForge does '
          + 'with that \u2014 for real, on every game you finish.'
        : 'You played ' + m.san + '. Here is what ChessForge does with it \u2014 for real, '
          + 'on every game you finish.';
      /* The panel is on the page from the start, dimmed, so you can see what is
         about to happen -- and so revealing it does not resize the column and
         shove the board you are looking at. The footnote stays too: it is still
         true after you move, and hiding it was another 17px of movement. */
      var pattern = m.mated ? 'Back-rank and f7 mates'
                  : m.grade === 'best' || m.grade === 'good' ? 'Defending the mating square'
                  : 'Missed defence';
      $('#flAnalyse').textContent = m.san + ' graded, and the 30 alternatives with it';
      $('#flPuzzle').textContent = m.mated
        ? 'the position one move before Qxf7#'
        : 'the position you just played from';
      $('#flLesson').textContent = pattern + ' — the pattern, not this one board';
      $('#flDone').textContent = 'back tomorrow, then in three days, then a week';
      var steps = $$('li', f);
      steps.forEach(function (li, i) {
        flowTimers.push(setTimeout(function () {
          li.className = 'run';
          flowTimers.push(setTimeout(function () {
            li.className = 'done';
            if (i === steps.length - 1) {
              var fn = $('#flowNext');
              if (fn) { fn.removeAttribute('aria-hidden'); fn.classList.add('in'); }
            }
          }, 620));
        }, hold + 420 + i * 700));
      });
    }

    function reset(msg) {
      played = null; sel = null;
      paint(D.start);
      clearMarks();
      setEval(D.bestCp);
      $('#grade').textContent = ''; $('#grade').className = 'grade';
      $('#coachAct').hidden = true;
      $('#candBox').hidden = true;
      stopFlow();
      restoreIdle();
      $('#coachBox').classList.remove('spoke', 'right', 'wrong');
      var dock0 = $('#forgeDock'); if (dock0) dock0.dataset.expr = 'neutral';
      $('#evalTxt').textContent = (D.bestCp >= 0 ? '+' : '') + (D.bestCp / 100).toFixed(1);
      $('#evalSub').textContent = 'Level — for one more move';
      $('#moveTxt').textContent = '\u2014';
      $('#moveSub').textContent = 'pick up a piece';
      $('#coachSay').textContent = msg || D.idle;
    }

    board.addEventListener('click', function (e) {
      if (!D) return;
      var cell = e.target.closest('.sq'); if (!cell) return;
      var sq = cell.dataset.sq;
      if (played) { reset(); return; }          // a click after a move starts over
      if (sel) {
        var m = movesFrom(sel).filter(function (x) { return x.to === sq; })[0];
        if (m) { respond(m); return; }
      }
      var opts = movesFrom(sq);
      clearMarks();
      if (!opts.length) { sel = null; return; }
      sel = sq;
      cell.classList.add('pick');
      opts.forEach(function (o) {
        var t = board.querySelector('[data-sq="' + o.to + '"]');
        if (t) t.classList.add('target');
      });
    });

    fetch('v4-hero.json').then(function (r) { return r.json(); }).then(function (d) {
      D = d;
      coords();
      paint(d.start);
      setEval(d.bestCp);
      if (shot) shot.innerHTML = cells(d.start);
      fetch('forge.svg').then(function (r) { return r.text(); }).then(function (svg) {
        var dock = $('#forgeDock');
        if (dock) dock.innerHTML = svg.replace(/<\?xml[^>]*\?>/, '');
      }).catch(function () {});
      $('#undo').addEventListener('click', function () { reset('Try another one.'); });
      $('#showBest').addEventListener('click', function () {
        var b3 = d.moves.filter(function (m) { return m.san === d.best; })[0];
        if (b3) respond(b3);
      });
      var fnext = $('#flowNext');
      if (fnext) fnext.addEventListener('click', function () {
        var t = document.getElementById('features');
        if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
      });
    }).catch(function () {});
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

/* ══ Yearly / monthly, and the clock on the launch offer ════════════════════
   $19.99 a month, or $40 for a whole year while the offer runs.

   The deadline below is the same epoch second the app ships in billing.py, so
   the two cannot drift apart -- but it is only the fallback. If the app
   answers, its figures win, which means the offer can be extended or ended
   from Railway without touching this file. And it is measured against the
   SERVER's clock: a laptop with a wrong date would otherwise see the offer
   already over, or keep it running for weeks after it closed. */
(function () {
  var API = 'https://app.chessforge.org/plan/pricing';
  var P = { monthly: 19.99, monthly_was: 29.99, yearly: 40, yearly_off_pct: 83,
            ends: 1791057883, now: Math.floor(Date.now() / 1000),
            yearly_available: true };
  var interval = 'yearly', skew = 0, tick = null;

  var sw    = document.getElementById('billSwitch');
  var price = document.getElementById('planPrice');
  var note  = document.getElementById('offerNote');
  if (!sw || !price || !note) return;

  function left() { return P.ends ? (P.ends * 1000) - (Date.now() + skew) : 0; }
  function live()  { return !!P.yearly_available && left() > 0; }

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
      price.innerHTML = '$' + P.yearly.toFixed(0)
        + '<span class="save">' + P.yearly_off_pct + '% off</span>'
        + '<small>CAD for the year &mdash; $' + (P.yearly / 12).toFixed(2) + ' a month</small>';
    } else {
      price.innerHTML = '<s>$' + P.monthly_was.toFixed(2) + '</s>$' + P.monthly.toFixed(2)
        + '<small>CAD a month</small>';
    }
    clock();
  }

  function clock() {
    var ms = left();
    /* The clock belongs to the yearly price. On Monthly there is nothing
       running out, so a countdown sitting under $19.99 a month is just an
       unexplained number. */
    if (interval !== 'yearly') {
      note.hidden = true;
      if (tick) { clearInterval(tick); tick = null; }
      return;
    }
    if (!live()) {
      /* Over means gone. A clock reading 0d 00h 00m 00s left on the page is
         worse than no clock, and the offer must not stay advertised. */
      note.hidden = true;
      if (tick) { clearInterval(tick); tick = null; }
      if (P.yearly_available && ms <= 0) { P.yearly_available = false; render(); }
      return;
    }
    note.hidden = false;
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
