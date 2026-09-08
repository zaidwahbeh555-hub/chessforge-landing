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
// The page ships v3-styles.css now; style.css is the retired sheet.
const css  = fs.readFileSync('v3-styles.css','utf8');
const icon = fs.readFileSync('logo.svg','utf8');

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
check('the favicon leaves room around the mark for its glow to fall off',
      r100[0]/100 > 0.24 && r100[0]/100 < 0.34,
      (100*r100[0]/100).toFixed(0) + ' of 100');
check('and the inline mark fills its box',
      r24[0]/24 > 0.34 && r24[0]/24 < 0.44,
      (r24[0]).toFixed(2) + ' of 24');

// ── the landing ───────────────────────────────────────────────────────────
// The mark is a new one: a hexagon with the knight cut OUT of it, so the two
// are a single shape rather than a glyph sitting inside a container. It ships
// as one file used everywhere -- nav, footer and favicon -- because three
// copies of a logo is three chances for them to drift apart.
check('the favicon is the mark', /rel="icon"[^>]*href="logo\.svg"/.test(html));
check('there is only one icon link, so there is no second mark to drift',
      (html.match(/rel="icon"/g) || []).length === 1);
check('the brand no longer draws a knight GLYPH -- it draws the file',
      !/<a class="brand"[^>]*>[\s\S]{0,200}&#98\d\d;/.test(html),
      'a glyph renders as whatever font the machine has');
check('the unicode hexagon character is gone everywhere',
      !html.includes('\u2B21'),
      'it renders as whatever font the machine has, so it was a different shape per platform');
check('the nav and the footer both draw the mark',
      (html.match(/class="mark-img"/g) || []).length === 2,
      (html.match(/class="mark-img"/g) || []).length + ' found');
check('both use the same file',
      (html.match(/src="logo\.svg"/g) || []).length === 2);
check('the mark file exists', fs.existsSync('logo.svg'));
{
  const mark = fs.readFileSync('logo.svg', 'utf8');
  // evenodd is what makes the knight a HOLE in the hexagon rather than a
  // second shape painted on top of it.
  check('the knight is cut out of the hexagon, not drawn on it',
        /fill-rule="evenodd"/.test(mark));
  check('it is one path, so the two shapes cannot separate',
        (mark.match(/<path/g) || []).length === 1);
  check('it scales -- a logo pinned to pixels is wrong on every other screen',
        /viewBox="0 0 64 64"/.test(mark) && !/width="\d/.test(mark));
  check('it carries its own colour, not the stylesheet\'s',
        /linearGradient/.test(mark) && /#2FD1FF/i.test(mark));
  check('and it names itself for a screen reader', /<title>ChessForge<\/title>/.test(mark));
}
check('the mark glows in the nav', /\.mark-img\{[\s\S]{0,140}drop-shadow/.test(css));
check('and the footer copy of it does not glow -- one mark, two weights',
      /\.foot-brand \.mark-img\{[^}]*filter:none/.test(css));
check('the footer mark is quieter than the nav one',
      /\.foot-brand \.mark-img\{width:21px/.test(css) && /\.mark-img\{width:34px/.test(css));

// The mark is a filled shape now, not a stroked ring, so there is no filter to
// warn about and no plate to remove -- the hexagon IS the plate.
check('it has no background plate -- the hexagon is the shape',
      !/<rect/.test(icon), 'it sits on whatever the tab bar is');
check('and it is a single filled path, which is what survives a 16px favicon',
      /fill-rule="evenodd"/.test(icon) && (icon.match(/<path/g) || []).length === 1);

// ── the app, if it is checked out beside this ─────────────────────────────
const APP = path.resolve('..', 'nextmove-backend', 'nextmove-v2');
if(!fs.existsSync(APP)){
  console.log('  (app checkout not found beside this one; skipping the app half)');
}else{
  // The app's markup and assets moved into frontend/ when the repo was split
  // into backend/ and frontend/. These paths were not updated, so this file
  // threw ENOENT on every run instead of checking anything -- and a test that
  // crashes reports nothing rather than failing loudly.
  const appHtml = fs.readFileSync(path.join(APP,'frontend','templates','index.html'),'utf8');
  const appCss  = fs.readFileSync(path.join(APP,'frontend','static','css','style.css'),'utf8');
  const appIcon = fs.readFileSync(path.join(APP,'frontend','static','favicon.svg'),'utf8');

  // One mark, one file. They diverged for a while -- the app tinted to its own
  // indigo accent -- and then the accents themselves were unified, so there is
  // no longer anything to diverge about.
  check('the app favicon is byte-identical to the landing one', appIcon === icon,
        'one mark means one file');
  // The two accents are NOT the same any more: the landing follows the design
  // brief's blue (#4da3ff) and the app is still on its cyan (#22E5FF). That is
  // a real divergence, recorded here rather than hidden, so whoever unifies
  // them has one place to look.
  // The two accents used to differ -- the app on #22E5FF cyan, the landing on
  // the brief's #4DA3FF blue. They meet at #2FD1FF now, weighted toward cyan,
  // so the mark, the buttons and the tab icon are one colour across both.
  check('the app accent is the blended one', /#2FD1FF/i.test(appCss));
  check('and the old cyan is gone from it', !/#22E5FF/i.test(appCss),
        'one accent, or the two drift again');
  check('the mark is drawn in that same accent', /#2FD1FF/i.test(icon));

}

console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total ? 0 : 1);
