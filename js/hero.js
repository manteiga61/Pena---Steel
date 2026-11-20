/* Hero: movimento de câmera, troca entre destaques, poeira de estúdio e profundidade ao mover o mouse.
   Se existir um vídeo em assets/videos/, ele passa a ser usado no lugar da imagem animada. */
(function () {
  var hero = document.getElementById('inicio'), media = document.getElementById('heroMedia');
  var tabs = document.querySelectorAll('#heroTabs button'), header = document.getElementById('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }
  if (!hero || !media || !tabs.length) return;
  var slides = media.querySelectorAll('.hero-slide');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DURATION = 7500, current = 0, timer = null, visible = true;
  hero.style.setProperty('--dur', DURATION + 'ms');
  if (reduce) hero.classList.add('is-static');

  slides.forEach(function (sl) {
    var v = sl.querySelector('video');
    if (v) v.addEventListener('canplay', function () { sl.classList.add('has-video'); if (sl.classList.contains('is-active') && !reduce) v.play().catch(function () {}); });
  });
  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (sl, n) {
      var on = n === current, v = sl.querySelector('video');
      sl.classList.toggle('is-active', on);
      if (!v) return;
      if (on && !reduce) { v.preload = 'auto'; v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else setTimeout(function () { if (!sl.classList.contains('is-active')) v.pause(); }, 1500);
    });
    tabs.forEach(function (t, n) {
      t.classList.toggle('is-active', n === current); t.setAttribute('aria-selected', n === current);
      var bar = t.querySelector('i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
  }
  function stop() { clearInterval(timer); }
  function start() { stop(); if (!reduce && visible && !document.hidden) timer = setInterval(function () { show(current + 1); }, DURATION); }
  tabs.forEach(function (t, n) { t.addEventListener('click', function () { show(n); start(); }); });
  document.addEventListener('visibilitychange', start);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }, { threshold: .15 }).observe(hero);

  /* profundidade com o mouse */
  if (!reduce && window.matchMedia('(hover:hover)').matches) {
    var raf = 0;
    hero.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * 2);
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * 2); raf = 0;
      });
    });
  }

  /* poeira flutuando na luz do estúdio */
  var cv = document.getElementById('heroDust');
  if (cv && !reduce) {
    var cx = cv.getContext('2d'), W, H, dots = [], dpr = Math.min(window.devicePixelRatio || 1, 2), run = false;
    var size = function () { W = cv.width = hero.clientWidth * dpr; H = cv.height = hero.clientHeight * dpr; };
    var mk = function (init) { return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: (Math.random() * 1.3 + .4) * dpr, vy: (Math.random() * .25 + .08) * dpr, vx: (Math.random() - .5) * .12 * dpr, a: Math.random() * .5 + .15, ph: Math.random() * 6.28 }; };
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < (window.innerWidth < 700 ? 22 : 44); i++) dots.push(mk(true));
    var t0 = 0;
    (function loop(t) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      cx.clearRect(0, 0, W, H);
      dots.forEach(function (d, k) {
        d.y -= d.vy; d.x += d.vx + Math.sin(t / 2200 + d.ph) * .12 * dpr;
        if (d.y < -10) dots[k] = d = mk(false);
        var a = d.a * (.55 + .45 * Math.sin(t / 900 + d.ph)), g = cx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3);
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(d.x, d.y, d.r * 3, 0, 6.283); cx.fill();
      });
    })(0);
  }
  show(0); start();
})();
