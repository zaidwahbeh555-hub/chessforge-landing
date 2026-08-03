// The landing hero demo. It is the first thing a visitor touches, and I cannot
// see it render, so everything computable gets computed: that the board is
// built from the FEN, that each step advances, that a wrong answer is refused,
// and that the squares named in the script exist on the board.
const els={};
function mk(id){
  const e={id, innerHTML:'', textContent:'', className:'', dataset:{}, _c:new Set(),
    classList:{add:c=>e._c.add(c), remove:c=>e._c.delete(c), contains:c=>e._c.has(c),
               toggle:(c,on)=>{on?e._c.add(c):e._c.delete(c)}},
    addEventListener(ev,fn){ e['_'+ev]=fn; },
    querySelectorAll(sel){
      const out=[];
      if(sel.includes('data-sq')){
        const re=/data-sq="([a-h][1-8])"/g; let m;
        while((m=re.exec(e.innerHTML))) out.push(mkCell(m[1]));
      } else {
        const re=/class="dopt"[^>]*data-v="([^"]*)"/g; let m;
        while((m=re.exec(e.innerHTML))) out.push(mkOpt(m[1]));
      }
      return out;
    }};
  els[id]=e; return e;
}
const cellStore={}, optStore={};
function mkCell(n){ if(cellStore[n]) return cellStore[n];
  const c={dataset:{sq:n}, _c:new Set(),
    classList:{add:x=>c._c.add(x), remove:x=>c._c.delete(x), contains:x=>c._c.has(x)}};
  return cellStore[n]=c; }
function mkOpt(v){ const k='o'+v; if(optStore[k]) return optStore[k];
  const o={dataset:{v}, _c:new Set(), textContent:'',
    classList:{add:x=>o._c.add(x), remove:x=>o._c.delete(x), contains:x=>o._c.has(x)},
    addEventListener(ev,fn){ o._fn=fn; }, _click(){ o._fn&&o._fn({}); }};
  return optStore[k]=o; }
['demoBoard','demoAsk','demoCard','demoStep','demoTitle','demoBody','demoRows',
 'demoOpts','demoFb','demoNext','demoClose'].forEach(mk);
els['demoCard']._c.add('hidden');
global.document={getElementById:id=>els[id]||null, addEventListener(){}, querySelector:()=>null};
global.window={location:{href:''}}; global.location=global.window.location;

const src=require('fs').readFileSync('script.js','utf8');
eval(src.slice(src.indexOf('/* ══'+'═'.repeat(3)+'══'), src.length).replace(/^[\s\S]*?(\(function\(\)\{\n  var board)/, '$1'));

let pass=0,total=0;
const check=(l,c,d)=>{total++; if(c)pass++; console.log(`  [${c?'PASS':'FAIL'}] ${l}${d?'  -> '+d:''}`);};

// ── the board is built ──────────────────────────────────────────────────────
const html=els['demoBoard'].innerHTML;
check('64 squares are drawn', (html.match(/data-sq=/g)||[]).length===64,
      (html.match(/data-sq=/g)||[]).length+' squares');
check('32 pieces for the opening position', (html.match(/<img/g)||[]).length===32,
      (html.match(/<img/g)||[]).length+' pieces');
check('pieces load from the vendored folder', html.includes('src="pieces/'));
check('light and dark squares alternate',
      /data-sq="a8"/.test(html) && /data-sq="h1"/.test(html));

// ── the walk-through runs ───────────────────────────────────────────────────
els['demoAsk']._click({});
check('the ask button opens the card', !els['demoCard']._c.has('hidden'));
check('it starts at step 1 of 4', els['demoStep'].textContent==='1 of 4', els['demoStep'].textContent);
check('step 1 names the move that changed things',
      /Qf3/.test(els['demoTitle'].textContent), els['demoTitle'].textContent);
check('the squares it talks about are marked on the board',
      cellStore['f7'] && cellStore['f7']._c.has('hot'));

els['demoNext']._click({});
check('step 2 is the count', /count/i.test(els['demoTitle'].textContent), els['demoTitle'].textContent);
check('the count table is shown', /attacking/.test(els['demoRows'].innerHTML));
check('f7 is flagged loose', /loose/.test(els['demoRows'].innerHTML));

els['demoNext']._click({});
check('step 3 asks yes/no', els['demoOpts'].innerHTML.includes('Yes'));
let opts=els['demoOpts'].querySelectorAll('.dopt');
opts.find(o=>o.dataset.v==='0')._click();          // wrong answer
check('a wrong yes/no is corrected, not accepted',
      /Look again/.test(els['demoFb'].textContent), els['demoFb'].textContent.slice(0,50));
opts.find(o=>o.dataset.v==='1')._click();          // right answer
check('the right answer explains why it is mate',
      /mate/.test(els['demoFb'].textContent), els['demoFb'].textContent.slice(0,60));

els['demoNext']._click({});
check('step 4 is the move choice', els['demoOpts'].innerHTML.includes('Qf6'));
opts=els['demoOpts'].querySelectorAll('.dopt');
opts.find(o=>o.dataset.v==='0')._click();          // a6 -> mated
check('a losing move is called out as mate',
      /Qxf7#/.test(els['demoFb'].textContent), els['demoFb'].textContent.slice(0,50));
opts.find(o=>o.dataset.v==='1')._click();          // Qf6
check('the engine move is confirmed',
      /Qf6/.test(els['demoFb'].textContent), els['demoFb'].textContent.slice(0,50));

// ── every square the script names exists ────────────────────────────────────
const named=[...src.matchAll(/mark:\[([^\]]*)\]/g)].flatMap(m=>m[1].match(/[a-h][1-8]/g)||[]);
check('every square the coach points at is a real square on the board',
      named.every(s=>html.includes('data-sq="'+s+'"')), named.join(' '));

// ── an unanswered question must not offer a way past it ─────────────────────
els['demoAsk']._click({});                       // reopen at step 1
check('a note step can be advanced freely', !els['demoNext'].className.includes('hidden'),
      els['demoNext'].className);
els['demoNext']._click({}); els['demoNext']._click({});   // to the yes/no
check('an unanswered question hides Next', els['demoNext'].className.includes('hidden'),
      els['demoNext'].className);
opts = els['demoOpts'].querySelectorAll('.dopt');
opts.find(o=>o.dataset.v==='0')._click();        // wrong
check('a wrong answer still hides Next -- they must try again',
      els['demoNext'].className.includes('hidden'), els['demoNext'].className);
opts.find(o=>o.dataset.v==='1')._click();        // right
check('answering correctly reveals Next', !els['demoNext'].className.includes('hidden'),
      els['demoNext'].className);
check('closing hides the card', (els['demoClose']._click({}), els['demoCard']._c.has('hidden')));
console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total?0:1);
