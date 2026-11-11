// node --experimental-websocket tools/e2e.js [--shots] — сквозная проверка сайта в headless Chrome по file://
// Сайт копируется в /tmp: file:// с эмодзи в пути headless открывает плохо. Скриншоты — в /tmp/socionik-shots.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');

const SITE = path.join(__dirname, '..', 'site');
// SOCIO_TMP — своя папка, если параллельно гоняют другую копию сайта (другая ветка, worktree)
const TMP = process.env.SOCIO_TMP || '/tmp/socionik';
const SHOTS = TMP + '-shots';
const WITH_SHOTS = process.argv.includes('--shots');
execSync(`rm -rf ${TMP} && cp -R "${SITE}" ${TMP} && mkdir -p ${SHOTS}`);
const BASE = 'file://' + TMP + '/index.html';

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok });
  console.log((ok ? '✓ ' : '✗ ') + name + (ok || !info ? '' : ' — ' + info));
};

const ROUTES = ['#/', '#/test', '#/result', '#/types', '#/types/esi', '#/quadras', '#/relations', '#/relations/ile/lse', '#/box', '#/about', '#/r/1-72-64-58-19', '#/nope'];

(async () => {
  const b = await launch();
  const go = async (hash, wait = 900) => { await b.eval(`location.hash = ${JSON.stringify(hash)}`); await b.sleep(wait); };
  const shot = async (name, selector, offset = 70) => {
    if (!WITH_SHOTS) return;
    if (selector) await b.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - ${offset}); })()`);
    else await b.eval('scrollTo(0, 0)');
    await b.sleep(1500);
    await b.shot(path.join(SHOTS, name + '.png'));
  };
  try {
    await b.viewport(1280, 900);
    await b.goto(BASE + '#/');
    await b.sleep(1200);
    check('главная открывается по file:// без ошибок', (await b.eval('document.body.dataset.view')) === 'home' && !b.errors.length, b.errors.join('; '));
    await shot('d-home');

    // ---------- все маршруты ----------
    for (const r of ROUTES) {
      await go(r, 700);
      const st = await b.eval(`({ view: document.body.dataset.view, err: document.documentElement.dataset.error || '' })`);
      check(`маршрут ${r} → ${st.view}`, !st.err, st.err);
    }

    // ---------- тест кликами ----------
    await b.eval(`localStorage.clear()`);
    await go('#/test', 1000);
    const flow = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const seen = [];
      const stage = document.querySelector('.q-stage');
      let maxQ = 0;
      const mo = new MutationObserver(() => { maxQ = Math.max(maxQ, stage.querySelectorAll('.q').length); });
      mo.observe(stage, { childList: true });
      for (let i = 0; i < 20; i++) {
        const q = document.querySelector('.q-stage .q:last-child');
        if (!q) return { fail: 'нет вопроса ' + i };
        seen.push(q.dataset.q);
        q.querySelectorAll('.dot')[[0, 1, 3, 4, 1][i % 5]].click();
        await sleep(760);   // ответ виден 0,43 с, потом смена вопроса
      }
      mo.disconnect();
      await sleep(3200);
      return { unique: new Set(seen).size, maxQ, view: document.body.dataset.view, code: (document.querySelector('.res-code') || {}).textContent };
    });
    check('тест: 20 разных вопросов кликами → экран результата', flow.unique === 20 && flow.view === 'result', JSON.stringify(flow));
    check('смена вопроса без наложения: на экране всегда один вопрос', flow.maxQ === 1, 'одновременно вопросов: ' + flow.maxQ);
    await shot('d-result-top');

    await b.reload();
    await b.sleep(900);
    const again = await b.eval(`(document.querySelector('.res-code') || {}).textContent`);
    check('результат сохраняется после перезагрузки', again === flow.code, `${again} ≠ ${flow.code}`);

    // ---------- после теста «Тест» не пустой, в шапке «Мой тип» ----------
    await go('#/test', 900);
    const passedScr = await b.eval(`(() => { const s = document.querySelector('.test-passed'); return { on: Boolean(s), open: s ? s.querySelector('a.btn').getAttribute('href') : '', again: Boolean(s && s.querySelector('[data-again]')),
      q: Boolean(document.querySelector('.q-stage')), nav: Array.from(document.querySelectorAll('.nav-links a[data-nav="test"], .menu a[data-nav="test"]')).map(a => a.getAttribute('href') + ' ' + a.textContent.trim()) }; })()`);
    check('после теста «Тест» — не пустой первый вопрос, а выбор «Открыть результат / Пройти заново»; в шапке и меню «Мой тип»',
      passedScr.on && passedScr.open === '#/result' && passedScr.again && !passedScr.q && passedScr.nav.length === 2 && passedScr.nav.every(x => x === '#/result Мой тип'), JSON.stringify(passedScr));
    await shot('d-test-passed');
    await b.eval(`document.querySelector('[data-again]').click()`);
    await b.sleep(700);

    // ---------- клавиатура, «Назад», «Сначала» ----------
    const keys = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const count = () => document.querySelector('.q-stage .q:last-child .q-count').textContent;
      const c0 = count();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
      await sleep(900);
      const c1 = count();
      document.querySelector('[data-back]').click();
      await sleep(900);
      const c2 = count();
      const checked = document.querySelector('.q-stage .q:last-child .dot[aria-checked="true"]');
      return { c0, c1, c2, kept: checked ? checked.dataset.v : null };
    });
    check('клавиша 4 отвечает и листает дальше', keys.c0 === 'Вопрос 1 из 20' && keys.c1 === 'Вопрос 2 из 20', JSON.stringify(keys));
    check('«Назад» возвращает и помнит ответ', keys.c2 === 'Вопрос 1 из 20' && keys.kept === '1', JSON.stringify(keys));
    const visual = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('[data-restart]').click();
      await sleep(700);
      const q = () => document.querySelector('.q-stage .q:last-child');
      const arts = Array.from(q().querySelectorAll('.q-art img')).map(i => i.complete && i.naturalWidth > 0 && /img\/q\/q01-[ab]\.webp/.test(i.getAttribute('src')));
      const heads = Array.from(q().querySelectorAll('.q-head')).map(h => h.textContent);
      q().querySelector('.q-card.q-a').click();
      await sleep(120);
      const picked = { a: q().querySelector('.q-a').classList.contains('on'), b: q().querySelector('.q-b').classList.contains('off'), dot: (q().querySelector('.dot[aria-checked="true"]') || {}).dataset ? q().querySelector('.dot[aria-checked="true"]').dataset.v : null };
      await sleep(700);
      for (let k = 0; k < 4; k++) { q().querySelector('.q-card.q-b').click(); await sleep(760); }
      const toast = document.querySelector('.t-toast');
      return { arts, heads, picked, n: document.querySelector('[data-n]').textContent, eta: document.querySelector('[data-eta]').textContent, toast: toast.hidden ? '' : toast.textContent,
        ring: getComputedStyle(document.querySelector('.t-ring-fg')).getPropertyValue('--p').trim(), done: document.querySelectorAll('.t-steps .done').length,
        logo: new Set(Array.from(document.querySelectorAll('.brand-mark i')).map(i => getComputedStyle(i).backgroundImage).filter(u => /img\/logo\/(alpha|beta|gamma|delta)\.webp/.test(u))).size };
    });
    check('тест наглядный: у вариантов 3D-картинки и заголовки, нажатие на карточку — «точно»', visual.arts.length === 2 && visual.arts.every(Boolean) && visual.heads.every(h => h.length > 3) && visual.picked.a && visual.picked.b && visual.picked.dot === '-2', JSON.stringify(visual));
    check('тест держит до конца: кольцо и 20 делений, время по темпу, подбадривание на четверти', visual.n === '6' && /мин|минуты/.test(visual.eta) && /Четверть позади/.test(visual.toast) && visual.done === 5 && Number(visual.ring) === 25, JSON.stringify(visual));
    check('логотип на компьютере: четыре 3D-шара в цветах квадр (фоном — на телефоне не скачиваются)', visual.logo === 4, JSON.stringify(visual.logo));
    await shot('d-test');

    // ---------- «Заново» с отменой; все ответы «поровну» ----------
    const undo = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const n = () => document.querySelector('[data-n]').textContent;
      const before = n();
      document.querySelector('[data-restart]').click();
      await sleep(700);
      const bar = document.querySelector('.t-undo');
      const out = { before, after: n(), shown: !bar.hidden };
      bar.querySelector('[data-undo]').click();
      await sleep(700);
      out.back = n(); out.hidden = bar.hidden; out.answers = Object.keys(JSON.parse(localStorage.getItem('socio.test')).answers).length;
      return out;
    });
    check('«Заново» не теряет ответы: «Ответы сброшены · Вернуть» возвращает на тот же вопрос',
      undo.before === '6' && undo.after === '1' && undo.shown && undo.back === '6' && undo.hidden && undo.answers === 5, JSON.stringify(undo));
    await b.eval(`(() => { const a = {}; Socio.data.questions.forEach(q => { a[q.id] = 0; }); delete a[Socio.data.questions[19].id]; localStorage.setItem('socio.test', JSON.stringify({ answers: a, index: 19 })); })()`);
    await b.reload();
    await b.sleep(900);
    const flat = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const saved = localStorage.getItem('socio.result');
      document.querySelector('.q-stage .dot.d2').click();
      await sleep(1500);
      const panel = document.querySelector('.t-flat');
      const out = { panel: Boolean(panel), text: panel ? panel.textContent : '', view: document.body.dataset.view, same: localStorage.getItem('socio.result') === saved, kept: Boolean(localStorage.getItem('socio.test')) };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
      await sleep(300);
      if (panel) panel.querySelector('[data-review]').click();
      await sleep(700);
      out.q = (document.querySelector('.q-stage .q-count') || {}).textContent;
      return out;
    });
    check('все ответы «поровну»: тип не называется и не сохраняется, ответы на месте, можно вернуться к вопросам',
      flat.panel && /не.смог выбрать тип/.test(flat.text) && flat.view === 'test' && flat.same && flat.kept && flat.q === 'Вопрос 1 из 20', JSON.stringify(flat));

    // ---------- «Назад» помнит место; битые ссылки на результат ----------
    const backScroll = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      location.hash = '#/types';
      await sleep(900);
      scrollTo(0, 700);
      await sleep(300);
      const y0 = scrollY;
      location.hash = '#/types/esi';
      await sleep(900);
      const y1 = scrollY;
      history.back();
      await sleep(1300);
      return { y0, y1, y2: scrollY, view: document.body.dataset.view };
    });
    check('«Назад» возвращает на то же место страницы, новая страница открывается с начала',
      backScroll.view === 'types' && backScroll.y0 > 300 && backScroll.y1 === 0 && Math.abs(backScroll.y2 - backScroll.y0) < 40, JSON.stringify(backScroll));
    const bad = [];
    for (const h of ['#/r/zzz', '#/r/1-72-64-58', '#/r/1-100-50-50-50', '#/r/1-50-50-50-50', '#/r/']) {
      await go(h, 600);
      bad.push(await b.eval(`document.body.dataset.view + ' ' + ((document.querySelector('.lost-actions .btn') || {}).getAttribute('href') || '')`));
    }
    check('битая, обрезанная, «100 %» и «ровная» ссылка на результат → «Ссылка сломалась» с выходом к своему результату', bad.every(x => x === 'badlink #/result'), bad.join(' | '));
    await shot('d-badlink');

    // ---------- шер ----------
    await go('#/result', 1200);
    const share = await b.eval(async () => {
      const c = document.querySelector('.share-canvas');
      const ctx = c.getContext('2d');
      let colored = 0;
      for (let y = 200; y < c.height; y += 40) for (let x = 60; x < c.width; x += 40) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] + d[1] + d[2] > 60) colored++;
      }
      const size = await new Promise(r => c.toBlob(bl => r(bl ? bl.size : 0), 'image/png'));
      document.querySelector('[data-fmt="post"]').click();
      await new Promise(r => setTimeout(r, 200));
      return { w: c.width, h: c.height, colored, size, postH: c.height, text: Socio.share.text(Socio.state.result()), portrait: Boolean(Socio.sharePortraits && Socio.sharePortraits[Socio.state.myType()]) };
    });
    check('картинка для шера рисуется и выгружается в PNG (canvas не «испачкан»)', share.colored > 200 && share.size > 50000, JSON.stringify(share));
    check('шер без процента: в тексте нет «совпадение N %»', !/совпадени|%/.test(share.text), share.text);
    const resHero = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      scrollTo(0, 0);
      await sleep(300);
      const hero = document.querySelector('.res-hero'), btn = hero.querySelector('[data-share-now]'), rel = hero.querySelector('.res-acts a');
      const r = btn.getBoundingClientRect(), rr = rel.getBoundingClientRect();
      const out = { btn: btn.textContent.trim(), rel: rel ? rel.getAttribute('href') + ' ' + rel.textContent.trim() : '', btnBottom: Math.round(r.bottom), relBottom: Math.round(rr.bottom), vh: innerHeight,
        pct: /%/.test(hero.textContent), clear: (hero.querySelector('.res-clear') || {}).textContent || '', dots: hero.querySelectorAll('.res-dots i').length };
      btn.click();
      await sleep(900);
      const go = document.querySelector('[data-share] [data-sk="go"]').getBoundingClientRect();
      out.after = { goTop: Math.round(go.top), goBottom: Math.round(go.bottom), focus: document.activeElement === document.querySelector('[data-share] [data-sk="go"]') };
      return out;
    });
    check('результат: в первом экране «Поделиться результатом» и «С кем мне легко», без процента — строка «шкалы выражены чётко» с четырьмя точками',
      resHero.btn === 'Поделиться результатом' && /^#\/#rel С.кем мне легко$/.test(resHero.rel) && resHero.btnBottom <= resHero.vh && resHero.relBottom <= resHero.vh && !resHero.pct && /шкал/.test(resHero.clear) && resHero.dots === 4, JSON.stringify(resHero));
    check('«Поделиться результатом» без файлового шера доводит до кнопки отправки и ставит на неё фокус',
      resHero.after.goTop >= 0 && resHero.after.goBottom <= resHero.vh && resHero.after.focus, JSON.stringify(resHero.after));
    check('формат «Пост» — 1080×1350', share.postH === 1350, String(share.postH));

    // ---------- четыре шкалы ----------
    const scales = await b.eval(async () => {
      const box = document.querySelector('.scales');
      box.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 2400));
      return Array.from(box.querySelectorAll('.scale')).map(c => {
        const t = c.querySelector('.sc-track').getBoundingClientRect(), k = c.querySelector('.sc-knob').getBoundingClientRect();
        return {
          w: Number(c.dataset.w),
          knob: Math.round((k.left + k.width / 2 - t.left) / t.width * 100),
          vals: Array.from(c.querySelectorAll('.sc-pct b')).map(b => Number(b.dataset.count)),
          on: Array.from(c.querySelectorAll('.sc-pole')).map(p => p.classList.contains('on')),
          imgs: Array.from(c.querySelectorAll('.sc-pole img')).every(i => i.complete && i.naturalWidth > 0),
          verdict: c.querySelector('.sc-verdict').textContent.trim()
        };
      });
    });
    check('четыре шкалы: бегунок у ближнего полюса, полюс подсвечен, 3D-картинки загрузились',
      scales.length === 4 && scales.every(x => Math.abs(x.knob - x.w) <= 2 && x.vals[0] + x.vals[1] === 100 && x.on[0] === (x.vals[0] >= 50) && x.on[1] === (x.vals[1] >= 50) && x.imgs && /ближе|поровну/i.test(x.verdict)),
      JSON.stringify(scales));
    await shot('d-result-scales', '.scales', 90);
    check('на картинке — портрет персонажа типа (data:-URI, canvas чистый)', share.portrait && share.size > 50000, JSON.stringify({ portrait: share.portrait, size: share.size }));
    const siteUrl = await b.eval('Socio.config.SITE_URL');
    if (siteUrl) {
      check('текст шера: «кто я», вопрос к друзьям и ссылка на результат', /^Я — .+ А ты кто из 16 типов\? Тест за 4 минуты на Socio-Nik https:\/\/\S+\/r\/[a-z]{3}\/#1-\d+-\d+-\d+-\d+$/.test(share.text), share.text);
      // ссылка ведёт на r/<тип>/ — страницу с превью типа для мессенджеров; она сразу передаёт числа сайту
      const shareUrl = await b.eval('Socio.share.url(Socio.state.result())');
      const myCode = await b.eval(`document.querySelector('.res-code').textContent`);
      const sm = shareUrl.match(/\/r\/([a-z]{3})\/#(1-\d+-\d+-\d+-\d+)$/);
      const stubFile = sm ? path.join(TMP, 'r', sm[1], 'index.html') : '';
      const stubHtml = stubFile && fs.existsSync(stubFile) ? fs.readFileSync(stubFile, 'utf8') : '';
      check('ссылка на результат ведёт на страницу-превью своего типа с og-картинкой',
        Boolean(sm) && stubHtml.includes(`og/${sm[1]}.jpg`) && fs.existsSync(path.join(TMP, 'og', sm[1] + '.jpg')), shareUrl);
      if (sm) {
        await b.goto(`file://${TMP}/r/${sm[1]}/index.html#${sm[2]}`);
        await b.sleep(1300);
        const round = await b.eval(`({ href: location.href, view: document.body.dataset.view, shared: (document.querySelector('.res-code') || {}).textContent })`);
        check('страница-превью сразу открывает тот же результат', round.view === 'shared' && round.shared === myCode && /index\.html#\/r\/1-/.test(round.href), JSON.stringify(round));
        await b.goto(`file://${TMP}/r/${sm[1]}/index.html`);
        await b.sleep(1100);
        const bare = await b.eval(`({ href: location.href, view: document.body.dataset.view })`);
        check('страница-превью без чисел ведёт на страницу типа', new RegExp(`#/types/${sm[1]}$`).test(bare.href), JSON.stringify(bare));
      }
      await go('#/result', 900);
      const soc = await b.eval(async () => {
        const box = document.querySelector('[data-share]');
        const href = n => (box.querySelector(`[data-net="${n}"]`) || {}).href || '';
        const copy = box.querySelector('[data-sk="copy"]');
        copy.click();
        await new Promise(r => setTimeout(r, 300));
        const copied = copy.classList.contains('done') || /Не удалось/.test(box.querySelector('.sk-status').textContent);
        box.querySelector('[data-sk="go"]').click();
        await new Promise(r => setTimeout(r, 900));
        return { tg: href('telegram'), wa: href('whatsapp'), vk: href('vk'), go: box.querySelector('[data-sk="go"]').textContent.trim(), copied, status: box.querySelector('.sk-status').textContent,
          phone: Boolean(box.querySelector('.share-phone canvas')), meta: /instagram|инстаграм/i.test(document.body.innerHTML) };
      });
      const enc = encodeURIComponent(await b.eval('Socio.share.url(Socio.state.result())'));
      check('результат: превью в «телефоне», главная кнопка, Telegram, WhatsApp, ВКонтакте и ссылка с «Копировать»; упоминаний Instagram нет',
        soc.phone && soc.tg.startsWith('https://t.me/share/url?url=' + enc) && soc.wa.startsWith('https://wa.me/?text=') && soc.wa.includes(enc) &&
        soc.vk.startsWith('https://vk.com/share.php?url=' + enc) && soc.copied && !soc.meta, JSON.stringify(soc));
      check('результат: главная кнопка отдаёт картинку (на компьютере — скачивает)', /Скачать картинку|Поделиться картинкой/.test(soc.go) && (/скачана/.test(soc.status) || /Поделиться/.test(soc.go)), JSON.stringify(soc));
    } else {
      check('текст шера без ссылки, пока нет SITE_URL', /^Я — .+ Socio-Nik$/.test(share.text), share.text);
    }
    const keep = await b.eval(async () => {
      const row = document.querySelector('[data-keep]');
      if (!row) return { fail: 'нет блока «Не потеряй результат»' };
      row.scrollIntoView({ block: 'center' });
      const code = Socio.core.payload.encode(Socio.state.result());
      row.querySelector('[data-sk="copy"]').click();
      await new Promise(r => setTimeout(r, 900));
      const manual = row.querySelector('.sk-manual');
      return { link: row.querySelector('.sk-link').textContent, code, status: row.querySelector('.sk-status').textContent, manual: manual && !manual.hidden ? manual.value : '',
        box: Boolean(document.querySelector('#app [data-box]')), next: Boolean(document.querySelector('#app .next-grid')) };
    });
    check('результат: «Не потеряй результат» — ссылка, по которой он откроется на другом устройстве; копирование не заканчивается тупиком',
      !keep.fail && keep.link.includes(keep.code) && (/^Скопировано/.test(keep.status) || keep.manual.includes(keep.code)), JSON.stringify(keep));
    check('результат без повторов: коробки и второго списка «Ещё похоже на» нет', !keep.box && !keep.next, JSON.stringify(keep));
    await b.eval(`(() => { const d = document.querySelector('.dist-fold'); if (d) d.open = true; })()`);
    await shot('d-result-dist', '.dist');
    await shot('d-result-share', '[data-share]');

    // ---------- mystery box ----------
    await go('#/box', 900);
    const box = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('.bx').click();
      await sleep(1500);
      const t1 = (document.querySelector('.bx-text') || {}).textContent || '';
      const count1 = document.querySelector('.box-progress b').textContent;
      document.querySelector('[data-more]').click();
      await sleep(1900);
      const t2 = (document.querySelector('.bx-text') || {}).textContent || '';
      return { t1: t1.slice(0, 50), t2: t2.slice(0, 50), count1, count2: document.querySelector('.box-progress b').textContent, open: document.querySelector('.box-stage').classList.contains('is-open'),
        pop: Boolean(document.querySelector('.bx-pop .bx-who')), moons: document.querySelectorAll('.bx-moon').length };
    });
    check('mystery box открывается: из коробки выскакивает герой факта, вокруг летали 6 символов', box.open && box.t1.length > 20 && box.pop && box.moons === 6, JSON.stringify(box));
    check('«Ещё факт» — другой факт, счётчик растёт', box.t2 && box.t2 !== box.t1 && Number(box.count2) > Number(box.count1), JSON.stringify(box));
    await go('#/about', 400);
    await go('#/box', 1000);
    const still = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const at = () => ['.box-stage', '.bx', '.bx-slot', '.box-progress'].map(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(','); }).join(' | ');
      const before = at();
      document.querySelector('.bx').click();
      await sleep(250);
      const popEarly = getComputedStyle(document.querySelector('.bx-pop')).opacity;
      await sleep(1300);
      const opened = at(), flipped = document.querySelector('.bx-slot').classList.contains('flipped');
      document.querySelector('[data-more]').click();
      await sleep(2100);
      return { before, opened, again: at(), popEarly, flipped };
    });
    check('mystery box не прыгает: коробка и карта на месте при открытии и «Ещё факт», сквозь закрытую коробку никого не видно',
      still.flipped && still.before === still.opened && still.opened === still.again && still.popEarly === '0', JSON.stringify(still));
    const fsoc = await b.eval(async () => {
      const card = document.querySelector('.bx-card');
      const nets = Array.from(card.querySelectorAll('[data-net]')).map(el => el.dataset.net);
      const tg = (card.querySelector('[data-net="telegram"]') || {}).href || '';
      const png = await Socio.share.factImage(Socio.facts.all()[0]);
      const canFiles = Socio.share.canShareFiles();
      let status = '';
      if (!canFiles) {
        card.querySelector('[data-sk="go"]').click();
        await new Promise(r => setTimeout(r, 1500));
        status = card.querySelector('.sk-status').textContent;
      }
      return { nets, tg, png: png.size, canFiles, status, hook: (card.querySelector('.fc-hook') || {}).textContent, copy: Boolean(card.querySelector('[data-sk="copy"]')), meta: /instagram|инстаграм/i.test(card.innerHTML) };
    });
    check('факт: крючок «Узнаёшь кого-то…», Telegram, WhatsApp, ВКонтакте и ссылка на тип; упоминаний Instagram нет', fsoc.nets.join() === 'telegram,whatsapp,vk' && fsoc.copy && /Узна|Удиви/.test(fsoc.hook) && !fsoc.meta && /%23%2Ftypes%2F[a-z]{3}|%23%2Fbox/.test(fsoc.tg), JSON.stringify(fsoc));
    check('факт: картинка для сторис собирается и отдаётся главной кнопкой', fsoc.png > 60000 && (fsoc.canFiles || /скачана/.test(fsoc.status)), JSON.stringify(fsoc));
    await shot('d-box-open', '.box-stage', 140);

    // ---------- калькулятор ----------
    await go('#/relations', 1000);
    const calc = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const a = document.querySelector('[data-a]'), bb = document.querySelector('[data-b]');
      const title = () => document.querySelector('.calc-title').textContent;
      a.value = 'ile'; a.dispatchEvent(new Event('change'));
      bb.value = 'esi'; bb.dispatchEvent(new Event('change'));
      await sleep(100);
      const t1 = title();
      bb.value = 'lse'; bb.dispatchEvent(new Event('change'));
      await sleep(100);
      const t2 = title();
      document.querySelector('[data-swap]').click();
      await sleep(100);
      return { t1, t2, t3: title() };
    });
    check('калькулятор: ИЛЭ и ЭСИ — конфликтные', calc.t1 === 'Конфликтные отношения', calc.t1);
    check('калькулятор: заказ с ролями и перестановка', calc.t2 === 'Социальный заказ: ЛСЭ — заказчик для ИЛЭ' && calc.t3 === 'Социальный заказ: ЛСЭ — заказчик для ИЛЭ', JSON.stringify(calc));
    await shot('d-relations-calc', '[data-calc]', 110);
    const kinds = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const groups = Array.from(document.querySelectorAll('.kinds-group'));
      const out = { groups: groups.map(g => g.querySelector('.tone').textContent.trim().toLowerCase() + ':' + g.querySelectorAll('.kind').length).join(','),
        em: document.querySelectorAll('.kind .kind-em').length, scenes: document.querySelectorAll('.kinds .pair-scene, .kinds svg.scene').length,
        open: document.querySelectorAll('.kind details[open]').length, legend: Array.from(document.querySelectorAll('.matrix-legend .tone, .legend .tone')).map(x => x.textContent.trim().toLowerCase()).join(',') };
      const d = document.querySelector('.kind details');
      d.querySelector('summary').click();
      await sleep(150);
      out.opens = d.open && /Как ладить/.test(d.querySelector('.kind-more').textContent);
      d.open = false;
      return out;
    });
    check('«14 видов»: три группы по тону (легко, ровно, непросто), у каждого вида символ, описание раскрывается по нажатию',
      /^легко:\d+,ровно:\d+,непросто:\d+$/.test(kinds.groups) && kinds.groups.match(/\d+/g).reduce((a, x) => a + Number(x), 0) === 14 && kinds.em === 14 && kinds.scenes === 0 && kinds.open === 0 && kinds.opens, JSON.stringify(kinds));
    await shot('d-relations-kinds', '.kinds-group', 90);
    await shot('d-relations-matrix', '.matrix', 150);

    // ---------- страница результата по ссылке ----------
    const shared = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const code = '1-80-85-20-15';                   // Э · И · этика · иррационал → ИЭЭ
      const mine = Socio.state.myType();
      location.hash = '#/r/' + code;
      await sleep(1000);
      const withMine = {
        badge: Boolean(document.querySelector('.sh-badge')),
        cta: (document.querySelector('.sh-hero .cta .btn') || {}).getAttribute('href'),
        scene: Boolean(document.querySelector('.sh-pair .duo')) && !document.querySelector('.duo-mystery')
      };
      localStorage.removeItem('socio.result');
      location.hash = '#/';
      await sleep(700);
      location.hash = '#/r/' + code;
      await sleep(1000);
      const ctaR = document.querySelector('.sh-hero .cta .btn').getBoundingClientRect();
      const fresh = { code: document.querySelector('.res-code').textContent, mystery: Boolean(document.querySelector('.duo-mystery .duo-q img.char[src*="mystery"]')), cta: document.querySelector('.sh-hero [data-friend]').textContent,
        ctaBottom: Math.round(ctaR.bottom), vh: innerHeight, pct: /%/.test(document.querySelector('.sh-hero .res-alias').textContent) };
      // свою ссылку открыли в другом браузере: результат можно забрать без теста
      document.querySelector('[data-own]').click();
      await sleep(1000);
      fresh.own = { view: document.body.dataset.view, code: (document.querySelector('.res-code') || {}).textContent, saved: localStorage.getItem('socio.mine') };
      localStorage.removeItem('socio.result');
      localStorage.removeItem('socio.mine');
      location.hash = '#/r/' + code;
      await sleep(1000);
      document.querySelector('.sh-hero [data-friend]').click();
      await sleep(1000);
      for (let i = 0; i < 20; i++) {
        const q = document.querySelector('.q-stage .q:last-child');
        if (!q) return { fail: 'нет вопроса ' + i };
        q.querySelectorAll('.dot')[[4, 3, 1, 0, 2][i % 5]].click();
        await sleep(760);
      }
      await sleep(3200);
      const you = { view: document.body.dataset.view, title: (document.querySelector('.sh-you h2') || {}).textContent || '', rel: (document.querySelector('.sh-you .sh-rel') || {}).textContent || '' };
      return { mine, withMine, fresh, you };
    });
    check('ссылка на чужой результат: своя страница с плашкой и кнопкой к вашим отношениям', shared.withMine.badge && shared.withMine.cta === `#/relations/${shared.mine}/iee` && shared.withMine.scene, JSON.stringify(shared.withMine));
    check('страница по ссылке на компьютере: «Узнать свой тип» в первом экране, у типа нет процента', shared.fresh.ctaBottom <= shared.fresh.vh && !shared.fresh.pct, JSON.stringify(shared.fresh));
    check('без своего результата: пара «? и персонаж» и кнопка «Узнать свой тип»', shared.fresh.code === 'ИЭЭ' && shared.fresh.mystery && shared.fresh.cta === 'Узнать свой тип', JSON.stringify(shared.fresh));
    check('по своей ссылке в другом браузере: «Открыть как свой результат» переносит результат без теста', shared.fresh.own.view === 'result' && shared.fresh.own.code === 'ИЭЭ' && /iee/.test(shared.fresh.own.saved), JSON.stringify(shared.fresh.own));
    check('после теста по ссылке — блок «Ты и тот, кто прислал ссылку»', shared.you.view === 'result' && / и ИЭЭ$/.test(shared.you.title) && shared.you.rel.length > 5, JSON.stringify(shared.you));
    await shot('d-shared-you', '.sh-you', 60);
    await go('#/r/1-80-85-20-15', 1200);
    await shot('d-shared');

    await go('#/relations', 1000);

    // ---------- главная: герой, лента, стопка ----------
    const savedResult = await b.eval(`localStorage.getItem('socio.result')`);
    await b.eval(`localStorage.removeItem('socio.result')`);
    await b.goto(BASE + '#/');
    await b.sleep(1500);
    const home = await b.eval(() => {
      const hero = document.querySelector('section[data-hero]');   // [data-hero] есть и у <html> — там тип героя для <head>
      const cta = hero.querySelector('.hero-actions .btn');
      const img = hero.querySelector('.hero-fig img');
      const sp = t => t.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
      const tiles = Array.from(document.querySelectorAll('.mq-copy:not([inert]) .mq-tile')).map(a => a.getAttribute('href'));
      const nav = document.querySelector('.nav'), nr = nav.getBoundingClientRect();
      return {
        cta: cta.getAttribute('href'), ctaText: cta.textContent.trim(), title: sp(hero.querySelector('.hero-title').textContent),
        ask: sp((hero.querySelector('[data-hero-q]') || {}).textContent || ''), micro: (hero.querySelector('.hero-micro') || {}).textContent || '',
        hero: document.documentElement.dataset.hero, mystery: hero.classList.contains('hero-mystery'), mark: (hero.querySelector('.hero-mark') || {}).textContent || '',
        imgOk: img.complete && img.naturalWidth > 0 && img.getAttribute('src').includes('img/mystery/'), next: Boolean(hero.querySelector('.hero-next')),
        chips: Array.from(hero.querySelectorAll('.hero-traits li')).map(li => sp(li.textContent)).join(' · '),
        navShown: nr.top >= 0 && nr.bottom > 0 && getComputedStyle(nav).visibility !== 'hidden', heroMenu: Boolean(document.querySelector('.hero-menu')),
        navLinks: Array.from(document.querySelectorAll('.nav-links a')).map(a => a.getAttribute('href')).join(),
        tiles: tiles.length, uniq: new Set(tiles).size, inert: document.querySelectorAll('.mq-copy[inert]').length,
        cards: Array.from(document.querySelectorAll('.stack-card .qc-go')).map(a => a.getAttribute('href')).join(),
        types: new Set(Array.from(document.querySelectorAll('.stack-card .qc-type')).map(a => a.getAttribute('href'))).size
      };
    });
    check('герой до теста — тайный тип: «Привет, кто ты?», силуэт с «?», без перебора типов', home.mystery && home.hero === 'mystery' && home.title === 'Привет, кто ты?' && home.mark === '?' && home.imgOk && !home.next, JSON.stringify(home));
    check('тайный тип зовёт в тест: «16 типов. Один — твой», что откроется после теста, «Узнать свой тип» и «20 вопросов · 4 минуты»',
      home.cta === '#/test' && home.ctaText === 'Узнать свой тип' && home.ask === '16 типов. Один — твой' && home.chips === 'Твоя суперсила · С кем тебе легко · Звёзды похожего типа' && /20.вопросов/.test(home.micro), JSON.stringify(home));
    check('шапка на главной та же, что везде: видна сразу, логотип и 6 разделов, своего меню у героя нет',
      home.navShown && !home.heroMenu && home.navLinks === '#/test,#/types,#/quadras,#/relations,#/box,#/about', JSON.stringify(home));
    check('лента: 16 типов, у каждого одна живая копия, остальные inert', home.tiles === 16 && home.uniq === 16 && home.inert === 4, JSON.stringify(home));
    check('стопка: 4 карточки ведут на квадры, 16 персонажей — на типы', home.cards === '#/quadras#alpha,#/quadras#beta,#/quadras#gamma,#/quadras#delta' && home.types === 16, JSON.stringify(home));
    const orbit = await b.eval(() => {
      const em = document.querySelector('.stack-card .qorbit');
      const items = em ? Array.from(em.querySelectorAll('.qo-item')) : [];
      const r = em ? em.getBoundingClientRect() : { width: 0, height: 0 };
      return { items: items.length, abs: items.length > 0 && items.every(i => getComputedStyle(i).position === 'absolute'), w: Math.round(r.width), h: Math.round(r.height) };
    });
    check('эмблема квадры в стопке — квадратная орбита из 4 знаков', orbit.items === 4 && orbit.abs && orbit.w > 100 && Math.abs(orbit.w - orbit.h) <= 2, JSON.stringify(orbit));
    const mag = await b.eval(async () => {
      scrollTo(0, 0);
      const z = document.querySelector('.hero [data-magnet]');
      if (!z) return { zone: false };
      const el = z.firstElementChild, r = z.getBoundingClientRect();
      const move = (x, y) => dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse' }));
      move(r.right + 40, r.top + r.height / 2);
      await new Promise(res => setTimeout(res, 400));
      const near = el.style.transform;
      move(2, 2);
      await new Promise(res => setTimeout(res, 400));
      return { zone: true, fine: Socio.fx.fineMouse(), near, far: el.style.transform };
    });
    check('магнит: персонаж тянется к мыши рядом и возвращается на место', mag.zone && mag.fine && /^translate3d\((?!0px, 0px)/.test(mag.near) && /^translate3d\(0px, 0px/.test(mag.far), JSON.stringify(mag));
    const heroes = [];
    for (let k = 0; k < 2; k++) {
      await b.reload(); await b.sleep(700);
      heroes.push(await b.eval(`document.documentElement.dataset.hero + ':' + Boolean(document.querySelector('link[rel=preload][imagesrcset*="img/mystery/"]'))`));
    }
    check('до теста после перезагрузки — снова тайный тип, его картинка грузится заранее', heroes.every(h => h === 'mystery:true'), heroes.join(' → '));
    const tileNav = await b.eval(async () => {
      const a = document.querySelector('.mq-copy:not([inert]) .mq-tile');
      const href = a.getAttribute('href');
      a.click();
      await new Promise(r => setTimeout(r, 900));
      return { href, hash: location.hash, view: document.body.dataset.view };
    });
    check('плитка ленты открывает страницу типа', tileNav.hash === tileNav.href && tileNav.view === 'type', JSON.stringify(tileNav));
    await b.eval(`localStorage.setItem('socio.result', ${JSON.stringify(savedResult)})`);
    await go('#/', 1200);
    const mineHero = await b.eval(`({ cta: document.querySelector('.hero-actions .btn').getAttribute('href'), ctaText: document.querySelector('.hero-actions .btn').textContent.trim(),
      title: document.querySelector('.hero-title').textContent.replace(/\\s+/g, ' ').trim(), name: document.querySelector('[data-hero-name]').textContent,
      steps: Array.from(document.querySelectorAll('.hero-steps a')).map(a => a.getAttribute('href')), mine: Socio.state.myType(), short: Socio.ui.short(Socio.core.modelA.type(Socio.state.myType())),
      hero: document.documentElement.dataset.hero, next: Boolean(document.querySelector('.hero-next')), bubble: (document.querySelector('[data-hero-bubble]') || {}).textContent || '',
      map: (document.querySelector('#rel [data-relmap]') || {}).dataset ? document.querySelector('#rel [data-relmap]').dataset.relmap : '',
      share: Boolean(document.querySelector('#share .share-phone canvas')), box: Boolean(document.querySelector('.home-box [data-box]')),
      you: document.querySelectorAll('.mq-you').length, firstQuadra: (document.querySelector('.stack-card') || {}).getAttribute ? document.querySelector('.stack-card .qc-you') !== null : false,
      mineStored: localStorage.getItem('socio.mine') })`);
    check('после теста: «Привет, <твой тип>», твой персонаж, «Поделиться результатом» и шаги «Про мой тип · Мои отношения · Пройти заново»',
      mineHero.title === `Привет, ${mineHero.short}` && mineHero.hero === mineHero.mine && !mineHero.next && mineHero.cta === '#/#share' && mineHero.ctaText === 'Поделиться результатом' &&
      mineHero.steps.join() === `#/types/${mineHero.mine},#/#rel` && mineHero.bubble.length > 5, JSON.stringify(mineHero));
    check('после теста главная про тебя: карта отношений, картинка для шера, факты про тип, «ты» в ленте и своя квадра первой',
      mineHero.map === mineHero.mine && mineHero.share && mineHero.box && mineHero.you === 3 && mineHero.firstQuadra && mineHero.mineStored === JSON.stringify(mineHero.mine), JSON.stringify(mineHero));
    const p1 = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // «К содержимому»: фокус на main, адрес и экран не меняются
      const before = location.hash, a = document.querySelector('.skip');
      a.focus(); a.click();
      await sleep(400);
      const skip = { before, after: location.hash, view: document.body.dataset.view, focus: (document.activeElement || {}).id || '' };
      // первый кадр: пока main пустой, он держит экран — подвал ниже сгиба (иначе сначала виден подвал, потом прыжок)
      const app = document.getElementById('app'), keep = document.createDocumentFragment();
      while (app.firstChild) keep.appendChild(app.firstChild);
      const empty = { h: Math.round(app.getBoundingClientRect().height), vh: innerHeight, footer: Math.round(document.querySelector('.footer').getBoundingClientRect().top + scrollY) };
      app.appendChild(keep);
      // контраст: строка подвала, «Твоя квадра», подписи на плитках ленты
      const qc = document.querySelector('.qc-you'), cs = qc ? getComputedStyle(qc) : null;
      const contrast = { fine: getComputedStyle(document.querySelector('.footer-fine')).color, qc: cs ? cs.color : '', qcPx: cs ? parseFloat(cs.fontSize) : 0, role: getComputedStyle(document.querySelector('.mq-role')).color };
      return { skip, empty, contrast };
    });
    check('«К содержимому» ставит фокус на содержимое и не открывает «Тут пусто»', p1.skip.after === p1.skip.before && p1.skip.view === 'home' && p1.skip.focus === 'app', JSON.stringify(p1.skip));
    check('первый кадр: пока страница не нарисована, main держит экран и подвал не виден', p1.empty.h >= p1.empty.vh && p1.empty.footer >= p1.empty.vh, JSON.stringify(p1.empty));
    check('контраст: строка подвала и подписи на плитках ярче, «Твоя квадра» — тёмным по цвету квадры от 12 px',
      p1.contrast.fine === 'rgba(215, 226, 234, 0.6)' && p1.contrast.qc === 'rgb(12, 12, 12)' && p1.contrast.qcPx >= 12 && p1.contrast.role === 'rgba(215, 226, 234, 0.8)', JSON.stringify(p1.contrast));

    // ---------- страницы для глаз ----------
    await b.goto(BASE + '#/types/esi');
    await b.sleep(1200);
    await shot('d-type-top');
    await shot('d-type-modelA', '.ma', 120);
    await shot('d-type-relations', '#relations', 90);

    // ---------- отношения типа: три строки «Легко / Ровно / Непросто» ----------
    const rmap = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const box = document.querySelector('[data-relmap]');
      box.scrollIntoView({ block: 'center' });
      await sleep(1600);
      const nodes = box.querySelectorAll('.rm-node').length;
      const rows = Array.from(box.querySelectorAll('.rm-row')).map(r => r.querySelector('.rm-lab b').textContent + ':' + r.querySelectorAll('.rm-node').length).join();
      const first = box.querySelector('.rd-title').textContent, rd0 = box.querySelector('.rd');
      const quiet = { emoji: box.querySelectorAll('img[src*="emotes/"]').length, duo: Boolean(box.querySelector('.rd-duo, .duo')), orbits: box.querySelectorAll('.rm-stage svg, .rm-ring, .rm-beam').length,
        panel: getComputedStyle(rd0).borderTopColor, kicker: Boolean(box.querySelector('.rd-kicker')), who: (box.querySelector('.rd-who') || {}).textContent || '' };
      const firstOn = box.querySelector('.rm-node.is-on');
      const dualRing = firstOn && firstOn.classList.contains('t-support');
      box.querySelector('[data-tab="2"]').click();
      await sleep(80);
      const conflict = Array.from(box.querySelectorAll('.rm-node')).find(n => /Конфликтные/.test(n.getAttribute('aria-label')));
      conflict.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(300);
      const after = box.querySelector('.rd-title').textContent, link = box.querySelector('.rd .link').getAttribute('href');
      const tabKept = box.querySelector('[data-tab="2"]').getAttribute('aria-selected') === 'true' && !box.querySelectorAll('.rd-pane')[2].hidden;
      const keyed = await (async () => {
        const on = box.querySelector('.rm-node.is-on');
        on.focus();
        on.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        await sleep(80);
        return box.querySelector('.rm-node.is-on').dataset.i;
      })();
      return { nodes, rows, first, dualRing, after, link, tabKept, quiet, keyed, conflictI: conflict.dataset.i };
    });
    check('отношения типа: три строки «Легко / Ровно / Непросто» по 5 типов, сначала выбран дуал', rmap.nodes === 15 && rmap.rows === 'Легко:5,Ровно:5,Непросто:5' && rmap.first === 'Дуальные отношения' && rmap.dualRing, JSON.stringify(rmap));
    check('нажатие на тип открывает разбор пары, вкладка «Как ладить» сохраняется, стрелка вверх — в строку выше',
      rmap.after === 'Конфликтные отношения' && rmap.link === '#/relations/esi/ile#tips' && rmap.tabKept && Number(rmap.keyed) === Number(rmap.conflictI) - 5, JSON.stringify(rmap));
    check('просто и тихо: без орбит, лучей, 3D-символов и сцены пары; рамка панели нейтральная, без надзаголовка',
      rmap.quiet.emoji === 0 && !rmap.quiet.duo && rmap.quiet.orbits === 0 && rmap.quiet.panel === 'rgba(215, 226, 234, 0.15)' && !rmap.quiet.kicker && /«/.test(rmap.quiet.who), JSON.stringify(rmap.quiet));

    // ---------- «Отношения»: тип в центре меняется выбором и кнопкой «Карта …»; пары в калькуляторе играют сцены ----------
    await go('#/relations', 1400);
    const refocus = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const box = document.querySelector('[data-relmap]'), sel = box.querySelector('[data-rmtype]');
      box.scrollIntoView({ block: 'center' });
      await sleep(900);
      sel.value = 'lsi';
      sel.dispatchEvent(new Event('change'));
      await sleep(300);
      const viaSelect = box.dataset.relmap + ':' + box.querySelectorAll('.rm-node').length;
      const partner = box.querySelector('.rm-node.is-on').dataset.b;
      box.querySelector('button[data-refocus]').click();
      await sleep(300);
      const calc = document.querySelector('[data-calc]'), a = calc.querySelector('[data-a]'), bb = calc.querySelector('[data-b]');
      const acts = [];
      for (const [x, y] of [['ile', 'sei'], ['ile', 'esi'], ['ile', 'eii'], ['ile', 'lse']]) {
        a.value = x; bb.value = y; bb.dispatchEvent(new Event('change'));
        await sleep(60);
        const d = calc.querySelector('.duo');
        acts.push((d.className.match(/act-[a-z]+/) || [''])[0] + ':' + d.querySelectorAll('.fx').length);
      }
      return { viaSelect, partner, center: box.dataset.relmap, selValue: sel.value, acts: acts.join(' ') };
    });
    check('«Отношения»: выбор типа перестраивает строки, кнопка «Отношения …» — показывает партнёра', refocus.viaSelect === 'lsi:15' && refocus.center === refocus.partner && refocus.selValue === refocus.partner, JSON.stringify(refocus));
    check('калькулятор: пары разыгрывают отношение — дуал, конфликт, ревизия, заказ', refocus.acts === 'act-dual:3 act-conflict:1 act-supervision:2 act-request:2', refocus.acts);
    const fitDesk = await b.eval(async () => {
      const box = document.querySelector('.relmap'), nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
      scrollTo(0, box.getBoundingClientRect().top + scrollY - nav - 8);
      await new Promise(r => setTimeout(r, 900));
      const r = box.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight };
    });
    check('строки с панелью влезают в один экран (1280×900)', fitDesk.bottom <= fitDesk.vh, JSON.stringify(fitDesk));

    // ---------- шторка функции модели А ----------
    await go('#/types/esi', 1200);
    const noBox = await b.eval(() => ({ box: Boolean(document.querySelector('#app [data-box]')), facts: (document.querySelector('#app .type-facts a') || { getAttribute: () => '' }).getAttribute('href') }));
    check('страница типа: коробки нет, к фактам ведёт ссылка', !noBox.box && noBox.facts === '#/box/esi', JSON.stringify(noBox));
    const fn = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const cell = document.querySelector('[data-fn="4"]');
      cell.scrollIntoView({ block: 'center' });
      await sleep(500);
      cell.click();
      await sleep(900);
      const d = document.querySelector('dialog.sheet');
      const own = Socio.content.modelA && Socio.content.modelA.esi && Socio.content.modelA.esi[4];
      const main = d.querySelector('.fn-main p').textContent;
      const res = { open: d.open, title: d.querySelector('.fn-title').textContent, own: Boolean(own) && main === own.text, tip: Boolean(d.querySelector('.fn-tip')), rel: d.querySelector('.fn-rel').getAttribute('href') };
      d.querySelector('.fn-nav [data-fn-go]:last-child').click();
      await sleep(700);
      res.next = d.querySelector('.fn-title').textContent;
      d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await sleep(700);
      res.arrow = d.querySelector('.fn-title').textContent;
      return res;
    });
    check('шторка модели А: ЭСИ, болевая — «Уязвимое место», свой текст типа и совет', fn.open && fn.title === 'Уязвимое место' && fn.own && fn.tip && fn.rel === '#/relations/esi/ile', JSON.stringify(fn));
    check('шторка листается кнопкой и стрелкой', fn.next === 'Чего не хватает' && fn.arrow === 'Что заряжает', JSON.stringify(fn));
    await shot('d-sheet');
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.sleep(700);
    check('шторка закрывается по Esc', (await b.eval(`document.querySelectorAll('dialog.sheet').length`)) === 0);

    // ---------- знаменитости с похожим типом ----------
    const cel = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const box = document.getElementById('celebs');
      if (!box) return { none: true };
      box.scrollIntoView({ block: 'start' });
      await sleep(1800);
      const cols = Array.from(box.querySelectorAll('.celeb-col'));
      const res = {
        real: cols[0] ? cols[0].querySelectorAll('.celeb .celeb-ava:not(.fic)').length : 0,
        fic: cols[1] ? cols[1].querySelectorAll('.celeb .celeb-ava.fic').length : 0,
        disc: /не диагноз/.test((box.querySelector('.celeb-disc') || {}).textContent || ''),
        icons: new Set(Array.from(box.querySelectorAll('.celeb-ava img.celeb-ic')).filter(i => i.complete && i.naturalWidth > 0).map(i => i.getAttribute('src'))).size,
        visible: Array.from(box.querySelectorAll('.celeb-ava')).every(a => getComputedStyle(a).opacity === '1')
      };
      location.hash = '#/result';
      await sleep(1200);
      const line = document.querySelector('.celeb-line');
      res.mine = Socio.state.myType();
      res.line = line ? line.getAttribute('href') : null;
      res.lineText = line ? line.querySelector('.celeb-line-txt').textContent.replace(/\s+/g, ' ').trim() : '';
      if (line) {
        line.click();
        await sleep(1800);
        const el = document.getElementById('celebs');
        res.after = { hash: location.hash, top: el ? Math.round(el.getBoundingClientRect().top) : null };
      }
      location.hash = '#/r/1-80-85-20-15';
      await sleep(1200);
      res.shared = (document.querySelector('.celeb-line') || {}).getAttribute ? document.querySelector('.celeb-line').getAttribute('href') : null;
      return res;
    });
    check('страница типа: 3 человека и 3 персонажа с похожим типом, у каждого своя иконка, и оговорка', cel.real === 3 && cel.fic === 3 && cel.icons === 6 && cel.disc && cel.visible, JSON.stringify(cel));
    check('результат: строчка «Похожий тип — у знаменитостей» ведёт к списку на странице типа',
      cel.line === `#/types/${cel.mine}#celebs` && /^Похожий тип — у знаменитостей .+ и ещё 3$/.test(cel.lineText) && cel.after && cel.after.top !== null && cel.after.top < 200, JSON.stringify(cel));
    check('страница по ссылке: та же строчка для чужого типа', cel.shared === '#/types/iee#celebs', String(cel.shared));
    await go('#/types/esi', 1200);
    await shot('d-type-celebs', '#celebs', 40);
    await go('#/relations/ile/lse', 1200);
    await shot('d-pair');

    // ---------- страница пары на каждый день ----------
    await go('#/relations/esi/lie', 1600);
    const pr = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 30 && !document.querySelector('#spheres'); i++) await sleep(150);
      localStorage.removeItem('socio.tried.esi-lie');
      const zones = document.querySelectorAll('.pr-zone');
      const out = {
        zones: zones.length, story: document.querySelectorAll('.pr-story').length, scripts: document.querySelectorAll('.pr-script').length,
        qs: document.querySelectorAll('.pr-q').length, badges: Array.from(document.querySelectorAll('.pr-badge')).map(x => x.textContent.trim()),
        side: Array.from(document.querySelectorAll('.pr-side a')).map(a => a.getAttribute('href')),
        send: Boolean(document.querySelector('[data-sk="send"]')), toc: document.querySelectorAll('.pr-toc a').length,
        imgs: Array.from(document.querySelectorAll('.pr-asp')).length,
        how: document.querySelectorAll('.pr-how-row').length, gives: document.querySelectorAll('.pr-gives > div').length,
        stages: document.querySelectorAll('.pr-stages li').length, ctx: document.querySelectorAll('.pr-ctx-card').length,
        pm: document.querySelectorAll('.pr-pm-col li').length, tips: document.querySelectorAll('.pr-tip').length,
        tipsTop: document.getElementById('tips') ? 1 : 0
      };
      document.querySelector('.pr-toc a[href$="#spheres"]').click();
      await sleep(1100);
      out.tocTop = Math.round(document.getElementById('spheres').getBoundingClientRect().top);
      zones[0].open = true;
      await sleep(300);
      const btn = zones[0].querySelector('[data-try]');
      btn.click();
      await sleep(200);
      out.pressed = btn.getAttribute('aria-pressed');
      out.progress = document.querySelector('.pr-progress').textContent.replace(/\s+/g, ' ').trim();
      document.querySelector('[data-q-next]').click();
      await sleep(200);
      out.qn = document.querySelector('.pr-qn').textContent.replace(/\s+/g, ' ').trim();
      out.qVisible = document.querySelectorAll('.pr-q:not([hidden])').length;
      return out;
    });
    check('пара: «Об отношениях» — как устроено (4), кто что ведёт, этапы (3), в паре / дружбе / работе (3), сильные и слабые места (3 + 3)',
      pr.how === 4 && pr.gives >= 2 && pr.stages === 3 && pr.ctx === 3 && pr.pm === 6, JSON.stringify(pr));
    check('пара: отдельный раздел «Советы для пары» — 8 советов, фразы, ссора и ритуал', pr.tipsTop === 1 && pr.tips === 8 && pr.scripts === 3, JSON.stringify(pr));
    const prWide = await b.eval(`(() => { const f = Array.from(document.querySelectorAll('.pr-fold')); const s = document.querySelector('.pr-send-top [data-sk="send"]');
      return { folds: f.length, open: f.filter(x => x.open).length, more: Boolean(document.querySelector('.pr-tips-more')), top: Boolean(s), label: s ? s.textContent.replace(/\\s+/g, ' ').trim() : '' }; })()`);
    check('пара, компьютер: блоки «Об отношениях» раскрыты, все советы видны сразу, «Отправить» есть и наверху',
      prWide.folds >= 5 && prWide.open === prWide.folds && !prWide.more && prWide.top && /Отправить ЛИЭ/.test(prWide.label), JSON.stringify(prWide));
    check('пара: неделя из жизни, 8 сфер со знаками и бейджами, 3 фразы, 6 вопросов, две стороны и отправка партнёру',
      pr.zones === 8 && pr.imgs === 8 && pr.story === 2 && pr.scripts === 3 && pr.qs === 6 && pr.badges.length === 8 && pr.badges.every(Boolean) &&
      pr.side[1] === '#/relations/lie/esi' && pr.send && pr.toc === 4, JSON.stringify(pr));
    check('пара: оглавление ведёт к разделу, «попробовали» отмечается и считается, вопросы листаются',
      pr.tocTop >= -5 && pr.tocTop < 160 && pr.pressed === 'true' && /Попробовали 1 из 8/.test(pr.progress) && /^2 из 6$/.test(pr.qn) && pr.qVisible === 1, JSON.stringify(pr));
    await b.reload();
    await b.sleep(1800);
    const kept = await b.eval(`(() => { const z = document.querySelector('.pr-zone [data-try]'); return { pressed: z && z.getAttribute('aria-pressed'), progress: (document.querySelector('.pr-progress') || {}).textContent || '' }; })()`);
    check('пара: тексты подгружаются при чистой загрузке, отметка «попробовали» переживает перезагрузку', kept.pressed === 'true' && /1\s+из\s+8/.test(kept.progress), JSON.stringify(kept));
    await shot('d-pair-spheres', '#spheres', 60);
    await go('#/quadras', 1200);
    const qOnce = await b.eval(() => ({ stack: document.querySelectorAll('#app [data-stack], #app .qs-sec').length, secs: document.querySelectorAll('#app section.quadra').length, nav: document.querySelectorAll('#app .qnav a').length }));
    check('квадры: каждая квадра на странице один раз — без повторной стопки карточек', qOnce.stack === 0 && qOnce.secs === 4 && qOnce.nav === 4, JSON.stringify(qOnce));
    await shot('d-quadras', '#gamma', 50);
    await go('#/about', 1200);
    await shot('d-about-aspects', '.aspect-grid', 140);
    const asp = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const btn = document.querySelector('[data-aspect="Ne"]');
      btn.scrollIntoView({ block: 'center' });
      await sleep(500);
      btn.click();
      await sleep(700);
      const d = document.querySelector('dialog.sheet');
      if (!d) return { open: false };
      const title = d.querySelector('.fn-title').textContent, life = d.querySelectorAll('.as-life li').length;
      const types = Array.from(d.querySelectorAll('.as-type b')).map(x => x.textContent).join(',');
      d.querySelector('[data-as-go="Ni"]').click();
      await sleep(700);
      const next = d.querySelector('.fn-title').textContent;
      d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      d.dispatchEvent(new Event('cancel'));
      await sleep(500);
      return { open: true, title, life, types, next, closed: !document.querySelector('dialog.sheet') };
    });
    check('«О соционике»: аспект по нажатию — шторка с разбором, типами и листанием', asp.open && asp.title === 'Интуиция возможностей' && asp.life === 3 && asp.types === 'ИЛЭ,ИЭЭ,ЛИИ,ЭИИ' && asp.next === 'Интуиция времени' && asp.closed, JSON.stringify(asp));

    // ---------- щадящий режим ----------
    await b.media({ 'prefers-reduced-motion': 'reduce' });
    await b.goto(BASE + '#/');
    await b.sleep(400);
    const calm = await b.eval(`(() => { const els = Array.from(document.querySelectorAll('.reveal')); return els.filter(e => getComputedStyle(e).opacity !== '1').length; })()`);
    check('prefers-reduced-motion: всё видно сразу, без появления', calm === 0, `скрытых: ${calm}`);
    await b.media({ 'prefers-reduced-motion': 'no-preference' });

    // ---------- телефон ----------
    for (const [w, h] of [[320, 640], [390, 844]]) {
      await b.viewport(w, h, { mobile: true, scale: 2 });
      const overflow = [];
      for (const r of ROUTES) {
        await b.goto(BASE + r);
        await b.sleep(600);
        // с innerWidth сравнивать нельзя: телефон расширяет layout viewport под переполнение, и разница всегда 0
        const o = await b.eval(`Math.max(document.documentElement.scrollWidth, innerWidth) - ${w}`);
        if (o > 0) overflow.push(`${r}: +${o}px`);
      }
      check(`телефон ${w} px: нигде нет горизонтального скролла`, overflow.length === 0, overflow.join(', '));
    }
    // 320 px: названия полюсов шкал («Иррациональность» и др.) в одну строку
    await b.viewport(320, 640, { mobile: true, scale: 2 });
    await b.goto(BASE + '#/result');
    await b.sleep(900);
    const wrapped = await b.eval(`Array.from(document.querySelectorAll('.sc-name')).filter(n => n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).lineHeight) * 1.5).map(n => n.textContent)`);
    check('320 px: названия полюсов на шкалах не переносятся', wrapped.length === 0, wrapped.join(', '));
    // 375×667: шкала теста видна без прокрутки, персонаж героя не закрывает кнопку
    await b.viewport(375, 667, { mobile: true, scale: 2 });
    await b.goto(BASE + '#/test');
    await b.sleep(900);
    const passedM = await b.eval(`(() => { const s = document.querySelector('.test-passed'); if (!s) return null; const r = s.querySelector('[data-again]').getBoundingClientRect(); const out = { bottom: Math.round(r.bottom), h: Math.round(r.height) }; s.querySelector('[data-again]').click(); return out; })()`);
    check('375×667: экран «тест уже пройден» с обеими кнопками помещается без прокрутки', passedM && passedM.bottom <= 667 && passedM.h >= 44, JSON.stringify(passedM));
    await b.sleep(700);
    const scaleBottom = await b.eval(`Math.round(document.querySelector('.q-scale').getBoundingClientRect().bottom)`);
    check('375×667: шкала теста видна без прокрутки', scaleBottom <= 667, `низ шкалы ${scaleBottom}`);
    // до теста — тайный тип: тёмный силуэт не поднимается на заголовок, а уходит низом под подвал героя
    const saved375 = await b.eval(`localStorage.getItem('socio.result')`);
    await b.eval(`localStorage.removeItem('socio.result')`);
    await b.goto(BASE + '#/');
    await b.sleep(1500);
    const foldX = await b.eval(`(() => {
      const c = document.querySelector('.hero-actions .btn').getBoundingClientRect(), n = document.querySelector('.hero-title .fit-line:last-child').getBoundingClientRect(), f = document.querySelector('.hero-fig img').getBoundingClientRect();
      const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
      return { mystery: Boolean(document.querySelector('.hero-mystery')), ctaFree: Boolean(hit && hit.closest('.hero-actions')), ctaBottom: Math.round(c.bottom), overlap: Math.round((n.bottom - f.top) / n.height * 100) };
    })()`);
    check('375×667: тайный тип не закрывает кнопку и заходит на «кто ты?» не больше чем на половину строки, кнопка на первом экране',
      foldX.mystery && foldX.ctaFree && foldX.ctaBottom <= 667 && foldX.overlap <= 50, JSON.stringify(foldX));
    await b.eval(`localStorage.setItem('socio.result', ${JSON.stringify(saved375)})`);
    await b.reload();   // тот же адрес #/ — без перезагрузки страница осталась бы с тайным типом
    await b.sleep(1500);
    const fold = await b.eval(`(() => { const c = document.querySelector('.hero-actions').getBoundingClientRect(), f = document.querySelector('.hero-fig img').getBoundingClientRect(); return { me: Boolean(document.querySelector('.hero-me')), cta: Math.round(c.top), fig: Math.round(f.bottom), ctaBottom: Math.round(c.bottom) }; })()`);
    check('375×667: после теста персонаж не закрывает кнопку героя, кнопка на первом экране', fold.me && fold.fig <= fold.cta && fold.ctaBottom <= 667, JSON.stringify(fold));
    for (const [w, h] of [[375, 667], [390, 844]]) {
      await b.viewport(w, h, { mobile: true, scale: 2 });
      await b.goto(BASE + '#/relations');
      await b.sleep(1200);
      const fit = await b.eval(async () => {
        const box = document.querySelector('.relmap'), nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
        scrollTo(0, box.getBoundingClientRect().top + scrollY - nav - 8);
        await new Promise(r => setTimeout(r, 1200));
        const st = box.querySelector('.rm-stage').getBoundingClientRect(), orbs = Array.from(box.querySelectorAll('.rm-orb')).map(n => n.getBoundingClientRect().width);
        const hits = Array.from(box.querySelectorAll('.rm-node')).map(n => Math.min(n.getBoundingClientRect().width, n.getBoundingClientRect().height));
        const over = document.documentElement.scrollWidth - innerWidth;
        return { stageBottom: Math.round(st.bottom), vh: innerHeight, minOrb: Math.round(Math.min(...orbs)), minHit: Math.round(Math.min(...hits)), over };
      });
      check(`${w}×${h}: все три строки на одном экране, аватары не мельче 48 px, по типу легко попасть пальцем`, fit.stageBottom <= fit.vh && fit.minOrb >= 48 && fit.minHit >= 44 && fit.over <= 0, JSON.stringify(fit));
    }

    // ---------- телефон: разгрузка экранов и паузы (по аудиту мобильной версии) ----------
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await b.goto(BASE + '#/r/1-72-64-58-19');
    await b.sleep(1300);
    const shCta = await b.eval(`(() => { scrollTo(0, 0); const r = document.querySelector('.sh-hero .cta .btn').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight }; })()`);
    check('390 px: на странице по ссылке главная кнопка — на первом экране', shCta.bottom <= shCta.vh, JSON.stringify(shCta));
    await b.goto(BASE + '#/');
    await b.sleep(1500);
    const heroM = await b.eval(`(() => {
      const vis = el => getComputedStyle(el).display !== 'none';
      const tr = document.querySelector('.hero-traits-m');
      return { traits: Array.from(tr.children).filter(vis).length, overflow: tr.scrollWidth - tr.clientWidth,
        steps: Array.from(document.querySelectorAll('.hero-steps a')).filter(vis).length, bubble: getComputedStyle(document.querySelector('.hero-bubble')).display };
    })()`);
    check('390 px: в герое не больше двух черт и двух шагов, без прокрутки вбок; реплика не закрывает имя',
      heroM.traits <= 2 && heroM.overflow <= 1 && heroM.steps <= 2 && heroM.bubble === 'none', JSON.stringify(heroM));
    const simple = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const vis = el => Boolean(el && el.offsetParent !== null);
      const hero = document.querySelector('section[data-hero]'), meta = hero.querySelector('.hero-meta'), cta = hero.querySelector('.hero-cta');
      const out = { chips: vis(hero.querySelector('.hero-traits-m')), steps: vis(hero.querySelector('.hero-steps')), metaBorder: meta ? getComputedStyle(meta).borderTopStyle : '',
        cta: vis(cta), ctaLines: Math.round(cta.getBoundingClientRect().height / parseFloat(getComputedStyle(cta).lineHeight || 20)) };
      const map = document.querySelector('#rel .relmap');
      Object.assign(out, { hint: vis(map.querySelector('.rm-hint')), tone: vis(map.querySelector('.rd-tone')), refocus: vis(map.querySelector('.rd-refocus')), link: vis(map.querySelector('.rd .link')),
        rowLine: getComputedStyle(map.querySelectorAll('.rm-row')[1]).borderTopStyle });
      Object.assign(out, { marquee: Boolean(document.querySelector('[data-marquee]')), outside: Array.from(document.querySelectorAll('#app img')).filter(i => !i.closest('section[data-hero]')).length });
      return out;
    });
    check('390 px, после теста — только главное: в герое без черт и шагов, результат — тихой ссылкой; в «С кем легко» без пояснений, линий, тона и второй кнопки',
      !simple.chips && !simple.steps && simple.metaBorder === 'none' && simple.cta && !simple.hint && simple.rowLine === 'none' && !simple.tone && !simple.refocus && simple.link, JSON.stringify(simple));
    check('390 px, после теста: ленты нет, 3D-картинки — только в герое', !simple.marquee && simple.outside === 0, JSON.stringify(simple));
    // браузер Telegram (≈390×660): страница по ссылке и сохранение картинки без файлового шера
    await b.viewport(390, 660, { mobile: true, scale: 2 });
    const savedTg = await b.eval(`localStorage.getItem('socio.result')`);
    await b.eval(`localStorage.removeItem('socio.result')`);
    await go('#/r/1-72-64-58-19', 1500);
    const tg = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      scrollTo(0, 0);
      await sleep(500);
      const cta = document.querySelector('.sh-hero .cta .btn'), bar = document.querySelector('[data-sticky]');
      const first = { ctaBottom: Math.round(cta.getBoundingClientRect().bottom), vh: innerHeight, barOn: bar.classList.contains('on') };
      scrollTo(0, innerHeight * 1.6);
      await sleep(800);
      const mid = { barOn: bar.classList.contains('on'), bottom: Math.round(bar.querySelector('.btn').getBoundingClientRect().bottom) };
      scrollTo(0, document.documentElement.scrollHeight);
      await sleep(800);
      return { first, mid, end: { barOn: bar.classList.contains('on') } };
    });
    check('390×660 (окно Telegram): на странице по ссылке «Узнать свой тип» в первом экране; при прокрутке прикреплена внизу, у последней кнопки прячется',
      tg.first.ctaBottom <= tg.first.vh && !tg.first.barOn && tg.mid.barOn && tg.mid.bottom <= tg.first.vh && !tg.end.barOn, JSON.stringify(tg));
    await b.eval(`localStorage.setItem('socio.result', ${JSON.stringify(savedTg)})`);
    await go('#/result', 1400);
    const save = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      navigator.canShare = () => false;   // как во встроенном браузере: файлом не отправить
      Socio.app.render({ instant: true });
      await sleep(1200);
      const box = document.querySelector('[data-share]'), btn = box.querySelector('[data-sk="go"]');
      const label = btn.textContent.trim();
      btn.click();
      await sleep(1500);
      const dlg = document.querySelector('dialog.sheet[open]'), img = dlg && dlg.querySelector('.save-img');
      const out = { label, open: Boolean(dlg), src: img ? img.getAttribute('src').slice(0, 22) : '', status: box.querySelector('.sk-status').textContent, copy: Boolean(dlg && dlg.querySelector('[data-save-copy]')) };
      if (dlg) dlg.querySelector('.sheet-close').click();
      await sleep(600);
      return out;
    });
    check('телефон без отправки файла (браузер Telegram): «Сохранить картинку» показывает её крупно для долгого нажатия, без ложного «сохранена»',
      save.label === 'Сохранить картинку' && save.open && save.src.startsWith('data:image/png') && !/сохранена/.test(save.status) && save.copy, JSON.stringify(save));
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    await go('#/', 1500);   // дальше проверки главной после теста
    const relM = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const map = document.querySelector('.relmap');
      if (!map) return { none: true };
      map.scrollIntoView({ block: 'center' });
      await sleep(900);
      const onScreen = map.classList.contains('is-off');
      const rd = map.querySelector('.rd');
      const out = { anim: map.hasAttribute('data-anim'), onScreen, panes: rd ? getComputedStyle(rd.querySelector('.rd-panes')).display : '', inner: rd ? rd.scrollHeight - rd.clientHeight : -1,
        float: getComputedStyle(map.querySelector('.rm-orb')).animationName };
      scrollTo(0, 0);
      await sleep(900);
      out.offScreen = map.classList.contains('is-off');
      return out;
    });
    check('390 px: строки отношений на паузе вне экрана, марки не парят, в панели нет окошка с прокруткой',
      relM.anim && relM.onScreen === false && relM.offScreen === true && relM.float === 'none' && relM.panes === 'none' && relM.inner <= 1, JSON.stringify(relM));
    // № 10: «Поделиться результатом» в герое доводит до кнопки шера, а не только до превью
    const shareM = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      scrollTo(0, 0);
      await sleep(300);
      const cta = document.querySelector('section[data-hero] a.hero-cta[href="#/#share"]');
      if (!cta) return { none: true };
      cta.click();
      await sleep(1600);
      const go = document.querySelector('[data-share] [data-sk="go"]');
      const r = go.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, focus: document.activeElement === go };
    });
    check('390 px: «Поделиться результатом» в герое главной приводит к самой кнопке шера — она на экране и в фокусе',
      !shareM.none && shareM.top >= 0 && shareM.bottom <= shareM.vh && shareM.focus, JSON.stringify(shareM));
    // № 11: в «Непросто» совет «Как ладить» виден сразу, ссылка ведёт к советам пары
    const tipM = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const map = document.querySelector('#rel .relmap');
      map.scrollIntoView({ block: 'start' });
      await sleep(500);
      const tense = map.querySelector('.rm-node.t-tense');
      tense.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(400);
      const tip = map.querySelector('.rd-tip'), link = map.querySelector('.rd .link');
      return { tip: Boolean(tip && tip.offsetParent !== null), text: tip ? tip.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '', size: tip ? parseFloat(getComputedStyle(tip).fontSize) : 0,
        link: link.getAttribute('href'), inner: map.querySelector('.rd').scrollHeight - map.querySelector('.rd').clientHeight };
    });
    check('390 px: у пары из «Непросто» сразу виден совет «Как ладить», ссылка ведёт к «Советам для пары»',
      tipM.tip && /^Как ладить\./.test(tipM.text) && tipM.size >= 14 && /#tips$/.test(tipM.link) && tipM.inner <= 1, JSON.stringify(tipM));
    // № 21: страница пары на телефоне — «Отправить» в первом экране, второстепенное свёрнуто
    await go('#/relations/esi/lie', 1900);
    const pairM = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 30 && !document.querySelector('#spheres'); i++) await sleep(150);
      scrollTo(0, 0);
      await sleep(300);
      const send = document.querySelector('.pr-send-top [data-sk="send"]'), r = send.getBoundingClientRect();
      const folds = Array.from(document.querySelectorAll('.pr-fold'));
      const more = document.querySelector('.pr-tips-more');
      const out = { sendBottom: Math.round(r.bottom), sendH: Math.round(r.height), vh: innerHeight, folds: folds.length, open: folds.filter(f => f.open).length,
        tipsShown: Array.from(document.querySelectorAll('.pr-tip')).filter(x => !x.closest('details:not([open])')).length, more: more ? more.querySelector('summary').textContent.replace(/\s+/g, ' ').trim() : '',
        screens: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10 };
      folds[0].querySelector('summary').click();
      await sleep(200);
      out.opens = folds[0].open;
      folds[0].open = false;
      more.querySelector('summary').click();
      await sleep(200);
      out.tipsAll = Array.from(document.querySelectorAll('.pr-tip')).filter(x => !x.closest('details:not([open])')).length;
      return out;
    });
    check('390 px, пара: «Отправить» — в первом экране, второстепенные блоки свёрнуты и раскрываются, советов сначала три, остальные по кнопке',
      pairM.sendBottom <= pairM.vh && pairM.sendH >= 44 && pairM.folds >= 5 && pairM.open === 0 && pairM.opens && pairM.tipsShown === 3 && /Показать ещё 5/.test(pairM.more) && pairM.tipsAll === 8, JSON.stringify(pairM));
    check('390 px, пара: страница заметно короче прежних 17 экранов', pairM.screens <= 11, String(pairM.screens));
    await go('#/', 1500);
    await b.goto(BASE + '#/result');
    await b.sleep(1300);
    const foldM = await b.eval(`(() => { const d = document.querySelector('.dist-fold'); return { fold: Boolean(d), open: d ? d.open : null, hint: d ? d.textContent : '' }; })()`);
    check('390 px: «Все 16 типов» свёрнуты в одну строку, подсказка без «наведи»', foldM.fold && foldM.open === false && !/Наведи/.test(foldM.hint), JSON.stringify(foldM));
    await b.goto(BASE + '#/box');
    await b.sleep(1100);
    const bxM = await b.eval(`Math.round(document.querySelector('.bx-back').getBoundingClientRect().height)`);
    check('390 px: заглушка коробки компактная, без пустого экрана', bxM < 420, String(bxM));
    await b.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await b.viewport(375, 667, { mobile: true, scale: 2 });
    await b.goto(BASE + '#/');
    await b.sleep(1400);
    await shot('m-home');
    await b.goto(BASE + '#/test');
    await b.sleep(1200);
    await shot('m-test');
    await b.goto(BASE + '#/result');
    await b.sleep(1400);
    await shot('m-result-top');
    await shot('m-result-scales', '.scales', 90);

    // ---------- P2 и P3 разбора: загрузка, клавиатура, петли, телефон ----------
    await b.viewport(1280, 900);
    await b.goto(BASE + '#/');
    await b.sleep(900);
    await b.eval(`Socio.debug.answerAll('esi'), 1`);
    const srcs = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').match(/<script src="[^"]+"/g) || [];
    check('загрузка: 41 скрипт; тексты пары, «Как устроен тип» и юнит-тесты в неё не входят', srcs.length === 41 && !srcs.some(s => /content\/(pair|modelA-)|js\/tests/.test(s)), String(srcs.length));
    const yml = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
    check('выкладка: страница юнит-тестов убирается из сайта до сборки', /rm -rf site\/tests\.html site\/js\/tests[\s\S]*upload-pages-artifact/.test(yml));

    // Ленивые тексты: каждый маршрут — с чистой загрузки, иначе пропущенную подгрузку маскируют открытые раньше
    const cleanErr = [];
    for (const r of ROUTES) {
      const before = b.errors.length;
      await b.eval(`location.hash = ${JSON.stringify(r)}, 1`);
      await b.reload();
      await b.sleep(1200);
      const st = await b.eval(`({ err: document.documentElement.dataset.error || '', h1: document.querySelectorAll('#app h1').length })`);
      if (st.err || st.h1 !== 1 || b.errors.length > before) cleanErr.push(`${r}: ${st.err || (st.h1 !== 1 ? 'h1 × ' + st.h1 : b.errors.slice(before).join('; '))}`);
    }
    check('чистая загрузка каждого маршрута: страница собрана, один h1, ошибок нет', !cleanErr.length, cleanErr.join(' | '));
    await b.eval(`location.hash = '#/types/esi', 1`);
    await b.reload();
    await b.sleep(1500);
    const lazyA = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const cell = document.querySelector('[data-fn="4"]');
      cell.scrollIntoView({ block: 'center' });
      await sleep(400);
      cell.focus();
      cell.click();
      await sleep(1200);
      const d = document.querySelector('dialog.sheet');
      const own = Socio.content.modelA && Socio.content.modelA.esi && Socio.content.modelA.esi[4];
      return { open: Boolean(d && d.open), own: Boolean(own) && d.querySelector('.fn-main p').textContent === own.text };
    });
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.sleep(800);
    const back = await b.eval(`({ closed: !document.querySelector('dialog.sheet[open]'), focus: document.activeElement ? document.activeElement.getAttribute('data-fn') : null })`);
    check('страница типа с чистой загрузки: тексты «Как устроен тип» подгружаются; после Esc фокус возвращается на ячейку',
      lazyA.open && lazyA.own && back.closed && back.focus === '4', JSON.stringify({ lazyA, back }));

    // ---------- клавиатура и скринридер ----------
    await go('#/relations', 1300);
    const mx = await b.eval(() => {
      const cells = Array.from(document.querySelectorAll('.matrix a.mx')), N = 16;
      const stops = cells.filter(c => c.tabIndex === 0);
      const at = () => cells.indexOf(document.activeElement);
      const key = k => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      if (stops[0]) stops[0].focus();
      const i0 = at();
      key('ArrowRight'); const i1 = at();
      key(i0 < N * (N - 1) ? 'ArrowDown' : 'ArrowUp'); const i2 = at();
      key('End'); const i3 = at();
      key('Home'); const i4 = at();
      return { cells: cells.length, stops: stops.length, after: cells.filter(c => c.tabIndex === 0).length, mine: Socio.data.types.findIndex(t => t.id === 'esi'), i0, i1, i2, i3, i4,
        you: document.querySelectorAll('.matrix .mx-you').length, hint: Boolean(document.querySelector('.mx-keys')) };
    });
    check('матрица: одна остановка Tab — в строке своего типа; внутри стрелки, Home и End; свой тип подписан «Ты»',
      mx.cells === 256 && mx.stops === 1 && mx.after === 1 && Math.floor(mx.i0 / 16) === mx.mine && mx.i1 === mx.i0 + 1 && Math.abs(mx.i2 - mx.i1) === 16 &&
      mx.i3 % 16 === 15 && mx.i4 % 16 === 0 && Math.floor(mx.i4 / 16) === Math.floor(mx.i2 / 16) && mx.you >= 1 && mx.hint, JSON.stringify(mx));
    await go('#/types', 1000);
    const youGrid = await b.eval(`(() => { const m = Array.from(document.querySelectorAll('#app .mq-you')); const a = m[0] && m[0].closest('a'); return { n: m.length, href: a ? a.getAttribute('href') : '' }; })()`);
    check('«Все типы»: свой тип в сетке помечен «Ты»', youGrid.n === 1 && youGrid.href === '#/types/esi', JSON.stringify(youGrid));

    const heads = [];
    for (const r of ['#/', '#/test', '#/result', '#/types', '#/types/esi', '#/quadras', '#/relations', '#/relations/esi/lie', '#/box', '#/about', '#/nope', '#/r/zzz']) {
      await go(r, r.startsWith('#/relations/') ? 1500 : 800);
      await b.eval(`scrollTo(0, document.body.scrollHeight), 1`);
      await b.sleep(350);
      const h = await b.eval(() => {
        const vis = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return !el.closest('[inert], [aria-hidden="true"], dialog:not([open])'); };
        const hs = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(vis).map(el => ({ l: Number(el.tagName[1]), t: el.textContent.trim().slice(0, 30) }));
        let prev = 0; const skips = [];
        hs.forEach(x => { if (x.l > prev + 1) skips.push(`h${prev}→h${x.l} «${x.t}»`); prev = x.l; });
        return { h1: hs.filter(x => x.l === 1).length, skips };
      });
      if (h.h1 !== 1 || h.skips.length) heads.push(`${r}: h1 × ${h.h1} ${h.skips.join(', ')}`);
    }
    check('заголовки: на каждой странице один h1 и ни одного пропущенного уровня', !heads.length, heads.join(' | '));
    const navs = await b.eval(`Array.from(document.querySelectorAll('nav')).map(n => n.getAttribute('aria-label'))`);
    check('навигация: три nav, у каждого своя подпись', navs.length === 3 && navs.every(Boolean) && new Set(navs).size === 3, navs.join(', '));

    await go('#/result', 1300);
    const tipEsc = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const find = () => Array.from(document.querySelectorAll('#app [data-tip]')).find(el => el.offsetParent);
      // закрытый <details> прячет содержимое через content-visibility: offsetParent у него есть, а фокус не встаёт
      document.querySelectorAll('#app details').forEach(d => { d.open = true; });
      await sleep(200);
      const row = find();
      if (!row) return { row: false };
      row.scrollIntoView({ block: 'center' });
      await sleep(400);
      row.focus();
      await sleep(200);
      const on = document.querySelectorAll('.tip.on').length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(150);
      return { row: true, on, off: document.querySelectorAll('.tip.on').length, focus: document.activeElement === row };
    });
    check('подсказка: появляется по фокусу, Esc убирает её и не трогает фокус', tipEsc.row && tipEsc.on === 1 && tipEsc.off === 0 && tipEsc.focus, JSON.stringify(tipEsc));

    await go('#/box', 1100);
    const boxA = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const card = document.querySelector('.bx-card'), backFace = document.querySelector('.bx-back'), say = document.querySelector('[data-box-say]');
      const shut = { card: card.inert, say: say.textContent.trim() };
      document.querySelector('.bx').click();
      await sleep(1800);
      return { shut, open: { card: card.inert, back: backFace.inert, say: say.textContent.trim().length, inCard: card.contains(document.activeElement) || document.activeElement === card } };
    });
    check('коробка: закрытая сторона выключена для клавиатуры (inert), факт объявляется скринридеру',
      boxA.shut.card === true && boxA.open.card === false && boxA.open.back === true && boxA.open.say > 20, JSON.stringify(boxA));

    // ---------- петли: поиграли и замерли ----------
    await go('#/relations/esi/lie', 1500);
    const rest = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const loops = el => el.getAnimations({ subtree: true }).filter(a => a.effect && a.effect.getComputedTiming().iterations === Infinity && a.playState === 'running').length;
      const el = Array.from(document.querySelectorAll('#app [data-anim]:not([data-anim="keep"])')).find(x => x.getAnimations({ subtree: true }).some(a => a.effect && a.effect.getComputedTiming().iterations === Infinity));
      if (!el) return { found: false };
      scrollTo(0, 0);
      el.scrollIntoView({ block: 'center' });
      el.dispatchEvent(new PointerEvent('pointerenter'));
      await sleep(700);
      const start = loops(el);
      let left = start, t = 0;
      while (left > 0 && t < 18000) { await sleep(1000); t += 1000; left = loops(el); }
      el.dispatchEvent(new PointerEvent('pointerenter'));
      await sleep(400);
      return { found: true, start, left, sec: t / 1000, again: loops(el), chars: document.querySelectorAll('[data-anim-text], .soc-char').length };
    });
    check('петли играют и замирают сами (не дольше 18 с), под курсором оживают; текста по буквам нет',
      rest.found && rest.start > 0 && rest.left === 0 && rest.again > 0 && rest.chars === 0, JSON.stringify(rest));

    // ---------- планшет и телефон ----------
    for (const w of [768, 834]) {
      await b.viewport(w, 1024);
      await b.goto(BASE + '#/types/esi');
      await b.sleep(300);
      await b.reload();
      await b.sleep(1500);
      const ma = await b.eval(`(() => { const out = Array.from(document.querySelectorAll('#app [data-fn]')).filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).length; return { cells: document.querySelectorAll('#app [data-fn]').length, out, ow: document.documentElement.scrollWidth - innerWidth }; })()`);
      check(`${w} px: «Как устроен тип» целиком в экране`, ma.cells === 8 && ma.out === 0 && ma.ow <= 0, JSON.stringify(ma));
    }
    for (const [w, h] of [[320, 640], [390, 844]]) {
      await b.viewport(w, h, { mobile: true, scale: 2 });
      const bad = [];
      for (const [r, fresh] of [['#/', 0], ['#/test', 1], ['#/test', 0], ['#/result', 0], ['#/types', 0], ['#/types/esi', 0], ['#/quadras', 0], ['#/relations', 0], ['#/relations/esi/lie', 0], ['#/box', 0], ['#/about', 0], ['#/r/1-72-64-58-19', 0]]) {
        await b.eval(fresh ? `localStorage.clear(), location.hash = ${JSON.stringify(r)}, 1` : `Socio.debug.answerAll('esi'), location.hash = ${JSON.stringify(r)}, 1`);
        await b.reload();
        await b.sleep(1400);
        const a = await b.eval(() => {
          const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('details:not([open]) > :not(summary)') && !el.closest('[hidden], [inert], dialog:not([open])'); };
          const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '');
          const small = new Set(), tiny = new Set();
          document.querySelectorAll('a, button, select, summary, input, [role="button"], [tabindex="0"]').forEach(el => {
            if (!vis(el)) return;
            const r = el.getBoundingClientRect();
            if (r.height < 43.5 || r.width < 43.5) small.add(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
          });
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = w.nextNode())) {
            const el = n.parentElement;
            if (!n.nodeValue.trim() || !el || !vis(el) || el.closest('script, style, svg, canvas')) continue;
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 12) tiny.add(`${name(el)} ${fs}px`);
          }
          return { small: Array.from(small), tiny: Array.from(tiny) };
        });
        if (a.small.length || a.tiny.length) bad.push(`${r}${fresh ? ' (до теста)' : ''}: ${a.small.concat(a.tiny).slice(0, 4).join(', ')}`);
      }
      check(`${w} px: нет целей касания меньше 44 px и текста мельче 12 px`, !bad.length, bad.join(' | '));
      if (w === 320) {
        await b.eval(`Socio.debug.answerAll('esi'), location.hash = '#/result', 1`);
        await b.reload();
        await b.sleep(1400);
        const tv = await b.eval(async () => {
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          document.querySelectorAll('#app details').forEach(d => { d.open = true; });
          const sw = Array.from(document.querySelectorAll('#app [role="group"] button, #app [role="tab"]')).find(x => /Таблиц/.test(x.textContent));
          if (sw) sw.click();
          await sleep(500);
          const t = document.querySelector('#app .table-view');
          if (!t || !t.offsetParent) return { table: false };
          const box = t.getBoundingClientRect();
          const out = Array.from(t.querySelectorAll('th, td')).filter(c => { const r = c.getBoundingClientRect(); return r.right > box.right + 1 || r.left < box.left - 1; }).length;
          return { table: true, out, left: Math.round(box.left), right: Math.round(box.right), vw: innerWidth };
        });
        check('320 px: таблица результата целиком в экране, ничего не обрезано', tv.table && tv.out === 0 && tv.left >= 0 && tv.right <= tv.vw + 1, JSON.stringify(tv));
      }
    }
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    await b.eval(`location.hash = '#/', 1`);
    await b.reload();
    await b.sleep(1300);
    const menu = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const btn = document.querySelector('[data-menu]'), app = document.querySelector('#app');
      btn.focus();
      btn.click();
      await sleep(500);
      const open = { exp: btn.getAttribute('aria-expanded'), inert: app.inert, label: btn.getAttribute('aria-label') };
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(400);
      return { open, exp: btn.getAttribute('aria-expanded'), inert: app.inert, focus: document.activeElement === btn };
    });
    check('меню на телефоне: страница под ним выключена (inert), Esc закрывает и возвращает фокус на кнопку',
      menu.open.exp === 'true' && menu.open.inert === true && menu.open.label === 'Закрыть меню' && menu.exp === 'false' && menu.inert === false && menu.focus, JSON.stringify(menu));

    // ---------- компьютер и телефон: на компьютере полные 3D-иллюстрации, на телефоне упрощённая версия (html.flat) ----------
    const mqSame = (() => {
      const head = (fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').match(/matchMedia\('([^']+)'\)/) || [])[1];
      const ui = (fs.readFileSync(path.join(SITE, 'js', 'ui', 'components.js'), 'utf8').match(/ui\.RICH_MQ = '([^']+)'/) || [])[1];
      return { head, ui, same: Boolean(head) && head === ui };
    })();
    check('граница компьютер / телефон задана одной строкой в <head> и в ui.RICH_MQ', mqSame.same, JSON.stringify(mqSame));
    // 3D-картинки вне первых экранов: персонаж в героях, пара в герое страницы пары и подарок на #/box — можно, остальное нет
    const STRAY_3D = `Array.from(document.querySelectorAll('#app img')).filter(i => /img\\/(types|mystery|aspects|emotes|celebs|q|scale|logo|box)\\//.test(i.getAttribute('src') || '')
      && !i.closest('section[data-hero], .res-hero, .type-hero, .sh-hero, .pair-hero, .lost-hero, .box-stage')).map(i => i.getAttribute('src').replace(/^.*img\\//, ''))`;
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    await b.goto(BASE + '#/');
    await b.sleep(800);
    await b.eval(`(localStorage.clear(), Socio.debug.answerAll('esi'), 1)`);
    await b.sleep(600);
    const flatRoute = async (hash, expr) => {
      await b.eval(`location.hash = ${JSON.stringify(hash)}`);
      await b.reload();
      await b.sleep(1400);
      return b.eval(`(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await sleep(60); }
        scrollTo(0, 0);
        const out = { flat: document.documentElement.classList.contains('flat'), stray: ${STRAY_3D} };
        Object.assign(out, await (${expr})());
        return out; })()`);
    };
    const ph = {};
    ph.home = await flatRoute('#/', `async () => {
      const box = document.querySelector('[data-box]'), back = box.querySelector('.bx-back');
      const before = { gift: box.querySelectorAll('.bx').length, label: back.getAttribute('aria-label') || '', imgs: box.querySelectorAll('img').length };
      back.click(); await new Promise(r => setTimeout(r, 1100));
      const card = box.querySelector('.bx-card');
      return { marquee: Boolean(document.querySelector('[data-marquee]')), marks: document.querySelectorAll('#rel .rm-orb.tm').length,
        stackQm: document.querySelectorAll('.stack-card .qm').length, stackArt: document.querySelectorAll('.qc-art').length, corners: document.querySelectorAll('.soc-g').length,
        logoBg: getComputedStyle(document.querySelector('.brand-mark i')).backgroundImage, logo: new Set(Array.from(document.querySelectorAll('.brand-mark i')).map(i => getComputedStyle(i).backgroundColor)).size,
        share: document.querySelectorAll('[data-share] .share-fx').length,
        deck: { ...before, flipped: box.querySelector('.bx-slot').classList.contains('flipped'), mark: (card.querySelector('.fc-ava b') || {}).textContent || '', cardImgs: card.querySelectorAll('img').length } }; }`);
    ph.result = await flatRoute('#/result', `async () => ({ poleImgs: document.querySelectorAll('.sc-pole img, .sc-knob img').length, quadra: Boolean(document.querySelector('.lc-art .qm')),
      dual: Boolean(document.querySelector('.lc-art .tm')), share: document.querySelectorAll('.share-fx').length, calc: Boolean(document.querySelector('.calc-duo .pm')) })`);
    ph.types = await flatRoute('#/types', `async () => ({ sym: document.querySelectorAll('.tcard-sym').length, art: document.querySelectorAll('.tcard-art').length })`);
    ph.type = await flatRoute('#/types/esi', `async () => ({ ma: document.querySelectorAll('[data-fn] .am').length, celebs: document.querySelectorAll('.celeb-ava svg.celeb-ic').length })`);
    ph.quadras = await flatRoute('#/quadras', `async () => ({ qm: document.querySelectorAll('.quadra-art .qm').length, orbit: document.querySelectorAll('.qorbit').length })`);
    ph.relations = await flatRoute('#/relations', `async () => ({ kindImgs: document.querySelectorAll('.kinds img').length, calc: Boolean(document.querySelector('.calc-duo .pm')), list: document.querySelectorAll('.mlist-out .rl-ava.tm').length })`);
    ph.pair = await flatRoute('#/relations/esi/lie', `async () => ({ zones: document.querySelectorAll('.pr-zone .am').length, ctx: document.querySelectorAll('.pr-ctx-ic').length,
      duo: document.querySelectorAll('.pair-hero .duo img.char').length, fx: document.querySelectorAll('.duo-fx').length })`);
    ph.box = await flatRoute('#/box', `async () => ({ gift: document.querySelectorAll('.box-stage .bx-img').length, moons: document.querySelectorAll('.bx-moon').length, pop: document.querySelectorAll('.bx-pop').length })`);
    ph.about = await flatRoute('#/about', `async () => ({ aspects: document.querySelectorAll('.aspect .am').length })`);
    ph.notfound = await flatRoute('#/nope', `async () => ({ char: document.querySelectorAll('.lost-char').length })`);
    ph.passed = await flatRoute('#/test', `async () => ({ mark: (document.querySelector('.tp-char .tm b') || {}).textContent || '' })`);
    await b.eval(`(localStorage.clear(), 1)`);
    ph.shared = await flatRoute('#/r/1-97-96-4-4', `async () => ({ ask: Boolean(document.querySelector('.sh-pair .pm-ask')), mystery: Boolean(document.querySelector('.duo-mystery')) })`);
    ph.test = await flatRoute('#/test', `async () => ({ cards: document.querySelectorAll('.q-card').length, imgs: document.querySelectorAll('.q-stage img, .t-ring img').length, slot: document.querySelectorAll('.slot-code').length })`);
    const strayAll = Object.entries(ph).filter(([, v]) => !v.flat || v.stray.length).map(([k, v]) => `${k}: ${v.flat ? v.stray.slice(0, 3).join(', ') : 'нет flat'}`);
    check('телефон, все страницы: упрощённая версия — 3D только в героях, паре и подарке', strayAll.length === 0, strayAll.join(' | '));
    check('телефон, главная: ленты и стихий по углам нет, «С кем легко» — марки, квадры — плоские знаки, логотип — плоские круги, у шера без символов',
      !ph.home.marquee && ph.home.marks === 15 && ph.home.stackQm === 4 && ph.home.stackArt === 0 && ph.home.corners === 0 && ph.home.logoBg === 'none' && ph.home.logo === 4 && ph.home.share === 0, JSON.stringify(ph.home));
    check('телефон, главная: факты — одна карта без подарка, открывается нажатием, у факта марка типа',
      ph.home.deck.gift === 0 && /факт/i.test(ph.home.deck.label) && ph.home.deck.imgs === 0 && ph.home.deck.flipped && ph.home.deck.mark === 'ЭСИ' && ph.home.deck.cardImgs === 0, JSON.stringify(ph.home.deck));
    check('телефон, результат: шкалы без картинок, квадра и дуал — плоские знаки, калькулятор — две марки',
      ph.result.poleImgs === 0 && ph.result.quadra && ph.result.dual && ph.result.share === 0 && ph.result.calc, JSON.stringify(ph.result));
    check('телефон: «Все типы» без бюстов, «Как устроен тип» и «О соционике» — плоские знаки, знаменитости — линейные иконки, квадры без орбит',
      ph.types.sym === 16 && ph.types.art === 0 && ph.type.ma === 8 && ph.type.celebs === 6 && ph.about.aspects === 8 && ph.quadras.qm === 4 && ph.quadras.orbit === 0, JSON.stringify({ types: ph.types, type: ph.type, about: ph.about, quadras: ph.quadras }));
    check('телефон, отношения и пара: «14 видов» без картинок, список и калькулятор — марки; в паре плоские знаки сфер, линейные иконки, персонажи в герое без символов',
      ph.relations.kindImgs === 0 && ph.relations.calc && ph.relations.list === 16 && ph.pair.zones === 8 && ph.pair.ctx === 3 && ph.pair.duo === 2 && ph.pair.fx === 0, JSON.stringify({ rel: ph.relations, pair: ph.pair }));
    check('телефон: #/box — подарок без летающих символов и персонажа; 404 без персонажа; «Тест уже пройден» — марка; чужая ссылка — кружок «?»; тест без картинок',
      ph.box.gift === 2 && ph.box.moons === 0 && ph.box.pop === 0 && ph.notfound.char === 0 && ph.passed.mark === 'ЭСИ' && ph.shared.ask && !ph.shared.mystery && ph.test.cards === 2 && ph.test.imgs === 0 && ph.test.slot === 1,
      JSON.stringify({ box: ph.box, nf: ph.notfound, passed: ph.passed, shared: ph.shared, test: ph.test }));
    // окно растянули до компьютера и сузили обратно — страница перерисовывается сама, без перезагрузки
    await b.eval(`(Socio.debug.answerAll('esi'), location.hash = '#/types', 1)`);
    await b.sleep(900);
    await b.viewport(1280, 900);
    await b.sleep(900);
    const wide = await b.eval(`({ flat: document.documentElement.classList.contains('flat'), art: document.querySelectorAll('.tcard-art img').length, sym: document.querySelectorAll('.tcard-sym').length, view: document.body.dataset.view })`);
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    await b.sleep(900);
    const narrow = await b.eval(`({ flat: document.documentElement.classList.contains('flat'), art: document.querySelectorAll('.tcard-art img').length, sym: document.querySelectorAll('.tcard-sym').length })`);
    check('окно шире 768 px с мышью — 3D, уже — плоско; переход перерисовывает страницу на месте',
      !wide.flat && wide.art === 16 && wide.sym === 0 && wide.view === 'types' && narrow.flat && narrow.art === 0 && narrow.sym === 16, JSON.stringify({ wide, narrow }));
    await b.viewport(1280, 900);

    check('ошибок JS за весь прогон нет', b.errors.length === 0, b.errors.slice(0, 5).join(' | '));
  } catch (e) {
    check('сценарий дошёл до конца', false, e.stack);
  } finally {
    await b.close();
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} проверок прошли${WITH_SHOTS ? ' · скриншоты в ' + SHOTS : ''}`);
  process.exit(failed ? 1 : 0);
})();
