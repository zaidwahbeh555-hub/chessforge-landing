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
/* The founder quote and the player count were removed from the page. What they
   were there to guarantee still matters, and is now guaranteed by their absence:
   nothing on this page speaks for anybody. */
check('no quote is attributed to any person at all',
      !/<blockquote|class="q-by"|class="quote"/.test(html),
      'the owner quote is gone; nothing replaced it with someone else\'s');
/* The one that is not about marketing. The owner is never named on a public
   page, and that is a standing rule rather than a stylistic choice. */
check('the owner is never named anywhere',
      !/\bZaid\b/i.test(html) && !/\bZaid\b/i.test(js) && !/\bZaid\b/i.test(css)
      && !/wahbeh/i.test(html) && !/wahbeh/i.test(js) && !/wahbeh/i.test(css));

console.log('\nNO HEADCOUNT IS CLAIMED');
/* The live player count came off with the quote that carried it. A number of
   users is a weak claim while the number is small, and a stale hard-coded one
   is worse than none -- so the page makes no claim about how many people are
   here, and this fails if one reappears without being read from the app. */
check('the page does not state how many players there are',
      !/data-live-users|class="stat-n"/.test(html));
check('and no headcount is hard-coded into the prose',
      !/\b\d{2,}\s*(players|users|members)\b/i.test(html),
      'a typed figure is out of date the day after it is typed');
/* A function handed whatever querySelector found must survive being handed
   null -- countUp dereferenced it on its first line and took the whole script
   down with it, and three chessboards stopped painting because a section had
   been deleted. The guarantee is the guard, not the function: countUp went
   with the animated figures it served, so this passes either by the function
   being absent or by it still guarding. */
