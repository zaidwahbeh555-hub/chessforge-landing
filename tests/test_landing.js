/* The landing page is five questions and a hand-off.
 *
 * It used to be a marketing page — hero, three phases, a judgement demo,
 * pricing cards, an FAQ — and this file used to check all of that. The page was
 * deliberately cut back to the questionnaire on 2026-10-04, so the assertions
 * about those sections went with them. What is kept is everything that was
 * about TRUTH rather than layout: no invented people, no invented numbers, the
 * owner never named, and nothing sold that does not exist.
 *
 * What is new, and is the point of this file now:
 *   * the questions have to match the app's, because answering here IS the
 *     app's onboarding — a band or an opening the app does not know makes the
 *     hand-off fall back to asking everything again, silently;
 *   * "choose for me" must never hand somebody an opening written for a
 *     stronger player than they just said they were;
 *   * the way out must always be a real link, because a redirect can be blocked
 *     and a page with no visible exit is a dead end.
 *
 * Run from chessforge-landing/:  node tests/test_landing.js
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const css  = fs.readFileSync('v4.css', 'utf8');
const js   = fs.readFileSync('v4.js', 'utf8');

let pass = 0, total = 0;
function check(label, cond, detail) {
  total++; if (cond) pass++;
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  -> ' + detail : ''}`);
}

/* The page's own copy, with the structured data and the comments taken out —
   otherwise a check reads the JSON-LD it is meant to be compared against, and
   a comment explaining a removal counts as the thing removed. */
const text = html.replace(/<script[\s\S]*?<\/script>/g, '')
                 .replace(/<!--[\s\S]*?-->/g, '');

console.log('\nNOBODY IS INVENTED');
check('no testimonials', !/testimonial|★{3}/i.test(text));
check('no aggregate claim about other people',
      !/\b(join \d|used by|trusted by|loved by)\b/i.test(text));
check('no quote is attributed to anyone', !/<blockquote|class="quote"/.test(text));
check('the owner is never named anywhere',
      !/zaid|wahbeh/i.test(html + css + js),
      'a standing rule: owner, solo founder, he — never the name');
check('the page does not state how many players there are',
      !/\b\d{2,}\s*(players|users|members|people)\b/i.test(text));

console.log('\nIT SELLS THE PRODUCT THAT EXISTS');
['GM Forge', 'live coaching', 'Trap Trainer', 'cognitive fingerprint'].forEach(gone => {
  check('no mention of ' + gone, !new RegExp(gone, 'i').test(html),
        'deleted from the product — do not resurrect it here');
});
check('it does not sell PGN upload as the product',
      !/upload (your )?(pgn|games)/i.test(text));
check('it says the app decides what comes next, which is the difference',
      /decides|tells you what to do/i.test(text));

