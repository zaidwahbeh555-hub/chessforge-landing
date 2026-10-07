/* chessforge.org — the haze
 * ───────────────────────────────────────────────────────────────────────────
 * The cursor drags smoke. Moving the pointer pushes a velocity field around
 * and injects a little cyan dye into it, and the field then carries that dye
 * where the pointer is no longer pointing — which is why it reads as gas and
 * not as a trail of dots following the mouse.
 *
 * It is a real fluid, solved every frame on the GPU, the usual way:
 *
 *   1. advect velocity by itself          (the field moves what the field is)
 *   2. add curl, so it swirls             (without this it is a straight puff)
 *   3. solve for pressure, 20 Jacobi passes, and subtract its gradient
 *      -> the field becomes divergence-free, which is what makes it look like
 *         a fluid rather than like something being blown outward
 *   4. advect the dye by the finished velocity, and fade it
 *
 * Deliberate choices, because this page is a questionnaire and not a demo:
 *
 *   * POINTER ONLY. Skipped entirely on a touch screen -- there is no cursor
 *     to trail, and a simulation nobody can aim is phone battery for nothing.
 *   * It STOPS. Two and a half seconds after the dye has gone the loop ends,
 *     and the next pointer move starts it again. An idle tab costs nothing.
 *   * prefers-reduced-motion: it never starts. The canvas stays empty.
 *   * Dye is the site cyan, never a rainbow, and the canvas composites as
 *     glow -- it can only brighten what is under it, so no answer, question
 *     or button can be made unreadable by it.
 *   * If anything is missing (no WebGL, no half-float render target, no
 *     linear filtering of one) it returns and the page is exactly as it was.
 *     There is no second-rate fallback; the page does not need the effect.
 */
