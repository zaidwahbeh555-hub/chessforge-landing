/* The landing page.
 *
 * The page was rebuilt from a design brief. The brief is not the authority on
 * what the product IS, and where the two disagreed the product won — most of
 * this file is the record of those disagreements, so a future rebuild from the
 * same brief cannot quietly reintroduce them:
 *
 *   - the brief carried three invented testimonials with invented rating gains
 *   - it sold "upload a PGN and get analysis", which is the thing this product
 *     deliberately STOPPED being
 *   - it claimed "1000+ players" against a real number in the thirties
 *
 * Run from chessforge-landing/:  node tests/test_landing.js
 */
const fs = require('fs');
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const rawHtml = fs.readFileSync('index.html', 'utf8');
// Comments are not page content. Several of them EXPLAIN the claims this file
// forbids -- "no average gain", "no invented testimonials" -- and matching a
// ban against its own rationale is a false positive that teaches you to widen
// the rule until it stops catching anything.
const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '');
const css  = fs.readFileSync('v4.css', 'utf8');
const js   = fs.readFileSync('v4.js', 'utf8');

let pass = 0, total = 0;
function check(label, cond, detail) {
  total++; if (cond) pass++;
  console.log('  [' + (cond ? 'PASS' : 'FAIL') + '] ' + label + (detail ? '  -> ' + detail : ''));
}

console.log('\nNOTHING ON THIS PAGE IS INVENTED');
check('no testimonials', !/Daniel K\.|Maya S\.|Ethan R\.|testimonial/i.test(html),
      'the brief shipped three, with rating gains attached to made-up people');
check('no aggregate claim about other people',
      !/players improving|average (rating )?gain|1000\+|players coached/i.test(html));
check('the only quote is the owner\'s, and it says so',
      /only one I can promise\s+you is real/.test(html.replace(/\s+/g, ' '))
      || /only one I can promise you is real/.test(html.replace(/\s+/g, ' ')));
check('and it is signed by role, never by name',
      /the person who built ChessForge/.test(html)
      && !/\bZaid\b/i.test(html) && !/\bZaid\b/i.test(js) && !/\bZaid\b/i.test(css));

console.log('\nTHE PLAYER COUNT IS READ, NOT TYPED');
check('the figure is fetched from the app', /public\/stats/.test(js));
check('with a real fallback in the markup so it degrades to a number',
      /data-count="\d+"[^>]*data-live="users"/.test(html));
check('the same number in the prose moves with it', /data-live-users/.test(html)
      && /data-live-users/.test(js));
check('the count-up waits for the real figure rather than animating to the '
      + 'wrong one and correcting itself', /liveCount\(countUp\)/.test(js));
check('and a hanging request cannot stop the animation for good',
      /setTimeout\(finish, \d+\)/.test(js));

console.log('\nIT SELLS THE PRODUCT THAT EXISTS');
check('it does not sell PGN upload as the product',
      !/upload (your |a )?(games?|pgn)/i.test(html),
      'the paste-a-PGN loop was removed from the product; the brief still sold it');
check('the loop on the page is the loop in the app',
      /Play a game/i.test(html) && /See what broke/i.test(html)
      && /Drill it/i.test(html));
check('the free plan is described as it actually is',
      /One unaided game a week/.test(html) && /One coached game a week/.test(html),
      'weekly, not daily -- SOLO_WINDOW is 7 days');
