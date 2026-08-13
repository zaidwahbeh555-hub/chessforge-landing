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
const js=fs.readFileSync('script.js','utf8');

let pass=0,total=0;
const check=(l,c,d)=>{total++; if(c)pass++; console.log(`  [${c?'PASS':'FAIL'}] ${l}${d?'  -> '+d:''}`);};

// ── the structural fix: they no longer share space ─────────────────────────
const wide=(css.match(/@media \(min-width:1201px\)\{[\s\S]*?\n\}/)||[''])[0];
check('above 1200 the hero is a grid', /\.hero\{[\s\S]*?display:grid/.test(wide));
check('with a column for the text and one for the demo',
      /grid-template-columns:minmax\(0,1fr\) min\(/.test(wide), (wide.match(/grid-template-columns:[^;]*/)||[])[0]);
check('the demo stops being an overlay', /\.hero-demo\{[\s\S]*?position:static/.test(wide));
check('it is lifted from centre, not relocated to the top',
      /\.hero-demo\{[\s\S]*?align-self:center/.test(wide) &&
      /\.hero-demo\{[\s\S]*?transform:translateY\(clamp\(-/.test(wide),
      (wide.match(/transform:translateY\(clamp\([^)]*\)\)/)||[])[0]);
// A negative margin on a centre-aligned grid item only moves it half the value,
// because centring splits the free space either side of the margin box. That is
// why the first attempt looked like nothing had happened.
check('the lift is a transform, so it moves the full amount',
      !/\.hero-demo\{[\s\S]*?margin-top:clamp\(-/.test(wide));
{
  const m=/transform:translateY\(clamp\(-([\d.]+)rem,-([\d.]+)vh,-([\d.]+)rem\)\)/.exec(wide);
  check('the lift is visible at a normal window height', !!m && +m[2] >= 6,
        m ? m[2]+'vh' : 'none');
  if(m){
    [800,900,1050].forEach(vh=>{
      const px=Math.min(Math.max(+m[1]*16, vh*+m[2]/100), +m[3]*16);
      check(`${vh}px tall: lifted ${px.toFixed(0)}px above centre`, px >= 55,
            px.toFixed(0)+'px');
    });
  }
}
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

// ══ the demo: bigger and higher, without moving anything else ════════════
// The ask was "make it bigger and more up, WITHOUT changing anything else, no
// other sizes". So the size comes from a transform, not from the grid: widening
// the demo column takes width out of the text column, and the headline is
// already at its ceiling there -- its longest line needs about 6.9em, which at
// 1440 allows 108px against the 107px it asks for.
check('the demo column is untouched, so the headline is too',
      /grid-template-columns:minmax\(0,1fr\) min\(30rem,34vw\)/.test(wide),
      'widening it would force the h1 to shrink at 1201-1440');
check('the headline rule is unchanged',
      /\.hero-h1\{font-size:clamp\(2\.9rem,7\.4vw,7rem\)\}/.test(wide));
check('the demo is scaled up instead', /scale\(1\.14\)/.test(wide));
check('from its centre, so it grows into the gutter on both sides',
      /transform-origin:center center/.test(wide));
check('and it sits higher than it did', /translateY\(clamp\(-8\.5rem,-11vh,-4\.5rem\)\)/.test(wide),
      'was clamp(-7rem,-9vh,-3.5rem)');

// Growing from the centre must never reach the text column.
let overlap = [];
for(const w of [1201, 1280, 1366, 1440, 1600, 1920, 2560]){
  const col  = Math.min(30*16, 0.34*w);
  const grow = (col*1.14 - col) / 2;
  const gap  = Math.max(24, Math.min(0.03*w, 48));
  if(grow > gap) overlap.push(w + 'px: grows ' + grow.toFixed(0) + ' into a ' + gap.toFixed(0) + 'px gap');
}
check('the scaled demo never reaches the text column at any width',
      !overlap.length, overlap.join('; '));

// And the lift must not carry it up under the nav.
let tooHigh = [];
for(const h of [720, 800, 900, 1080, 1440, 1600]){
  const lift = Math.max(4.5*16, Math.min(0.11*h, 8.5*16));
  const pad  = Math.max(6*16,   Math.min(0.12*h, 9*16));
  if(lift >= pad) tooHigh.push(h + 'px tall');
}
check('and never lifts past the hero padding at any height',
      !tooHigh.length, tooHigh.join('; '));

// ── the "press me" nudge ─────────────────────────────────────────────────
check('there is a press-me hint', /id="demoHint"/.test(html));
check('it says press me', /<em>press me<\/em>/.test(html));
check('with an arrow pointing at the button', /class="demo-hint"[\s\S]{0,320}<svg/.test(html));
check('it is decorative to screen readers', /class="demo-hint" id="demoHint" aria-hidden="true"/.test(html));
check('it is absolutely positioned, so it costs the layout nothing',
      /\.demo-hint\{[\s\S]{0,120}position:absolute/.test(css));
check('its anchor is the button itself, not the column',
      /\.demo-askwrap\{position:relative; display:block\}/.test(css),
      'anchored to the column it sat at the bottom pointing at nothing');
check('and the markup wraps the two together',
      /<span class="demo-askwrap">[\s\S]{0,600}id="demoAsk"/.test(html));
check('it is centred on the button vertically',
      /\.demo-hint\{[\s\S]{0,200}top:50%; transform:translateY\(-50%\)/.test(css));
check('the nudge keeps that centring instead of dropping it',
      /@keyframes demoNudge\{[\s\S]{0,140}translate\(-5px,-50%\)/.test(css));
check('the arrow points right, at the button beside it',
      /d="M3 6c10 -3 22 1 33 11"/.test(html), 'shaft ends at the tip, x=36 of 40');
check('with a head at that tip', /M36 17L27\.1 15\.5/.test(html) && /M36 17L32\.9 8\.6/.test(html));
check('and it turns to point down when it moves above the button',
      /@media \(max-width:1200px\)\{[\s\S]{0,300}\.demo-hint svg\{transform:rotate\(52deg\)\}/.test(css));
check('it cannot swallow the click it is pointing at',
      /\.demo-hint\{[\s\S]{0,220}pointer-events:none/.test(css));
check('it leaves once the demo is opened', /hint\.classList\.add\('gone'\)/.test(js));
check('and there is a rule that hides it', /\.demo-hint\.gone\{/.test(css));
check('it moves to above the button where there is no room beside it',
      /@media \(max-width:1200px\)\{[\s\S]{0,300}\.demo-hint\{\s*\n?\s*right:auto/.test(css));
check('reduced motion stops it nudging',
      /@media\(prefers-reduced-motion:reduce\)\{\.demo-hint\{animation:none\}\}/.test(css));

console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total?0:1);
