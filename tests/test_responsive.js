// The landing page across screen sizes.
//
// The hero demo was absolutely positioned over the hero and sized independently
// of the text beside it, so the two only stayed apart by coincidence. Widening
// the board -- which it needed, it was 142px -- broke that coincidence: it
// covered 232px of copy at 1440 and 376px at 1280. A MacBook sits right in that
// range.
//
// Run from chessforge-landing/:  node tests/test_responsive.js
const fs=require('fs');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('index.html','utf8');

let pass=0,total=0;
const check=(l,c,d)=>{total++; if(c)pass++; console.log(`  [${c?'PASS':'FAIL'}] ${l}${d?'  -> '+d:''}`);};

// ── the structural fix: they no longer share space ─────────────────────────
const wide=(css.match(/@media \(min-width:1201px\)\{[\s\S]*?\n\}/)||[''])[0];
check('above 1200 the hero is a grid', /\.hero\{[\s\S]*?display:grid/.test(wide));
check('with a column for the text and one for the demo',
      /grid-template-columns:minmax\(0,1fr\) min\(/.test(wide), (wide.match(/grid-template-columns:[^;]*/)||[])[0]);
check('the demo stops being an overlay', /\.hero-demo\{[\s\S]*?position:static/.test(wide));
check('and the text column is allowed to shrink', /minmax\(0,1fr\)/.test(wide));
check('the heading is resized for half the width',
      /\.hero-h1\{font-size:clamp\(/.test(wide), (wide.match(/\.hero-h1\{[^}]*/)||[])[0]);

// ── below that it is hidden, so a cramped board never ships ────────────────
check('the demo is hidden below 1201',
      /@media \(max-width:1200px\)\{\s*\.hero-demo\{display:none\}\s*\}/.test(css));

// ── widening the demo must not have moved other sections' breakpoints ──────
check('features and pricing still stack at their own breakpoint',
      /@media \(max-width:1024px\)\{[\s\S]*?price-layout\{grid-template-columns:1fr\}/.test(css));
// Bounded to the 1200 block itself -- an unbounded search just runs on until it
// finds price-layout in the 1024 block below.
{
  const block=(css.match(/@media \(max-width:1200px\)\{[^}]*\}[^}]*\}/)||[''])[0];
  check('the demo threshold block controls only the demo',
        /hero-demo/.test(block) && !/price-layout|feat-hero|plan-free/.test(block),
        block.replace(/\s+/g,' ').slice(0,60));
}

// ── the arithmetic, at the sizes people actually have ─────────────────────
const edge = w => Math.min(Math.max(w*0.05, 20), 96);
const gap  = w => Math.min(Math.max(w*0.03, 24), 48);
function layout(w){
  if(w <= 1200) return {demo:0, text:w-2*edge(w), board:0};
  const d=Math.min(30*16, w*0.34);
  return {demo:d, text:w-2*edge(w)-d-gap(w), board:(d-32-16)*(1.6/2.6)};
}
[[1201,'smallest width that shows it'],[1280,'MacBook Air 13'],[1440,'MacBook 15 / common desktop'],
 [1512,'MacBook Pro 14'],[1728,'MacBook Pro 16'],[1920,'1080p'],[2560,'1440p']].forEach(([w,label])=>{
  const L=layout(w);
  check(`${w}px (${label}): text and demo both fit`, L.text > 0 && L.demo > 0,
        `text ${L.text.toFixed(0)}px, demo ${L.demo.toFixed(0)}px, board ${L.board.toFixed(0)}px`);
});
[[390,'iPhone'],[768,'iPad portrait'],[1024,'iPad landscape'],[1180,'small laptop']].forEach(([w,label])=>{
  const L=layout(w);
  check(`${w}px (${label}): demo hidden, text gets the full width`,
        L.demo === 0 && L.text > 0, `text ${L.text.toFixed(0)}px`);
});

// The headline has to stay big. The ceiling is arithmetic: the longest line,
// "that knows your", needs about 6.9em, so type can be column width / 6.9.
{
  const m=/\.hero-h1\{font-size:clamp\(([\d.]+)rem,([\d.]+)vw,([\d.]+)rem\)/.exec(wide);
  check('the headline clamp is readable at both ends', !!m, m && m[0]);
  const [,lo,vw,hi]=m.map(Number);
  check('it is not the small over-correction', vw >= 7 && hi >= 6.5, vw+'vw, cap '+hi+'rem');
  [[1280,90],[1440,100],[1920,105]].forEach(([w,want])=>{
    const px=Math.min(Math.max(lo*16, w*vw/100), hi*16);
    const text=layout(w).text;
    check(`${w}px: headline is ${px.toFixed(0)}px and fits the column`,
          px >= want && px*6.9 <= text, px.toFixed(0)+'px, needs '+(px*6.9).toFixed(0)+' of '+text.toFixed(0));
  });
}

// ── a board worth showing wherever it is shown ────────────────────────────
[1201,1280,1440,1920].forEach(w=>{
  const b=layout(w).board;
  check(`${w}px: the board is legible (>=210px)`, b >= 210, b.toFixed(0)+'px');
});

// ── no fixed widths that cannot shrink ─────────────────────────────────────
const fixed=[...css.matchAll(/([.#][a-z0-9-]+)\{([^}]*)\}/gi)]
  // 400px is the bar: anything at or above that cannot fit a narrow phone's
  // content box, while smaller fixed sizes (a 200px divider, say) are safe.
  .filter(m=>{
    const w=/(?<![-a-z])width:\s*(\d+)px/.exec(m[2]);
    return w && +w[1] >= 400 && !/max-width|min\(/.test(m[2]);
  })
  .map(m=>m[1]);
check('nothing carries an unshrinkable fixed width', fixed.length===0, fixed.join(',') || 'none');

// ── the demo still hides on the breakpoints that already existed ──────────
check('mobile nav breakpoint untouched', /@media \(max-width:760px\)/.test(css));
check('the demo body stacks on narrow windows', /@media \(max-width: 900px\)\{\s*\.demo-body\{grid-template-columns:1fr\}/.test(css));

console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total?0:1);
