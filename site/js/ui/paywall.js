/* Socio-Nik · пейвол разбора пары. Режим — в config.js (PAYWALL.mode):
   off — всё открыто; fakedoor — кнопка с ценой и честная бета: разбор открываем бесплатно и пишем событие с ценой;
   live — адаптер оплаты: интерфейс есть, интеграции нет (нужны НПД, чеки, оферта и хостинг в России).
   ?unlock=1 — открыть для проверок и скриншотов. Контакты не собираем, тёмных паттернов нет: ни таймеров, ни скрытых подписок. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;

  const conf = () => Object.assign({ mode: 'fakedoor', price: 490, prices: [490], surveyShare: 0.1 }, S.config && S.config.PAYWALL);
  const query = () => new URLSearchParams(root.location ? root.location.search : '');
  const rub = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

  const paywall = {
    mode: () => (query().get('unlock') === '1' ? 'off' : conf().mode),
    // В режиме проверки спроса цена — из списка. Для пары она одна и та же у обоих партнёров (выбирается по ключу пары),
    // без пары — одна на устройство, чтобы не прыгала от визита к визиту
    price(key) {
      const c = conf();
      if (paywall.mode() !== 'fakedoor') return c.price;
      if (key) {
        let h = 0;
        for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return c.prices[h % c.prices.length];
      }
      let p = S.store.get('price', null);
      if (!c.prices.includes(p)) {
        p = c.prices[Math.floor(Math.random() * c.prices.length)];
        S.store.set('price', p);
      }
      return p;
    },
    unlocked: () => paywall.mode() === 'off' || Boolean(S.store.get('unlocked', null)),
    unlock(mode) { S.store.set('unlocked', { at: Date.now(), mode }); },
    // Опрос о цене: доля устройств из конфига, решение — один раз на устройство
    inSurvey() {
      let v = S.store.get('survey', null);
      if (typeof v !== 'boolean') { v = Math.random() < conf().surveyShare; S.store.set('survey', v); }
      return v && !S.store.get('surveyDone', false);
    },
    // live: сюда подключается оплата — вернуть Promise, который выполнится после успешного платежа
    live: { checkout: () => Promise.reject(new Error('Оплата пока не подключена')) },
    rub
  };
  S.paywall = paywall;

  const INSIDE = [
    'Карта восьми сфер, от денег до близости: где вы дополняете друг друга, где говорите на одном языке, а где нужна бережность',
    'Пять договорённостей на эту неделю под вашу пару',
    'Как мириться: три фразы «вместо этого скажи так»',
    'Ритуал на неделю и вопросы для вечера вдвоём',
    'Картинка карты для сторис и версия для печати'
  ];
  ui.offerInside = () => `<ul class="offer-list">${INSIDE.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

  function sheetHTML({ gift, price }) {
    const mode = paywall.mode();
    if (gift) {
      return `<div class="offer-sheet">
        <h2 class="title-sm">Подарок паре друзей скоро появится.</h2>
        <p class="body">Мы готовим подарочный разбор с открыткой: дарите ссылку, а пара проходит тест и открывает свою карту. Спасибо, что нажали, — так мы понимаем, что подарок нужен.</p>
        <p class="offer-beta">А свой разбор можно открыть уже сейчас: пока он в бета-версии, это бесплатно.</p>
        <div class="offer-actions"><button class="btn btn-lg" type="button" data-offer-yes>Открыть наш разбор</button><button class="ghost-btn" type="button" data-close>Закрыть</button></div>
      </div>`;
    }
    const beta = mode === 'live'
      ? '<p class="offer-beta">Оплата скоро появится. Мы не берём денег, пока не подключим чеки и всё, что положено по закону.</p>'
      : '<p class="offer-beta">Сейчас разбор в бета-версии и открывается бесплатно: мы проверяем, нужен ли он. Оплаты на сайте нет — ничего не спишется.</p>';
    return `<div class="offer-sheet">
      <h2 class="title-sm">Все 8 сфер вашей пары и что с этим делать.</h2>
      ${ui.offerInside()}
      <div class="offer-foot">
        <div class="offer-price"><b>${rub(price)}</b><span>${mode === 'live' ? 'разовая оплата, без подписки' : 'цена после беты, разово и без подписки'}</span></div>
        ${beta}
        <div class="offer-actions">
          <button class="btn btn-lg" type="button" data-offer-yes${mode === 'live' ? ' disabled' : ''}>${mode === 'live' ? 'Оплатить' : 'Открыть разбор бесплатно'}</button>
          <button class="ghost-btn" type="button" data-close>Не сейчас</button>
        </div>
      </div>
    </div>`;
  }

  // Открыть шторку предложения; onUnlock — что сделать после открытия разбора
  ui.openOffer = ({ gift = false, from, onUnlock, ctx = {} } = {}) => {
    const price = paywall.price(ctx.pair);
    S.track('offer_click', Object.assign({ product: 'pair', price, gift, mode: paywall.mode() }, ctx));
    const sheet = ui.openSheet({ label: gift ? 'Подарить разбор' : 'Разбор пары', from, render: () => sheetHTML({ gift, price }) });
    sheet.dlg.classList.add('offer');
    sheet.dlg.addEventListener('click', e => {
      if (!e.target.closest('[data-offer-yes]')) return;
      // разбор открываем, когда шторка уже уехала: иначе половина открытия играет под ней
      if (paywall.mode() === 'live') {
        paywall.live.checkout(ctx).then(() => { paywall.unlock('live'); return sheet.close(); }).then(() => { if (onUnlock) onUnlock(); }).catch(() => {});
        return;
      }
      paywall.unlock(paywall.mode());
      S.track('report_unlocked', Object.assign({ mode: paywall.mode(), price, gift }, ctx));
      sheet.close().then(() => { if (onUnlock) onUnlock(); });
    });
    return sheet;
  };

  // ---------- 4 вопроса о цене (Ван Вестендорп), каждому десятому после открытия ----------
  const STEPS = [390, 490, 690, 990, 1490, 1990];
  const QS = [
    ['cheap', 'При какой цене разбор так дёшев, что вызывает сомнения?'],
    ['bargain', 'При какой цене он выгоден?'],
    ['expensive', 'При какой цене он дорогой, но ещё можно купить?'],
    ['tooexp', 'При какой цене он слишком дорогой?']
  ];
  const STEPS_LOW = [0, 99, 199, 290].concat(STEPS);

  ui.priceSurvey = () => `
    <div class="card survey" data-survey>
      <h3 class="card-title">Помоги с ценой: четыре вопроса, и мы поймём, сколько должен стоить разбор.</h3>
      ${QS.map(([k, q]) => `<fieldset class="sv-q"><legend>${esc(q)}</legend><div class="sv-opts">${STEPS_LOW.map(v => `<button type="button" class="chip" data-sv="${k}" data-v="${v}" aria-pressed="false">${v ? rub(v) : 'бесплатно'}</button>`).join('')}</div></fieldset>`).join('')}
      <p><button class="btn" type="button" data-sv-send disabled>Отправить</button></p>
    </div>`;

  ui.mountSurvey = scope => {
    const box = scope.querySelector('[data-survey]');
    if (!box) return () => {};
    const ans = {};
    const onClick = e => {
      const b = e.target.closest('[data-sv]');
      if (b) {
        ans[b.dataset.sv] = Number(b.dataset.v);
        box.querySelectorAll(`[data-sv="${b.dataset.sv}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        box.querySelector('[data-sv-send]').disabled = QS.some(([k]) => !(k in ans));
      }
      if (e.target.closest('[data-sv-send]')) {
        S.track('price_survey', Object.assign({ product: 'pair' }, ans));
        S.store.set('surveyDone', true);
        box.innerHTML = '<h3 class="card-title">Спасибо, ответ записан. Это очень помогает.</h3>';
      }
    };
    box.addEventListener('click', onClick);
    return () => box.removeEventListener('click', onClick);
  };
})(window);
