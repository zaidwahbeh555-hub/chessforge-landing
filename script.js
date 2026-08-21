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
    '600–1600 Elo',
    'your mistakes, drilled until they stop',
    'no card required to start'
  ];
  var run = document.getElementById('tickerRun');
  if (run) {
    // Twice, so the loop wraps without a gap: the marquee translates by -50%.
    var html = TICKER.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    run.innerHTML = html + html;
  }

  /* ── legal ───────────────────────────────────────────────────────────────
     Real baseline content, in a modal rather than a separate page, so nobody
     loses their place on the way to reading it. */
  var LEGAL = {
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
