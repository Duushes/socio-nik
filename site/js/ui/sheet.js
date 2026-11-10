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
        <p class="sr sheet-say" aria-live="polite"></p>
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
        // Вернуть фокус туда, откуда открыли. Ушли по ссылке из шторки — того места уже нет: фокус на новую страницу
        const main = document.getElementById('app');
        if (from && document.body.contains(from)) from.focus({ preventScroll: true });
        else if (main) main.focus({ preventScroll: true });
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

    // Новое содержимое на место старого. Кнопка «следующая / предыдущая» исчезает вместе со старым — фокус
    // возвращаем на такую же кнопку, а новый заголовок произносим: иначе с клавиатуры и скринридером теряешься
    const say = dlg.querySelector('.sheet-say');
    const put = html => {
      const inside = body.contains(document.activeElement);
      const at = Array.from(body.querySelectorAll('.fn-nav button')).indexOf(document.activeElement);
      body.innerHTML = html;
      if (inside) (body.querySelectorAll('.fn-nav button')[at] || panel).focus({ preventScroll: true });
      const h = body.querySelector('h2');
      if (h) say.textContent = h.textContent;
    };
    // смена содержимого по очереди: старое гаснет, новое въезжает — без наложения
    const swap = (html, dir = 1) => {
      if (reducedMotion()) { put(html); panel.scrollTop = 0; return; }
      body.classList.add(dir > 0 ? 'sw-out-l' : 'sw-out-r');
      setTimeout(() => {
        body.classList.remove('sw-out-l', 'sw-out-r');
        put(html);
        panel.scrollTop = 0;
        body.classList.add(dir > 0 ? 'sw-in-r' : 'sw-in-l');
        setTimeout(() => body.classList.remove('sw-in-r', 'sw-in-l'), 380);
      }, 160);
    };
    return { dlg, body, swap, close };
  };

  // ---------- шторка функции модели А ----------
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

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
          <div class="fn-art">${ui.aspectMark(id)}</div>
          <div class="fn-titles">
            <p class="fn-kicker">${t.code} · ${n} из 8</p>
            <h2 class="fn-title">${F[n - 1].plain}</h2>
            <p class="fn-aspect">${S.art.symbol(id)}<b>${esc(cap(ui.PLAIN[id]))}</b></p>
          </div>
        </header>
        <section class="fn-sec fn-main">
          <h3>Как это у ${t.code}</h3>
          <p>${esc(own ? own.text : C.positions[n] + ' ' + C.aspectsLong[id])}</p>
          ${own ? `<p class="fn-tip"><b>Совет.</b> ${esc(own.tip)}</p>` : ''}
        </section>
        <section class="fn-sec"><h3>${F[n - 1].name} функция: что это</h3><p>${esc(C.positions[n])}</p></section>
        <section class="fn-sec"><h3>${esc(a.name)} (${a.short}): про что это</h3><p>${esc(C.aspectsLong[id])}</p></section>
        <a class="fn-rel" href="#/relations/${t.id}/${rt.id}" style="--rq:var(--q-${rt.quadra})">
          ${ui.mark(rt, { cls: 'fn-rel-em' })}
          <span>${esc(relText(`${rt.code} «${rt.alias}»`))}</span>
        </a>
        <nav class="fn-nav" aria-label="Другие функции ${t.code}">
          <button type="button" data-fn-go="${prev}" aria-label="Предыдущая: ${F[prev - 1].plain}">‹ ${F[prev - 1].plain}</button>
          <span class="fn-dots" aria-hidden="true">${[1, 2, 3, 4, 5, 6, 7, 8].map(k => `<i class="${k === n ? 'on' : ''}"></i>`).join('')}</span>
          <button type="button" data-fn-go="${next}" aria-label="Следующая: ${F[next - 1].plain}">${F[next - 1].plain} ›</button>
        </nav>
      </article>`;
  }

  // ---------- шторка аспекта (страница «О соционике») ----------
  const ASPECTS = ['Ne', 'Ni', 'Se', 'Si', 'Te', 'Ti', 'Fe', 'Fi'];
  const GLYPH = { pyramid: 'пирамида', sphere: 'шар', cube: 'куб', corner: 'уголок' };

  function aspectHTML(id) {
    const a = S.data.aspects[id], el = S.data.elements[a.element], more = (S.content.aspectsMore || {})[id] || {};
    const base = S.data.types.filter(t => t.ego[0] === id), creative = S.data.types.filter(t => t.ego[1] === id);
    const quadras = S.data.quadras.filter(q => q.values.includes(id));
    const i = ASPECTS.indexOf(id), prev = ASPECTS[(i + 7) % 8], next = ASPECTS[(i + 1) % 8];
    const typeLink = t => `<a class="as-type" href="#/types/${t.id}" style="${ui.qStyle(t.quadra)}">${ui.mark(t, { cls: 'as-ava' })}<span><span class="sr">${t.code} </span>${esc(t.alias)}</span></a>`;
    const dense = a.vert === 'e';
    return `
      <article class="fn as" style="--q:var(--violet, #8b3fd1)">
        <header class="fn-head sheet-drag">
          <div class="fn-art">${ui.aspectMark(id)}</div>
          <div class="fn-titles">
            <p class="fn-kicker">${el.name} · ${dense ? 'чёрный, экстравертный' : 'белый, интровертный'} аспект</p>
            <h2 class="fn-title">${esc(a.name)}</h2>
            <p class="fn-aspect">${S.art.symbol(id)}<b>${a.short}</b> ${esc(a.hint)}</p>
          </div>
        </header>
        <section class="fn-sec fn-main"><p>${esc(more.about || S.content.aspectsLong[id])}</p></section>
        ${more.life ? `<section class="fn-sec"><h3>Как это выглядит в жизни</h3><ul class="as-life">${more.life.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        ${more.low ? `<section class="fn-sec"><h3>Когда этого мало</h3><p>${esc(more.low)}</p></section>` : ''}
        <section class="fn-sec">
          <h3>Главная сила у типов</h3><div class="as-types">${base.map(typeLink).join('')}</div>
          <h3 class="as-sub">Рабочий инструмент у типов</h3><div class="as-types">${creative.map(typeLink).join('')}</div>
        </section>
        <section class="fn-sec">
          <h3>Ценят квадры</h3>
          <div class="as-quadras">${quadras.map(q => `<a class="chip" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}"><i class="qdot" aria-hidden="true"></i>${q.name}</a>`).join('')}</div>
          <p class="as-glyph">На сайте этот аспект — ${dense ? 'плотный' : 'стеклянный'} ${GLYPH[el.glyph]}: так его носят персонажи на одежде.</p>
        </section>
        <nav class="fn-nav" aria-label="Другие аспекты">
          <button type="button" data-as-go="${prev}" aria-label="Предыдущий: ${esc(S.data.aspects[prev].name)}">‹ ${S.data.aspects[prev].short}</button>
          <span class="fn-dots" aria-hidden="true">${ASPECTS.map(k => `<i class="${k === id ? 'on' : ''}"></i>`).join('')}</span>
          <button type="button" data-as-go="${next}" aria-label="Следующий: ${esc(S.data.aspects[next].name)}">${S.data.aspects[next].short} ›</button>
        </nav>
      </article>`;
  }

  ui.openAspect = (id, from) => {
    let cur = id;
    const label = k => `Аспект: ${S.data.aspects[k].name}`;
    const sheet = ui.openSheet({
      label: label(id),
      from,
      render: () => aspectHTML(cur),
      onKey: e => {
        if (e.key === 'ArrowRight') go(ASPECTS[(ASPECTS.indexOf(cur) + 1) % 8], 1);
        if (e.key === 'ArrowLeft') go(ASPECTS[(ASPECTS.indexOf(cur) + 7) % 8], -1);
      }
    });
    function go(k, dir) {
      cur = k;
      sheet.dlg.setAttribute('aria-label', label(k));
      sheet.swap(aspectHTML(k), dir);
    }
    sheet.dlg.addEventListener('click', e => {
      const b = e.target.closest('[data-as-go]');
      if (b) { const k = b.dataset.asGo, d = ASPECTS.indexOf(k) - ASPECTS.indexOf(cur); go(k, d === 1 || d === -7 ? 1 : -1); }
      if (e.target.closest('.as-type, .as-quadras a')) sheet.close();
    });
    return sheet;
  };

  ui.openFunction = (t, n, from) => {
    let cur = n;
    const sheet = ui.openSheet({
      label: `${t.code}: ${S.data.functions[n - 1].plain.toLowerCase()}`,
      from,
      render: () => fnHTML(t, cur),
      onKey: e => {
        if (e.key === 'ArrowRight') go(cur === 8 ? 1 : cur + 1, 1);
        if (e.key === 'ArrowLeft') go(cur === 1 ? 8 : cur - 1, -1);
      }
    });
    function go(k, dir) {
      cur = k;
      sheet.dlg.setAttribute('aria-label', `${t.code}: ${S.data.functions[k - 1].plain.toLowerCase()}`);
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