check('the price is the real one', /\$19\.99/.test(html) && /\$29\.99/.test(html));
check('and the trial length is the real one', /3(&#8209;|-|\s)day/.test(html),
      'TRIAL_DAYS is 3');
check('the rating range is the honest one', /300 to 1000/.test(html));

console.log('\nTHE COMPARISON MAKES NO CLAIM ABOUT THE READER');
// The section argues you need someone watching. It shows the same hour spent
// two ways -- and carries no numbers on purpose: a rising rating line here
// would be a claim about what happens to YOU, and the only result this page is
// allowed to claim is the owner's own.
/* v4 argues this dimension by dimension rather than as two ordered flows: a
   labelled column for each side, and a named axis on every row. The promise is
   the same -- both sides stated, and the claim tied to something specific
   rather than to adjectives. */
check('both sides are there', /class="vs-head a"/.test(html)
      && /class="vs-head b"/.test(html));
check('every row names the dimension it compares, so the argument is never '
      + 'just an adjective',
      (html.match(/class="vs-k"/g) || []).length >= 5
      && (html.match(/class="vs-k"/g) || []).length
         === (html.match(/class="vs-a"/g) || []).length
      && (html.match(/class="vs-a"/g) || []).length
         === (html.match(/class="vs-b"/g) || []).length,
      'a row with only one side filled in is a claim, not a comparison');
check('no rating figure is promised anywhere in it',
      !/\+\s*\d{2,4}\s*(elo|rating)/i.test(html)
      && !/gain(ed)? \d+/i.test(html));
check('and no aggregate about other players came back with it',
      !/players (improved|gained|report)/i.test(html));

console.log('\nTHE MOCKUP IS THE APP, AND IT ANSWERS');
check('all six tabs are there', (html.match(/class="rail-i/g) || []).length === 6);
/* The clickable six-pane preview is gone: v4 puts a REAL board in the hero
   instead, so the page demonstrates the product rather than picturing it. What
   has to survive is the naming -- the six tabs are what a reader is buying. */
check('and they are the app\'s actual six, named',
      ['Dashboard', 'Play &amp; Coach', 'Training', 'Analysis', 'Puzzles', 'Shop']
        .every(function (t) { return html.indexOf('>' + t + '<') > -1; }),
      'Progress and Lessons were deleted; naming them would sell what is not there');
check('and the hero board it replaced them with is really playable',
      /id="board"/.test(html) && /\.sq\[data-sq=|dataset\.sq/.test(js)
      && /v4-hero\.json/.test(js),
      'every legal move pre-analysed by Stockfish, not a scripted single answer');
check('the board uses the app\'s real colours',
      /--sq-l:#bccedb/i.test(css) && /--sq-d:#4a7191/i.test(css),
      'Storm Marble, the house board');

console.log('\nTHE LEGAL AND LICENSING BITS SURVIVED THE REBUILD');
check('Terms, Privacy and Credits all open', /data-legal="terms"/.test(html)
      && /data-legal="privacy"/.test(html) && /data-legal="credits"/.test(html));
check('Cburnett is credited by name', /Colin M\.L\. Burnett/.test(html));
check('under the licence actually relied on', /3-clause BSD/.test(html));
check('and the licence file ships beside the pieces',
      fs.existsSync('pieces/LICENSE.txt') && /pieces\/LICENSE\.txt/.test(html));
check('Stockfish and python-chess are credited as GPL',
      /Stockfish/.test(html) && /GPL/.test(html));

console.log('\nMOTION IS OPTIONAL');
check('every animation stops under prefers-reduced-motion',
      /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?animation:none!important/.test(css));
check('and the reveals do not leave the page blank when they are off',
      /\.reveal\{opacity:1;transform:none\}/.test(css.replace(/\s+/g, ''))
      || /prefers-reduced-motion[\s\S]{0,400}\.reveal\{opacity:1/.test(css));
check('the JS honours it too', /prefers-reduced-motion/.test(js));

console.log('\nTHE REVEAL FAIL-SAFE IS STILL THERE');
// Without the sweep, an anchor link that jumps past a section leaves that
// section invisible for good: it never intersects, so it never reveals.
check('a sweep reveals anything already above the fold', /function sweep/.test(js)
      || /var sweep =/.test(js));
check('bound to scroll, resize AND hashchange',
      /addEventListener\('scroll', sweep/.test(js)
      && /addEventListener\('resize', sweep\)/.test(js)
      && /addEventListener\('hashchange', sweep\)/.test(js));

console.log('\n  ' + pass + '/' + total + ' passed');
process.exit(pass === total ? 0 : 1);