check('the counter survives being handed nothing',
      !/function countUp\(/.test(js)
      || /function countUp\(el\)\s*\{[\s\S]{0,400}if \(!el \|\| el\._ran\)/.test(js),
      'a function that takes an element must survive not getting one');

console.log('\nIT SELLS THE PRODUCT THAT EXISTS');
check('it does not sell PGN upload as the product',
      !/upload (your |a )?(games?|pgn)/i.test(html),
      'the paste-a-PGN loop was removed from the product; the brief still sold it');
/* The loop changed with the product: it is no longer play -> see what broke ->
   drill it. It is the three phases of a game, in order, with the app choosing
   the next step. The page must name all three, because those are the three tabs
   a reader is signing up for. */
check('the loop on the page is the loop in the app',
      ['Opening', 'Middlegame', 'Endgame']
        .every(function (t) { return html.indexOf('>' + t + '<') > -1; }),
      'the three phases are the product now');
check('and it says the app chooses the next step, which is the difference',
      /tells you (the|what to do) next|what to do next|assigned/i.test(html),
      'a library you browse is the thing this is not');
// The free plan is a FRACTION of the paid one, stated in the real counts, and
// both cards carry the same six rows so the two columns read as a diff.
check('the free plan says what fraction of the product it is',
      /1 of 14/.test(html) && /6 of 252/.test(html) && /5 of 43/.test(html)
      && /4 of 24/.test(html),
      'the numbers come from data.js: 14 openings, 252 replies, 43 positions, 24 endgames');
check('and what it does not include, in the same words',
      (html.match(/class="v lk">Locked/g) || []).length >= 2);
check('the paid card answers each of those rows',
      /all 14/.test(html) && /all 252/.test(html) && /all 43/.test(html)
      && /all 24/.test(html));
check('and says how much more that is',
      /14&times;/.test(html) && /42&times;/.test(html),
      'a multiplier is the argument; "unlimited" is a word');
check('the price is the real one', /\$4\.99/.test(html) && /\$9\.99/.test(html),
      'PRO_PRICE 4.99, PRO_PRICE_WAS 9.99');
check('and the trial length is the real one', /3(&#8209;|-|\s)day/.test(html),
      'TRIAL_DAYS is 3');
// Widened with the product: the old band was set by a coaching loop aimed at
// people losing to one-move tactics. Openings and endgame technique keep paying
// further up, so the honest claim moved with it.
check('the rating range is the honest one', /300 to 1400/.test(html));

console.log('\nEVERY CLAIM CARRIES A NUMBER, NOT AN ADJECTIVE');
/* The two-column comparison band went with the old product. What replaced it is
   the phase grid, and the promise it has to keep is the one the comparison kept:
   nothing is argued with adjectives. Each phase states what is actually in it,
   counted, and those counts are the real ones from the library. */
check('each phase states what is in it, counted',
      (html.match(/class="ph-facts"/g) || []).length === 3,
      'three phases, three sets of figures');
check('and the figures are the real ones',
      /\b14\b/.test(html) && /\b252\b/.test(html)
      && /\b43\b/.test(html) && /\b24\b/.test(html),
      '14 openings, 252 off-book replies, 43 positions, 24 endgames');
check('the engine check is stated, since it is the reason to trust any of it',
      /Stockfish/.test(html) && /995/.test(html),
      '995 moves verified, and the ones that failed were dropped');
check('no rating figure is promised anywhere in it',
      !/\+\s*\d{2,4}\s*(elo|rating)/i.test(html)
      && !/gain(ed)? \d+/i.test(html));
check('and no aggregate about other players came back with it',
      !/players (improved|gained|report)/i.test(html));

console.log('\nTHE MOCKUP IS THE APP, AND IT ANSWERS');
/* Six tabs became three. Naming the old six on the page would sell Dashboard,
   Play & Coach, Training, Analysis, Puzzles and Shop -- none of which the app
   has any more, and two of which were deleted before that. What has to hold is
   that the page names the sections that exist and none that do not. */
check('the three sections are named',
      ['Opening', 'Middlegame', 'Endgame']
        .every(function (t) { return html.indexOf('>' + t + '<') > -1; }));
check('and no deleted screen is still being sold',
      !['Dashboard', 'Play &amp; Coach', 'Trap Trainer', 'GM Forge', 'Progress', 'Lessons']
        .some(function (t) { return html.indexOf(t) > -1; }),
      'every one of these was removed from the product');
/* The playable board was the old product's demo: you played a move and a coach
   graded it. There is no coach in the app now and grading a move is not what it
   does, so it was replaced by the thing every endgame in the app opens on -- one
   judgement, made before you are told anything.

   What has to hold is that the page still DEMONSTRATES rather than describes,
   and that the demo is answerable without an engine because the answer was
   settled at depth before it shipped. */
check('the page demonstrates the app rather than describing it',
      /data-judge="win"/.test(html) && /data-judge="draw"/.test(html),
      'one judgement, asked before anything is revealed');
check('a wrong answer is corrected with what believing it would cost',
      /stops trying and draws it/.test(js),
      'a correction with no consequence attached is just a score');
check('and the method arrives only after the judgement',
      html.indexOf('data-judge=') < html.indexOf('class="j-steps"'),
      'telling you the method first is answering your own question');
check('real positions are drawn from FEN, not pictured',
      (html.match(/data-fen="/g) || []).length >= 4
      && /function boardHTML\(fen\)/.test(js),
      'the boards are the app\'s own positions, painted, not screenshots');
check('the board uses the app\'s real colours',
      /--sq-l:#bccedb/i.test(css) && /--sq-d:#4a7191/i.test(css),
      'Storm Marble, the house board');

console.log('\nTHE LEGAL AND LICENSING BITS SURVIVED THE REBUILD');
check('Terms, Privacy and Attribution all open', /data-legal="terms"/.test(html)
      && /data-legal="privacy"/.test(html) && /data-legal="attribution"/.test(html));
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
/* Matched loosely on purpose: what matters is that sweep is bound to all
   three, not whether the call also passes { passive: true }. The strict form
   failed the day the listeners were made passive, which was an improvement. */
check('bound to scroll, resize AND hashchange',
      /addEventListener\('scroll', sweep\b/.test(js)
      && /addEventListener\('resize', sweep\b/.test(js)
      && /addEventListener\('hashchange', sweep\b/.test(js));

console.log('\n  ' + pass + '/' + total + ' passed');
process.exit(pass === total ? 0 : 1);
