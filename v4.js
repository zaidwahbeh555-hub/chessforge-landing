/* ChessForge landing — behaviour.
 *
 * The page is four questions. They are the SAME four the app asks at sign-up,
 * with the same bands and the same openings, filtered by band the same way, so
 * finishing this page finishes the onboarding.
 *
 * The answers are handed to the app in ?ob=band.white.e4.d4 on the final link.
 * A query string and not storage: chessforge.org and app.chessforge.org are
 * separate origins and localStorage does not cross one. The app validates every
 * field against its own library and reads the answers back before applying
 * them, so a hand-edited link cannot quietly configure somebody's account.
 *
 * OPENINGS below is generated from the app's local/data.js and must be
 * regenerated if the library changes. It carries only what this page shows.
 */
(function () {
  'use strict';
  var RM = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  var OPENINGS = [
    {
      "id": "italian",
      "name": "Italian Game",
      "slot": "white",
      "idea": "The oldest opening there is. Fast development, and every piece points at f7.",
      "min": 0
    },
    {
      "id": "london",
      "name": "London System",
      "slot": "white",
      "idea": "The same setup against almost anything. One system to learn instead of ten.",
      "min": 0
    },
    {
      "id": "vienna",
      "name": "Vienna Game",
      "slot": "white",
      "idea": "Looks like a quiet e4 opening, then the f-pawn arrives and it is not quiet at all.",
      "min": 500
    },
    {
      "id": "queens-gambit",
      "name": "Queen's Gambit",
      "slot": "white",
      "idea": "Not really a gambit. You offer a pawn to pull his d-pawn off the centre, and you get it back.",
      "min": 600
    },
    {
      "id": "scotch",
      "name": "Scotch Game",
      "slot": "white",
      "idea": "Open the centre on move three, before he has finished developing.",
      "min": 400
    },
    {
      "id": "kings-indian-attack",
      "name": "King's Indian Attack",
      "slot": "white",
      "idea": "A setup, not a line. The same six moves against nearly anything he plays.",
      "min": 300
    },
    {
      "id": "caro",
      "name": "Caro-Kann Defence",
      "slot": "e4",
      "idea": "Solid as a wall, and unlike the French your light-squared bishop gets out first.",
      "min": 0
    },
    {
      "id": "scandi",
      "name": "Scandinavian Defence",
      "slot": "e4",
      "idea": "You get to play the same thing every game, and he is out of his book by move two.",
      "min": 0
    },
    {
      "id": "french",
      "name": "French Defence",
      "slot": "e4",
      "idea": "Give him the centre, then break it with c5 and f6. A counter-punching opening.",
      "min": 400
    },
    {
      "id": "philidor-defence",
      "name": "Philidor Defence",
      "slot": "e4",
      "idea": "Rock solid and very easy to remember. Nothing sharp can happen to you early.",
      "min": 0
    },
    {
      "id": "qgd",
      "name": "Queen’s Gambit Declined",
      "slot": "d4",
      "idea": "The most respectable answer to 1.d4 there is. You keep a pawn on d5 and nothing collapses.",
      "min": 400
    },
    {
      "id": "slav",
      "name": "Slav Defence",
      "slot": "d4",
      "idea": "Like the Queen’s Gambit Declined, but the light-squared bishop is not shut in.",
      "min": 500
    },
    {
      "id": "kings-indian",
      "name": "King’s Indian Defence",
      "slot": "d4",
      "idea": "Let him have the centre, castle fast, then blow it up with e5 or c5.",
      "min": 700
    },
    {
      "id": "dutch",
      "name": "Dutch Defence",
      "slot": "d4",
      "idea": "Grab the e4 square on move one and play for an attack from the start.",
      "min": 600
    }
  ];

  /* The same three bands the app offers, in the same words. */
  var BANDS = [
    [600,  'Just starting',     'Still learning how the pieces work together'],
    [900,  'Around 600\u2013900',  'I know the rules and lose to tactics'],
    [1200, 'Around 900\u20131200', 'I play openings but do not really know them']
  ];

  var STEPS = [
    { key:'band',  label:'Rated',
      q:'Roughly how strong are you?',
      sub:'This decides which openings you are offered first. The app asks the same thing, in the same three bands.' },
    { key:'white', label:'As White', slot:'white',
      q:'What do you want to play as White?',
      sub:'One opening, learned properly, beats four learned badly. You can add the others later.' },
    { key:'e4',    label:'Against 1.e4', slot:'e4',
      q:'And when he opens 1.e4?',
      sub:'Your answer to the most common first move there is.' },
    { key:'d4',    label:'Against 1.d4', slot:'d4',
      q:'And against 1.d4?',
      sub:'The last one. Then it tells you what to do first.' }
  ];

  var feed = $('#askFeed');
  if (!feed) return;
  var A = {};          /* the four answers */
  var at = 0;

  function optsFor(step) {
    if (step.key === 'band') {
      return BANDS.map(function (b) {
        return { id:String(b[0]), name:b[1], idea:b[2] };
      });
    }
    /* Filtered by band exactly as the app filters: anything whose range starts
       at or below the band you gave. If that leaves nothing, show the lot
       rather than an empty question. */
    var pool = OPENINGS.filter(function (o) { return o.slot === step.slot; });
    var show = pool.filter(function (o) { return o.min <= (+A.band || 1200); });
    return (show.length ? show : pool);
  }

  function ask(n) {
    var step = STEPS[n];
    var blk = document.createElement('section');
    blk.className = 'q';
    blk.dataset.step = n;
    blk.innerHTML = '<h2 class="q-h">' + step.q + '</h2>' +
                    '<p class="q-sub">' + step.sub + '</p>' +
                    '<div class="q-opts"></div>';
    var box = $('.q-opts', blk);
    optsFor(step).forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'q-opt';
      b.innerHTML = '<span class="q-dot" aria-hidden="true"></span>' +
                    '<span class="q-txt"><b></b><i></i></span>';
      $('b', b).textContent = o.name;
      $('i', b).textContent = o.idea;
      b.addEventListener('click', function () { answer(n, o); });
      box.appendChild(b);
    });
    feed.appendChild(blk);
    if (!RM && n > 0) blk.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  /* An answered question collapses to one line you can click to change, so the
     page keeps a record of what you said without the questions piling up. */
  function collapse(n) {
    var step = STEPS[n], blk = feed.querySelector('[data-step="' + n + '"]');
    blk.className = 'q done';
    blk.innerHTML = '<span class="d-k"></span><span class="d-v"></span>' +
                    '<button type="button" class="d-edit">change</button>';
    $('.d-k', blk).textContent = step.label;
    $('.d-v', blk).textContent = A[step.key + '_name'];
    $('.d-edit', blk).addEventListener('click', function () { rewind(n); });
  }

  function rewind(n) {
    $$('[data-step]', feed).forEach(function (el) {
      if (+el.dataset.step >= n) el.parentNode.removeChild(el);
    });
    var out = $('.out', feed); if (out) out.parentNode.removeChild(out);
    STEPS.slice(n).forEach(function (s) { delete A[s.key]; delete A[s.key + '_name']; });
    at = n; ask(n);
  }

  function answer(n, o) {
    var step = STEPS[n];
    A[step.key] = o.id;
    A[step.key + '_name'] = o.name;
    collapse(n);
    at = n + 1;
    if (at < STEPS.length) ask(at); else finish();
  }

  function finish() {
    /* band.white.e4.d4 -- the app parses exactly this and validates each part */
    var payload = [A.band, A.white, A.e4, A.d4].join('.');
    var href = 'https://app.chessforge.org/?ob=' + encodeURIComponent(payload);

    var out = document.createElement('section');
    out.className = 'out';
    out.innerHTML =
      '<p class="out-k">Your repertoire</p>' +
      '<h2 class="out-h">That is the setup. Here is what happens next.</h2>' +
      '<p class="out-w">The app opens on one step with a single button under it. ' +
        'Finish it and the next appears \u2014 you do not choose the order again.</p>' +
      '<dl class="out-rows">' +
        '<div><dt>As White</dt><dd>' + A.white_name + '</dd></div>' +
        '<div><dt>Against 1.e4</dt><dd>' + A.e4_name + '</dd></div>' +
        '<div><dt>Against 1.d4</dt><dd>' + A.d4_name + '</dd></div>' +
        '<div><dt>Starting at</dt><dd>' + A.band_name + '</dd></div>' +
      '</dl>' +
      '<p class="out-note">Your answers travel with you. The app reads them back and ' +
        'asks before it applies anything, and an account is what keeps them off ' +
        'this browser.</p>' +
      '<div class="out-acts">' +
        '<a class="btn btn-fill" id="askGo">Show me my first step</a>' +
        '<a class="btn btn-ghost" href="#pricing">What it costs</a>' +
      '</div>' +
      '<p class="out-fine">Free: one full opening, five middlegame positions and four ' +
        'endgames \u2014 no card, no expiry.</p>';
    feed.appendChild(out);
    $('#askGo', out).href = href;
    if (!RM) out.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  ask(0);

  /* ── the rest of the page ────────────────────────────────────────────── */

  var nav = $('#nav');
  addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('stuck', scrollY > 12);
  }, { passive:true });

  (function () {
    var b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      m.hidden = open;
    });
    $$('a', m).forEach(function (a) {
      a.addEventListener('click', function () {
        b.setAttribute('aria-expanded', 'false'); m.hidden = true;
      });
    });
  })();

  /* Reveals, with a sweep so anything already on screen is shown even if the
     observer never fires -- an anchor that jumps past a section used to leave
     it blank. */
  (function () {
    var els = $$('.reveal');
    if (RM || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); io.unobserve(e.target);
      });
    }, { threshold:.14 });
    els.forEach(function (e) { io.observe(e); });
    function sweep() {
      els.forEach(function (e) {
        if (e.getBoundingClientRect().top < innerHeight) e.classList.add('in');
      });
    }
    addEventListener('scroll', sweep, { passive:true });
    addEventListener('resize', sweep, { passive:true });
    addEventListener('hashchange', sweep);
    sweep();
  })();

  /* boards, painted from FEN */
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
          out += '<span class="ps ' + (((file + r) % 2) ? 'd' : 'l') + '">' +
                 '<img src="pieces/' + p + '.svg" alt="" loading="lazy" decoding="async"></span>';
          file++;
        }
      }
    }
    return out;
  }
  $$('[data-fen]').forEach(function (f) {
    var host = $('.pos-b', f);
    if (host) host.innerHTML = boardHTML(f.getAttribute('data-fen') || '8/8/8/8/8/8/8/8');
    f.classList.add('in');
  });

  /* the judgement */
  (function () {
    var wrap = $('#judge'); if (!wrap) return;
    var askC = $('#judgeAsk'), said = $('#judgeSaid');
    var TRUTH = 'win';
    $$('[data-judge]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var right = b.getAttribute('data-judge') === TRUTH;
        $('#jVerdict').textContent = right ? 'Right \u2014 it is a win.' : 'Not quite. It is a win.';
        $('#jVerdict').className = 'j-verdict ' + (right ? 'good' : 'bad');
        $('#jWhy').textContent = right
          ? 'One pawn and the kings, and it is winning for the side to move \u2014 but only '
            + 'played in the right order. Most players push the pawn here and draw it.'
          : 'This one IS winnable, and that matters: a player who thinks it is drawn '
            + 'stops trying and draws it. The pawn is not the problem \u2014 the order is.';
        askC.hidden = true; said.hidden = false;
      });
    });
    var again = $('#jAgain');
    if (again) again.addEventListener('click', function () {
      said.hidden = true; askC.hidden = false;
    });
  })();

  /* pricing, read from the app so a price here is one Stripe can charge */
  (function () {
    var sw = document.getElementById('billSwitch');
    var pp = document.getElementById('planPrice');
    var note = document.getElementById('offerNote');
    if (!pp) return;
    var P = null;
    fetch('https://app.chessforge.org/plan/pricing')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        P = d; if (sw) sw.hidden = false;
        render('yearly');
      })
      .catch(function () { /* the markup already carries the real figures */ });

    function render(interval) {
      if (!P) return;
      var yearly = interval === 'yearly';
      var amt = yearly ? (P.yearly || 29.99) : (P.monthly || 4.99);
      var was = yearly ? (P.yearly_was || 59.88) : (P.was || 9.99);
      pp.innerHTML = '<s>$' + Number(was).toFixed(2) + '</s>$' + Number(amt).toFixed(2) +
                     '<small>CAD ' + (yearly ? 'a year' : 'a month') + '</small>';
      if (note && P.yearly_off_pct) {
        note.hidden = !yearly;
        note.innerHTML = yearly ? 'Yearly <span class="save">save ' + P.yearly_off_pct + '%</span>' : '';
      }
    }
    if (sw) $$('.bs-b', sw).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.bs-b', sw).forEach(function (x) { x.classList.toggle('on', x === b); });
        render(b.dataset.interval);
      });
    });
  })();

  /* legal modals */
  (function () {
    var open = null;
    function shut() {
      if (open) { open.hidden = true; open = null; document.body.style.overflow = ''; }
    }
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
})();
