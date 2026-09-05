/* ══════════════════════════════════════════════════════════════════════════
   ChessForge — landing interactions. Vanilla, no libraries, no build step.
   The hero runs entirely on CSS: it is a demonstration, not a toy, so there is
   nothing here driving it.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── footer year ─────────────────────────────────────────────────────── */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ── mobile menu ─────────────────────────────────────────────────────── */
  var burger = document.getElementById('navBurger');
  var links  = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  /* ── scroll reveal ───────────────────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el, i) {
      // A short stagger inside a group, so rows arrive one after another rather
      // than as a single block.
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── ticker ──────────────────────────────────────────────────────────────
     Statements about what the product does, not invented metrics. There are no
     user counts or "blunders caught" totals here because there is no honest
     number to put in them yet. */
  var TICKER = [
    'coaching that happens during the game',
    'every move checked against Stockfish',
    'puzzles built from your own blunders',
    'a bot that plays to your level',
    'for beginners · ~300–1000 rated',
    'your mistakes, drilled until they stop',
    'no card required to start'
  ];
  var run = document.getElementById('tickerRun');
  if (run) {
    // Twice, so the loop wraps without a gap: the marquee translates by -50%.
    var html = TICKER.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    run.innerHTML = html + html;
  }

  /* ── reviews ─────────────────────────────────────────────────────────────
     There is no carousel here any more. It rotated three testimonials that no
     player had written; the section now carries one signed note from the person
     who built the thing, which is static markup and needs no script. When there
     are real reviews to publish this comes back, reading them from the app
     rather than from an array in this file. */

  /* ── the machine ───────────────────────────────────────────────────────────
     Four screens in one laptop. Pressing a pick swaps the screen, swings the
     rig to a new angle and throws the arrow out with a label on it. The rig
     also leans toward the pointer, which is what sells it as an object rather
     than a picture of one.

     Everything is guarded: the section may not be on the page, and none of this
     may run at all if the visitor has asked for reduced motion. */
  (function () {
    var stage = document.getElementById('machStage');
    var rig   = document.getElementById('machRig');
    var picks = document.getElementById('machPicks');
    var arrow = document.getElementById('machArrow');
    var label = document.getElementById('machLabel');
    if (!stage || !rig || !picks) return;

    var calm = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var VIEWS = {
      coach:  { rx: 11, ry: -15, label: 'Two moves marked on the board. He plays both of them out, then asks which you would rather have.' },
      review: { rx:  9, ry:  -9, label: 'Every move graded. The blunder is the one in red, and you can ask about the position it left behind.' },
      drill:  { rx: 13, ry: -19, label: 'The position you got wrong, back as a drill \u2014 and mixed with other kinds so you have to work out which one it is.' },
      import: { rx:  8, ry: -12, label: 'Thirty games from chess.com in about ten seconds. Username only \u2014 there is no password to give.' }
    };

    /* The boards are real markup now -- real pieces, a real position, generated
       and checked with python-chess so the squares lit up are the squares the
       text talks about. They used to be painted here as 64 empty divs shaded by
       :nth-child, which on an eight-wide grid alternates DOWN THE COLUMNS and
       drew vertical stripes rather than a chessboard. */

    function show(name) {
      var v = VIEWS[name]; if (!v) return;
      Array.prototype.forEach.call(document.querySelectorAll('.scr'), function (s) {
        s.classList.toggle('is-on', s.getAttribute('data-scr') === name);
      });
      Array.prototype.forEach.call(picks.querySelectorAll('.mach-pick'), function (b) {
        var on = b.getAttribute('data-go') === name;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      base.rx = v.rx; base.ry = v.ry;
      if (!calm) rig.style.setProperty('--rx', v.rx + 'deg');
      if (!calm) rig.style.setProperty('--ry', v.ry + 'deg');
      if (label && arrow) {
        arrow.classList.remove('is-on');
        label.textContent = v.label;
        setTimeout(function () { arrow.classList.add('is-on'); }, 90);
      }
    }

    var base = { rx: 11, ry: -15 };

    picks.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.mach-pick');
      if (b) show(b.getAttribute('data-go'));
    });

    /* Lean toward the pointer. Small numbers on purpose -- past about six
       degrees it stops reading as a tilt and starts reading as a wobble. */
    if (!calm) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        rig.style.setProperty('--ry', (base.ry + dx * 6).toFixed(2) + 'deg');
        rig.style.setProperty('--rx', (base.rx - dy * 5).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', function () {
        rig.style.setProperty('--ry', base.ry + 'deg');
        rig.style.setProperty('--rx', base.rx + 'deg');
      });
    }

    // Count the imported games up once, when it is actually looked at.
    var counter = document.getElementById('machCount');
    if (counter && 'IntersectionObserver' in window && !calm) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          io2.unobserve(en.target);
          var n = 0, id = setInterval(function () {
            n += 1; counter.textContent = n;
            if (n >= 30) clearInterval(id);
          }, 26);
        });
      }, { threshold: 0.4 });
      io2.observe(counter);
    }

    show('coach');
  })();

  /* ── the player count, read from the app ─────────────────────────────────
     It used to say 31 because 31 was typed into the HTML the day this was
     written. The number then kept moving and the page did not, so a claim
     about our own product quietly went stale -- which is worse than making no
     claim at all.

     /public/stats returns nothing but a count. If it is slow, blocked, or the
     app is down, the number already in the HTML stands and the page behaves
     exactly as it did before: this can only correct the figure, never empty it.
     Fetched before the count-up animation starts so the reader sees one number
     rather than watching it change. */
  function liveCount(done) {
    var el = document.querySelector('[data-count][data-live="users"]');
    if (!el || !window.fetch) { done(); return; }
    var settled = false;
    function finish() { if (!settled) { settled = true; done(); } }
    // Never let a hanging request stop the animation from running at all.
    setTimeout(finish, 2500);
    fetch('https://app.chessforge.org/public/stats', { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var n = d && d.users;
        if (typeof n === 'number' && n > 0) {
          el.setAttribute('data-count', String(n));
          document.querySelectorAll('[data-live-users]').forEach(function (t) {
            t.textContent = String(n);
          });
        }
      })
      .catch(function () {})
      .then(finish);
  }

  /* Count up once, when the band is actually on screen. */
  var stats = document.getElementById('stats');
  function startStats() {
    if (!(stats && 'IntersectionObserver' in window)) return;
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        so.unobserve(e.target);
        e.target.querySelectorAll('[data-count]').forEach(function (el) {
          var target = parseInt(el.getAttribute('data-count'), 10) || 0;
          var pre = el.getAttribute('data-prefix') || '';
          var suf = el.getAttribute('data-suffix') || '';
          var t0 = null;
          function step(now) {
            if (t0 === null) t0 = now;
            var p = Math.min(1, (now - t0) / 1200);
            var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
            el.textContent = pre + v.toLocaleString() + suf;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.3 });
    so.observe(stats);
  }
  // The count first, then the animation -- so the reader sees one number
  // settle rather than 31 counting up and then correcting itself.
  liveCount(startStats);

  /* ── legal ───────────────────────────────────────────────────────────────
     Real baseline content, in a modal rather than a separate page, so nobody
     loses their place on the way to reading it. */
  var LEGAL = {
    credits: {
      title: 'Credits',
      body: [
        ['Chess piece artwork',
         'The chess pieces on this page and in the app are the work of Colin M.L. Burnett, ' +
         'used under the 3-clause BSD Licence. He publishes them on Wikimedia Commons under a ' +
         'choice of licences \u2014 GFDL 1.2+, CC BY-SA 3.0, GPL v2/v3 and 3-clause BSD \u2014 ' +
         'and ChessForge uses them under the BSD terms. The only change made is a viewBox ' +
         'attribute on each file so the artwork scales with the board; the artwork itself is ' +
         'unmodified. The full licence text ships with the files at /pieces/LICENSE.txt.'],
        ['The BSD conditions, in full',
         'Redistribution and use in source and binary forms, with or without modification, are ' +
         'permitted provided that redistributions of source code retain the above copyright ' +
         'notice, this list of conditions and the following disclaimer; that redistributions in ' +
         'binary form reproduce them in the documentation or other materials provided with the ' +
         'distribution; and that neither the name of the copyright holder nor the names of its ' +
         'contributors are used to endorse or promote products derived from this software ' +
         'without specific prior written permission. This software is provided by the copyright ' +
         'holders and contributors \u201Cas is\u201D and any express or implied warranties, ' +
         'including the implied warranties of merchantability and fitness for a particular ' +
         'purpose, are disclaimed. In no event shall the copyright holder or contributors be ' +
         'liable for any damages arising in any way out of the use of this software.'],
        ['Engine and chess logic',
         'Positions are analysed by Stockfish, free software under the GNU General Public ' +
         'License v3, which runs as a separate program on our server. Move legality uses ' +
         'chess.js (BSD) in the browser and python-chess (GPL v3) on the server, each running ' +
         'as its own component.']
      ]
    },
    terms: {
      title: 'Terms of Service',
      body: [
        ['What ChessForge is',
         'ChessForge is a chess coaching service. You play games against a computer opponent, ' +
         'and the service analyses your play and offers coaching, puzzles and training drawn ' +
         'from it. It is a training aid, not a guarantee of any particular result or rating.'],
        ['Your account',
         'You are responsible for your account and for keeping your password to yourself. ' +
         'One person per account. Tell us if you think someone else has got into it.'],
        ['Acceptable use',
         'Do not use ChessForge to cheat in games played anywhere else, do not try to break, ' +
         'overload or reverse-engineer the service, and do not resell access to it. Accounts ' +
         'used for any of those can be closed without a refund.'],
        ['Subscriptions and payment',
         'The free plan is free. The Grandmaster plan is billed monthly in advance through ' +
         'Stripe, who handle the payment; ChessForge never sees your card number. Prices are ' +
         'shown before you pay, and a founding-member price stays at the rate you signed up at ' +
         'for as long as the subscription runs uninterrupted.'],
        ['Cancelling',
         'You can cancel at any time from inside the app. Cancelling stops the next payment; ' +
         'you keep Grandmaster access until the end of the period you have already paid for. ' +
         'We do not pro-rate part-months.'],
        ['Availability',
         'ChessForge is run by one person and is offered as-is. It may be unavailable for ' +
         'maintenance or for reasons outside our control. If it is down for a long stretch of ' +
         'a paid month, email us and we will sort it out.'],
        ['Liability',
         'To the extent the law allows, ChessForge is not liable for indirect or consequential ' +
         'loss. Nothing here limits liability for anything that cannot legally be limited.'],
        ['Changes',
         'These terms may change. If a change matters, it will be flagged in the app before it ' +
         'takes effect, and continuing to use the service means it applies to you.']
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      body: [
        ['What is collected',
         'An account needs a username, an email address and a password. The password is stored ' +
         'only as a salted PBKDF2 hash — it is never stored in a form anyone can read. ' +
         'Beyond that, what is kept is what the coaching needs: the games you play here, the ' +
         'moves in them, the analysis of those moves, your puzzle and training history, and ' +
         'the weakness profile built from all of it.'],
        ['What it is used for',
         'To run the service and to coach you. Your games and your profile are used to pick ' +
         'what to teach you next. They are not sold, and they are not shared with anyone else.'],
        ['Payments',
         'Payments are processed by Stripe. Card details go to Stripe, never to ChessForge. ' +
         'We store only the subscription status Stripe reports back.'],
        ['Cookies',
         'One cookie, for the login session, so you stay signed in between visits. There is no ' +
         'advertising or third-party tracking on the app.'],
        ['How long it is kept',
         'For as long as you have an account. Delete your account and the games, the profile ' +
         'and the training history go with it.'],
        ['Getting it or removing it',
         'Email the address in the footer to ask for a copy of your data or to have the account ' +
         'and everything in it deleted. It is one person reading that inbox, so allow a few days.']
      ]
    }
  };

  var back  = document.getElementById('legalModal');
  var title = document.getElementById('legalTitle');
  var bodyE = document.getElementById('legalBody');
  var lastFocus = null;

  function openLegal(which) {
    var doc = LEGAL[which];
    if (!doc || !back) return;
    lastFocus = document.activeElement;
    title.textContent = doc.title;
    bodyE.innerHTML = doc.body.map(function (s) {
      return '<h4>' + s[0] + '</h4><p>' + s[1] + '</p>';
    }).join('') +
      '<p class="fine">Baseline wording, written for a small independent product. ' +
      'It is not legal advice, and it is not a substitute for having a lawyer look at it.</p>';
    back.hidden = false;
    document.body.style.overflow = 'hidden';
    var x = back.querySelector('[data-legal-close]');
    if (x) x.focus();
  }
  function closeLegal() {
    if (!back || back.hidden) return;
    back.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var open = e.target.closest && e.target.closest('[data-legal]');
    if (open) { e.preventDefault(); openLegal(open.getAttribute('data-legal')); return; }
    if (e.target.closest && e.target.closest('[data-legal-close]')) { e.preventDefault(); closeLegal(); return; }
    if (back && !back.hidden && e.target === back) closeLegal();
  });
  document.addEventListener('keydown', function (e) {
    if (!back || back.hidden) return;
    if (e.key === 'Escape') { closeLegal(); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the dialog while it is open.
    var f = back.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

})();
