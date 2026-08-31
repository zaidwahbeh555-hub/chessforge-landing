/* Search metadata, on both domains.
 *
 * "maximize the website's SEO -- no visual changes, this is just seo"
 *
 * Everything here is invisible on the page and therefore easy to break without
 * noticing: a title that drifts past 60 characters, a canonical that points at
 * the wrong host, structured data whose answers no longer match the visible
 * FAQ (which is a manual-action risk, not a missed opportunity), a price in
 * the wrong currency.
 *
 * Run from chessforge-landing/:  node tests/test_seo.js
 */
const fs = require('fs');
const path = require('path');

let pass = 0, total = 0;
const check = (l, c, d) => { total++; if(c) pass++;
  console.log(`  [${c?'PASS':'FAIL'}] ${l}` + (d ? '  -> ' + d : '')); };

const html = fs.readFileSync('index.html', 'utf8');
const decode = s => s.replace(/&amp;/g,'&').replace(/&mdash;/g,'—').replace(/&middot;/g,'·');
const meta = (n) => {
  const m = new RegExp('<meta name="' + n + '" content="([^"]*)"').exec(html);
  return m ? decode(m[1]) : null;
};
const prop = (n) => {
  const m = new RegExp('<meta property="' + n + '" content="([^"]*)"').exec(html);
  return m ? decode(m[1]) : null;
};

console.log('\nTHE TAB TITLE AND THE SNIPPET');
const title = decode((/<title>([^<]*)<\/title>/.exec(html) || [])[1] || '');
check('there is a title', !!title, title);
check('it is under 60 characters, so it is not truncated',
      title.length <= 60, title.length + ' chars');
check('the keyword leads, the brand follows',
      /^AI Chess Coach/.test(title) && /ChessForge$/.test(title));
const desc = meta('description');
check('there is a meta description', !!desc);
check('and it is under 160 characters', desc && desc.length <= 160,
      desc ? desc.length + ' chars' : '');

console.log('\nONE CANONICAL HOME, AND ONE PLACE THAT RANKS');
check('the landing page is canonical to itself',
      /<link rel="canonical" href="https:\/\/chessforge\.org\/">/.test(html));
check('and it invites indexing', /content="index, follow/.test(html));

console.log('\nWHAT A SHARED LINK LOOKS LIKE');
check('og:title, og:description and og:url are all set',
      !!prop('og:title') && !!prop('og:description') && !!prop('og:url'));
check('og:url is the canonical host', prop('og:url') === 'https://chessforge.org/');
check('there is a share image, with its size declared',
      !!prop('og:image') && prop('og:image:width') === '1200'
      && prop('og:image:height') === '630');
check('the image actually exists in the repo', fs.existsSync('og.png'),
      'a declared og:image that 404s is worse than none');
check('and it is really 1200x630', (function(){
        const b = fs.readFileSync('og.png');
        // PNG IHDR: width and height are big-endian uint32 at bytes 16 and 20.
        return b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630;
      })());
check('the image has alt text', !!prop('og:image:alt'));
check('Twitter gets a large card', meta('twitter:card') === 'summary_large_image'
      && !!meta('twitter:image'));

console.log('\nSTRUCTURED DATA THAT MATCHES THE PAGE');
const ld = JSON.parse((/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)||[])[1]);
const byType = {}; ld['@graph'].forEach(n => byType[n['@type']] = n);
check('it parses as JSON', !!ld && Array.isArray(ld['@graph']));
check('it describes the organisation, the site, the app and the FAQ',
      ['Organization','WebSite','SoftwareApplication','FAQPage']
        .every(t => byType[t]), Object.keys(byType).join(', '));

const app = byType.SoftwareApplication;
check('the app offers both plans', app.offers.length === 2);
const gm = app.offers.find(o => o.name === 'Grandmaster');
check('the paid price is the price actually charged', gm.price === '19.99',
      gm.price + ' ' + gm.priceCurrency);
check('in the currency it is actually charged in', gm.priceCurrency === 'CAD',
      'the backend bills CAD -- a USD figure in a search result is a wrong price');
check('the price in the structured data is the price on the page',
      html.includes('$19.99') && gm.price === '19.99');
check('the free plan is $0', app.offers.find(o => o.name === 'Free').price === '0');

// Google requires the marked-up answer to be the answer a visitor sees.
const faqs = byType.FAQPage.mainEntity;
const visible = [...html.matchAll(/<summary>(.*?)<\/summary>/gs)].map(m =>
  m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim());
