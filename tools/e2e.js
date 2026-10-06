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
        await sleep(560);
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
    check('формат «Пост» — 1080×1350', share.postH === 1350, String(share.postH));
    check('на картинке — портрет персонажа типа (data:-URI, canvas чистый)', share.portrait && share.size > 50000, JSON.stringify({ portrait: share.portrait, size: share.size }));
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
        return { tg: href('telegram'), wa: href('whatsapp'), x: href('x'), vk: href('vk'), story: Boolean(bar.querySelector('[data-social="story"]')), meta: /instagram|инстаграм/i.test(document.body.innerHTML), copy: Boolean(bar.querySelector('[data-social="copy"]')) };
      });
      const enc = encodeURIComponent(await b.eval('Socio.share.url(Socio.state.result())'));
      check('результат: Telegram, WhatsApp, X, ВКонтакте, «Картинка для сторис» и «Скопировать ссылку»; упоминаний Instagram нет',
        soc.tg.startsWith('https://t.me/share/url?url=' + enc) && soc.wa.startsWith('https://wa.me/?text=') && soc.wa.includes(enc) &&
        soc.x.startsWith('https://x.com/intent/tweet?text=') && soc.x.includes('&url=' + enc) && soc.vk.startsWith('https://vk.com/share.php?url=' + enc) && soc.story && soc.copy && !soc.meta,
        JSON.stringify(soc));
    } else {
      check('текст шера без ссылки, пока нет SITE_URL', /^Мой соционический тип — .+ Socio-Nik$/.test(share.text), share.text);
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
    check('факт: четыре сети, картинка для сторис и ссылка на тип; упоминаний Instagram нет', ['telegram', 'whatsapp', 'x', 'vk', 'story'].every(n => fsoc.nets.includes(n)) && !fsoc.meta && /%23%2Ftypes%2F[a-z]{3}|%23%2Fbox/.test(fsoc.tg), JSON.stringify(fsoc));
    check('факт: картинка для сторис собирается', fsoc.png > 60000 && (fsoc.canFiles || /сохранена/.test(fsoc.status)), JSON.stringify(fsoc));
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
      const fresh = { code: document.querySelector('.res-code').textContent, mystery: Boolean(document.querySelector('.duo-mystery')), cta: document.querySelector('.sh-hero [data-friend]').textContent };
      document.querySelector('.sh-hero [data-friend]').click();
      await sleep(1000);
      for (let i = 0; i < 20; i++) {
        const q = document.querySelector('.q-stage .q:last-child');
        if (!q) return { fail: 'нет вопроса ' + i };
        q.querySelectorAll('.dot')[[4, 3, 1, 0, 2][i % 5]].click();
        await sleep(560);
      }
      await sleep(3200);
      const you = { view: document.body.dataset.view, title: (document.querySelector('.sh-you h2') || {}).textContent || '', rel: (document.querySelector('.sh-you .sh-rel') || {}).textContent || '' };
      return { mine, withMine, fresh, you };
    });
    check('ссылка на чужой результат: своя страница с плашкой и кнопкой к вашим отношениям', shared.withMine.badge && shared.withMine.cta === `#/relations/${shared.mine}/iee` && shared.withMine.scene, JSON.stringify(shared.withMine));
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
      const hero = document.querySelector('[data-hero]');
      const cta = hero.querySelector('.hero-actions .btn');
      const img = hero.querySelector('.hero-fig img');
      const tiles = Array.from(document.querySelectorAll('.mq-copy:not([inert]) .mq-tile')).map(a => a.getAttribute('href'));
      return {
        cta: cta.getAttribute('href'), ctaText: cta.textContent.trim(), name: hero.querySelector('[data-hero-name]').textContent,
        hero: document.documentElement.dataset.hero, imgOk: img.complete && img.naturalWidth > 0 && img.getAttribute('src').includes(document.documentElement.dataset.hero),
        tiles: tiles.length, uniq: new Set(tiles).size, inert: document.querySelectorAll('.mq-copy[inert]').length,
        cards: Array.from(document.querySelectorAll('.stack-card .qc-go')).map(a => a.getAttribute('href')).join(),
        types: new Set(Array.from(document.querySelectorAll('.stack-card .qc-type')).map(a => a.getAttribute('href'))).size
      };
    });
    check('герой: «Пройти тест» ведёт в тест', home.cta === '#/test' && home.ctaText === 'Пройти тест', JSON.stringify(home));
    check('герой: имя и портрет выбранного типа, картинка загружена', home.imgOk && home.name.length > 1, JSON.stringify(home));
    check('лента: 16 типов, у каждого одна живая копия, остальные inert', home.tiles === 16 && home.uniq === 16 && home.inert === 4, JSON.stringify(home));
    check('стопка: 4 карточки ведут на квадры, 16 персонажей — на типы', home.cards === '#/quadras#alpha,#/quadras#beta,#/quadras#gamma,#/quadras#delta' && home.types === 16, JSON.stringify(home));
    const sw = await b.eval(async () => {
      const before = document.documentElement.dataset.hero;
      document.querySelector('.hero-next').click();
      await new Promise(r => setTimeout(r, 900));
      const after = document.documentElement.dataset.hero;
      return { before, after, name: document.querySelector('[data-hero-name]').textContent, alias: Socio.core.modelA.type(after).short || Socio.core.modelA.type(after).alias, src: document.querySelector('.hero-fig img').getAttribute('src') };
    });
    check('«Другой тип» меняет персонажа, имя и портрет', sw.before !== sw.after && sw.src.includes(sw.after) && sw.name === sw.alias, JSON.stringify(sw));
    const heroes = [];
    for (let k = 0; k < 4; k++) { await b.reload(); await b.sleep(700); heroes.push(await b.eval('document.documentElement.dataset.hero')); }
    check('после каждой перезагрузки на главной другой персонаж', heroes.every((h, k) => !k || h !== heroes[k - 1]), heroes.join(' → '));
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
    const mineHero = await b.eval(`({ cta: document.querySelector('.hero-actions .btn').getAttribute('href'), steps: Array.from(document.querySelectorAll('.hero-steps a')).map(a => a.getAttribute('href')), mine: Socio.state.myType(), bubble: (document.querySelector('[data-hero-bubble]') || {}).textContent || '' })`);
    check('с результатом: «Мой результат» и ряд «Про мой тип · Мои отношения · Поделиться · Пройти заново»',
      mineHero.cta === '#/result' && mineHero.steps.join() === `#/types/${mineHero.mine},#/types/${mineHero.mine}#relations,#/result#share,#/test` && mineHero.bubble.length > 5, JSON.stringify(mineHero));

    // ---------- страницы для глаз ----------
    await b.goto(BASE + '#/types/esi');
    await b.sleep(1200);
    await shot('d-type-top');
    await shot('d-type-modelA', '.ma', 120);
    await shot('d-type-relations', '.rel-groups', 120);

    // ---------- карта отношений типа ----------
    const rmap = await b.eval(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const box = document.querySelector('[data-relmap]');
      box.scrollIntoView({ block: 'center' });
      await sleep(1600);
      const nodes = box.querySelectorAll('.rm-node').length, lines = box.querySelectorAll('.rm-line').length;
      const first = box.querySelector('.rd-title').textContent;
      const conflict = Array.from(box.querySelectorAll('.rm-node')).find(n => /Конфликтные/.test(n.getAttribute('aria-label')));
      conflict.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(300);
      const after = box.querySelector('.rd-title').textContent, link = box.querySelector('.rd .link').getAttribute('href');
      box.querySelector('.rm-chip[data-tone="tense"]').click();
      await sleep(100);
      return { nodes, lines, first, after, link, filtered: box.classList.contains('filtered') && box.classList.contains('f-tense') };
    });
    check('карта отношений: 15 типов и 15 дуг, сначала — дуал', rmap.nodes === 15 && rmap.lines === 15 && rmap.first === 'Дуальные отношения', JSON.stringify(rmap));
    check('карта: нажатие на тип открывает разбор пары, фильтр по тону работает', rmap.after === 'Конфликтные отношения' && rmap.link === '#/relations/esi/ile' && rmap.filtered, JSON.stringify(rmap));

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
    for (const [w, h] of [[320, 640], [390, 844]]) {
      await b.viewport(w, h, { mobile: true, scale: 2 });
      const overflow = [];
      for (const r of ROUTES) {
        await b.goto(BASE + r);
        await b.sleep(600);
        const o = await b.eval(`document.documentElement.scrollWidth - innerWidth`);
        if (o > 0) overflow.push(`${r}: +${o}px`);
      }
      check(`телефон ${w} px: нигде нет горизонтального скролла`, overflow.length === 0, overflow.join(', '));
    }
    // 375×667: шкала теста видна без прокрутки, персонаж героя не закрывает кнопку
    await b.viewport(375, 667, { mobile: true, scale: 2 });
    await b.goto(BASE + '#/test');
    await b.sleep(900);
    const scaleBottom = await b.eval(`Math.round(document.querySelector('.q-scale').getBoundingClientRect().bottom)`);
    check('375×667: шкала теста видна без прокрутки', scaleBottom <= 667, `низ шкалы ${scaleBottom}`);
    await b.goto(BASE + '#/');
    await b.sleep(1500);
    const fold = await b.eval(`(() => { const c = document.querySelector('.hero-actions').getBoundingClientRect(), f = document.querySelector('.hero-fig img').getBoundingClientRect(); return { cta: Math.round(c.top), fig: Math.round(f.bottom), ctaBottom: Math.round(c.bottom) }; })()`);
    check('375×667: персонаж не закрывает кнопку героя, кнопка на первом экране', fold.fig <= fold.cta && fold.ctaBottom <= 667, JSON.stringify(fold));
    await b.goto(BASE + '#/');
    await b.sleep(1400);
    await shot('m-home');
    await b.goto(BASE + '#/test');
    await b.sleep(1200);
    await shot('m-test');
    await b.goto(BASE + '#/result');
    await b.sleep(1400);
    await shot('m-result-top');
    await shot('m-result-axes', '.axes', 90);

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
