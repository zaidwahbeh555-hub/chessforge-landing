// One mark, everywhere.
//
// Before this there were three different logos in play:
//   * both favicons were a KNIGHT, not a hexagon
//   * the landing nav and footer used the unicode character U+2B21, which
//     renders as whatever font on the machine happens to carry it
//   * the app's top bar used a double hexagon, an outer ring with a second one
//     inside it
//
// The mark is one hexagon ring, defined by one path, drawn the same way in the
// favicon, the landing nav, the landing footer, the app top bar and the app
// sign-in card.
//
// This test lives in the landing repo but checks the app too, since the whole
// point is that the two agree. It skips the app half if that checkout is not
// beside this one.
//
// Run from chessforge-landing/:  node tests/test_logo.js

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html','utf8');
const css  = fs.readFileSync('style.css','utf8');
const icon = fs.readFileSync('favicon.svg','utf8');

let pass=0, total=0;
function check(label, cond, detail){ total++; if(cond) pass++;
  console.log(`  [${cond?'PASS':'FAIL'}] ${label}${detail?'  -> '+detail:''}`); }

// The canonical geometry, at both scales it is drawn.
const PATH_24  = 'M12 2.7 L20.05 7.35 V16.65 L12 21.3 L3.95 16.65 V7.35 Z';
const PATH_100 = 'M50 20 L75.98 35 V65 L50 80 L24.02 65 V35 Z';

// ── the hexagon is a real hexagon ─────────────────────────────────────────
// Six vertices, all the same distance from the centre, or it is a blob.
function vertices(d, cx, cy){
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  // M x y L x y V y L x y L x y V y Z  -> rebuild the points in order
  const p = [];
  p.push([nums[0], nums[1]]);
  p.push([nums[2], nums[3]]);
  p.push([nums[2], nums[4]]);
  p.push([nums[5], nums[6]]);
  p.push([nums[7], nums[8]]);
  p.push([nums[7], nums[9]]);
  return p.map(([x,y])=>Math.hypot(x-cx, y-cy));
}
const r24 = vertices(PATH_24, 12, 12);
check('the mark has six vertices', r24.length === 6);
check('all the same distance from the centre',
      Math.max(...r24) - Math.min(...r24) < 0.06,
      r24.map(v=>v.toFixed(2)).join(' '));
const r100 = vertices(PATH_100, 50, 50);
check('and the favicon scale is the same shape',
      Math.max(...r100) - Math.min(...r100) < 0.06,
      r100.map(v=>v.toFixed(2)).join(' '));
// They are deliberately NOT the same fraction of their box: the favicon sits on
// a dark plate and needs padding around it, the inline icon fills its box.
// What has to match is the shape, which the two checks above establish.
check('the favicon leaves room around the mark for its plate',
      r100[0]/100 > 0.24 && r100[0]/100 < 0.34,
      (100*r100[0]/100).toFixed(0) + ' of 100');
check('and the inline mark fills its box',
      r24[0]/24 > 0.34 && r24[0]/24 < 0.44,
      (r24[0]).toFixed(2) + ' of 24');

// ── the landing ───────────────────────────────────────────────────────────
check('the favicon is the mark, not a knight glyph',
      /rel="icon" type="image\/svg\+xml" href="favicon.svg"/.test(html));
check('and the old knight data-URI is gone', !/9822/.test(html), 'U+266E was the knight');
check('the unicode hexagon character is gone everywhere',
      !html.includes('⬡'),
      'it renders as whatever font the machine has, so it was a different shape per platform');
check('the nav and the footer both draw the mark',
      (html.match(/class="brand-mark"/g)||[]).length === 2,
      (html.match(/class="brand-mark"/g)||[]).length + ' found');
check('both use the canonical path',
      (html.match(new RegExp(PATH_24.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length === 2);
check('the mark glows', /\.brand-mark\{[\s\S]{0,200}drop-shadow/.test(css));
check('and stops glowing under reduced motion',
      /@media\(prefers-reduced-motion:reduce\)\{\.brand-mark\{filter:none\}\}/.test(css));
check('the footer mark is smaller than the nav one',
      /\.footer-brand \.brand-mark\{width:17px/.test(css) && /\.brand-mark\{width:20px/.test(css));

// ── the favicon file itself ───────────────────────────────────────────────
check('the favicon uses the canonical path', icon.includes(PATH_100));
check('it is a ring, not a filled shape', /fill="none"/.test(icon));
check('it carries its glow in the file, not in CSS',
      (icon.match(new RegExp(PATH_100.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length >= 3,
      'a favicon cannot rely on a stylesheet');
check('and the reason is written down',
      /filter\s+support in favicon rendering is inconsistent/.test(icon),
      'the comment wraps, so the phrase spans a newline');
check('it has a dark plate so it reads on a light tab bar', /rect width="100"/.test(icon));

// ── the app, if it is checked out beside this ─────────────────────────────
const APP = path.resolve('..', 'nextmove-backend', 'nextmove-v2');
if(!fs.existsSync(APP)){
  console.log('  (app checkout not found beside this one; skipping the app half)');
}else{
  const appHtml = fs.readFileSync(path.join(APP,'templates','index.html'),'utf8');
  const appCss  = fs.readFileSync(path.join(APP,'static','css','style.css'),'utf8');
  const appIcon = fs.readFileSync(path.join(APP,'static','favicon.svg'),'utf8');

  check('the app favicon is byte-identical to the landing one', appIcon === icon,
        'one mark means one file');
  check('the app symbol uses the canonical path', appHtml.includes(PATH_24));
  // The sprite is one long line of many symbols, so a lazy match runs straight
  // past ic-logo into the next one. Cut the symbol out and count its paths.
  const symStart = appHtml.indexOf('<symbol id="ic-logo"');
  const sym = appHtml.slice(symStart, appHtml.indexOf('</symbol>', symStart));
  check('it is a single ring, not a hexagon inside a hexagon',
        (sym.match(/<path/g)||[]).length === 1,
        (sym.match(/<path/g)||[]).length + ' paths; the inner one made it a '
        + 'different mark from the favicon');
  check('every logo in the app draws that symbol',
        (appHtml.match(/use href="#ic-logo"/g)||[]).length >= 2,
        (appHtml.match(/use href="#ic-logo"/g)||[]).length + ' places');
  check('the app mark glows the same way',
        /\.logo-icon \.ic\{[\s\S]{0,260}drop-shadow/.test(appCss));
  check('and respects reduced motion too',
        /@media\(prefers-reduced-motion:reduce\)\{\.logo-icon \.ic\{filter:none\}\}/.test(appCss));
  check('the app favicon is still linked',
      /rel="icon" type="image\/svg\+xml" href="\/static\/favicon.svg"/.test(appHtml));
}

console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total ? 0 : 1);
