/* Socio-Nik · пара: как функции двоих ложатся друг на друга — движок карты и сборка разбора.
   Позиции модели А делятся на четыре класса: сильная ценная (1, 2), сильная не ценная (7, 8),
   слабая ценная (5, 6), слабая не ценная (3, 4). Пара классов по одному аспекту даёт вид взаимодействия.
   Набор видов зависит только от вида отношений — это проверяет юнит-тест для всех 256 пар. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const core = S.core = S.core || {};
  const M = () => core.modelA;

  const CLASS = { 1: 'sv', 2: 'sv', 7: 'su', 8: 'su', 5: 'wv', 6: 'wv', 3: 'wu', 4: 'wu' };

  // «класс активной стороны|класс второй» → вид. Активная — та, от кого идёт действие:
  // кто даёт, прикрывает, настаивает, ценит, или кому не хватает (у «можно попросить» и «запроса без ответа»).
  const KIND_OF = {
    'sv|wv': 'complement',   // дополнение: один легко даёт то, чего другому не хватает
    'su|wu': 'cover',        // тихая страховка: один незаметно прикрывает трудное место другого
    'sv|sv': 'shared',       // общая сила
    'su|su': 'background',   // фон: оба умеют, никто не придаёт значения
    'wv|su': 'ask',          // можно попросить: одному не хватает, другой умеет, но не ценит
    'sv|su': 'values',       // разные ценности при общей силе
    'sv|wu': 'press',        // давление: одному важно, другому трудно и больно
    'wv|wv': 'need',         // общая потребность: хотят оба, дать некому
    'wu|wu': 'blind',        // слепая зона
    'wv|wu': 'unanswered'    // запрос без ответа
  };
  const KINDS = ['complement', 'cover', 'shared', 'background', 'ask', 'values', 'press', 'need', 'blind', 'unanswered'];
  const SYMMETRIC = new Set(['shared', 'background', 'need', 'blind']);

  // Группы для людей: не больше пяти, и ни одна пара не видит карту из одних тревожных зон
  const GROUPS = [
    { id: 'fit', kinds: ['complement', 'cover'] },
    { id: 'common', kinds: ['shared', 'background'] },
    { id: 'ask', kinds: ['ask', 'values'] },
    { id: 'care', kinds: ['press'] },
    { id: 'gap', kinds: ['need', 'blind', 'unanswered'] }
  ];
  const GROUP_OF = {};
  GROUPS.forEach(g => g.kinds.forEach(k => { GROUP_OF[k] = g.id; }));

  // Порядок сфер на карте — один для всех пар, чтобы карты можно было сравнивать
  const ORDER = ['Fi', 'Fe', 'Ne', 'Ni', 'Ti', 'Te', 'Se', 'Si'];

  // Мерность функции (В. Букалов): длина лепестка на карте
  const DIM = { 1: 4, 8: 4, 2: 3, 7: 3, 3: 2, 6: 2, 4: 1, 5: 1 };
  const valued = pos => pos === 1 || pos === 2 || pos === 5 || pos === 6;

  // Вид взаимодействия по позициям у тебя (a) и у партнёра (b); side — с твоей стороны:
  // me — активная сторона ты, partner — партнёр, both — симметричный вид
  function zone(posA, posB) {
    const ca = CLASS[posA], cb = CLASS[posB];
    const direct = KIND_OF[ca + '|' + cb];
    if (direct) return { kind: direct, side: SYMMETRIC.has(direct) ? 'both' : 'me' };
    return { kind: KIND_OF[cb + '|' + ca], side: 'partner' };
  }

  // Карта пары: восемь сфер в постоянном порядке
  function map(a, b) {
    const ma = M().modelA(a.ego), mb = M().modelA(b.ego);
    return ORDER.map(aspect => {
      const posA = ma.indexOf(aspect) + 1, posB = mb.indexOf(aspect) + 1;
      const z = zone(posA, posB);
      return { aspect, posA, posB, kind: z.kind, side: z.side, group: GROUP_OF[z.kind], dimA: DIM[posA], dimB: DIM[posB], valuedA: valued(posA), valuedB: valued(posB) };
    });
  }

  // Счётчики зон для тизера: { fit: 4, common: 0, ask: 2, care: 0, gap: 2 }
  function summary(a, b) {
    const out = {};
    GROUPS.forEach(g => { out[g.id] = 0; });
    map(a, b).forEach(z => { out[z.group]++; });
    return out;
  }

  // ---------- сборка разбора из текстов (content/pair-*.js) ----------
  // Чем раньше вид в списке, тем раньше его договорённость попадает в «пять договорённостей»
  const DEAL_PRIORITY = ['press', 'unanswered', 'values', 'ask', 'need', 'blind', 'complement', 'cover', 'shared', 'background'];
  // Чувствительность сферы для пары: уязвимое место (4) и «очень нужно» (5) — сильнее всего, затем 3 и 6
  const SENS = { 4: 2, 5: 2, 3: 1, 6: 1 };
  // затем — сферы, где затронута главная сила кого-то из вас (1), потом творческая (2)
  const CORE = { 1: 2, 2: 1 };
  const sens = z => Math.max(SENS[z.posA] || 0, SENS[z.posB] || 0) * 10 + Math.max(CORE[z.posA] || 0, CORE[z.posB] || 0);

  // Начало текста модели А — как сфера выглядит у твоего типа: целые предложения, пока влезает ~230 знаков
  const firstSentence = (text, max = 230) => {
    const parts = String(text || '').match(/[^.!?…]+[.!?…]+(?:[»"]?)(?=\s+[«А-ЯЁA-Z]|\s*$)/g) || [String(text || '')];
    let out = parts[0].trim();
    for (let i = 1; i < parts.length && (out + ' ' + parts[i].trim()).length <= max; i++) out += ' ' + parts[i].trim();
    return out;
  };

  // P — тексты пары (content/pair*.js); MA — тексты модели А по типам (content/modelA-*.js), по желанию
  function report(a, b, P, MA) {
    const r = M().relation(a, b), zones = map(a, b);
    const pick = z => {
      const kz = P.zones && P.zones[z.aspect] && P.zones[z.aspect][z.kind];
      return (kz && kz[z.side]) || null;
    };
    const ownOf = z => {
      const t = MA && MA[a.id] && MA[a.id][z.posA];
      return t ? firstSentence(t.text) : '';
    };
    // как эта сфера выглядит у партнёра такого типа — со стороны (content/pair-partner-*.js)
    const theirsOf = z => (P.partnerView && P.partnerView[b.id] && P.partnerView[b.id][z.posB]) || '';
    const items = zones.map(z => Object.assign({}, z, { copy: pick(z), own: ownOf(z), theirs: theirsOf(z) }));
    // Среди равных по виду первыми идут сферы, где кому-то из вас больнее всего (4) или нужнее всего (5)
    const deals = items
      .filter(z => z.copy && z.copy.deal)
      .sort((x, y) => DEAL_PRIORITY.indexOf(x.kind) - DEAL_PRIORITY.indexOf(y.kind) || sens(y) - sens(x) || ORDER.indexOf(x.aspect) - ORDER.indexOf(y.aspect))
      .slice(0, 5)
      .map(z => ({ aspect: z.aspect, kind: z.kind, group: z.group, text: z.copy.deal }));
    // Кто за что: кто ведёт сферу (даёт или прикрывает), кто возьмёт её по просьбе, кому она важнее,
    // и что делить договорённостью. Хотя бы один список есть у любой пары
    const lead = { me: [], partner: [] }, can = { me: [], partner: [] }, cares = { me: [], partner: [] }, split = [];
    items.forEach(z => {
      if (z.kind === 'complement' || z.kind === 'cover') lead[z.side].push(z.aspect);
      else if (z.kind === 'ask') can[z.side === 'me' ? 'partner' : 'me'].push(z.aspect);   // не хватает тебе — может партнёр
      else if (z.kind === 'values') cares[z.side].push(z.aspect);
      else if (z.kind !== 'press' && z.kind !== 'unanswered') split.push(z.aspect);
    });
    // Вопросы на вечер: сначала про сферы, где бережно и не хватает, потом остальные.
    // У каждой сферы два вопроса: hard — для трудных зон, easy — для лёгких
    const qOrder = ['care', 'gap', 'ask', 'fit', 'common'];
    const questions = items.slice()
      .sort((x, y) => qOrder.indexOf(x.group) - qOrder.indexOf(y.group) || sens(y) - sens(x) || ORDER.indexOf(x.aspect) - ORDER.indexOf(y.aspect))
      .map(z => {
        const q = P.questions && P.questions[z.aspect];
        return q ? { aspect: z.aspect, text: ['care', 'gap', 'ask'].includes(z.group) ? q.hard : q.easy } : null;
      })
      .filter(q => q && q.text)
      .slice(0, 6);
    return {
      relation: r,
      zones: items,
      summary: summary(a, b),
      deals,
      lead,
      can,
      cares,
      split,
      questions,
      rel: (P.relations && P.relations[r.id]) || null
    };
  }

  core.pair = { CLASS, KINDS, SYMMETRIC, GROUPS, GROUP_OF, ORDER, DIM, valued, zone, map, summary, report, firstSentence };
})(typeof window !== 'undefined' ? window : globalThis);
