/* ChessForge landing — the whole page.
 *
 * Five questions, then a hand-off. They are the SAME questions the app asks at
 * sign-up — the same three bands, the same openings, filtered by band the same
 * way — so answering here finishes the onboarding. The fifth is not sent
 * anywhere; it only chooses which phase the closing animation names.
 *
 * The answers travel in ?ob=band.white.e4.d4 on the link out. A query string
 * and not storage, because chessforge.org and app.chessforge.org are different
 * origins and localStorage does not cross one. The app validates every field
 * against its own library and reads them back before applying anything.
 *
 * OPENINGS is generated from the app's local/data.js. Regenerate it when the
 * library changes, or this page will offer an opening the app does not have.
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
      "min": 0,
      "max": 1400
    },
    {
      "id": "london",
      "name": "London System",
      "slot": "white",
      "idea": "The same setup against almost anything. One system to learn instead of ten.",
      "min": 0,
      "max": 1200
    },
    {
      "id": "vienna",
      "name": "Vienna Game",
      "slot": "white",
      "idea": "Looks like a quiet e4 opening, then the f-pawn arrives and it is not quiet at all.",
      "min": 500,
      "max": 1500
    },
    {
      "id": "queens-gambit",
      "name": "Queen's Gambit",
      "slot": "white",
      "idea": "Not really a gambit. You offer a pawn to pull his d-pawn off the centre, and you get it back.",
      "min": 600,
      "max": 1600
    },
    {
      "id": "scotch",
      "name": "Scotch Game",
      "slot": "white",
      "idea": "Open the centre on move three, before he has finished developing.",
      "min": 400,
      "max": 1400
    },
    {
      "id": "kings-indian-attack",
      "name": "King's Indian Attack",
      "slot": "white",
      "idea": "A setup, not a line. The same six moves against nearly anything he plays.",
      "min": 300,
      "max": 1300
    },
    {
      "id": "caro",
      "name": "Caro-Kann Defence",
      "slot": "e4",
      "idea": "Solid as a wall, and unlike the French your light-squared bishop gets out first.",
      "min": 0,
      "max": 1500
    },
    {
      "id": "scandi",
      "name": "Scandinavian Defence",
      "slot": "e4",
      "idea": "You get to play the same thing every game, and he is out of his book by move two.",
      "min": 0,
      "max": 1100
    },
    {
      "id": "french",
      "name": "French Defence",
      "slot": "e4",
      "idea": "Give him the centre, then break it with c5 and f6. A counter-punching opening.",
      "min": 400,
      "max": 1500
    },
    {
      "id": "philidor-defence",
      "name": "Philidor Defence",
      "slot": "e4",
      "idea": "Rock solid and very easy to remember. Nothing sharp can happen to you early.",
      "min": 0,
      "max": 1000
    },
    {
      "id": "qgd",
      "name": "Queen’s Gambit Declined",
      "slot": "d4",
      "idea": "The most respectable answer to 1.d4 there is. You keep a pawn on d5 and nothing collapses.",
      "min": 400,
      "max": 1500
    },
    {
      "id": "slav",
      "name": "Slav Defence",
      "slot": "d4",
      "idea": "Like the Queen’s Gambit Declined, but the light-squared bishop is not shut in.",
      "min": 500,
      "max": 1500
    },
    {
      "id": "kings-indian",
      "name": "King’s Indian Defence",
      "slot": "d4",
      "idea": "Let him have the centre, castle fast, then blow it up with e5 or c5.",
      "min": 700,
      "max": 1600
    },
    {
      "id": "dutch",
      "name": "Dutch Defence",
      "slot": "d4",
      "idea": "Grab the e4 square on move one and play for an attack from the start.",
      "min": 600,
      "max": 1500
    }
  ];

  var BANDS = [
    [600,  'Just starting',     'Still learning how the pieces work together'],
    [900,  'Around 600\u2013900',  'I know the rules and lose to tactics'],
    [1200, 'Around 900\u20131200', 'I play openings but do not really know them']
  ];

  /* The fifth question changes nothing in the app -- it has nowhere to put it.
     It picks which phase the closing line names, so it is at least not a
     question asked for the sake of asking. */
  var TROUBLE = [
    { id:'drift',  name:'I drift in the middlegame',
      idea:'Nothing is hanging and I have no idea what to do',
      line:'You will start in the middlegame: 43 positions verified to hold no tactic, and the same five questions every time.' },
    { id:'throw',  name:'I throw away endings',
      idea:'Winnable, drawn anyway',
      line:'You will start in the endgame: judge it first \u2014 can this be won at all? \u2014 and only then the method.' },
    { id:'lost',   name:'I am lost once the book runs out',
      idea:'Fine for six moves, then nothing',
      line:'You will start on the 252 off-book replies \u2014 the part nobody else covers.' },
    { id:'forget', name:'I forget what I studied',
      idea:'Learned it, lost it',
      line:'Review is the part that matters for you: 1, 3, 7, 16, 35 and 90 days, arriving just before you lose it.' }
  ];

  var STEPS = [
    { key:'band', label:'Rated',
      q:'Roughly how strong are you?',
      sub:'This decides which openings you are offered. The app asks the same thing, in the same three bands.' },
    { key:'white', label:'As White', slot:'white',
      q:'Choose your opening as White.',
      sub:'One opening learned properly beats four learned badly. You can change it any time in the app.' },
    { key:'e4', label:'Against 1.e4', slot:'e4',
      q:'Choose your answer to 1.e4.',
      sub:'The most common first move there is. Change it whenever you like \u2014 nothing here is locked in.' },
    { key:'d4', label:'Against 1.d4', slot:'d4',
      q:'Choose your answer to 1.d4.',
      sub:'The last opening. These three are your repertoire, and all three can be swapped later.' },
    { key:'trouble', label:'Goes wrong',
      q:'Where do your games actually go wrong?',
      sub:'Be honest. This one is just so the first thing it hands you is the thing you need.' }
  ];

  var feed = $('#askFeed');
  if (!feed) return;
  var A = {}, at = 0;

  /* What this browser answered last time, if anything.
     Every read and write is wrapped: localStorage throws outright in some
     private-browsing modes and comes back empty when site data is cleared, and
     a page that cannot be opened in a private window because of a convenience
     feature is a worse page. It is a convenience and nothing depends on it. */
  var LS = 'cf_landing_v1';
  function remembered() {
    try {
      var raw = localStorage.getItem(LS);
      if (!raw) return null;
      var d = JSON.parse(raw);
      /* Validate against the library the same way the app does. A stale entry
         naming an opening that has since been removed must not be offered. */
      if (!d || [600, 900, 1200].indexOf(+d.band) < 0) return null;
      var ok = ['white', 'e4', 'd4'].every(function (slot) {
        return OPENINGS.some(function (o) { return o.id === d[slot] && o.slot === slot; });
      });
      return ok ? d : null;
    } catch (e) { return null; }
  }
  function remember(d) {
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) {}
  }
  function forget() {
    try { localStorage.removeItem(LS); } catch (e) {}
  }
  function nameOf(id) {
    var o = OPENINGS.filter(function (x) { return x.id === id; })[0];
    return o ? o.name : id;
  }

  /* Everything whose range starts at or below the band you gave -- the same
     filter the app applies. If that leaves nothing, offer the lot rather than
     an empty question. */
  function poolFor(slot) {
    var all = OPENINGS.filter(function (o) { return o.slot === slot; });
    var fit = all.filter(function (o) { return o.min <= (+A.band || 1200); });
    return fit.length ? fit : all;
  }

  /* "Choose for me" picks the opening whose band range is CENTRED nearest the
     level given -- not the highest one you qualify for, which is what the first
     version did and which handed a player who had just said "still learning how
     the pieces work together" the Queen's Gambit. Centred-nearest gives the
     London at 600 and the Queen's Gambit at 1200, which is the right way round.
     Ties go to the gentler opening. Deterministic either way. */
  function bestFor(slot) {
    return poolFor(slot).slice().sort(function (a, b) {
      var am = Math.abs((a.min + a.max) / 2 - (+A.band || 1200));
      var bm = Math.abs((b.min + b.max) / 2 - (+A.band || 1200));
      return am - bm || a.min - b.min;
    })[0];
  }

  function optsFor(step) {
    if (step.key === 'band')    return BANDS.map(function (b) {
      return { id:String(b[0]), name:b[1], idea:b[2] }; });
    if (step.key === 'trouble') return TROUBLE;
    return poolFor(step.slot);
  }

  function ask(n) {
    var step = STEPS[n];
    var blk = document.createElement('section');
    blk.className = 'q';
    blk.dataset.step = n;
    blk.innerHTML = '<h2 class="q-h"></h2><p class="q-sub"></p><div class="q-opts"></div>';
    $('.q-h', blk).textContent = step.q;
    $('.q-sub', blk).textContent = step.sub;

    var box = $('.q-opts', blk);
    optsFor(step).forEach(function (o) { box.appendChild(optBtn(n, o)); });

    /* the openings get an escape hatch for anyone who does not know the names */
    if (step.slot) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'q-opt q-auto';
      b.innerHTML = '<span class="q-dot" aria-hidden="true"></span>' +
                    '<span class="q-txt"><b>Choose for me</b><i></i></span>';
      $('i', b).textContent = 'Pick the best fit for ' +
        (BANDS.filter(function (x) { return String(x[0]) === A.band; })[0] || [,'my level'])[1].toLowerCase();
      b.addEventListener('click', function () {
        var pick = bestFor(step.slot);
        answer(n, { id:pick.id, name:pick.name, auto:true });
      });
      box.appendChild(b);
    }

    feed.appendChild(blk);
    if (!RM && n > 0) blk.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function optBtn(n, o) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'q-opt';
    b.innerHTML = '<span class="q-dot" aria-hidden="true"></span>' +
                  '<span class="q-txt"><b></b><i></i></span>';
    $('b', b).textContent = o.name;
    $('i', b).textContent = o.idea;
    b.addEventListener('click', function () { answer(n, o); });
    return b;
  }

  /* An answered question collapses to one line you can click to change. */
  function collapse(n) {
    var step = STEPS[n], blk = feed.querySelector('[data-step="' + n + '"]');
    blk.className = 'q done';
    blk.innerHTML = '<span class="d-k"></span><span class="d-v"></span>' +
                    '<span class="d-auto" hidden>chosen for you</span>' +
                    '<button type="button" class="d-edit">change</button>';
    $('.d-k', blk).textContent = step.label;
    $('.d-v', blk).textContent = A[step.key + '_name'];
    if (A[step.key + '_auto']) $('.d-auto', blk).hidden = false;
    $('.d-edit', blk).addEventListener('click', function () { rewind(n); });
  }

  function rewind(n) {
    $$('[data-step]', feed).forEach(function (el) {
      if (+el.dataset.step >= n) el.parentNode.removeChild(el);
    });
    STEPS.slice(n).forEach(function (s) {
      delete A[s.key]; delete A[s.key + '_name']; delete A[s.key + '_auto'];
    });
    at = n; ask(n);
  }

  function answer(n, o) {
    var step = STEPS[n];
    A[step.key] = o.id;
    A[step.key + '_name'] = o.name;
    if (o.auto) A[step.key + '_auto'] = true;
    collapse(n);
    at = n + 1;
    if (at < STEPS.length) ask(at); else handOff();
  }

  /* ── the hand-off ──────────────────────────────────────────────────────
     Reads the four answers back while it builds, then goes. The link is real
     and visible the whole time, so a blocked redirect is never a dead end. */
  function handOff() {
    var payload = [A.band, A.white, A.e4, A.d4].join('.');
    remember({ band:+A.band, white:A.white, e4:A.e4, d4:A.d4 });
    var href = 'https://app.chessforge.org/?ob=' + encodeURIComponent(payload);

    var go = $('#go'), rows = $('#goRows'), bar = $('#goBar');
    $('#goLink').href = href;

    var t = TROUBLE.filter(function (x) { return x.id === A.trouble; })[0];
    if (t) $('#goNote').textContent = t.line;

    var lines = [
      ['As White', A.white_name],
      ['Against 1.e4', A.e4_name],
      ['Against 1.d4', A.d4_name],
      ['Starting at', A.band_name]
    ];
    rows.innerHTML = '';
    lines.forEach(function (r) {
      var li = document.createElement('li');
      li.innerHTML = '<span></span><b></b>';
      $('span', li).textContent = r[0];
      $('b', li).textContent = r[1];
      rows.appendChild(li);
    });

    go.hidden = false;
    document.body.classList.add('going');

    if (RM) {                       /* no animation, no surprise redirect */
      $('#goK').textContent = 'Your repertoire is ready';
      bar.style.width = '100%';
      return;
    }

    /* each line locks in, then the bar fills, then we go */
    $$('li', rows).forEach(function (li, i) {
      setTimeout(function () { li.classList.add('in'); }, 160 + i * 190);
    });
    setTimeout(function () { bar.classList.add('run'); }, 200);
    setTimeout(function () { location.href = href; }, 3200);
  }

  /* Returning on the same browser: show what was set up and a way straight
     through, rather than five questions somebody has already answered. */
  function showBack(d) {
    var box = $('#back'), rows = $('#backRows');
    var band = BANDS.filter(function (b) { return b[0] === +d.band; })[0];
    [['As White', nameOf(d.white)],
     ['Against 1.e4', nameOf(d.e4)],
     ['Against 1.d4', nameOf(d.d4)],
     ['Starting at', band ? band[1] : String(d.band)]
    ].forEach(function (r) {
      var li = document.createElement('li');
      li.innerHTML = '<span></span><b></b>';
      $('span', li).textContent = r[0];
      $('b', li).textContent = r[1];
      rows.appendChild(li);
    });
    /* It still carries the answers, so somebody who never made an account the
       first time is not asked to build the repertoire a second time. */
    $('#backGo').href = 'https://app.chessforge.org/?ob=' +
      encodeURIComponent([d.band, d.white, d.e4, d.d4].join('.'));
    $('#backAgain').addEventListener('click', function () {
      forget();
      box.hidden = true;
      feed.innerHTML = '';
      A = {}; at = 0;
      ask(0);
    });
    box.hidden = false;
  }

  var prev = remembered();
  if (prev) showBack(prev); else ask(0);

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