(function () {
  'use strict';

  var cv = document.getElementById('haze');
  if (!cv || !window.matchMedia) return;

  // A cursor effect needs a cursor, and motion needs permission.
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  var SIM        = 128,    // velocity grid. 128 is plenty; it is never seen
      DYE        = 1024,   // the dye is what you see, so this one is generous
      ITERS      = 20,     // pressure passes
      DYE_FADE   = 3.4,    // high: the smoke is gone about a second behind you
      VEL_FADE   = 0.55,
      CURL       = 22,     // higher = more wisps, fewer solid ribbons
      RADIUS     = 0.0032,  // small and soft, close to the cursor
      FORCE      = 2400,    // gentle push: it should drift, not be fired
      QUIET      = 1.6,     // seconds of stillness before the loop shuts down
      STEP       = 0.014;   // splat spacing along the path, in screen widths

  // ─── context, formats, capability ────────────────────────────────────────
  var opts = { alpha: true, depth: false, stencil: false, antialias: false,
               preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  var gl = cv.getContext('webgl2', opts), gl2 = !!gl;
  if (!gl) gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  if (!gl) return;

  var halfType, linear;
  if (gl2) {
    gl.getExtension('EXT_color_buffer_float');
    halfType = gl.HALF_FLOAT;
    linear = true;                       // core in WebGL2
  } else {
    var hf = gl.getExtension('OES_texture_half_float');
    halfType = hf && hf.HALF_FLOAT_OES;
    linear = !!gl.getExtension('OES_texture_half_float_linear');
  }
  if (!halfType || !linear) return;

  function renders(internal, format) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, halfType, null);
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(f); gl.deleteTexture(t);
    return ok;
  }

  // One, two and four channel targets, each falling back up the chain if the
  // narrow one cannot be rendered to. On WebGL1 they are all plain RGBA.
  function pick(chain) {
    for (var i = 0; i < chain.length; i++)
      if (renders(chain[i][0], chain[i][1]))
        return { internal: chain[i][0], format: chain[i][1] };
    return null;
  }
  var F_RGBA, F_RG, F_R;
  if (gl2) {
    F_RGBA = pick([[gl.RGBA16F, gl.RGBA]]);
    F_RG   = pick([[gl.RG16F, gl.RG], [gl.RGBA16F, gl.RGBA]]);
    F_R    = pick([[gl.R16F, gl.RED], [gl.RG16F, gl.RG], [gl.RGBA16F, gl.RGBA]]);
  } else {
    F_RGBA = F_RG = F_R = pick([[gl.RGBA, gl.RGBA]]);
  }
  if (!F_RGBA || !F_RG || !F_R) return;

  // ─── the full-screen quad everything is drawn with ───────────────────────
  var vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
  var ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  gl.disable(gl.BLEND);

  function blit(target) {
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ─── shaders ─────────────────────────────────────────────────────────────
  // GLSL ES 1.00 throughout: WebGL2 accepts it, so there is one set of
  // sources for both contexts instead of two that can drift apart.
  var VERT = `
    precision highp float;
    attribute vec2 aPos;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPos * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  var F_CLEAR = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; uniform sampler2D uTex; uniform float value;
    void main () { gl_FragColor = value * texture2D(uTex, vUv); }`;

  var F_SPLAT = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget; uniform float aspect;
    uniform vec3 color; uniform vec2 point; uniform float radius;
    void main () {
      vec2 p = vUv - point;
      p.x *= aspect;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`;

  var F_ADVECT = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity, uSource;
    uniform vec2 texelSize; uniform float dt, fade;
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + fade * dt);
    }`;

  var F_DIV = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`;

  var F_CURL = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`;

  var F_VORT = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main () {
      float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
    }`;

  var F_PRESS = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uPressure, uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }`;

  var F_GRAD = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uPressure, uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
      vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }`;

  // The dye is lit from the front using its own gradient as a normal, which is
  // what turns a flat cyan cloud into something with volume. Alpha is the
  // brightest channel, so empty space is transparent and the canvas can sit
  // over the page as glow: it adds light and never subtracts any.
  var F_SHOW = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uTex; uniform vec2 texelSize;
    void main () {
      vec3 c = texture2D(uTex, vUv).rgb;
      float dx = length(texture2D(uTex, vR).rgb) - length(texture2D(uTex, vL).rgb);
      float dy = length(texture2D(uTex, vT).rgb) - length(texture2D(uTex, vB).rgb);
      vec3 n = normalize(vec3(dx, dy, length(texelSize)));
      c *= clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.88, 0.88, 1.0);
      // Soft shoulder. Without it a fast sweep piles dye on dye and the
      // middle of the stroke clips to a hard white-cyan ribbon, which looks
      // like a laser and not like gas. This rolls the top off instead.
      c = 1.0 - exp(-c * 0.80);
      gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
    }`;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vert = compile(gl.VERTEX_SHADER, VERT);
  if (!vert) return;

  function prog(fragSrc) {
    var frag = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!frag) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vert); gl.attachShader(p, frag);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var nm = gl.getActiveUniform(p, i).name;
      u[nm] = gl.getUniformLocation(p, nm);
    }
    return { p: p, u: u, use: function () { gl.useProgram(p); return u; } };
  }

  var P = {
    clear:  prog(F_CLEAR), splat: prog(F_SPLAT), advect: prog(F_ADVECT),
    div:    prog(F_DIV),   curl:  prog(F_CURL),  vort:   prog(F_VORT),
    press:  prog(F_PRESS), grad:  prog(F_GRAD),  show:   prog(F_SHOW)
  };
  for (var k in P) if (!P[k]) return;     // a shader that will not build = no effect

  // ─── render targets ──────────────────────────────────────────────────────
  function fbo(w, h, f) {
    gl.activeTexture(gl.TEXTURE0);
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, halfType, null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex: t, fbo: fb, w: w, h: h, tx: 1 / w, ty: 1 / h,
      bind: function (unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        return unit;
      }
    };
  }
  function pair(w, h, f) {
    var a = fbo(w, h, f), b = fbo(w, h, f);
    return { w: w, h: h, tx: 1 / w, ty: 1 / h,
             get read () { return a; }, get write () { return b; },
             swap: function () { var t = a; a = b; b = t; } };
  }

  var dye, vel, divT, curlT, press, size = { w: 0, h: 0 };

  function dims(res) {
    var ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    var min = Math.round(res), max = Math.round(res * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight
      ? { w: max, h: min } : { w: min, h: max };
  }

  function build() {
    var d = dims(DYE), s = dims(SIM);
    dye   = pair(d.w, d.h, F_RGBA);
    vel   = pair(s.w, s.h, F_RG);
    divT  = fbo(s.w, s.h, F_R);
    curlT = fbo(s.w, s.h, F_R);
    press = pair(s.w, s.h, F_R);
  }

  function resize() {
    // Capped at 1.5x: a 3x retina dye grid costs a lot and looks the same
    // once it has been blurred by its own advection.
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (!w || !h || (w === size.w && h === size.h)) return false;
    size.w = cv.width = w; size.h = cv.height = h;
    build();
    return true;
  }
  if (!resize()) { cv.width = cv.height = 2; build(); }

  // ─── the step ────────────────────────────────────────────────────────────
  function step(dt) {
    var u;

    u = P.curl.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, vel.read.bind(0));
    blit(curlT);

    u = P.vort.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, vel.read.bind(0));
    gl.uniform1i(u.uCurl, curlT.bind(1));
    gl.uniform1f(u.curl, CURL);
    gl.uniform1f(u.dt, dt);
    blit(vel.write); vel.swap();

    u = P.div.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, vel.read.bind(0));
    blit(divT);

    u = P.clear.use();
    gl.uniform1i(u.uTex, press.read.bind(0));
    gl.uniform1f(u.value, 0.8);
    blit(press.write); press.swap();

    u = P.press.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uDivergence, divT.bind(0));
    for (var i = 0; i < ITERS; i++) {
      gl.uniform1i(u.uPressure, press.read.bind(1));
      blit(press.write); press.swap();
    }

    u = P.grad.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uPressure, press.read.bind(0));
    gl.uniform1i(u.uVelocity, vel.read.bind(1));
    blit(vel.write); vel.swap();

    u = P.advect.use();
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, vel.read.bind(0));
    gl.uniform1i(u.uSource, vel.read.bind(0));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.fade, VEL_FADE);
    blit(vel.write); vel.swap();

    gl.uniform2f(u.texelSize, dye.tx, dye.ty);
    gl.uniform1i(u.uVelocity, vel.read.bind(0));
    gl.uniform1i(u.uSource, dye.read.bind(1));
    gl.uniform1f(u.fade, DYE_FADE);
    blit(dye.write); dye.swap();
  }

  function draw() {
    var u = P.show.use();
    gl.uniform2f(u.texelSize, dye.tx, dye.ty);
    gl.uniform1i(u.uTex, dye.read.bind(0));
    blit(null);
  }

  // ─── what the pointer does to it ─────────────────────────────────────────
  function splat(x, y, dx, dy, c) {
    var u = P.splat.use();
    gl.uniform1i(u.uTarget, vel.read.bind(0));
    gl.uniform1f(u.aspect, cv.width / cv.height);
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0);
    gl.uniform1f(u.radius, RADIUS / 2.0);
    blit(vel.write); vel.swap();

    gl.uniform1i(u.uTarget, dye.read.bind(0));
    gl.uniform3f(u.color, c[0], c[1], c[2]);
    blit(dye.write); dye.swap();
  }

  // Site cyan, wandering between the two accents and never leaving them, so
  // the smoke always looks like it belongs to this page.
  function dyeColour() {
    var t = Math.random();
    return [ (0.07 + 0.09 * t) * 0.24,
             (0.52 + 0.30 * t) * 0.24,
             (0.80 + 0.20 * t) * 0.24 ];
  }

  var ptr = { x: 0, y: 0, has: false }, pending = [], quiet = 0, running = false;

  /* One splat per pointer event leaves a dotted line the moment the mouse
     moves quickly -- the events are far apart and the dye is not. So walk the
     segment between the last sample and this one and splat ALONG it, which is
     what turns a row of blobs into a thread. Coalesced events are used where
     the browser offers them: on a 120Hz trackpad that is several real samples
     per frame instead of one averaged guess. */
  function trail(x, y) {
    if (ptr.has) {
      var dx = x - ptr.x, dy = y - ptr.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1e-5) {
        var n = Math.min(Math.ceil(dist / STEP), 24);
        var vx = dx / n * FORCE, vy = dy / n * FORCE;
        for (var i = 1; i <= n; i++)
          pending.push([ptr.x + dx * i / n, ptr.y + dy * i / n,
                        vx, vy, dyeColour()]);
      }
    }
    ptr.x = x; ptr.y = y; ptr.has = true;
  }

  function moved(e) {
    var r = cv.getBoundingClientRect();
    // getCoalescedEvents() returns an EMPTY array for an event that carries no
    // coalesced history, and [] is truthy -- so `|| [e]` never fires and the
    // trail silently gets nothing. Check the length, not the value.
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (!list || !list.length) list = [e];
    for (var i = 0; i < list.length; i++)
      trail((list[i].clientX - r.left) / r.width,
            1 - (list[i].clientY - r.top) / r.height);
    quiet = 0;
    start();
  }

  var last = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 1 / 60);
    last = now;
    resize();

    // A backlog dumped into a single frame is a visible lurch, and on a slow
    // machine it is the thing that makes the whole effect feel broken.
    for (var n = Math.min(pending.length, 40); n > 0; n--) {
      var sp = pending.shift();
      splat(sp[0], sp[1], sp[2], sp[3], sp[4]);
    }
    if (pending.length > 160) pending.length = 160;
    step(dt);
    draw();

    quiet += dt;
    if (quiet > QUIET) {                 // the dye is long gone; stop burning a core
      running = false;
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', moved, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    // A click puffs, so the effect answers a press as well as a sweep.
    var r = cv.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    ptr.x = x; ptr.y = y; ptr.has = true;
    for (var i = 0; i < 3; i++)
      pending.push([x, y, (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, dyeColour()]);
    quiet = 0; start();
  }, { passive: true });
  window.addEventListener('pointerleave', function () { ptr.has = false; });
  window.addEventListener('blur', function () { ptr.has = false; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false; else if (quiet < QUIET) start();
  });
  window.addEventListener('resize', function () { if (running) resize(); });
})();
