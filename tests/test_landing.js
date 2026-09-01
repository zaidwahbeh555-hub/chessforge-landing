// The landing page, rebuilt.
//
// It replaces test_hero.js and test_responsive.js, which tested an interactive
// hero demo that no longer exists: the hero is now a demonstration that runs on
// its own, because a landing page should show the product working rather than
// hand you a toy to operate.
//
// The checks that matter most here are the honesty ones. The design this was
// built from carried invented social proof -- "12,600 players coached",
// "38,400 blunders caught", three testimonials attributed to Elo ratings. None
// of that is true of a product this new, and putting it on a page that takes
// real money is a straightforward lie. These assertions exist so it cannot
// creep back in.
//
// Run from chessforge-landing/:  node tests/test_landing.js

const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const css  = fs.readFileSync('style.css','utf8');
const js   = fs.readFileSync('script.js','utf8');

let pass=0, total=0;
function check(label, cond, detail){ total++; if(cond) pass++;
  console.log(`  [${cond?'PASS':'FAIL'}] ${label}${detail?'  -> '+detail:''}`); }

// ── the numbers ──────────────────────────────────────────────────────────
// These were pulled once and then put back on the owner's instruction: he ran a
// month-long test group, and +300 average over a month of daily use is his
// figure from it, not one I chose. What the tests hold onto is that the number
// on the page is the number he gave.
console.log('\n── the numbers are the ones he measured ──');
check('the rating gain is his figure', /data-count="300"/.test(html), '+300');
check('and it is framed as what it is',
      /average rating gain over a month of daily use/.test(html),
      'a month of DAILY use, which is the condition it was measured under');
check('it counts up rather than sitting there', /data-count/.test(html) && /requestAnimationFrame\(step\)/.test(js));
check('and only once it is actually on screen',
      /so\.unobserve\(e\.target\)/.test(js) && /threshold: 0\.3/.test(js));
check('the figures do not jitter as digits change',
      /font-variant-numeric:tabular-nums/.test(css),
      'proportional digits shift width while a counter runs');

console.log('\n── reviews ──');
check('there are three', (js.match(/by: '\d+ Elo'/g)||[]).length === 3,
      (js.match(/by: '\d+ Elo'/g)||[]).length + ' quotes');