console.log('\nTHE QUESTIONS ARE THE APP’S QUESTIONS');
check('it offers the app’s three bands',
      /\[600,/.test(js) && /\[900,/.test(js) && /\[1200,/.test(js));
check('it asks for all three repertoire slots',
      /slot:'white'/.test(js) && /slot:'e4'/.test(js) && /slot:'d4'/.test(js));
check('and it filters the openings by band, as the app does',
      /o\.min <= \(\+A\.band/.test(js),
      'otherwise it offers a beginner something written for 1500');

/* The hand-off only works if both sides agree about the library. */
const APP = path.resolve('..', 'nextmove-backend', 'nextmove-v2');
if (!fs.existsSync(APP)) {
  console.log('  (app checkout not found beside this one; skipping the library half)');
} else {
  const data = fs.readFileSync(path.join(APP, 'local', 'data.js'), 'utf8');
  const start = data.indexOf('{', data.indexOf('window.CF_OPENINGS'));
  let depth = 0, end = start;
  for (let k = start; k < data.length; k++) {
    if (data[k] === '{') depth++;
    else if (data[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  const lib = JSON.parse(data.slice(start, end)).openings;
  const slotOf = o => (o.side === 'white' ? 'white' : o.vs);

  const mine = [...js.matchAll(/"id":\s*"([^"]+)",\s*\n\s*"name":[^\n]*\n\s*"slot":\s*"([^"]+)"/g)]
                 .map(m => [m[1], m[2]]);
  check('the openings it offers are real openings', mine.length > 0, mine.length + ' listed');
  const unknown = mine.filter(([id, slot]) =>
    !lib.some(o => o.id === id && slotOf(o) === slot));
  check('every one exists in the app, in the same slot', unknown.length === 0,
        unknown.length ? unknown.map(x => x.join('/')).join(', ')
                       : 'an id the app does not know makes the hand-off do nothing');
  const mineBy = {}, realBy = {};
  mine.forEach(([, s]) => mineBy[s] = (mineBy[s] || 0) + 1);
  lib.forEach(o => { const s = slotOf(o); if (s) realBy[s] = (realBy[s] || 0) + 1; });
  check('and none of the app’s openings are missing from the page',
        ['white', 'e4', 'd4'].every(s => mineBy[s] === realBy[s]),
        JSON.stringify(mineBy) + ' vs ' + JSON.stringify(realBy));
}

console.log('\n"CHOOSE FOR ME" CANNOT OVERSHOOT');
check('there is a choose-for-me, so the names are not a wall',
      /q-auto/.test(js) && /Choose for me/.test(js));
check('it picks from the band-filtered pool, not the whole library',
      /function bestFor[\s\S]{0,400}poolFor\(/.test(js));
check('and it matches the band rather than taking the hardest one allowed',
      /\(a\.min \+ a\.max\) \/ 2/.test(js),
      'nearest-centred, not highest-qualifying — the first version handed a '
      + 'beginner the Queen’s Gambit');
check('an auto-pick is labelled as one', /d-auto/.test(js) && /chosen for you/.test(js));

console.log('\nTHE HAND-OFF');
check('the answers are passed as band.white.e4.d4',
      /\[A\.band, A\.white, A\.e4, A\.d4\]\.join\('\.'\)/.test(js));
check('to the app, over https', /https:\/\/app\.chessforge\.org\/\?ob=/.test(js));
check('and encoded, not concatenated raw into a URL',
      /encodeURIComponent\(payload\)/.test(js));
check('the way out is always a real link, not only a redirect',
      /id="goLink"/.test(html) && /goLink'\)\.href = href/.test(js),
      'a blocked redirect must never be a dead end');
check('reduced motion is not redirected without warning',
      /if \(RM\) \{[\s\S]{0,300}return;/.test(js),
      'it shows the repertoire and waits for the link to be clicked');

console.log('\nSOMEBODY WHO ALREADY HAS AN ACCOUNT CAN GET IN');
check('there is a way to the app that is not the questionnaire',
      /class="top-login"/.test(html) && /app\.chessforge\.org/.test(html),
      'the page is always the questions, so a returning user had no route in');
check('it does not claim to know whether anybody is signed in',
      !/(welcome back|you are signed in|logged in as)/i.test(text),
      'separate origins: this page cannot see the app\u2019s session');
check('and what it remembers is described as this browser, not as you',
      /on this browser/i.test(html));

console.log('\nREMEMBERING IS A CONVENIENCE, NOT A DEPENDENCY');
check('every localStorage access is wrapped',
      (js.match(/try \{[^}]*localStorage/g) || []).length >= 3,
      'it throws outright in some private modes; the page must still work');
check('what is read back is validated before it is offered',
      /function remembered\(\)[\s\S]{0,700}OPENINGS\.some/.test(js),
      'a stale entry naming a removed opening must not be handed to the app');
check('the band is validated too',
      /\[600, 900, 1200\]\.indexOf\(\+d\.band\) < 0/.test(js));
check('there is a way to start over, and it clears what was stored',
      /backAgain/.test(js) && /function forget\(\)[\s\S]{0,160}removeItem/.test(js));
check('and continuing still carries the answers',
      /backGo'\)\.href = 'https:\/\/app\.chessforge\.org\/\?ob='/.test(js),
      'somebody who never made an account should not rebuild the repertoire');

console.log('\nIT IS HONEST ABOUT THE FIFTH QUESTION');
check('the question that the app cannot store says so in the source',
      /not sent anywhere|nowhere to put it/i.test(js),
      'asking something and silently discarding it is the thing to avoid');
check('and it still changes something the reader sees',
      /TROUBLE[\s\S]{0,900}line:/.test(js));

console.log('\nTHE LEGAL BITS ARE REACHABLE');
['terms', 'privacy', 'attribution'].forEach(m => {
  check(m + ' opens', html.includes(`data-legal="${m}"`) && html.includes(`id="lg-${m}"`));
});
check('Cburnett is credited by name', /Colin M\.L\. Burnett/.test(html));
check('under the licence actually relied on', /3-clause BSD/.test(html));
check('Stockfish and python-chess are credited as GPL',
      /Stockfish/.test(html) && /GPL/.test(html));
check('there is a way to contact a human', /chessforgesupport@gmail\.com/.test(html));

console.log('\nNOTHING LOADS FROM SOMEBODY ELSE');
check('no third-party stylesheet, script or image',
      !/<(?:link|script|img)\b[^>]*?(?:href|src)="(?:https?:)?\/\/(?!chessforge\.org)/.test(html),
      'it breaks the CSP story and hands every visitor’s address away');
check('the fonts are served from here', /href="static\/fonts\.css"/.test(html));
check('and the font files are actually in the repo',
      fs.existsSync('static/fonts.css') && fs.readdirSync('static/fonts').length > 0);

console.log('\nMOTION IS OPTIONAL');
check('every animation stops under prefers-reduced-motion',
      /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?animation:none!important/.test(css));
check('and nothing is left invisible when it is off',
      /prefers-reduced-motion[\s\S]{0,400}\.go-rows li\{opacity:1/.test(css),
      'a reveal that never fires must not hide the content for good');
check('the JS honours it too', /prefers-reduced-motion/.test(js));

console.log('\n  ' + pass + '/' + total + ' passed');
process.exit(pass === total ? 0 : 1);
