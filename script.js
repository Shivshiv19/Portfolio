// Signal to the inline head guard that the reveal engine is alive.
window.__revealed = true;

(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Footer: live local time (Hyderabad / IST) + back-to-top
  var timeEl = document.getElementById('local-time');
  if (timeEl) {
    var fmtTime = function () {
      try {
        timeEl.textContent = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
        }).format(new Date());
      } catch (e) { timeEl.textContent = new Date().toLocaleTimeString(); }
    };
    fmtTime(); setInterval(fmtTime, 30000);
  }
  var backTop = document.querySelector('.foot-top');
  if (backTop) backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Reveal-on-scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    // No IO support: just show everything.
    document.documentElement.classList.remove('reveal-on');
  }

  // Hero tagline now scrolls via pure CSS (.rot-track) — no JS needed.

  // Best-effort autoplay for gif-style looping videos
  document.querySelectorAll('video[autoplay]').forEach(function (v) {
    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) tryPlay(); });
      }, { threshold: 0.2 }).observe(v);
    }
  });

  // Before/after comparison slider — wireframe (left) vs Final UI (right).
  // Rests at 50/50. Drag LEFT -> full Final UI, drag RIGHT -> full wireframe.
  // No auto-motion: wherever you leave the divider, it stays.
  document.querySelectorAll('.thumb.compare .ba-slider[data-ba]').forEach(function (el) {
    var handle = el.querySelector('.ba-handle');
    var clamp = function (n) { return Math.max(0, Math.min(100, n)); };
    var set = function (p) {
      p = clamp(p);
      el.style.setProperty('--pos', p + '%');
      if (handle) handle.setAttribute('aria-valuenow', Math.round(p));
    };
    var pctFromX = function (clientX) {
      var r = el.getBoundingClientRect();
      return (clientX - r.left) / r.width * 100;
    };
    var dragging = false;
    set(50);

    el.addEventListener('pointerdown', function (e) {
      dragging = true;
      set(pctFromX(e.clientX)); e.preventDefault();
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    el.addEventListener('pointermove', function (e) { if (dragging) set(pctFromX(e.clientX)); });
    var release = function () { dragging = false; };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    if (handle) {
      handle.addEventListener('keydown', function (e) {
        var cur = parseFloat(el.style.getPropertyValue('--pos')) || 50;
        if (e.key === 'ArrowLeft') { set(cur - 4); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { set(cur + 4); e.preventDefault(); }
      });
    }
  });

  // Mobile nav toggle (hamburger)
  var navToggle = document.querySelector('.nav-toggle');
  var topInner = document.querySelector('.top-inner');
  if (navToggle && topInner) {
    navToggle.addEventListener('click', function () {
      var open = topInner.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    topInner.querySelectorAll('nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        topInner.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Nav scrollspy — highlight the section currently in view (homepage only).
  if ('IntersectionObserver' in window) {
    var links = document.querySelectorAll('.top nav a[href^="#"]');
    var map = {};
    links.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec) map[sec.id] = a;
    });
    var ids = Object.keys(map);
    if (ids.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            links.forEach(function (a) { a.classList.remove('active'); });
            if (map[e.target.id]) map[e.target.id].classList.add('active');
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      ids.forEach(function (id) { spy.observe(document.getElementById(id)); });
    }
  }
})();

// Off-the-clock halftone reveal — a full-width grid of dots that swell far from
// the cursor and shrink near it, wiping to reveal the headline behind. No deps.
(function () {
  var canvas = document.getElementById('otcCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var section = canvas.closest('.otc');
  var DOT = (section && getComputedStyle(section).getPropertyValue('--otc-bg').trim()) || '#0F6B54';
  var CELL = 26, MAX = 26, K = 0.001; // higher K = smaller reveal spotlight
  var mouseX = null, mouseY = null, things = [], W = 0, H = 0, dpr = 1;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function build() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    things = [];
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        things.push({ x: j * CELL + CELL * 0.5, y: i * CELL + CELL * 0.5 });
      }
    }
    if (mouseX == null) { mouseX = W * 0.5; mouseY = H * 0.42; }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DOT;
    for (var k = 0; k < things.length; k++) {
      var t = things[k];
      var dx = mouseX - t.x, dy = mouseY - t.y;
      var radius = clamp((dx * dx + dy * dy) * K - 1, 0, MAX);
      if (radius <= 0.2) continue;
      ctx.beginPath(); ctx.arc(t.x, t.y, radius, 0, 6.2832); ctx.fill();
    }
  }

  function throttle(fn) {
    var q = false;
    return function (a) { if (!q) { requestAnimationFrame(function () { fn(a); q = false; }); q = true; } };
  }
  function move(e) {
    var r = canvas.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    mouseX = p.clientX - r.left; mouseY = p.clientY - r.top; draw();
  }
  canvas.addEventListener('mousemove', throttle(move));
  canvas.addEventListener('touchmove', throttle(move), { passive: true });
  window.addEventListener('resize', throttle(build));
  if (window.ResizeObserver) { new ResizeObserver(throttle(build)).observe(canvas); }
  build();
})();

