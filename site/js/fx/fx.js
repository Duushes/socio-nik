/* Socio-Nik · эффекты: появление при прокрутке, счёт чисел и рост полос, пауза петель вне экрана,
   лента по прокрутке, проявление текста по буквам, стопка карточек, подгонка заголовка по ширине,
   конфетти и переходы между экранами. Всё уважает prefers-reduced-motion. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { reducedMotion } = S.dom;
  const fineMouse = () => Boolean(root.matchMedia && root.matchMedia('(hover: hover) and (pointer: fine)').matches);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // Обработчик прокрутки и размера окна через один кадр; работает, только пока секция на экране
  function onScrollFrame(target, fn) {
    let raf = 0, on = true;
    const tick = () => { raf = 0; fn(); };
    const ask = () => { if (on && !raf) raf = requestAnimationFrame(tick); };
    const io = 'IntersectionObserver' in root ? new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) ask(); }, { rootMargin: '200px 0px' }) : null;
    if (io) io.observe(target);
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    ask();
    return () => { removeEventListener('scroll', ask); removeEventListener('resize', ask); cancelAnimationFrame(raf); if (io) io.disconnect(); };
  }

  // ---------- счёт чисел и рост полос ----------
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

  // FadeIn: один раз, 0,7 с; сдвиг и задержка — из --fx / --fy / --d
  function reveal(scope) {
    const els = Array.from(scope.querySelectorAll('.reveal'));
    if (reducedMotion() || !('IntersectionObserver' in root)) { els.forEach(show); return () => {}; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
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

  // ---------- лента: ряды едут в разные стороны по прокрутке ----------
  // offset = (scrollY − верх секции + высота окна) × 0,3; первый ряд — offset − 200, второй — зеркально
  function marquee(scope) {
    const sec = scope.querySelector('[data-marquee]');
    if (!sec || reducedMotion()) return () => {};
    const rows = Array.from(sec.querySelectorAll('.mq-track'));
    return onScrollFrame(sec, () => {
      const offset = (scrollY - (sec.getBoundingClientRect().top + scrollY) + innerHeight) * 0.3;
      rows.forEach((row, i) => {
        const x = i % 2 ? -(offset - 200) : offset - 200;
        row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      });
    });
  }

  // ---------- проявление текста по буквам: 0,2 → 1 между 'start 0.8' и 'end 0.2' ----------
  // Скринридер читает скрытую копию, буквы ему не видны; слова не рвутся
  function splitText(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    let i = 0;
    const words = text.split(' ').map(w => `<span class="at-w">${Array.from(w).map(ch => `<span class="at-c" style="--i:${i++}">${S.dom.esc(ch)}</span>`).join('')}</span>`);
    el.innerHTML = `<span class="sr">${S.dom.esc(text)}</span><span aria-hidden="true">${words.join(' ')}</span>`;
    el.style.setProperty('--n', i);
  }
  function animText(scope) {
    const els = Array.from(scope.querySelectorAll('[data-anim-text]'));
    if (!els.length) return () => {};
    els.forEach(splitText);
    if (reducedMotion()) { els.forEach(el => el.style.setProperty('--p', 1)); return () => {}; }
    const offs = els.map(el => onScrollFrame(el, () => {
      const r = el.getBoundingClientRect(), vh = innerHeight;
      el.style.setProperty('--p', clamp01((0.8 * vh - r.top) / (0.6 * vh + r.height)).toFixed(4));
    }));
    return () => offs.forEach(f => f());
  }

  // ---------- стопка: карточки прилипают и уменьшаются до 1 − (n − 1 − i) × 0,03 ----------
  function stack(scope) {
    const box = scope.querySelector('[data-stack]');
    if (!box || reducedMotion()) return () => {};
    const cards = Array.from(box.querySelectorAll('.stack-card'));
    const n = cards.length;
    return onScrollFrame(box, () => {
      const r = box.getBoundingClientRect();
      const p = clamp01(-r.top / Math.max(1, r.height - innerHeight));
      cards.forEach((c, i) => {
        const k = clamp01((p - i / n) / (1 - i / n));
        c.style.transform = `scale(${(1 - (n - 1 - i) * 0.03 * k).toFixed(4)})`;
      });
    });
  }

  // ---------- подгонка по ширине ----------
  // [data-fit]: внутри .fit-in со строками .fit-line. Одна строка, пока кегль ≥ min·vw; иначе по строке на .fit-line.
  // Кегль не больше max·vw и (если задано) maxh·высоты окна.
  function fit(el) {
    const inner = el.querySelector('.fit-in');
    if (!inner || !el.clientWidth) return;
    const cs = getComputedStyle(el);
    const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const vw = innerWidth / 100, vh = innerHeight / 100;
    const max = Number(el.dataset.max || 17.5) * vw, min = Number(el.dataset.min || 12) * vw;
    const maxh = el.dataset.maxh ? Number(el.dataset.maxh) * vh : Infinity;
    el.style.fontSize = '100px';
    el.classList.remove('is-two');
    let size = 100 * W / inner.scrollWidth;
    const lines = el.querySelectorAll('.fit-line');
    if (size < min && lines.length > 1) {
      el.classList.add('is-two');
      size = 100 * W / Math.max(...Array.from(lines, l => l.scrollWidth));
    }
    el.style.fontSize = Math.min(size * 0.985, max, maxh).toFixed(2) + 'px';
    el.dispatchEvent(new CustomEvent('fitted', { bubbles: true }));
  }
  function fitAll(scope) {
    const els = Array.from(scope.querySelectorAll('[data-fit]'));
    if (!els.length) return () => {};
    const run = () => els.forEach(fit);
    run();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); };
    addEventListener('resize', onResize);
    return () => { removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
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
  function transition(update) {
    // Без API, в щадящем режиме и поверх уже идущего перехода — просто обновляем экран
    if (!document.startViewTransition || reducedMotion() || active || document.visibilityState !== 'visible') { update(); return; }
    const vt = active = document.startViewTransition(update);
    const done = () => { active = null; };
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.then(done, done);
  }

  // Подключить всё к только что отрисованному экрану; вернуть уборку
  function mountAll(scope) {
    const offs = [fitAll(scope), reveal(scope), pauseOffscreen(scope), marquee(scope), animText(scope), stack(scope)];
    scope.querySelectorAll('svg.em-live').forEach(svg => offs.push(S.art.animateOrbit(svg)));
    return () => offs.forEach(off => off && off());
  }

  S.fx = { reveal, countUp, show, pauseOffscreen, marquee, animText, stack, fit, fitAll, confetti, transition, mountAll, fineMouse };
})(window);