check('every visible FAQ question is in the structured data',
      faqs.length === visible.length
      && visible.every(q => faqs.some(f => f.name === q)),
      faqs.length + ' marked up, ' + visible.length + ' on the page');
check('and no answer is empty',
      faqs.every(f => (f.acceptedAnswer.text || '').length > 40));

console.log('\nCRAWLERS ARE TOLD WHERE TO GO');
check('robots.txt exists and allows the site', fs.existsSync('robots.txt')
      && /^User-agent: \*\nAllow: \//m.test(fs.readFileSync('robots.txt','utf8')));
check('and points at the sitemap',
      /Sitemap: https:\/\/chessforge\.org\/sitemap\.xml/.test(fs.readFileSync('robots.txt','utf8')));
const sm = fs.readFileSync('sitemap.xml','utf8');
check('the sitemap is well-formed and lists the real page',
      /<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sm)
      && /<loc>https:\/\/chessforge\.org\/<\/loc>/.test(sm));
check('and does not list anchors as if they were pages', !/#/.test(sm),
      'a sitemap full of fragments is a known way to get it ignored');

console.log('\nTHERE IS SOMETHING FOR IMAGE SEARCH TO FIND');
check('GM Forge is a real file, not only inline SVG',
      fs.existsSync('gm-forge-ai-chess-coach.png'),
      'inline SVG is invisible to image search');
check('he is on the page with honest alt text',
      /<img[^>]*gm-forge-ai-chess-coach\.png[^>]*>/.test(html)
      && /alt="GM Forge, the AI chess coach[^"]{20,}"/.test(html));
check('the filename says what it is',
      /gm-forge-ai-chess-coach/.test(html), 'a filename is a ranking signal');
check('and the sitemap points crawlers at both images',
      /<image:image>/.test(sm) && /gm-forge-ai-chess-coach\.png/.test(sm)
      && /og\.png/.test(sm),
      'a crawler will not go looking for them otherwise');
check('the image sitemap namespace is declared',
      /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/.test(sm));

console.log('\nHEADINGS DESCRIBE THE PAGE');
const heads = [...html.matchAll(/<h([1-6])[^>]*>/g)].map(m => +m[1]);
check('there is exactly one H1', heads.filter(h => h === 1).length === 1,
      heads.filter(h => h === 1).length + ' found');
check('and no level is skipped on the way down',
      !heads.some((h, i) => i > 0 && h - Math.min(...heads.slice(0, i)) > 2),
      'H2 -> H5 in the footer was the one that skipped');
check('no heading is left empty',
      !/<h[1-6][^>]*>\s*<\/h[1-6]>/.test(html));

console.log('\nIMAGES DO NOT COST A FIRST PAINT');
const imgs = [...html.matchAll(/<img[^>]*>/g)].map(m => m[0]);
check('every image declares alt', imgs.every(i => /alt="/.test(i)),
      imgs.length + ' images');
check('and the decorative board defers loading',
      imgs.filter(i => /pieces\//.test(i)).every(i => /loading="lazy"/.test(i)));

console.log('\nTHE APP DOMAIN STAYS OUT OF THE RESULTS');
const APP = path.resolve('..', 'nextmove-backend', 'nextmove-v2');
if(!fs.existsSync(APP)){
  console.log('  SKIP -- app repo not beside this one');
} else {
  const appHtml = fs.readFileSync(path.join(APP,'frontend','templates','index.html'),'utf8');
  const appPy   = fs.readFileSync(path.join(APP,'backend','app.py'),'utf8');
  check('the app page asks not to be indexed',
        /<meta name="robots" content="noindex, follow">/.test(appHtml),
        'one page behind a sign-in modal has nothing to rank');
  check('but still passes link equity onward', /noindex, follow/.test(appHtml));
  check('it points search engines at the marketing site',
        /<link rel="canonical" href="https:\/\/chessforge\.org\/">/.test(appHtml));
  check('and it serves its own robots.txt',
        /@app\.route\("\/robots\.txt"\)/.test(appPy)
        && /Disallow: \/\\n/.test(appPy));
  check('the app still has a title and description',
        /<title>[^<]+<\/title>/.test(appHtml)
        && /<meta name="description"/.test(appHtml));
}

console.log('\n  ' + pass + '/' + total + ' passed');
process.exit(pass === total ? 0 : 1);