// oneko — a cat that follows the cursor site-wide. Adaptive coat (dark on light,
// white over dark zones). "You like cats?" toggle: ON = follow the cursor,
// OFF = trot over to the toggle and curl up asleep. Choice is remembered.
(function () {
  var mq = window.matchMedia;
  if (mq && (mq('(prefers-reduced-motion: reduce)').matches || mq('(pointer: coarse)').matches)) return;

  var SPRITE = 'url("data:image/gif;base64,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")';
  var STORE = 'catCursor';
  var enabled = true;
  try { enabled = localStorage.getItem(STORE) !== 'off'; } catch (e) {}

  var nekoEl, toggle, sw, darkZones = [];
  var nekoPosX = 32, nekoPosY = 32, mouseX = 32, mouseY = 32;
  var frameCount = 0, idleTime = 0, idleAnimation = null, idleAnimationFrame = 0, sleepFrame = 0;
  var nekoSpeed = 10;
  var spriteSets = {
    idle: [[-3,-3]], alert: [[-7,-3]],
    scratchSelf: [[-5,0],[-6,0],[-7,0]],
    scratchWallN: [[0,0],[0,-1]], scratchWallS: [[-7,-1],[-6,-2]],
    scratchWallE: [[-2,-2],[-2,-3]], scratchWallW: [[-4,0],[-4,-1]],
    tired: [[-3,-2]], sleeping: [[-2,0],[-2,-1]],
    N: [[-1,-2],[-1,-3]], NE: [[0,-2],[0,-3]], E: [[-3,0],[-3,-1]], SE: [[-5,-1],[-5,-2]],
    S: [[-6,-3],[-7,-2]], SW: [[-5,-3],[-6,-1]], W: [[-4,-2],[-4,-3]], NW: [[-1,0],[-1,-1]]
  };

  document.addEventListener('mousemove', function (e) { mouseX = e.clientX; mouseY = e.clientY; });

  function setSprite(name, f) { var s = spriteSets[name][f % spriteSets[name].length]; nekoEl.style.backgroundPosition = (s[0]*32)+'px '+(s[1]*32)+'px'; }
  function resetIdle() { idleAnimation = null; idleAnimationFrame = 0; }
  function dirString(dx, dy, dist) {
    var d = '';
    d += dy / dist > 0.5 ? 'N' : '';
    d += dy / dist < -0.5 ? 'S' : '';
    d += dx / dist > 0.5 ? 'W' : '';
    d += dx / dist < -0.5 ? 'E' : '';
    return d || 'idle';
  }
  function walk(dx, dy, dist) {
    nekoPosX -= (dx / dist) * nekoSpeed;
    nekoPosY -= (dy / dist) * nekoSpeed;
    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);
    nekoEl.style.left = (nekoPosX - 16) + 'px';
    nekoEl.style.top = (nekoPosY - 16) + 'px';
  }
  function sleepSpot() { var r = toggle.getBoundingClientRect(); return [r.left + r.width * 0.5, r.top - 10]; }
  function overDark() {
    for (var i = 0; i < darkZones.length; i++) {
      var r = darkZones[i].getBoundingClientRect();
      if (nekoPosX >= r.left && nekoPosX <= r.right && nekoPosY >= r.top && nekoPosY <= r.bottom) return true;
    }
    return false;
  }
  function idle() {
    idleTime += 1;
    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation == null) {
      var avail = ['sleeping', 'scratchSelf'];
      if (nekoPosX < 32) avail.push('scratchWallW');
      if (nekoPosY < 32) avail.push('scratchWallN');
      if (nekoPosX > window.innerWidth - 32) avail.push('scratchWallE');
      if (nekoPosY > window.innerHeight - 32) avail.push('scratchWallS');
      idleAnimation = avail[Math.floor(Math.random() * avail.length)];
    }
    switch (idleAnimation) {
      case 'sleeping':
        if (idleAnimationFrame < 8) { setSprite('tired', 0); break; }
        setSprite('sleeping', Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdle();
        break;
      case 'scratchWallN': case 'scratchWallS': case 'scratchWallE': case 'scratchWallW':
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdle();
        break;
      case 'scratchSelf':
        setSprite('scratchSelf', idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdle();
        break;
      default: setSprite('idle', 0); return;
    }
    idleAnimationFrame += 1;
  }
  function frame() {
    frameCount += 1;
    if (!enabled) {
      // OFF: trot to the toggle and curl up asleep
      var p = sleepSpot();
      var dx = nekoPosX - p[0], dy = nekoPosY - p[1], dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) {
        sleepFrame += 1;
        if (sleepFrame < 10) setSprite('tired', 0);
        else setSprite('sleeping', Math.floor(sleepFrame / 4));
      } else {
        sleepFrame = 0;
        setSprite(dirString(dx, dy, dist), frameCount);
        walk(dx, dy, dist);
      }
      nekoEl.style.filter = overDark() ? 'invert(1)' : 'invert(0)';
      return;
    }
    // ON: chase the cursor
    sleepFrame = 0;
    var diffX = nekoPosX - mouseX, diffY = nekoPosY - mouseY;
    var distance = Math.sqrt(diffX * diffX + diffY * diffY);
    if (distance < nekoSpeed || distance < 48) { idle(); }
    else {
      resetIdle();
      if (idleTime > 1) { setSprite('alert', 0); idleTime = Math.min(idleTime, 7); idleTime -= 1; }
      else { setSprite(dirString(diffX, diffY, distance), frameCount); walk(diffX, diffY, distance); }
    }
    nekoEl.style.filter = overDark() ? 'invert(1)' : 'invert(0)';
  }
  function refreshZones() { darkZones = Array.prototype.slice.call(document.querySelectorAll('.otc, [data-cat-dark]')); }

  toggle = document.createElement('div');
  toggle.className = 'cat-toggle';
  toggle.innerHTML = '<span class="cat-toggle-label">You like cats?</span>' +
    '<button class="cat-toggle-switch" type="button" role="switch" aria-label="Toggle cat cursor"><span class="knob"></span></button>';
  sw = toggle.querySelector('.cat-toggle-switch');
  (document.body || document.documentElement).appendChild(toggle);

  nekoEl = document.createElement('div');
  nekoEl.id = 'oneko'; nekoEl.setAttribute('aria-hidden', 'true');
  nekoEl.style.cssText = 'width:32px;height:32px;position:fixed;pointer-events:none;image-rendering:pixelated;left:16px;top:16px;z-index:2147483647;transition:filter .25s ease;background-image:' + SPRITE + ';';
  (document.body || document.documentElement).appendChild(nekoEl);
  refreshZones();

  if (!enabled) { var s0 = sleepSpot(); nekoPosX = s0[0]; nekoPosY = s0[1]; nekoEl.style.left = (nekoPosX - 16) + 'px'; nekoEl.style.top = (nekoPosY - 16) + 'px'; }

  sw.setAttribute('aria-checked', enabled ? 'true' : 'false');
  sw.addEventListener('click', function () {
    enabled = !enabled;
    try { localStorage.setItem(STORE, enabled ? 'on' : 'off'); } catch (e) {}
    sw.setAttribute('aria-checked', enabled ? 'true' : 'false');
    sleepFrame = 0;
  });

  setInterval(frame, 100);
  window.addEventListener('resize', refreshZones);
})();
