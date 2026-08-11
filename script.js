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

})();


/* ═══════════════════════════════════════════════════════════════════════════
   HERO DEMO — GM Forge walking through a real position
   The markup for this existed but nothing ever drove it, so the hero showed an
   empty board reading "Watching your position…" forever.

   The Scholar's Mate idea, mirrored so the visitor is WHITE and therefore
   sitting at the bottom of the board where they expect to be. Facing the
   position from the black side, upside down, is not how anyone reads a board.

   Every number below was checked against Stockfish before being written down:
   f2 really is attacked twice (Bc5, Qf6) and defended once, and only by the
   king; a3, Bd3 and Nd5 really are all mated by ...Qxf2#; and Qf3 really is
   the engine's first choice at depth 20.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  var board = document.getElementById('demoBoard');
  if(!board) return;

  var PIECES = 'pieces/';   // vendored so the hero survives the app being down
  var FEN = 'rnb1k1nr/pppp1ppp/5q2/2b1p3/4P3/2N5/PPPP1PPP/R1BQKBNR';
  var FILES = 'abcdefgh';
  var cells = {};

  function draw(){
    var rows = FEN.split('/'), html = '';
    for(var r = 0; r < 8; r++){
      var file = 0;
      for(var k = 0; k < rows[r].length; k++){
        var ch = rows[r][k];
        if(/\d/.test(ch)){
          for(var e = 0; e < +ch; e++){ html += sq(file, r, null); file++; }
        } else {
          html += sq(file, r, (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
          file++;
        }
      }
    }
    board.innerHTML = html;
    board.querySelectorAll('[data-sq]').forEach(function(el){ cells[el.dataset.sq] = el; });
  }
  function sq(file, rank, code){
    var name = FILES[file] + (8 - rank);
    var light = (file + rank) % 2 === 0;
    return '<div class="dsq ' + (light ? 'l' : 'd') + '" data-sq="' + name + '">'
      + (code ? '<img alt="" loading="lazy" src="' + PIECES + code + '.svg">' : '')
      + '</div>';
  }
  draw();

  /* The walk-through. Same shape as the one in the app: see what changed, count
     it, decide whether anything is loose, then choose. */
  var STEPS = [
    {kind:'note', title:'They just played Qf6. What changed?',
     body:'It attacked your pawn on f2, which is now hit 2 times and defended 1 — '
        + 'and the only thing defending it is your king. Go through it properly.',
     mark:['f2','f6','c5']},
    {kind:'count', title:'Start by counting.',
     body:'Before anything else: what is attacked, and is it defended enough?',
     rows:[{p:'pawn f2', a:2, d:1, loose:true}, {p:'pawn e4', a:0, d:1, loose:false}],
     mark:['f2']},
    {kind:'yesno', title:'Is anything of yours actually loose?',
     body:'Loose means attacked more times than it is defended.',
     answer:true,
     yes:'Correct — f2 is attacked twice and defended once. And if the queen takes it, '
       + 'the bishop on c5 covers the escape square. That is mate, not a lost pawn.',
     no:'Look again at f2 — two attackers, one defender, and the defender is your king.',
     mark:['f2']},
    {kind:'mcq', title:'So what do you play?',
     body:'Something of yours is hanging. Defend it, move it, or make a bigger threat.',
     options:['a3', 'Qf3', 'Bd3'], answer:1,
     right:'Yes — Qf3. It defends f2 a second time and offers the trade. The engine likes it best.',
     wrong:'That one gets mated: ...Qxf2#. Look at what is defending f2 before you develop.',
     mark:['f2']}
  ];

  var i = 0, answered = false, tries = 0;
  var $ = function(id){ return document.getElementById(id); };
  function el(id){ return $(id); }

  function markSquares(list){
    Object.keys(cells).forEach(function(k){ cells[k].classList.remove('mark','hot'); });
    (list || []).forEach(function(s, n){
      if(cells[s]) cells[s].classList.add(n === 0 ? 'hot' : 'mark');
    });
  }

  function render(){
    var s = STEPS[i];
    answered = false; tries = 0;
    el('demoStep').textContent = (i + 1) + ' of ' + STEPS.length;
    el('demoTitle').textContent = s.title;
    el('demoBody').textContent = s.body;
    el('demoFb').className = 'demo-fb hidden';
    el('demoFb').textContent = '';
    el('demoNext').className = 'demo-next hidden';
    markSquares(s.mark);

    var rows = el('demoRows');
    if(s.kind === 'count'){
      rows.innerHTML = s.rows.map(function(r){
        return '<div class="drow' + (r.loose ? ' loose' : '') + '">'
          + '<span>' + r.p + '</span><span>' + r.a + ' attacking</span>'
          + '<span>' + r.d + ' defending</span>'
          + (r.loose ? '<span class="dtag">loose</span>' : '') + '</div>';
      }).join('');
      rows.className = 'demo-rows';
    } else { rows.innerHTML = ''; rows.className = 'demo-rows hidden'; }

    var opts = el('demoOpts');
    if(s.kind === 'yesno'){
      opts.innerHTML = '<button class="dopt" data-v="1">Yes</button>'
                     + '<button class="dopt" data-v="0">No</button>';
      wire(opts, function(v){
        var ok = (v === '1') === s.answer;
        tries++;
        var done = mark(opts, v, s.answer ? '1' : '0', ok);
        say(ok ? s.yes : s.no, ok, done);
      });
    } else if(s.kind === 'mcq'){
      opts.innerHTML = s.options.map(function(o, n){
        return '<button class="dopt" data-v="' + n + '">' + o + '</button>';
      }).join('');
      wire(opts, function(v){
        var ok = (+v === s.answer);
        tries++;
        var done = mark(opts, v, String(s.answer), ok);
        say(ok ? s.right : s.wrong, ok, done);
      });
    } else {
      opts.innerHTML = '';
      el('demoNext').textContent = 'Next';
      el('demoNext').className = 'demo-next';
    }
  }

  function wire(box, cb){
    box.querySelectorAll('.dopt').forEach(function(b){
      b.addEventListener('click', function(){
        if(answered) return;
        cb(b.dataset.v);
      });
    });
  }
  // A wrong answer explains and lets them go again -- it does not reveal the
  // right one and lock the card. Locking on the first click meant anyone who
  // guessed wrong never got to read why the real move works, which is the
  // whole point of the demo. Two misses and it shows them.
  function mark(box, chosen, correct, ok){
    var give = ok || tries >= 2;
    box.querySelectorAll('.dopt').forEach(function(b){
      if(b.dataset.v === chosen){ b.classList.add(ok ? 'right' : 'wrong'); b.disabled = true; }
      if(give){ b.disabled = true; if(b.dataset.v === correct) b.classList.add('right'); }
    });
    answered = give;
    return give;
  }
  function say(text, ok, done){
    var fb = el('demoFb');
    fb.textContent = text;
    fb.className = 'demo-fb ' + (ok ? 'ok' : 'no');
    var n = el('demoNext');
    n.textContent = (i < STEPS.length - 1) ? 'Next' : 'Try it on your own game →';
    n.className = done ? 'demo-next' : 'demo-next hidden';
  }

  function open(){
    i = 0;
    el('demoCard').classList.remove('hidden');
    el('demoAsk').classList.add('hidden');
    render();
  }
  function close(){
    el('demoCard').classList.add('hidden');
    el('demoAsk').classList.remove('hidden');
    markSquares([]);
  }

  el('demoAsk').addEventListener('click', open);
  el('demoClose').addEventListener('click', close);
  el('demoNext').addEventListener('click', function(){
    if(i < STEPS.length - 1){ i++; render(); }
    else { window.location.href = 'https://app.chessforge.org'; }
  });
})();
