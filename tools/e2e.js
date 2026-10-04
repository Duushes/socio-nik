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

const ROUTES = ['#/', '#/pair', '#/duo', '#/i/1-72-64-58-19', '#/test', '#/result', '#/library', '#/types', '#/types/esi', '#/types/entp', '#/quadras', '#/relations',
  '#/relations/ile/lse', '#/pair/enfp/isfp', '#/pair/1-72-64-58-19/1-30-40-55-61', '#/box', '#/about', '#/r/1-72-64-58-19', '#/nope'];

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
        await sleep(560);
      }
      mo.disconnect();
      await sleep(2300);
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
      return { w: c.width, h: c.height, colored, size, postH: c.height, text: Socio.share.text(Socio.state.result()) };
    });
    check('картинка для шера рисуется и выгружается в PNG (canvas не «испачкан»)', share.colored > 200 && share.size > 50000, JSON.stringify(share));
    check('формат «Пост» — 1080×1350', share.postH === 1350, String(share.postH));
    const siteUrl = await b.eval('Socio.config.SITE_URL');
    if (siteUrl) {
      check('текст шера со ссылкой на результат', /Socio-Nik https:\/\/\S+\/#\/r\/1-\d+-\d+-\d+-\d+$/.test(share.text), share.text);
      const round = await b.eval(async () => {
        const code = document.querySelector('.res-code').textContent;
        const hash = Socio.share.url(Socio.state.result()).split('#')[1];
        location.hash = '#' + hash;
        await new Promise(r => setTimeout(r, 900));
        return { code, view: document.body.dataset.view, shared: document.querySelector('.res-code').textContent, links: document.querySelectorAll('.share-links a').length };
      });
      check('ссылка на результат открывает тот же тип', round.view === 'shared' && round.shared === round.code, JSON.stringify(round));
      await go('#/result', 900);
      const soc = await b.eval(() => {
        const bar = document.querySelector('.share .socials');
        const href = n => (bar.querySelector(`[data-social="${n}"]`) || {}).href || '';
        return { tg: href('telegram'), wa: href('whatsapp'), max: href('max'), vk: href('vk'), story: Boolean(bar.querySelector('[data-social="story"]')), meta: /instagram|инстаграм/i.test(document.body.innerHTML), copy: Boolean(bar.querySelector('[data-social="copy"]')) };
      });
      const enc = encodeURIComponent(await b.eval('Socio.share.url(Socio.state.result())'));
      check('результат: Telegram, WhatsApp, MAX, ВКонтакте, «Картинка для сторис» и «Скопировать ссылку»; упоминаний Instagram нет',
        soc.tg.startsWith('https://t.me/share/url?url=' + enc) && soc.wa.startsWith('https://wa.me/?text=') && soc.wa.includes(enc) &&
        soc.max.startsWith('https://max.ru/:share?text=') && soc.max.includes(enc) && soc.vk.startsWith('https://vk.com/share.php?url=' + enc) && soc.story && soc.copy && !soc.meta,
        JSON.stringify(soc));
    } else {
      check('текст шера без ссылки, пока нет SITE_URL', /^Мой тип личности — .+ Socio-Nik$/.test(share.text), share.text);
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
      const count1 = document.querySelector('.box-count b').textContent;
      document.querySelector('[data-more]').click();
      await sleep(1900);
      const t2 = (document.querySelector('.bx-text') || {}).textContent || '';
      return { t1: t1.slice(0, 50), t2: t2.slice(0, 50), count1, count2: document.querySelector('.box-count b').textContent, open: document.querySelector('.box-stage').classList.contains('is-open') };
    });
    check('mystery box открывается и показывает факт', box.open && box.t1.length > 20, JSON.stringify(box));
    check('«Ещё факт» — другой факт, счётчик растёт', box.t2 && box.t2 !== box.t1 && Number(box.count2) > Number(box.count1), JSON.stringify(box));
    const fsoc = await b.eval(async () => {
      const card = document.querySelector('.bx-card');
      const nets = Array.from(card.querySelectorAll('[data-social]')).map(el => el.dataset.social);
      const tg = (card.querySelector('[data-social="telegram"]') || {}).href || '';
      const png = await Socio.share.factImage(Socio.facts.all()[0]);
      const canFiles = Socio.share.canShareFiles();
      let status = '';
      if (!canFiles) {
        card.querySelector('[data-social="story"]').click();
        await new Promise(r => setTimeout(r, 800));
        status = card.querySelector('.bx-share-status').textContent;
      }
      return { nets, tg, png: png.size, canFiles, status, meta: /instagram|инстаграм/i.test(card.innerHTML) };
    });
    check('факт: четыре сети, картинка для сторис и ссылка на тип; упоминаний Instagram нет', ['telegram', 'whatsapp', 'max', 'vk', 'story'].every(n => fsoc.nets.includes(n)) && !fsoc.meta && /%23%2Ftypes%2F[a-z]{3}|%23%2Fbox/.test(fsoc.tg), JSON.stringify(fsoc));
    check('факт: картинка для сторис собирается', fsoc.png > 60000 && (fsoc.canFiles || /сохранена/.test(fsoc.status)), JSON.stringify(fsoc));
    await shot('d-box-open', '.box-stage', 140);

    // ---------- калькулятор ----------
    await go('#/relations', 1000);
    const calc = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const a = document.querySelector('[data-a]'), bb = document.querySelector('[data-b]');
      const title = () => document.querySelector('.calc-title').textContent + ' | ' + document.querySelector('.calc-term').textContent;
      a.value = 'ile'; a.dispatchEvent(new Event('change'));
      bb.value = 'esi'; bb.dispatchEvent(new Event('change'));
      await sleep(100);
      const t1 = title();
      bb.value = 'lse'; bb.dispatchEvent(new Event('change'));
      await sleep(100);
      const t2 = title();
      document.querySelector('[data-swap]').click();
      await sleep(100);
      return { t1, t2, t3: title(), link: document.querySelector('.calc-text .link').getAttribute('href') };
    });
    check('калькулятор: ENTP и ISFJ — «Разные языки», в соционике конфликтные', calc.t1 === 'Разные языки | Конфликтные отношения в соционике', calc.t1);
    check('калькулятор: заказ с ролями, перестановка и ссылка на экран пары', calc.t2 === 'Партнёр тебя вдохновляет | Социальный заказ: ESTJ — заказчик для ENTP в соционике' &&
      calc.t3 === 'Ты вдохновляешь партнёра | Социальный заказ: ESTJ — заказчик для ENTP в соционике' && calc.link === '#/pair/estj/entp', JSON.stringify(calc));
    await shot('d-relations-calc', '[data-calc]', 110);
    await shot('d-relations-kinds', '.kinds', 90);
    await shot('d-relations-matrix', '.matrix', 150);

    // ---------- страница результата по ссылке ----------
    const shared = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const code = '1-80-85-20-15';                   // Э · И · этика · иррационал → ИЭЭ
      const mine = Socio.state.myType(), mineCode = Socio.core.payload.encode(Socio.state.result());
      location.hash = '#/r/' + code;
      await sleep(1000);
      const withMine = {
        badge: Boolean(document.querySelector('.sh-badge')),
        cta: (document.querySelector('.sh-hero .cta .btn') || {}).getAttribute('href'),
        scene: Boolean(document.querySelector('.sh-pair .scene')) && !document.querySelector('.sc-mystery')
      };
      localStorage.removeItem('socio.result');
      location.hash = '#/';
      await sleep(700);
      location.hash = '#/r/' + code;
      await sleep(1000);
      const fresh = { code: document.querySelector('.res-code').textContent, mystery: Boolean(document.querySelector('.sc-mystery')), cta: document.querySelector('.sh-hero [data-friend]').textContent };
      document.querySelector('.sh-hero [data-friend]').click();
      await sleep(1000);
      for (let i = 0; i < 20; i++) {
        const q = document.querySelector('.q-stage .q:last-child');
        if (!q) return { fail: 'нет вопроса ' + i };
        q.querySelectorAll('.dot')[[4, 3, 1, 0, 2][i % 5]].click();
        await sleep(560);
      }
      await sleep(2300);
      const you = { view: document.body.dataset.view, title: (document.querySelector('.sh-you h2') || {}).textContent || '', rel: ((document.querySelector('.sh-you h2') || {}).textContent || '').split(': ')[1] || '' };
      const goPair = (document.querySelector('[data-pair-go]') || { getAttribute: () => '' }).getAttribute('href');
      return { mine, mineCode, withMine, fresh, you, goPair };
    });
    check('ссылка на чужой результат: своя страница с плашкой и кнопкой к вашей паре', shared.withMine.badge && shared.withMine.cta === `#/pair/${shared.mineCode}/1-80-85-20-15` && shared.withMine.scene, JSON.stringify(shared));
    check('без своего результата: загадка «?» и кнопка «Узнать свой тип»', shared.fresh.code === 'ENFP' && shared.fresh.mystery && shared.fresh.cta === 'Узнать свой тип', JSON.stringify(shared.fresh));
    check('после теста по ссылке — блок «Ты и тот, кто позвал» и кнопка к экрану пары', shared.you.view === 'result' && / и ENFP: /.test(shared.you.title) && shared.you.rel.length > 5 && /^#\/pair\/1-[\d-]+\/1-80-85-20-15$/.test(shared.goPair), JSON.stringify(shared));
    await shot('d-shared-you', '.sh-you', 60);
    await go('#/r/1-80-85-20-15', 1200);
    await shot('d-shared');

    await go('#/relations', 1000);

    // ---------- коды MBTI и старые адреса ----------
    const mb = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const h1 = async h => { location.hash = h; await sleep(800); return { view: document.body.dataset.view, h1: (document.querySelector('h1') || {}).textContent || '' }; };
      return { entp: await h1('#/types/entp'), ile: await h1('#/types/ile'), oldPair: await h1('#/relations/ile/sei'), box: await h1('#/box'), quadras: await h1('#/quadras'), shared: await h1('#/r/1-72-64-58-19') };
    });
    check('#/types/entp и #/types/ile — одна страница ENTP', mb.entp.h1 === 'ENTP' && mb.ile.h1 === 'ENTP', JSON.stringify(mb));
    check('старые адреса работают: #/relations/ile/sei → экран пары, #/r/…, #/box, #/quadras', mb.oldPair.view === 'pair' && mb.oldPair.h1 === 'Полное дополнение' && mb.box.view === 'box' && mb.quadras.view === 'quadras' && mb.shared.view === 'shared' && mb.shared.h1 === 'ENTP', JSON.stringify(mb));

    // ---------- тест вдвоём на одном телефоне ----------
    // чистое состояние: память страницы тоже сбрасываем перезагрузкой (смена одного #хэша её не сбрасывает)
    await b.eval(`localStorage.clear(); sessionStorage.clear(); location.hash = '#/duo'`);
    await b.reload();
    await b.sleep(900);
    const answerFn = `async pattern => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 20; i++) {
        const q = document.querySelector('.q-stage .q:last-child');
        if (!q) return 'нет вопроса ' + i;
        q.querySelectorAll('.dot')[pattern[i % pattern.length]].click();
        await sleep(560);
      }
      await sleep(2300);
      return '';
    }`;
    const duo = await b.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const answer = ${answerFn};
      document.querySelector('[data-duo-start]').click();
      await sleep(900);
      const chip1 = (document.querySelector('.duo-chip') || {}).textContent || '';
      const e1 = await answer([0, 1, 3, 4, 1]);
      const view1 = document.body.dataset.view, hand = /передай/.test(document.querySelector('h1').textContent);
      const mine = localStorage.getItem('socio.result');
      document.querySelector('[data-duo-go]').click();
      await sleep(900);
      const chip2 = (document.querySelector('.duo-chip') || {}).textContent || '';
      const e2 = await answer([4, 3, 1, 0, 2]);
      return { e1, e2, chip1, chip2, view1, hand, view2: document.body.dataset.view, hash: location.hash, mineKept: localStorage.getItem('socio.result') === mine,
        partner: JSON.parse(localStorage.getItem('socio.partner') || 'null'), duoLeft: localStorage.getItem('socio.duo') };
    })()`);
    check('тест вдвоём: ты → «передай телефон» → партнёр → экран пары; твой результат не затёрт', !duo.e1 && !duo.e2 && duo.view1 === 'duo' && duo.hand && duo.view2 === 'pair' &&
      /^#\/pair\/1-[\d-]+\/1-[\d-]+$/.test(duo.hash) && duo.mineKept && duo.partner && duo.partner.via === 'duo' && !duo.duoLeft && /потом партнёр/.test(duo.chip1) && /Отвечает партнёр/.test(duo.chip2), JSON.stringify(duo));
    await shot('p-pair-top');

    // ---------- бесплатный экран пары и пейвол ----------
    const free = await b.eval(() => ({
      offer: Boolean(document.querySelector('.offer-cta [data-offer]')), price: (document.querySelector('.offer-cta [data-offer]') || {}).textContent || '',
      counts: document.querySelectorAll('.teaser-counts li').length, report: Boolean(document.querySelector('[data-report]')),
      chips: document.querySelectorAll('.pv-locked .pv-chip').length, free: document.querySelectorAll('.pv-locked .pv-chip.free').length,
      leak: Array.from(document.querySelectorAll('.pv-locked .pv-chip.locked')).filter(c => /[А-Яа-яЁё]{3,}/.test(c.textContent + c.getAttribute('aria-label').replace('Закрытая сфера — откроется в разборе', '') + c.dataset.sphere)).length,
      title: document.querySelector('.pair-hero h1').textContent, events: Socio.track.log.map(e => e.event)
    }));
    check('тизер: карта из 8 сфер, одна открыта бесплатно, имена остальных не попадают в разметку', free.chips === 8 && free.free === 1 && free.leak === 0, JSON.stringify(free));
    check('экран пары бесплатно: вид отношений, тизер на 5 групп и кнопка с ценой; разбор закрыт', free.offer && /\d[\s\u00a0]₽/.test(free.price) && free.counts === 5 && !free.report && free.title.length > 5 &&
      free.events.includes('pair_view') && free.events.includes('offer_view') && free.events.includes('partner_test_done'), JSON.stringify(free));
    await shot('p-pair-offer', '#razbor', 40);

    const fd = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // закрытая сфера на карте тоже открывает предложение
      document.querySelector('.pv-chip.locked').click();
      await sleep(800);
      const sheet = document.querySelector('dialog.sheet.offer');
      const beta = sheet ? /бесплатно/.test(sheet.textContent) && /ничего не спишется/.test(sheet.textContent) : false;
      const ctaVisible = sheet ? (() => { const r = sheet.querySelector('[data-offer-yes]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })() : false;
      if (sheet) sheet.querySelector('[data-offer-yes]').click();
      // шторка уезжает, карта подъезжает под шапку, фишки переворачиваются — ждём отметку «распакован»
      for (let i = 0; i < 60 && !document.querySelector('[data-report][data-unveiled]'); i++) await sleep(150);
      await sleep(300);
      const focusOk = Boolean(document.activeElement && document.activeElement.matches('[data-report-title]'));
      const visibleNow = (() => { const rp = document.querySelector('[data-report] .rp'); return rp ? getComputedStyle(rp).opacity === '1' : false; })();
      const ev = Socio.track.log.filter(e => /^(offer_click|report_unlocked)$/.test(e.event)).map(e => e.event + ':' + (e.props.price || ''));
      const fig = document.querySelector('[data-report] [data-pv]');
      const chip = fig && fig.querySelector('.pv-chip');
      if (chip) chip.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      const readout = fig ? fig.querySelector('.pv-readout').textContent : '';
      const hoverOk = chip ? readout.startsWith(chip.dataset.sphere) && fig.classList.contains('focus') : false;
      if (fig) fig.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
      const fromMap = Socio.track.log.some(e => e.event === 'offer_click' && e.props.from === 'map');
      return { beta, ctaVisible, focusOk, visibleNow, unveil: Boolean(document.querySelector('[data-report][data-unveiled]')), hoverOk, fromMap, ready: Boolean(document.querySelector('[data-report].ready')), labs: document.querySelectorAll('.pv-open .pv-chip').length, zones: document.querySelectorAll('.zone').length,
        deals: document.querySelectorAll('.deals li').length, qs: document.querySelectorAll('.questions li').length, scripts: document.querySelectorAll('.scripts li').length, ev };
    });
    check('fake door: закрытая сфера на карте → честная шторка беты → разбор: карта на 8 сфер, 8 зон, 5 договорённостей, 6 вопросов, 3 фразы', fd.beta && fd.fromMap && fd.ready && fd.labs === 8 && fd.zones === 8 && fd.deals === 5 && fd.qs === 6 && fd.scripts === 3, JSON.stringify(fd));
    check('после открытия карта «распаковывается» без пустого кадра, фокус — на заголовке разбора, при наведении на сферу — подсказка под картой', fd.unveil && fd.focusOk && fd.visibleNow && fd.hoverOk, JSON.stringify(fd));
    check('в шторке предложения кнопка «Открыть разбор» видна без прокрутки', fd.ctaVisible, JSON.stringify(fd));
    check('события пейвола записаны с ценой: offer_click и report_unlocked', fd.ev.some(x => /^offer_click:\d+/.test(x)) && fd.ev.some(x => /^report_unlocked:\d+/.test(x)), JSON.stringify(fd.ev));
    await shot('p-report-map', '.pv-open', 90);
    await shot('p-report-zones', '.zone-groups', 70);
    await shot('p-report-recs', '.deals', 140);

    const rp = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('.zone-more-btn').click();
      await sleep(900);
      const d = document.querySelector('dialog.sheet');
      const sheet = d ? { title: d.querySelector('.fn-title').textContent, secs: d.querySelectorAll('.fn-sec').length } : null;
      if (d) d.querySelector('.sheet-close').click();
      await sleep(600);
      document.querySelector('[data-persp="1"]').click();
      for (let i = 0; i < 30 && !document.querySelector('[data-report].ready'); i++) await sleep(150);
      await sleep(300);
      const pressed = (document.querySelector('[data-persp="1"]') || { getAttribute: () => '' }).getAttribute('aria-pressed');
      const note = Boolean(document.querySelector('.persp-note'));
      const c = document.createElement('canvas');
      Socio.share.renderMap(c, Socio.core.modelA.type('iee'), Socio.core.modelA.type('sei'));
      const png = await new Promise(r => c.toBlob(x => r(x ? x.size : 0), 'image/png'));
      document.querySelector('[data-persp="0"]').click();
      await sleep(900);
      return { sheet, pressed, note, png, w: c.width, h: c.height };
    });
    check('шторка сферы: «вместе», у тебя и у партнёра', rp.sheet && rp.sheet.secs >= 3, JSON.stringify(rp));
    check('переключатель «глазами партнёра» меняет сторону разбора', rp.pressed === 'true' && rp.note, JSON.stringify(rp));
    check('картинка карты для сторис 1080×1920 рисуется', rp.w === 1080 && rp.h === 1920 && rp.png > 80000, JSON.stringify(rp));

    // ---------- имя партнёра: только на устройстве ----------
    const nm = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.scrollTo(0, 0);
      document.querySelector('[data-name]').click();
      await sleep(900);
      const f = document.querySelector('[data-name-form]');
      f.n.value = 'Саша';
      f.requestSubmit();
      await sleep(1500);
      const shown = /Саша/.test(document.querySelector('.pair-hero').textContent);
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => /Саша|%D0%A1%D0%B0/i.test(h));
      const shareTexts = Array.from(document.querySelectorAll('[data-share-pair] a[href]')).map(a => decodeURIComponent(a.getAttribute('href'))).filter(h => /Саша/.test(h));
      const href = location.href;
      const forget = document.querySelector('[data-forget]');
      if (forget) forget.click();
      await sleep(700);
      // «Забыть партнёра» необратимо — сначала подтверждение
      const confirmSheet = document.querySelector('dialog.sheet [data-yes]');
      if (confirmSheet) confirmSheet.click();
      await sleep(900);
      return { shown, href, links, shareTexts, forget: Boolean(forget), partnerAfter: localStorage.getItem('socio.partner') };
    });
    check('имя партнёра — в заголовке, но не в адресе, ссылках и шере; «Забыть партнёра» стирает его', nm.shown && !/Саша|%D0%A1%D0%B0/i.test(nm.href) && !nm.links.length && !nm.shareTexts.length && nm.forget && nm.partnerAfter === null, JSON.stringify(nm));

    // ---------- приглашение по ссылке ----------
    await b.eval(`localStorage.clear(); sessionStorage.clear(); location.hash = '#/i/1-80-85-20-15'`);
    await b.reload();
    await b.sleep(1000);
    await shot('p-invite');
    const inv = await b.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const answer = ${answerFn};
      const code = document.querySelector('.two-them').textContent;
      document.querySelector('[data-invite-go]').click();
      await sleep(1000);
      const e = await answer([4, 3, 1, 0, 2]);
      const you = Boolean(document.querySelector('.sh-you'));
      const go = document.querySelector('[data-pair-go]');
      const href = go ? go.getAttribute('href') : '';
      if (go) go.click();
      await sleep(1300);
      return { e, code, you, href, after: document.body.dataset.view, partner: JSON.parse(localStorage.getItem('socio.partner') || 'null'), ev: Socio.track.log.map(x => x.event) };
    })()`);
    check('приглашение: тип того, кто позвал → тест → свой тип и кнопка к паре → экран пары', !inv.e && inv.code === 'ENFP' && inv.you && /^#\/pair\/1-[\d-]+\/1-80-85-20-15$/.test(inv.href) &&
      inv.after === 'pair' && inv.partner && inv.partner.code === '1-80-85-20-15', JSON.stringify(inv));
    check('события приглашения: invite_opened и partner_test_done', inv.ev.includes('invite_opened') && inv.ev.includes('partner_test_done'), JSON.stringify(inv.ev));

    // ---------- «мы знаем свои коды» ----------
    await go('#/pair', 1000);
    await shot('p-hub');
    const codes = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const f = document.querySelector('[data-codes]');
      f.querySelector('[data-ca]').value = 'enfp';
      f.querySelector('[data-cb]').value = 'isfp';
      f.requestSubmit();
      await sleep(1000);
      return { hash: location.hash, view: document.body.dataset.view, h1: document.querySelector('h1').textContent };
    });
    check('«Мы знаем свои коды» → экран пары ENFP и ISFP: «Почти дополнение»', codes.hash === '#/pair/enfp/isfp' && codes.view === 'pair' && codes.h1 === 'Почти дополнение', JSON.stringify(codes));

    // ---------- ?unlock=1 и печать ----------
    await b.goto(BASE + '?unlock=1#/pair/enfp/isfp');
    await b.sleep(1800);
    const ul = await b.eval(`({ ready: Boolean(document.querySelector('[data-report].ready')), offer: Boolean(document.querySelector('[data-offer]')) })`);
    check('?unlock=1 открывает разбор без пейвола', ul.ready && !ul.offer, JSON.stringify(ul));
    await b.send('Emulation.setEmulatedMedia', { media: 'print' });
    const pr = await b.eval(`({ nav: getComputedStyle(document.querySelector('.nav')).display, share: getComputedStyle(document.querySelector('[data-share-pair]').closest('section')).display, report: getComputedStyle(document.querySelector('[data-report]')).display })`);
    await b.send('Emulation.setEmulatedMedia', { media: '' });
    check('печать: разбор остаётся, меню и шер скрыты', pr.nav === 'none' && pr.share === 'none' && pr.report !== 'none', JSON.stringify(pr));

    await go('#/relations', 1000);

    // ---------- тема ----------
    const theme = await b.eval(async () => {
      const before = document.documentElement.dataset.theme;
      document.querySelector('[data-theme-toggle]').click();
      await new Promise(r => setTimeout(r, 1200));
      return { before, after: document.documentElement.dataset.theme, view: document.body.dataset.view, saved: localStorage.getItem('socio.theme'), err: document.documentElement.dataset.error || '' };
    });
    check('переключатель темы меняет тему, экран перерисован', theme.before !== theme.after && theme.view === 'relations' && !theme.err, JSON.stringify(theme));
    await go('#/result', 1200);
    await shot('d-dark-result-top');
    await go('#/', 1400);
    await shot('d-dark-home');
    await b.eval(`localStorage.setItem('socio.theme', '"light"')`);

    // ---------- страницы для глаз ----------
    await go('#/types/esi', 1200);
    await shot('d-type-top');
    await shot('d-type-modelA', '.ma', 120);
    await shot('d-type-relations', '.rel-groups', 120);

    // ---------- шторка функции модели А ----------
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
        icons: Array.from(box.querySelectorAll('.celeb-ava')).filter(a => a.querySelector('svg.celeb-ic')).length,
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
    await go('#/quadras', 1200);
    await shot('d-quadras', '#gamma', 50);
    await go('#/about', 1200);
    await shot('d-about-aspects', '.aspect-grid', 140);

    // ---------- щадящий режим ----------
    await b.media({ 'prefers-reduced-motion': 'reduce' });
    await b.goto(BASE + '#/');
    await b.sleep(400);
    const calm = await b.eval(`(() => { const els = Array.from(document.querySelectorAll('.reveal')); return els.filter(e => getComputedStyle(e).opacity !== '1').length; })()`);
    check('prefers-reduced-motion: всё видно сразу, без появления', calm === 0, `скрытых: ${calm}`);
    await b.media({ 'prefers-reduced-motion': 'no-preference' });

    // ---------- телефон ----------
    await b.viewport(390, 844, { mobile: true, scale: 2 });
    let overflow = [];
    await b.goto(BASE + '#/');
    await b.sleep(600);
    for (const r of ROUTES.concat(['?unlock=1#/pair/enfp/isfp', '?unlock=1#/pair/esfj/intj'])) {
      if (r.startsWith('?')) await b.goto(BASE + r); else await go(r, 0);
      await b.sleep(r.includes('unlock') ? 1600 : 700);
      const at = await b.eval(`location.hash`);
      if (at !== r.slice(r.indexOf('#'))) overflow.push(`${r}: не открылся (${at})`);
      const o = await b.eval(`document.documentElement.scrollWidth - innerWidth`);
      if (o > 0) overflow.push(`${r}: +${o}px`);
    }
    check('телефон 390 px: нигде нет горизонтального скролла', overflow.length === 0, overflow.join(', '));
    await b.goto(BASE + '#/');
    await b.sleep(1400);
    await shot('m-home');
    await go('#/test', 1200);
    await shot('m-test');
    await go('#/result', 1400);
    await shot('m-result-top');
    await shot('m-result-axes', '.axes', 90);
    await b.goto(BASE + '?unlock=1#/pair/enfp/isfp');
    await b.sleep(1800);
    await shot('m-report-map', '.pv-open', 70);
    await shot('m-report-zones', '.zone-groups', 60);
    await b.goto(BASE + '#/pair/enfp/isfp');
    await b.sleep(1500);
    await shot('m-pair-top');
    await shot('m-pair-offer', '#razbor', 30);
    await go('#/', 1400);
    await shot('m-home-scenes', '.scene-list', 120);

    // ---------- однофайловая сборка: разбор открывается без подгрузки ----------
    execSync(`node "${path.join(__dirname, 'bundle.js')}" index.html && rm -rf /tmp/socionik-dist && mkdir -p /tmp/socionik-dist && cp "${path.join(__dirname, '..', 'dist', 'index.html')}" /tmp/socionik-dist/index.html`);
    await b.viewport(1280, 900);
    await b.goto('file:///tmp/socionik-dist/index.html?unlock=1#/pair/enfp/isfp');
    await b.sleep(1800);
    const bundled = await b.eval(`({ ready: Boolean(document.querySelector('[data-report].ready')), zones: document.querySelectorAll('.zone').length, lazy: Array.from(document.scripts).filter(x => x.src).length })`);
    check('однофайловая сборка: разбор открывается, внешних скриптов нет', bundled.ready && bundled.zones === 8 && bundled.lazy === 0, JSON.stringify(bundled));

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
