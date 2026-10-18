// node --experimental-websocket tools/e2e.js [--shots] — сквозная проверка сайта в headless Chrome по file://
// Сайт копируется в /tmp: file:// с эмодзи в пути headless открывает плохо. Скриншоты — в /tmp/socionik-shots.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');

const SITE = path.join(__dirname, '..', 'site');
const TMP = '/tmp/socionik';
const SHOTS = '/tmp/socionik-shots';
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

    // ---------- клавиатура, «Назад», «Сначала» ----------
    await go('#/test', 900);
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
        logo: Array.from(document.querySelectorAll('.brand-mark .bm')).filter(i => i.complete && i.naturalWidth > 0).length };
    });
    check('тест наглядный: у вариантов 3D-картинки и заголовки, нажатие на карточку — «точно»', visual.arts.length === 2 && visual.arts.every(Boolean) && visual.heads.every(h => h.length > 3) && visual.picked.a && visual.picked.b && visual.picked.dot === '-2', JSON.stringify(visual));
    check('тест держит до конца: кольцо и 20 делений, время по темпу, подбадривание на четверти', visual.n === '6' && /мин|минуты/.test(visual.eta) && /Четверть позади/.test(visual.toast) && visual.done === 5 && Number(visual.ring) === 25, JSON.stringify(visual));
    check('логотип: четыре 3D-шара в цветах квадр', visual.logo === 4, JSON.stringify(visual.logo));
    await shot('d-test');

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
    await shot('d-relations-kinds', '.kinds', 90);
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
      const fresh = { code: document.querySelector('.res-code').textContent, mystery: Boolean(document.querySelector('.duo-mystery')), cta: document.querySelector('.sh-hero [data-friend]').textContent,
        ctaBottom: Math.round(ctaR.bottom), vh: innerHeight, pct: /%/.test(document.querySelector('.sh-hero .res-alias').textContent) };
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
      mineHero.steps.join() === `#/types/${mineHero.mine},#/#rel,#/test` && mineHero.bubble.length > 5, JSON.stringify(mineHero));
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
      rmap.after === 'Конфликтные отношения' && rmap.link === '#/relations/esi/ile' && rmap.tabKept && Number(rmap.keyed) === Number(rmap.conflictI) - 5, JSON.stringify(rmap));
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
    check('шторка модели А: ЭСИ, болевая, свой текст типа и совет', fn.open && fn.title === 'Болевая' && fn.own && fn.tip && fn.rel === '#/relations/esi/ile', JSON.stringify(fn));
    check('шторка листается кнопкой и стрелкой', fn.next === 'Суггестивная' && fn.arrow === 'Активационная', JSON.stringify(fn));
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
      const sec = document.querySelector('[data-marquee]'), track = sec.querySelector('.mq-track'), row = sec.querySelector('.mq-row');
      sec.scrollIntoView({ block: 'center' }); await sleep(300); scrollBy(0, 300); await sleep(300);
      Object.assign(out, { mqTransform: track.style.transform || 'none', mqScroll: getComputedStyle(row).overflowX, inertShown: Array.from(sec.querySelectorAll('.mq-copy[inert]')).some(vis) });
      return out;
    });
    check('390 px, после теста — только главное: в герое без черт и шагов, результат — тихой ссылкой; в «С кем легко» без пояснений, линий, тона и второй кнопки',
      !simple.chips && !simple.steps && simple.metaBorder === 'none' && simple.cta && !simple.hint && simple.rowLine === 'none' && !simple.tone && !simple.refocus && simple.link, JSON.stringify(simple));
    check('390 px: лента типов листается пальцем и не едет за прокруткой страницы (на iOS отставала и прыгала)',
      simple.mqTransform === 'none' && simple.mqScroll === 'auto' && !simple.inertShown, JSON.stringify(simple));
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
    check('390 px: строки отношений на паузе вне экрана, аватары не парят, в панели нет окошка с прокруткой',
      relM.anim && relM.onScreen === false && relM.offScreen === true && relM.float === 'none' && relM.panes === 'none' && relM.inner <= 1, JSON.stringify(relM));
    await b.goto(BASE + '#/result');
    await b.sleep(1300);
    const foldM = await b.eval(`(() => { const d = document.querySelector('.dist-fold'); return { fold: Boolean(d), open: d ? d.open : null, hint: d && d.previousElementSibling ? d.previousElementSibling.textContent : '' }; })()`);
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
