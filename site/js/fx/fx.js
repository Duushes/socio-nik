/* Socio-Nik · эффекты: появление при прокрутке, счёт чисел и рост полос, пауза и отдых петель,
   магнит, лента по прокрутке, стопка карточек, подгонка заголовка по ширине,
   конфетти и переходы между экранами. Всё уважает prefers-reduced-motion. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { reducedMotion } = S.dom;
  const fineMouse = () => Boolean(root.matchMedia && root.matchMedia('(hover: hover) and (pointer: fine)').matches);
  // телефон: эффекты, которые пересчитывают стили на каждом кадре прокрутки, выключаем — там они давали подтормаживание
  const compactScreen = () => Boolean(root.matchMedia && root.matchMedia('(max-width: 767px), (pointer: coarse)').matches);
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

  // ---------- петли: вне экрана — пауза (.is-off); на экране играют несколько секунд и замирают ----------
  // Движение без конца сразу на многих блоках — шум и расход батареи. Петля внутри [data-anim] играет REST мс,
  // доигрывает цикл и замирает в исходной позе. Оживает, когда блок возвращается на экран, под курсором и по касанию.
  // [data-anim="keep"] не замирает: это единственный зовущий элемент экрана (коробка).
  const REST = 8000, SLOW = 8000;
  function pauseOffscreen(scope) {
    const els = Array.from(scope.querySelectorAll('[data-anim]'));
    if (!els.length || !('IntersectionObserver' in root)) return () => {};
    const rests = el => el.dataset.anim !== 'keep' && !reducedMotion();
    const timers = new Map();
    const tire = el => {
      el.classList.add('is-tired');
      // медленная петля (круг за минуту) конца цикла не дождётся — её останавливаем на месте: этого не видно
      if (el.getAnimations) el.getAnimations({ subtree: true }).forEach(a => {
        const t = a.effect && a.effect.getComputedTiming();
        if (t && t.iterations === Infinity && t.duration > SLOW && a.effect.target) a.effect.target.classList.add('is-held');
      });
    };
    const wake = el => {
      clearTimeout(timers.get(el));
      [el, ...el.querySelectorAll('.is-held, .is-settled')].forEach(x => x.classList.remove('is-tired', 'is-held', 'is-settled'));
      if (rests(el)) timers.set(el, setTimeout(tire, REST, el));
    };
    // Конец цикла у уставшей петли. Персонажи и значки в начале цикла стоят в исходной позе — просто пауза.
    // Символ пары (.fx) в начале цикла обычно невидим, поэтому его плавно возвращаем на своё место без движения.
    const onIter = e => {
      const t = e.target;
      if (!e.currentTarget.classList.contains('is-tired') || t.classList.contains('is-held') || t.classList.contains('is-settled')) return;
      if (!t.classList.contains('fx')) { t.classList.add('is-held'); return; }
      const cs = getComputedStyle(t), from = { opacity: cs.opacity, transform: cs.transform };
      t.classList.add('is-settled');
      try { t.animate([from, {}], { duration: 500, easing: 'ease-out' }); } catch (err) { /* без плавности, вид тот же */ }
    };
    const onWake = e => wake(e.currentTarget);
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      e.target.classList.toggle('is-off', !e.isIntersecting);
      if (e.isIntersecting) wake(e.target); else clearTimeout(timers.get(e.target));
    }));
    els.forEach(el => {
      io.observe(el);
      if (!rests(el)) return;
      el.addEventListener('animationiteration', onIter);
      el.addEventListener('pointerenter', onWake);
    });
    return () => {
      io.disconnect();
      timers.forEach(t => clearTimeout(t));
      els.forEach(el => { el.removeEventListener('animationiteration', onIter); el.removeEventListener('pointerenter', onWake); });
    };
  }

  // ---------- магнит: [data-magnet] — зона (её размер не меняется), сдвигается первый ребёнок ----------
  function magnet(scope, { pad = 150, strength = 3 } = {}) {
    const zones = Array.from(scope.querySelectorAll('[data-magnet]'));
    if (!zones.length || reducedMotion() || !fineMouse()) return () => {};
    let raf = 0, mx = -1e4, my = -1e4;
    const apply = () => {
      raf = 0;
      zones.forEach(z => {
        const el = z.firstElementChild;
        if (!el) return;
        const r = z.getBoundingClientRect();
        const near = mx > r.left - pad && mx < r.right + pad && my > r.top - pad && my < r.bottom + pad;
        if (near) {
          const x = (mx - (r.left + r.width / 2)) / strength, y = (my - (r.top + r.height / 2)) / strength;
          el.style.transition = 'transform 0.3s ease-out';
          el.style.willChange = 'transform';
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          z.classList.add('pulled');
        } else if (z.classList.contains('pulled')) {
          z.classList.remove('pulled');
          el.style.transition = 'transform 0.6s ease-in-out';
          el.style.transform = 'translate3d(0, 0, 0)';
          setTimeout(() => { if (!z.classList.contains('pulled')) el.style.willChange = ''; }, 650);
        }
      });
    };
    const move = e => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { mx = my = -1e4; if (!raf) raf = requestAnimationFrame(apply); };
    addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => { removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); };
  }

  // ---------- лента: ряды едут в разные стороны по прокрутке ----------
  // offset = (scrollY − верх секции + высота окна) × 0,3; первый ряд — offset − 200, второй — зеркально.
  // Телефон и сенсорные экраны — без этого: там прокрутка идёт мимо скрипта (iOS, встроенный браузер Telegram),
  // привязанные ряды отставали и прыгали; ряды листаются пальцем (components.css).
  function marquee(scope) {
    const sec = scope.querySelector('[data-marquee]');
    if (!sec || compactScreen()) return () => {};
    const rows = Array.from(sec.querySelectorAll('.mq-track'));
    const moving = !reducedMotion();
    let held = null;
    const sync = () => {
      if (!moving) return;
      const offset = (scrollY - (sec.getBoundingClientRect().top + scrollY) + innerHeight) * 0.3;
      rows.forEach((row, i) => {
        if (row === held) return;
        const x = i % 2 ? -(offset - 200) : offset - 200;
        row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      });
    };
    // Ряд шире окна, а своей прокрутки у него нет: плитка, на которую пришли с клавиатуры, могла стоять за краем.
    // Подвигаем ряд, чтобы она была видна; пока фокус в ряду, прокрутка страницы его не двигает.
    // Сдвиг — через left: в щадящем режиме transform у ряда выключен. Только для клавиатуры — под мышью ряд не дёргается.
    const byKeys = el => { try { return el.matches(':focus-visible'); } catch (e) { return document.documentElement.classList.contains('kbd'); } };
    const free = () => { if (!held) return; held.style.left = ''; held = null; sync(); };
    const onFocus = e => {
      const tile = e.target.closest && e.target.closest('.mq-tile');
      if (!tile || !byKeys(tile)) return;
      const row = tile.closest('.mq-track');
      if (held && held !== row) free();
      held = row;
      const r = tile.getBoundingClientRect(), pad = 24;
      if (r.left >= pad && r.right <= innerWidth - pad) return;
      // где плитка стояла бы без сдвига (сдвиг может быть ещё в пути) → сколько нужно, чтобы она встала по центру
      const natural = r.left - (parseFloat(getComputedStyle(row).left) || 0);
      row.style.left = ((innerWidth - r.width) / 2 - natural).toFixed(1) + 'px';
    };
    const onBlur = e => { const to = e.relatedTarget; if (!to || !sec.contains(to) || !to.closest('.mq-tile')) free(); };
    sec.addEventListener('focusin', onFocus);
    sec.addEventListener('focusout', onBlur);
    const off = moving ? onScrollFrame(sec, sync) : () => {};
    return () => { off(); sec.removeEventListener('focusin', onFocus); sec.removeEventListener('focusout', onBlur); };
  }

  // ---------- стопка: карточки прилипают и уменьшаются до 1 − (n − 1 − i) × 0,03 ----------
  function stack(scope) {
    const box = scope.querySelector('[data-stack]');
    if (!box || reducedMotion() || compactScreen()) return () => {};
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
  function confetti(colors, { x = 0.5, y = 0.32, n = 110, power = 1 } = {}) {
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
      const a = Math.random() * Math.PI * 2, v = (160 + Math.random() * 340) * power;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 240 * power, rot = (Math.random() - 0.5) * 1080;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), calc(-50% + ${dy.toFixed(0)}px)) rotate(${(rot / 2).toFixed(0)}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${(dx * 1.3).toFixed(0)}px), calc(-50% + ${(dy + 560 * power).toFixed(0)}px)) rotate(${rot.toFixed(0)}deg)`, opacity: 0 }
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
    const offs = [fitAll(scope), reveal(scope), pauseOffscreen(scope), magnet(scope), marquee(scope), stack(scope)];
    scope.querySelectorAll('svg.em-live').forEach(svg => offs.push(S.art.animateOrbit(svg)));
    return () => offs.forEach(off => off && off());
  }

  S.fx = { reveal, countUp, show, pauseOffscreen, magnet, marquee, stack, fit, fitAll, confetti, transition, mountAll, fineMouse };
})(window);
