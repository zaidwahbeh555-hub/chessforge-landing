/* Does the cursor actually drag smoke?
 *
 * Nothing static can answer that. A canvas effect can be perfectly valid
 * JavaScript, pass every brace check, be linked from the page -- and draw
 * nothing, because the context was refused, a shader did not compile or a
 * half-float render target is unsupported. All of those fail SILENTLY: no
 * error, no blank page, just a page with no effect.
 *
 * So this drives a real Chrome, sweeps a synthetic pointer across the page,
 * copies the WebGL canvas into a 2D one and counts lit pixels. If the fluid
 * is not running, the count is zero and this fails.
 *
 * Needs a server. It starts its own:  node tests/test_haze.js
 */
const path = require('path');
const http = require('http');
const fs = require('fs');

const APP = path.resolve('..', 'nextmove-backend', 'nextmove-v2');
const {open} = require(path.join(APP, 'tests', 'render', 'viewport.js'));

let pass = 0, total = 0;
function check(name, ok, why) {
  total++;
  if (ok) { pass++; console.log('  ok   ' + name); }
  else console.log('  FAIL ' + name + (why ? '\n       ' + why : ''));
}

const TYPES = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript',
               '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2',
               '.txt':'text/plain', '.xml':'application/xml'};

function serve(port) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(process.cwd(), p);
    if (!f.startsWith(process.cwd()) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); return res.end('no');
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

/* Sweep a pointer and report what the canvas is showing. Runs in the page. */
const SWEEP = `
  var cv = document.getElementById('haze');
  if (!cv) return {err: 'no canvas'};
  function rAF(){ return new Promise(r => requestAnimationFrame(r)); }
  function move(x, y){
    window.dispatchEvent(new PointerEvent('pointermove',
      {clientX: x, clientY: y, bubbles: true}));
  }
  return (async function () {
    // A slow sweep across the middle, a frame between each step, so the
    // simulation gets the chance to advect what it was handed.
    for (var i = 0; i <= 28; i++) {
      move(140 + i * 24, 420 + Math.sin(i / 3) * 110);
      await rAF();
    }
    for (var j = 0; j < 20; j++) await rAF();   // let it drift on its own

    var s = document.createElement('canvas');
    s.width = 160; s.height = 100;
    var c = s.getContext('2d');
    c.drawImage(cv, 0, 0, s.width, s.height);
    var d = c.getImageData(0, 0, s.width, s.height).data;
    var lit = 0, maxA = 0, sumR = 0, sumG = 0, sumB = 0;
    for (var k = 0; k < d.length; k += 4) {
      if (d[k+3] > 8) { lit++; sumR += d[k]; sumG += d[k+1]; sumB += d[k+2]; }
      if (d[k+3] > maxA) maxA = d[k+3];
    }
    return {lit: lit, of: s.width * s.height, maxA: maxA,
            r: sumR / (lit||1), g: sumG / (lit||1), b: sumB / (lit||1),
            css: getComputedStyle(cv).pointerEvents,
            disp: getComputedStyle(cv).display,
            z: getComputedStyle(cv).zIndex,
            hidden: cv.getAttribute('aria-hidden'),
            gl: !!(cv.getContext('webgl2') || cv.getContext('webgl'))};
  })();
`;

(async () => {
  const srv = await serve(8137);
  const URL = 'http://127.0.0.1:8137/';
  let page;
  try {
    console.log('\nTHE SMOKE IS REAL');
    page = await open(null, {settle: 1200, gl: true});
    await page.size(1280, 900, 1, false);
    await page.go(URL);

    const r = await page.eval(SWEEP);
    check('the canvas is there and keeps a GL context', !r.err && r.gl, r.err);
    check('moving the pointer lights pixels up',
          r.lit > 40,
          'lit ' + r.lit + ' of ' + r.of + ' sampled -- the fluid is not drawing');
    check('and the smoke is bright enough to see', r.maxA > 30, 'peak alpha ' + r.maxA);
    check('the dye is the site cyan, not a rainbow',
          r.b >= r.g && r.g > r.r,
          'mean rgb ' + [r.r|0, r.g|0, r.b|0].join(','));

    console.log('\nIT CANNOT GET IN THE WAY');
    check('it never takes a click', r.css === 'none');
    check('it is over the questions and under the legal modals',
          +r.z >= 60 && +r.z < 300, 'z-index ' + r.z);
    check('a screen reader is not told about it', r.hidden === 'true');

    // The dye must decay. A trail that stays is a smear, not smoke.
    const faded = await page.eval(`
      function rAF(){ return new Promise(r => requestAnimationFrame(r)); }
      return (async function(){
        for (var i = 0; i < 150; i++) await rAF();
        var cv = document.getElementById('haze');
        var s = document.createElement('canvas'); s.width = 160; s.height = 100;
        var c = s.getContext('2d'); c.drawImage(cv, 0, 0, s.width, s.height);
        var d = c.getImageData(0,0,s.width,s.height).data, m = 0;
        for (var k = 0; k < d.length; k += 4) if (d[k+3] > m) m = d[k+3];
        return m;
      })();
    `);
    check('the smoke clears when the pointer stops', faded < 24,
          'peak alpha still ' + faded + ' seconds later');

    console.log('\nNOBODY GETS IT WHO DID NOT ASK FOR IT');
    await page.size(390, 844, 2, true);
    await page.go(URL);
    const touch = await page.eval(`({
      disp: getComputedStyle(document.getElementById('haze')).display,
      coarse: matchMedia('(pointer:coarse)').matches
    })`);
    check('a phone is emulated as a touch device', touch.coarse,
          'the next check means nothing without this');
    check('and on a touch screen there is no canvas at all',
          touch.disp === 'none', 'display ' + touch.disp);
  } finally {
    if (page) await page.close();
    srv.close();
  }

  console.log('\n  ' + pass + '/' + total + ' passed');
  process.exit(pass === total ? 0 : 1);
})();