check('one at a time, with dots to jump', /quote-dots/.test(html) && /showQuote/.test(js));
check('the height is reserved so the page does not jump',
      /\.quote-text\{[\s\S]{0,220}min-height:110px/.test(css));
check('clicking a dot stops it rotating under you',
      /clearInterval\(qTimer\)/.test(js));
check('the empty placeholder slots are gone', !/Your review here/.test(html));

// ── the things he asked to change ─────────────────────────────────────────
console.log('\n── the changes asked for ──');
check('the wavy underline is gone, replaced by the drawn line we had',
      !/text-decoration-style:wavy/.test(css) && /class="scribble"/.test(html),
      'the wavy one was too tight and too repetitive at that size');
check('and the line is the same path as before',
      /M6 22 C 70 6, 130 30, 196 15 C 250 3, 300 12, 334 24/.test(html));
check('"Open app" is cyan, the way it was on the old page',
      /class="nav-cta">Open app →<\/a>/.test(html) &&
      /\.nav-cta\{[\s\S]{0,140}color:var\(--cyan\) !important/.test(css),
      'cyan and bold, not an outlined box');

console.log('\n── the hero demonstrates, it does not invite a click ──');
check('the hero visual is a figure, not a control',
      /<figure class="hero-demo"/.test(html));
check('there is no button inside it', !/hero-demo[\s\S]*?<button/.test(html.slice(html.indexOf('hero-demo'), html.indexOf('</figure>'))));
check('and no script drives it', !/demoAsk|demoCard|demoNext|demoOpts/.test(js),
      'it runs entirely on CSS');
check('the coach reaches, holds, and goes back', /@keyframes reach\{/.test(css));
check('the fingertip lands on the centre of f2',
      /\.fg-hand\{[\s\S]{0,120}left:68\.75%;top:81\.25%/.test(css),
      'f is file 5 of 8, rank 2 is row 6 of 8');
check('and the arm ends on the same point',
      /C 98 100, 82 92, 68\.75 81\.25/.test(html),
      'both in the board\'s own coordinate space');
check('the arm shares that space rather than guessing at it',
      /\.hb-wrap\{position:relative\}/.test(css) &&
      /\.fg-arm\{position:absolute;inset:0/.test(css));
check('the square he is pointing at lights up', /\.hb-hot::after\{/.test(css));
check('the three parts are one gesture, on one clock',
      (css.match(/9s ease-in-out infinite/g)||[]).length >= 4,
      'arm, hand, bubble and square all run 9s');
check('the position on the board is a real one', (html.match(/class="hb-sq/g)||[]).length === 64,
      (html.match(/class="hb-sq/g)||[]).length + ' squares');
check('drawn with the real piece art, not glyphs',
      /<img[^>]*src="pieces\/wK\.svg"/.test(html) && !/♞|♟|♜/.test(html),
      'matched on the tag, not on src being the first attribute -- adding '
      + 'loading="lazy" broke it while the art was untouched');
check('and what he says about it is true',
      /attacked twice and defended once/.test(html),
      'verified with python-chess: f2 attacked from c5 and f6, defended only from e1');

// A chess audience reads the board before it reads the headline, so the
// position has to survive that look. The first version of this board was
// missing the c2 pawn -- legal, but 15 v 16 four moves into a game with nothing
// captured, which is the kind of thing that costs you the visitor.
const pieces = [...html.matchAll(/pieces\/(\w)(\w)\.svg/g)].map(m=>[m[1],m[2]]);
const white = pieces.filter(p=>p[0]==='w'), black = pieces.filter(p=>p[0]==='b');
check('both sides have all sixteen units', white.length === 16 && black.length === 16,
      white.length + ' white v ' + black.length + ' black');
check('and eight pawns each',
      white.filter(p=>p[1]==='P').length === 8 && black.filter(p=>p[1]==='P').length === 8,
      white.filter(p=>p[1]==='P').length + ' v ' + black.filter(p=>p[1]==='P').length);
check('exactly one king each',
      white.filter(p=>p[1]==='K').length === 1 && black.filter(p=>p[1]==='K').length === 1);

console.log('\n── GM Forge is on the page, twice ──');
check('in the hero, mid-explanation', /class="fg-art"/.test(html));
check('and as his portrait in the coach section', /class="coach-art"/.test(html));
check('the portrait is a real image, not a placeholder slot',
      !/image-slot|coach portrait —/.test(html));

console.log('\n── pricing ──');
check('the paid plan is Grandmaster', /class="plan-name">Grandmaster</.test(html));
check('at the real price', /class="mono plan-now">\$19\.99</.test(html),
      'it is 19.99, and 19.99 IS the promotion');
// $29.99 has never been charged here: zero commits mention it, PRO_PRICE is
// 19.99, and that is what Stripe bills. Zaid asked for it struck through
// anyway, twice, and it is his pricing to set -- so the assertion records the
// decision rather than blocking it. The honest version of the same urgency is
// a forward-looking line ("goes to $29.99 after launch"), which is a promise
// rather than a claim about a past price; he has been told.
check('the anchor price is struck through, as asked',
      /class="mono plan-was">\$29\.99</.test(html)
      && /class="mono plan-now">\$19\.99</.test(html),
      'requested 2026-08-28; $19.99 is what is actually charged');
check('and it is visually subordinate, not a second equal price',
      /\.plan-was\{[\s\S]{0,220}text-decoration:line-through/.test(css)
      && /\.plan-was\{[\s\S]{0,220}color:var\(--ink-3\)/.test(css));
check('the founding-member framing carries the promotion instead',
      /founding-member rate/.test(html));
check('it is the bigger of the two columns',
      /\.plans\{[\s\S]{0,120}grid-template-columns:1fr 1\.25fr/.test(css));
check('and it shines', /\.plan-glow\{/.test(css) && /@keyframes sheen\{/.test(css));
/* The trial length is written in five places on this page and there is no
   server here to read it from, so these assert they AGREE rather than pinning a
   number -- changing 7 to 3 once left the tests asserting the old figure and
   two of them failed for the right reason. The charge lands the day after it
   ends, so that one is derived too. */
const trialTag = (html.match(/class="plan-tag mono">(\d+) days free/) || [])[1];
check('the tag leads with the trial, then the founding rate',
      !!trialTag && /class="plan-tag mono">\d+ days free &middot; founding member</.test(html),
      trialTag ? trialTag + ' days' : 'no trial tag found');
check('the button says what it starts, not what it costs',
      new RegExp('class="btn btn-primary plan-cta">Try Grandmaster free for '
                 + trialTag + ' days').test(html),
      'the button must quote the same number as the tag');
check('the hero offers the same trial as the pricing card',
      new RegExp('Try Grandmaster free for '
                 + ({1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',
                    14:'fourteen'}[trialTag] || trialTag) + ' days').test(html),
      'hero and card disagreeing on the trial length is a support ticket');
check('and the card states the charge date rather than burying it',
      new RegExp('nothing charged until day ' + (Number(trialTag) + 1)
                 + ', cancel any time before then').test(html),
      'burying it is what generates chargebacks; the charge is the day after it ends');
check('cancelling is stated on the card, not buried',
      /Cancel any time, from the app/.test(html));
check('no plan promises anything the app does not do',
      !/unlimited everything|guaranteed/i.test(html));

console.log('\n── features say what you are missing ──');
const misses = (html.match(/class="feat-miss"/g)||[]).length;
check('every feature names the cost of not having it', misses === 4, misses + ' of 4');
check('stated as a consequence rather than a taunt',
      /<b>Without it:<\/b>/.test(html) && !/you're losing|idiot|stupid/i.test(html));
check('and it is styled quieter than the feature itself',
      /\.feat-miss\{[\s\S]{0,140}color:var\(--ink-3\)/.test(css));

console.log('\n── footer ──');
check('the contact email is a real address',
      /mailto:chessforgesupport@gmail\.com/.test(html));
check('and it is shown, not only linked',
      /class="footer-mail"[^>]*>chessforgesupport@gmail\.com</.test(html));
check('the old placeholder address is gone', !/hello@chessforge\.org/.test(html));
check('no personal address anywhere on the page',
      !/zaidwahbeh/i.test(html), 'support address only, never a personal one');
check('terms of service is reachable', /data-legal="terms"/.test(html));
check('privacy policy is reachable', /data-legal="privacy"/.test(html));
check('both have real content behind them',
      /Subscriptions and payment/.test(js) && /What is collected/.test(js));
check('and both say plainly that they are baseline wording',
      /not legal advice/.test(js));
check('the copyright line is right', /© <span id="year">2026<\/span> ChessForge\. All rights reserved\./.test(html));

console.log('\n── the legal dialog behaves like a dialog ──');
check('escape closes it', /e\.key === 'Escape'/.test(js));
check('clicking the backdrop closes it', /e\.target === back\) closeLegal/.test(js));
check('focus is trapped while it is open', /e\.key !== 'Tab'/.test(js) && /last\.focus\(\)/.test(js));
check('and focus goes back where it came from',
      /lastFocus\.focus\(\)/.test(js) && /lastFocus = document\.activeElement/.test(js));
check('the page underneath does not scroll',
      /document\.body\.style\.overflow = 'hidden'/.test(js));

console.log('\n── the ticker ──');
// Read the array itself: the comment above it names the metrics it is
// deliberately not using, so scanning the whole file finds them in the prose.
const ticker = js.slice(js.indexOf('var TICKER = ['), js.indexOf('];', js.indexOf('var TICKER = [')));
// The audience range is a fact about who it is for, not a metric about how
// well it is doing, so it is the one number allowed through.
const numbers = ticker.replace(/600–1600 Elo/g, '');
check('it is built from product statements, not metrics',
      /coaching that happens during the game/.test(ticker) &&
      !/players coached|blunders caught|\d{3,}/.test(numbers),
      ticker.replace(/\s+/g,' ').slice(14, 90));
check('and the content is doubled so the loop has no gap',
      /run\.innerHTML = html \+ html/.test(js),
      'the marquee translates by -50%');

console.log('\n── structure and hygiene ──');
['how','features','pricing','faq'].forEach(function(id){
  check('the nav link to #' + id + ' has somewhere to land',
        html.includes('href="#' + id + '"') && html.includes('id="' + id + '"'));
});
check('every div is closed', html.split('<div').length === html.split('</div>').length);
check('every section is closed', html.split('<section').length === html.split('</section>').length);
check('every svg is closed', html.split('<svg').length === html.split('</svg>').length);
check('css braces balance',
      (css.match(/{/g)||[]).length === (css.match(/}/g)||[]).length);
check('no emoji anywhere', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html));
check('no curly apostrophes inside JS strings',
      !/'[^']*[‘’][^']*'/.test(js.replace(/\/\/.*$/gm,'')),
      'they have broken the parser four separate times');
check('the fonts the design calls for are loaded',
      /family=Manrope/.test(html) && /IBM\+Plex\+Mono/.test(html));
check('and nothing falls back to Arial or Helvetica',
      !/Arial|Helvetica/.test(css));
check('reduced motion stops every animation',
      /@media \(prefers-reduced-motion:reduce\)\{[\s\S]{0,200}animation:none !important/.test(css));
check('and still shows what the animations would have revealed',
      /\.reveal\{opacity:1;transform:none\}/.test(css.replace(/\s+/g,' ').replace(/ \{/g,'{')) ||
      /\.reveal\{opacity:1/.test(css.replace(/\s+/g,'')),
      'otherwise the page is blank for those users');

console.log('\n── the board, and the wordmark ──');
// Hue 300 in the reference sat 40 degrees from the magenta warning, so the
// warning square had nothing to stand out against. 241 is a cool slate.
check('the board is no longer purple', !/oklch\(30% 0\.045 300\)/.test(css));
check('and it is dark, not a mid-slate',
      /\.hb-sq\.l\{background:#1E253B\}/.test(css) && /\.hb-sq\.d\{background:#020313\}/.test(css));
check('it blends into the page rather than sitting on it',
      /sits at 1\.01:1 against the page/.test(css.replace(/\s+/g,' ')),
      'the board is part of the surface, not a panel dropped onto it');
check('and the checker gap was widened to survive going that dark',
      /the same lightness step buys less separation down here/.test(css.replace(/\s+/g,' ')));
// Both squares sit BELOW the dead band, where the black piece reads by its
// light edge on either shade. That is what lets the whole board be dark.
const flat = css.replace(/\s+/g,' ');
check('the reasoning is recorded, since it was solved not picked',
      /both squares work via the light edge/.test(flat));
check('the hue is blue with purple in it, not one or the other',
      /blue with purple in it rather than either on its own/.test(flat));
check('and nothing warm anywhere',
      !/#[0-9A-F]*[89A-F][0-9A-F]{3}[0-3][0-9A-F]\}/.test(css.match(/\.hb-sq\.[ld]\{background:#\w{6}\}/g).join('')),
      'red channel never leads in either square');
check('the wordmark is mixed case, not a shouted label',
      /brand-strong">Chess<\/span><span class="brand-soft">Forge/.test(html));
check('set tight, and closer to the mark',
      /\.brand\{[\s\S]{0,160}gap:7px[\s\S]{0,80}letter-spacing:-\.025em/.test(css));
// gap on a flex row applies between every child, so the gap meant for the mark
// was also pushing Chess and Forge apart.
check('Chess and Forge are one box, so no gap falls between them',
      /<span class="brand-word"><span class="brand-strong">Chess<\/span><span class="brand-soft">Forge<\/span><\/span>/.test(html));
check('and the reason is recorded', /applies between EVERY child/.test(css));
check('in a rounder, more modern face than the body text',
      /font-family:'Outfit'/.test(css) && /family=Outfit/.test(html));
check('and Forge is not thinner than Chess by much',
      /\.brand-strong\{font-weight:700\}/.test(css) && /\.brand-soft\{font-weight:600/.test(css),
      'half a step, not a full one');
check('the feature bullets are line art, not generated shapes',
      (html.match(/class="feat-ic"><svg/g)||[]).length === 4,
      (html.match(/class="feat-ic"><svg/g)||[]).length + ' of 4');
check('drawn in one family', (html.match(/stroke-width="1\.75"/g)||[]).length >= 3);
check('and the filled circle-diamond-triangle set is gone',
      !/i-circle|i-diamond|i-triangle/.test(css));

console.log('\n── the primary button ──');
check('it glows', /\.btn-primary\{[\s\S]{0,300}box-shadow:0 0 6px/.test(css));
check('faintly — two low-alpha layers, not one bright one',
      (css.match(/rgba\((?:34,229,255|124,242,255),\.[12]\d\)/g)||[]).length >= 4,
      'a tight edge plus a wide falloff, both under .35');
check('and it breathes rather than blinks',
      /@keyframes btnGlow\{/.test(css) && /animation:btnGlow 3\.4s/.test(css),
      'slow enough to read as light, not as a warning');
check('hover settles it instead of pulsing harder',
      /\.btn-primary:hover\{[\s\S]{0,120}animation:none/.test(css));
check('reduced motion stops it with everything else',
      /@media \(prefers-reduced-motion:reduce\)\{[\s\S]{0,200}animation:none !important/.test(css));

console.log(`\n  ${pass}/${total} passed`);
process.exit(pass===total ? 0 : 1);
