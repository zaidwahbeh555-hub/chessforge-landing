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
  /* ── Interactive hero puzzle: back-rank mate (White to move, Rd8#) ── */
  var boardEl = document.getElementById('demoBoard');
  var coachTextEl = document.getElementById('demoCoachText');

  // App-matching Staunton SVG pieces
  var FB_BASE = '<path d="M9.5 42.5 L35.5 42.5 L35.5 39.5 Q35.5 37.5 33 37.5 L12 37.5 Q9.5 37.5 9.5 39.5 Z"/><path d="M12.5 37.5 L32.5 37.5 L31 32 L14 32 Z"/>';
  var FB = {
    k:'<rect x="21" y="4" width="3" height="8" rx="1"/><rect x="18.5" y="6.5" width="8" height="3" rx="1"/><path d="M22.5 12 C16 12 13 18 17 24 Q22.5 20 28 24 C32 18 29 12 22.5 12 Z"/><path d="M15 24 Q22.5 20 30 24 L29 32 L16 32 Z"/>'+FB_BASE,
    q:'<circle cx="10" cy="13" r="2.6"/><circle cx="17.5" cy="9.5" r="2.6"/><circle cx="27.5" cy="9.5" r="2.6"/><circle cx="35" cy="13" r="2.6"/><circle cx="22.5" cy="8" r="2.6"/><path d="M10 14 L13.5 27 L31.5 27 L35 14 L29 20 L25.5 12 L22.5 19 L19.5 12 L16 20 Z"/><path d="M13.5 27 L31.5 27 L30 32 L15 32 Z"/>'+FB_BASE,
    b:'<circle cx="22.5" cy="6" r="2.6"/><path d="M22.5 9 C29 13 30 21 24 27 L21 27 C15 21 16 13 22.5 9 Z"/><rect x="20.5" y="15" width="4" height="1.8" rx=".6"/><rect x="21.6" y="13.9" width="1.8" height="4" rx=".6"/><path d="M17 27 L28 27 L29.5 32 L15.5 32 Z"/>'+FB_BASE,
    n:'<path d="M13 42 C12 33 14 28 18 25 C13.5 24 12 19 15 15 C17 12 15 11 14.5 8 L18 10 C20 7 25 7 28 11 C31.5 15.5 32 24 31 30 C30.5 34 31 38 31 42 Z"/><circle class="fb-eye" cx="17.5" cy="17" r="1.5"/>',
    r:'<path d="M12 9 L12 15 L33 15 L33 9 L28.5 9 L28.5 11.5 L25 11.5 L25 9 L20 9 L20 11.5 L16.5 11.5 L16.5 9 Z"/><path d="M14.5 15 L30.5 15 L29 20 L16 20 Z"/><path d="M16 20 L29 20 L30.5 32 L14.5 32 Z"/>'+FB_BASE,
    p:'<circle cx="22.5" cy="11" r="5.2"/><path d="M18 17 L27 17 L26 20 L19 20 Z"/><path d="M17.5 32 Q16 24 22.5 20 Q29 24 27.5 32 Z"/>'+FB_BASE
  };
  function pieceSVG(code){ return '<svg class="dp '+code[0]+'" viewBox="0 0 45 45">'+FB[code[1]]+'</svg>'; }

  // 6k1/5ppp/8/8/8/8/5PPP/R5RK w — two rooks, but only Ra8 is mate (g-rook blocked by g2)
  var START = [
    ['','','','','','','bk',''],
    ['','','','','','bp','bp','bp'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','wp','wp','wp'],
    ['wr','','','','','','wr','wk']
  ];
  var POSITION = START.map(function(r){ return r.slice(); });
  var SOL = { to:[0,0] };            // a8 — only the a-file rook reaches the back rank
  var selected = null, solved = false;

  function say(t){ if(coachTextEl) coachTextEl.innerHTML = t; }

  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    for(var r=0;r<8;r++){ for(var f=0;f<8;f++){
      var sq = document.createElement('div');
      sq.className = 'sq ' + (((r+f)%2===0) ? 'light' : 'dark');
      sq.dataset.rc = r+'-'+f;
      var code = POSITION[r][f];
      if(code) sq.innerHTML = pieceSVG(code);
      if(selected && selected[0]===r && selected[1]===f) sq.classList.add('sel');
      if(solved && r===0 && f===6) sq.classList.add('mate');
      frag.appendChild(sq);
    }}
    boardEl.appendChild(frag);
  }

  function rookMoves(r,f){
    var color = POSITION[r][f][0], out = [];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
      var rr=r+d[0], ff=f+d[1];
      while(rr>=0&&rr<8&&ff>=0&&ff<8){
        var occ = POSITION[rr][ff];
        if(!occ){ out.push([rr,ff]); }
        else { if(occ[0]!==color) out.push([rr,ff]); break; }
        rr+=d[0]; ff+=d[1];
      }
    });
    return out;
  }
  function showDots(moves){
    moves.forEach(function(m){
      var el = boardEl.querySelector('[data-rc="'+m[0]+'-'+m[1]+'"]');
      if(!el) return;
      var d = document.createElement('div');
      d.className = POSITION[m[0]][m[1]] ? 'dp-ring' : 'dp-dot';
      el.appendChild(d);
    });
  }
  function shake(){ boardEl.classList.remove('shk'); void boardEl.offsetWidth; boardEl.classList.add('shk'); }

  function onSquare(r,f){
    if(solved || !boardEl) return;
    var code = POSITION[r][f];
    if(selected){
      var moves = rookMoves(selected[0], selected[1]);
      var isTarget = moves.some(function(m){ return m[0]===r && m[1]===f; });
      if(isTarget){
        if(r===SOL.to[0] && f===SOL.to[1]){
          POSITION[r][f] = POSITION[selected[0]][selected[1]];
          POSITION[selected[0]][selected[1]] = '';
          selected = null; solved = true; render();
          say('✔ <b>Ra8 — checkmate!</b> The a-rook swings across; the g-rook was stuck behind its own pawn. This is what your coach spots for you <em>before</em> it matters.');
          boardEl.classList.add('win');
          return;
        }
        selected = null; render();
        say('Not that square — the other rook can\'t get there. Think <b>back rank</b>, a-file. Try again.');
        shake();
        return;
      }
      selected = null; render();
    }
    if(code === 'wr'){
      selected = [r,f]; render(); showDots(rookMoves(r,f));
      say('Good. Now — which square ends it? Look hard at the <b>back rank</b>.');
    } else if(code && code[0]==='w'){
      say('Use a <b>rook</b> — that\'s your mating piece here.');
    }
  }

  if(boardEl){
    render();
    say('White to move. Two rooks — but only <b>one</b> reaches the back rank. Black never made luft. Find the mate.');
    boardEl.addEventListener('click', function(e){
      var cell = e.target.closest ? e.target.closest('.sq') : null;
      if(!cell) return;
      var rc = cell.dataset.rc.split('-');
      onSquare(+rc[0], +rc[1]);
    });
  }
})();
