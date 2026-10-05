/* Socio-Nik · эффекты: появление при прокрутке, счёт чисел, рост столбиков, наклон карточек,
   морфинг дихотомий, пауза анимаций вне экрана, конфетти, переходы между экранами. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { reducedMotion } = S.dom;

  // ---------- счёт чисел и рост столбиков ----------
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.count);
    if (reducedMotion()) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1200;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function show(el) {
    el.classList.add('in');
    const counters = el.matches('[data-count]') ? [el] : [];
    counters.concat(Array.from(el.querySelectorAll('[data-count]'))).forEach(countUp);
    const bars = el.matches('[data-w]') ? [el] : [];
    bars.concat(Array.from(el.querySelectorAll('[data-w]'))).forEach(b => { b.style.setProperty('--w', b.dataset.w + '%'); });
  }

  function reveal(scope) {
    const els = Array.from(scope.querySelectorAll('.reveal'));
    if (reducedMotion() || !('IntersectionObserver' in root)) { els.forEach(show); return () => {}; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }

  // ---------- пауза петель вне экрана ----------
  function pauseOffscreen(scope) {
    const els = scope.querySelectorAll('[data-anim]');
    if (!els.length || !('IntersectionObserver' in root)) return () => {};
    const io = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)));
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }

  // ---------- наклон карточек и блик за курсором ----------
  function tilt(scope) {
    if (reducedMotion()) return () => {};
    const move = e => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest && e.target.closest('.tilt');
      if (!el || !scope.contains(el)) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
      el.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      el.classList.add('tilting');
    };
    const out = e => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
      el.classList.remove('tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    };
    scope.addEventListener('pointermove', move);
    scope.addEventListener('pointerout', out);
    return () => { scope.removeEventListener('pointermove', move); scope.removeEventListener('pointerout', out); };
  }

  // ---------- морфинг «А ↔ Б» у карточек дихотомий ----------
  function morph(scope) {
    const cards = Array.from(scope.querySelectorAll('[data-morph]'));
    if (!cards.length) return () => {};
    const visible = new Set();
    const io = 'IntersectionObserver' in root ? new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)))) : null;
    cards.forEach(c => {
      if (io) io.observe(c); else visible.add(c);
      c.addEventListener('pointerenter', () => c.classList.add('hover'));
      c.addEventListener('pointerleave', () => c.classList.remove('hover'));
    });
    const timer = reducedMotion() ? 0 : setInterval(() => cards.forEach(c => {
      if (visible.has(c) && !c.classList.contains('hover')) c.classList.toggle('is-b');
    }), 2600);
    return () => { clearInterval(timer); if (io) io.disconnect(); };
  }

  // ---------- параллакс героя ----------
  function parallax(scope) {
    const hero = scope.querySelector('[data-parallax]');
    if (!hero || reducedMotion()) return () => {};
    let raf = 0, px = 0, py = 0;
    const onMove = e => {
      if (e.pointerType === 'touch') return;
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const apply = () => {
      raf = 0;
      hero.style.setProperty('--px', px.toFixed(3));
      hero.style.setProperty('--py', py.toFixed(3));
      hero.style.setProperty('--sy', Math.min(1, scrollY / innerHeight).toFixed(3));
    };
    addEventListener('pointermove', onMove);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }

  // ---------- конфетти ----------
  function confetti(colors, { x = 0.5, y = 0.32, n = 110 } = {}) {
    if (reducedMotion() || !document.body.animate) return;
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    const ox = innerWidth * x, oy = innerHeight * y;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const w = 6 + Math.random() * 7;
      p.style.cssText = `left:${ox}px;top:${oy}px;width:${w}px;height:${(w * (0.45 + Math.random() * 0.7)).toFixed(1)}px;background:${colors[i % colors.length]};border-radius:${Math.random() < 0.3 ? '50%' : '2px'}`;
      layer.appendChild(p);
      const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 340;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 240, rot = (Math.random() - 0.5) * 1080;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), calc(-50% + ${dy.toFixed(0)}px)) rotate(${(rot / 2).toFixed(0)}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${(dx * 1.3).toFixed(0)}px), calc(-50% + ${(dy + 560).toFixed(0)}px)) rotate(${rot.toFixed(0)}deg)`, opacity: 0 }
      ], { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), 2800);
  }

  // ---------- переходы между экранами ----------
  let active = null;
  function transition(update, { theme = false, x = innerWidth / 2, y = 0 } = {}) {
    // Без API, в щадящем режиме и поверх уже идущего перехода — просто обновляем экран
    if (!document.startViewTransition || reducedMotion() || active || document.visibilityState !== 'visible') { update(); return; }
    const de = document.documentElement;
    if (theme) {
      de.style.setProperty('--vt-x', x + 'px');
      de.style.setProperty('--vt-y', y + 'px');
      de.classList.add('vt-theme');
    }
    const vt = active = document.startViewTransition(update);
    const done = () => { active = null; de.classList.remove('vt-theme'); };
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.then(done, done);
  }

  // Подключить всё к только что отрисованному экрану; вернуть уборку
  function mountAll(scope) {
    const offs = [reveal(scope), pauseOffscreen(scope), tilt(scope), morph(scope), parallax(scope)];
    scope.querySelectorAll('svg.em-live').forEach(svg => offs.push(S.art.animateOrbit(svg)));
    return () => offs.forEach(off => off && off());
  }

  S.fx = { reveal, countUp, show, pauseOffscreen, tilt, morph, parallax, confetti, transition, mountAll };
})(window);
