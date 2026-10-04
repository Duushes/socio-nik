/* Socio-Nik · эффекты: появление при прокрутке, счёт чисел, наклон карточек,
   морфинг дихотомий, пауза анимаций вне экрана, конфетти, переходы между экранами. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { reducedMotion } = S.dom;

  // ---------- счёт чисел ----------
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.count);
    if (reducedMotion() || (S.app && S.app.quiet)) { el.textContent = to; return; }
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
  // Смотрим на каждую секцию экрана (и на помеченное data-anim): всё, что ушло за край, стоит на паузе
  function pauseOffscreen(scope) {
    const els = scope.querySelectorAll('section, [data-anim]');
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
  // Не по таймеру: знак меняется, когда на карточку смотрят (наведение) или нажимают на неё
  function morph(scope) {
    const cards = Array.from(scope.querySelectorAll('[data-morph]'));
    if (!cards.length) return () => {};
    const offs = cards.map(c => {
      const on = () => c.classList.add('hover'), off = () => c.classList.remove('hover');
      const tap = e => { if (e.pointerType !== 'mouse') c.classList.toggle('is-b'); };
      c.addEventListener('pointerenter', on);
      c.addEventListener('pointerleave', off);
      c.addEventListener('pointerup', tap);
      return () => { c.removeEventListener('pointerenter', on); c.removeEventListener('pointerleave', off); c.removeEventListener('pointerup', tap); };
    });
    return () => offs.forEach(f => f());
  }

  // ---------- сцены отношений: история один раз, повтор — по наведению или нажатию ----------
  function scenes(scope) {
    const replay = svg => {
      if (reducedMotion() || !svg.getAnimations) return;
      svg.getAnimations({ subtree: true }).forEach(a => { a.cancel(); a.play(); });
    };
    const pick = e => e.target.closest && e.target.closest('svg.scene');
    const onEnter = e => { const sc = pick(e); if (sc && e.pointerType === 'mouse' && !sc.contains(e.relatedTarget)) replay(sc); };
    const onClick = e => { const sc = pick(e); if (sc) replay(sc); };
    scope.addEventListener('pointerover', onEnter);
    scope.addEventListener('click', onClick);
    return () => { scope.removeEventListener('pointerover', onEnter); scope.removeEventListener('click', onClick); };
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
    // Без API и поверх уже идущего перехода — просто обновляем экран; в щадящем режиме — мягкая смена прозрачности
    if (!document.startViewTransition || active || document.visibilityState !== 'visible') { update(); return; }
    const de = document.documentElement, gentle = reducedMotion();
    if (gentle) de.classList.add('vt-gentle');
    else if (theme) {
      de.style.setProperty('--vt-x', x + 'px');
      de.style.setProperty('--vt-y', y + 'px');
      de.classList.add('vt-theme');
    }
    const vt = active = document.startViewTransition(update);
    const done = () => { active = null; de.classList.remove('vt-theme', 'vt-gentle'); };
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.then(done, done);
  }

  // Подключить всё к только что отрисованному экрану; вернуть уборку
  function mountAll(scope) {
    const offs = [reveal(scope), pauseOffscreen(scope), tilt(scope), morph(scope), scenes(scope)];
    scope.querySelectorAll('svg.em-live').forEach(svg => offs.push(S.art.animateOrbit(svg)));
    return () => offs.forEach(off => off && off());
  }

  S.fx = { reveal, countUp, show, pauseOffscreen, tilt, morph, scenes, confetti, transition, mountAll };
})(window);
