/* Socio-Nik · шторка: снизу на телефоне, окном по центру на компьютере.
   Нативный <dialog> даёт фокус внутри, Esc и неактивный фон; сверху — своя подложка, свайп вниз и плавная смена содержимого.
   И шторка функции модели А: как функция проявляется у типа, что значит позиция и аспект, с каким типом связана. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc, reducedMotion } = S.dom;
  const M = () => S.core.modelA;

  const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // render() → HTML тела; вернёт { body, swap(html, dir), close() }
  ui.openSheet = ({ label, render, from, onKey }) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    dlg.setAttribute('aria-label', label);
    dlg.innerHTML = `<div class="sheet-scrim" data-close></div>
      <div class="sheet-panel" tabindex="-1">
        <div class="sheet-grab" aria-hidden="true"></div>
        <button class="sheet-close" type="button" data-close aria-label="Закрыть">${CLOSE_ICON}</button>
        <div class="sheet-body"></div>
      </div>`;
    document.body.appendChild(dlg);
    const panel = dlg.querySelector('.sheet-panel'), body = dlg.querySelector('.sheet-body');
    body.innerHTML = render();
    dlg.showModal();
    // фокус — на саму панель (без рамки): иначе браузер ставит его на крестик и рисует кольцо
    panel.focus({ preventScroll: true });
    document.documentElement.classList.add('sheet-open');
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('in')));

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      dlg.classList.remove('in');
      dlg.classList.add('out');
      setTimeout(() => {
        dlg.close();
        dlg.remove();
        document.documentElement.classList.remove('sheet-open');
        if (from && document.body.contains(from)) from.focus({ preventScroll: true });
      }, reducedMotion() ? 0 : 340);
    };
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dlg.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    if (onKey) dlg.addEventListener('keydown', onKey);

    // свайп вниз за ручку или шапку — закрыть
    let startY = null, dy = 0;
    panel.addEventListener('pointerdown', e => {
      if (!e.target.closest('.sheet-grab, .sheet-drag') || panel.scrollTop > 0 || innerWidth > 734) return;
      startY = e.clientY;
      dy = 0;
      dlg.classList.add('dragging');
      panel.setPointerCapture(e.pointerId);
    });
    panel.addEventListener('pointermove', e => {
      if (startY == null) return;
      dy = Math.max(0, e.clientY - startY);
      panel.style.setProperty('--drag', dy + 'px');
    });
    const end = () => {
      if (startY == null) return;
      startY = null;
      dlg.classList.remove('dragging');
      if (dy > 110) close(); else panel.style.setProperty('--drag', '0px');
    };
    panel.addEventListener('pointerup', end);
    panel.addEventListener('pointercancel', end);

    // смена содержимого по очереди: старое гаснет, новое въезжает — без наложения
    const swap = (html, dir = 1) => {
      if (reducedMotion()) { body.innerHTML = html; return; }
      body.classList.add(dir > 0 ? 'sw-out-l' : 'sw-out-r');
      setTimeout(() => {
        body.classList.remove('sw-out-l', 'sw-out-r');
        body.innerHTML = html;
        panel.scrollTop = 0;
        body.classList.add(dir > 0 ? 'sw-in-r' : 'sw-in-l');
        setTimeout(() => body.classList.remove('sw-in-r', 'sw-in-l'), 380);
      }, 160);
    };
    return { dlg, body, swap, close };
  };

  // ---------- шторка функции модели А ----------
  const BLOCKS = { 1: 'Эго', 2: 'Эго', 3: 'Суперэго', 4: 'Суперэго', 5: 'Суперид', 6: 'Суперид', 7: 'Ид', 8: 'Ид' };

  // С каким типом связана позиция: у него этот аспект — базовая функция (для творческой — тоже творческая)
  const RELATED = {
    1: ['kindred', (b) => `Та же базовая функция — у ${b}: у вас родственные отношения.`],
    2: ['business', (b) => `Та же творческая функция — у ${b}: у вас деловые отношения.`],
    3: ['superego', (b) => `Для ${b} это базовая функция — у вас отношения суперэго: уважение на расстоянии.`],
    4: ['conflict', (b) => `Для ${b} это базовая функция: здесь вы легче всего задеваете друг друга — у вас конфликтные отношения.`],
    5: ['dual', (b) => `Для ${b} это базовая функция — дуал закрывает её легко и естественно.`],
    6: ['activation', (b) => `Для ${b} это базовая функция — активатор заряжает тебя именно здесь.`],
    7: ['quasi', (b) => `Для ${b} это базовая функция — у вас квазитождественные отношения.`],
    8: ['extinguish', (b) => `Для ${b} это базовая функция — у вас отношения погашения.`]
  };

  function fnHTML(t, n) {
    const m = M().modelA(t.ego), id = m[n - 1], a = S.data.aspects[id], F = S.data.functions;
    const C = S.content, own = C.modelA && C.modelA[t.id] && C.modelA[t.id][n];
    const [relId, relText] = RELATED[n], rt = M().partner(t, relId);
    const prev = n === 1 ? 8 : n - 1, next = n === 8 ? 1 : n + 1;
    return `
      <article class="fn" style="${ui.qStyle(t.quadra)}">
        <header class="fn-head sheet-drag">
          <div class="fn-art"><span class="fn-float">${S.art.glyphSVG(id, S.theme.quadraColor(t.quadra), 'fn-svg')}</span></div>
          <div class="fn-titles">
            <p class="fn-kicker">${t.code} · ${BLOCKS[n]} · функция ${n} из 8</p>
            <h2 class="fn-title">${F[n - 1].name}</h2>
            <p class="fn-aspect">${S.art.symbol(id)}<b>${a.short}</b> ${esc(a.name)}</p>
          </div>
        </header>
        <section class="fn-sec fn-main">
          <h3>Как это у ${t.code}</h3>
          <p>${esc(own ? own.text : C.positions[n] + ' ' + C.aspectsLong[id])}</p>
          ${own ? `<p class="fn-tip"><b>Совет.</b> ${esc(own.tip)}</p>` : ''}
        </section>
        <section class="fn-sec"><h3>Что это за функция</h3><p>${esc(C.positions[n])}</p></section>
        <section class="fn-sec"><h3>Что это за аспект</h3><p>${esc(C.aspectsLong[id])}</p></section>
        <a class="fn-rel" href="#/relations/${t.id}/${rt.id}" style="--rq:var(--q-${rt.quadra})">
          <span class="fn-rel-em">${S.art.emblem(rt, { cls: 'em-mini', label: false })}</span>
          <span>${esc(relText(`${rt.code} «${rt.alias}»`))}</span>
        </a>
        <nav class="fn-nav" aria-label="Другие функции ${t.code}">
          <button type="button" data-fn-go="${prev}" aria-label="Предыдущая: ${F[prev - 1].name}">‹ ${F[prev - 1].name}</button>
          <span class="fn-dots" aria-hidden="true">${[1, 2, 3, 4, 5, 6, 7, 8].map(k => `<i class="${k === n ? 'on' : ''}"></i>`).join('')}</span>
          <button type="button" data-fn-go="${next}" aria-label="Следующая: ${F[next - 1].name}">${F[next - 1].name} ›</button>
        </nav>
      </article>`;
  }

  ui.openFunction = (t, n, from) => {
    let cur = n;
    const sheet = ui.openSheet({
      label: `${t.code}: ${S.data.functions[n - 1].name.toLowerCase()} функция`,
      from,
      render: () => fnHTML(t, cur),
      onKey: e => {
        if (e.key === 'ArrowRight') go(cur === 8 ? 1 : cur + 1, 1);
        if (e.key === 'ArrowLeft') go(cur === 1 ? 8 : cur - 1, -1);
      }
    });
    function go(k, dir) {
      cur = k;
      sheet.dlg.setAttribute('aria-label', `${t.code}: ${S.data.functions[k - 1].name.toLowerCase()} функция`);
      sheet.swap(fnHTML(t, k), dir);
    }
    sheet.dlg.addEventListener('click', e => {
      const b = e.target.closest('[data-fn-go]');
      if (b) { const k = Number(b.dataset.fnGo); go(k, (k === 1 && cur === 8) || k > cur && !(k === 8 && cur === 1) ? 1 : -1); }
      if (e.target.closest('.fn-rel')) sheet.close();
    });
    return sheet;
  };
})(window);
