/* Socio-Nik · юнит-тесты ядра. Гоняются в браузере (tests.html) и в Node (tools/run-tests.js). */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const cases = [];
  const test = (name, fn) => cases.push({ name, fn });

  function fail(msg) { throw new Error(msg); }
  function ok(cond, msg) { if (!cond) fail(msg || 'условие не выполнено'); }
  function eq(actual, expected, msg) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) fail((msg ? msg + ': ' : '') + 'ожидали ' + e + ', получили ' + a);
  }

  const M = () => S.core.modelA;
  const SC = () => S.core.scoring;
  const P = () => S.core.payload;
  const T = id => M().type(id);

  // Эталоны из спеки: таблицы 7.1 и 7.3
  const DUALS = { ile: 'sei', ese: 'lii', eie: 'lsi', sle: 'iei', see: 'ili', lie: 'esi', lse: 'eii', iee: 'sli' };
  const ILE_ROW = {
    dual: 'СЭИ', activation: 'ЭСЭ', mirror: 'ЛИИ', semidual: 'СЛИ', mirage: 'ИЭИ',
    identity: 'ИЛЭ', kindred: 'ИЭЭ', business: 'СЛЭ', quasi: 'ИЛИ', benefactor: 'ЛСЭ', beneficiary: 'ЭИЭ',
    extinguish: 'ЛИЭ', superego: 'СЭЭ', supervisor: 'ЭИИ', supervisee: 'ЛСИ', conflict: 'ЭСИ'
  };

  // ---------- модель А и типы ----------

  test('модель А ИЛЭ: ЧИ · БЛ · ЧС · БЭ · БС · ЧЭ · БИ · ЧЛ', () => {
    eq(M().modelA(T('ile').ego), ['Ne', 'Ti', 'Se', 'Fi', 'Si', 'Fe', 'Ni', 'Te']);
  });

  test('у каждого типа валидное Эго и все 8 аспектов в модели А', () => {
    S.data.types.forEach(t => {
      ok(M().isValidEgo(t.ego), t.code + ': Эго');
      eq(new Set(M().modelA(t.ego)).size, 8, t.code + ': аспектов в модели А');
    });
  });

  test('16 типов: уникальные id, коды, Эго и сочетания полюсов', () => {
    const ts = S.data.types;
    eq(ts.length, 16, 'типов');
    ['id', 'code', 'alias', 'role'].forEach(k => eq(new Set(ts.map(t => t[k])).size, 16, 'уникальных ' + k));
    eq(new Set(ts.map(t => t.ego.join('-'))).size, 16, 'уникальных Эго');
    eq(new Set(ts.map(t => Object.values(M().dichotomies(t.ego)).join(''))).size, 16, 'уникальных сочетаний полюсов');
  });

  test('код и название типа согласованы с Эго', () => {
    const LETTER = { I: 'И', S: 'С', L: 'Л', E: 'Э' };
    const WORD = { I: 'Интуитивно', S: 'Сенсорно', L: 'Логико', E: 'Этико' };
    S.data.types.forEach(t => {
      const [b, c] = t.ego.map(id => S.data.aspects[id].element);
      const extra = M().dichotomies(t.ego).EI === 'E';
      eq(t.code, LETTER[b] + LETTER[c] + (extra ? 'Э' : 'И'), t.id + ': код');
      ok(t.name.startsWith(WORD[b] + '-'), t.code + ': название начинается с базовой функции');
      ok(t.name.endsWith(extra ? 'экстраверт' : 'интроверт'), t.code + ': вертность в названии');
    });
  });

  test('typeByPoles находит тип по 4 полюсам', () => {
    eq(M().typeByPoles({ EI: 'E', NS: 'N', TF: 'T', RP: 'P' }).code, 'ИЛЭ');
    eq(M().typeByPoles({ EI: 'E', NS: 'N', TF: 'T', RP: 'R' }).code, 'ЛИЭ');
    eq(M().typeByPoles({ EI: 'I', NS: 'S', TF: 'F', RP: 'P' }).code, 'СЭИ');
    S.data.types.forEach(t => eq(M().typeByPoles(M().dichotomies(t.ego)).id, t.id, t.code));
  });

  test('квадра типа — та, в ценностях которой оба аспекта Эго; по 4 типа в квадре', () => {
    S.data.types.forEach(t => eq(M().quadraOf(t).id, t.quadra, t.code));
    S.data.quadras.forEach(q => eq(S.data.types.filter(t => t.quadra === q.id).length, 4, q.name));
  });

  // ---------- отношения ----------

  test('дуалы совпадают с таблицей 7.1', () => {
    Object.keys(DUALS).forEach(a => {
      eq(M().partner(T(a), 'dual').id, DUALS[a], T(a).code);
      eq(M().partner(T(DUALS[a]), 'dual').id, a, T(DUALS[a]).code);
    });
  });

  test('строка ИЛЭ совпадает с таблицей 7.3', () => {
    Object.keys(ILE_ROW).forEach(rel => eq(M().partner(T('ile'), rel).code, ILE_ROW[rel], rel));
  });

  test('у каждого типа 16 партнёров — перестановка всех 16 типов', () => {
    S.data.types.forEach(a => {
      const partners = S.data.relations.map(r => M().partner(a, r.id));
      ok(partners.every(Boolean), a.code + ': у позиции нет партнёра');
      eq(new Set(partners.map(t => t.id)).size, 16, a.code);
    });
  });

  test('relation(a, b) и partner(a, отношение) согласованы для всех 256 пар', () => {
    S.data.types.forEach(a => S.data.types.forEach(b => {
      const r = M().relation(a, b);
      ok(r, a.code + ' → ' + b.code + ': нет отношения');
      eq(M().partner(a, r.id).id, b.id, a.code + ' → ' + b.code);
    }));
  });

  test('симметричные отношения симметричны, у заказа и ревизии стороны меняются', () => {
    S.data.types.forEach(a => S.data.types.forEach(b => {
      const ab = M().relation(a, b), ba = M().relation(b, a);
      eq(ba.id, ab.inverse || ab.id, a.code + ' ↔ ' + b.code);
    }));
  });

  test('кольца ревизии и заказа от ИЛЭ совпадают с эталоном', () => {
    const ring = rel => {
      const out = ['ile'];
      let t = T('ile');
      for (let i = 0; i < 4; i++) { t = M().partner(t, rel); out.push(t.id); }
      return out.map(id => T(id).code);
    };
    eq(ring('supervisee'), ['ИЛЭ', 'ЛСИ', 'СЭЭ', 'ЭИИ', 'ИЛЭ'], 'ревизия');
    eq(ring('beneficiary'), ['ИЛЭ', 'ЭИЭ', 'СЭЭ', 'ЛСЭ', 'ИЛЭ'], 'заказ');
  });

  test('все кольца: 4 типа из 4 разных квадр; ревизия чередует вертность, заказ — нет', () => {
    ['supervisee', 'beneficiary'].forEach(rel => S.data.types.forEach(a => {
      const seen = [];
      let t = a;
      for (let i = 0; i < 4; i++) { seen.push(t); t = M().partner(t, rel); }
      eq(t.id, a.id, a.code + ': кольцо «' + rel + '» не замкнулось за 4 шага');
      eq(new Set(seen.map(x => x.quadra)).size, 4, a.code + ': квадр в кольце «' + rel + '»');
      const verts = seen.map(x => M().dichotomies(x.ego).EI);
      if (rel === 'supervisee') ok(verts.every((v, i) => i === 0 || v !== verts[i - 1]), a.code + ': ревизия должна чередовать вертность');
      else eq(new Set(verts).size, 1, a.code + ': в кольце заказа одна вертность');
    }));
  });

  test('внутри квадры — только тождество, дуальность, активация и зеркало', () => {
    const allowed = new Set(['identity', 'dual', 'activation', 'mirror']);
    S.data.types.forEach(a => S.data.types
      .filter(b => b.quadra === a.quadra)
      .forEach(b => ok(allowed.has(M().relation(a, b).id), a.code + ' → ' + b.code)));
  });

  test('противоположные квадры: конфликт, суперэго, квазитождество, погашение', () => {
    const OPPOSITE = { alpha: 'gamma', gamma: 'alpha', beta: 'delta', delta: 'beta' };
    const allowed = new Set(['conflict', 'superego', 'quasi', 'extinguish']);
    S.data.types.forEach(a => S.data.types
      .filter(b => b.quadra === OPPOSITE[a.quadra])
      .forEach(b => ok(allowed.has(M().relation(a, b).id), a.code + ' → ' + b.code)));
  });

  // ---------- подсчёт ----------

  // Ответы, которые тянут к полюсам типа t с силой strength (1 или 2)
  function answersFor(t, strength) {
    const d = M().dichotomies(t.ego), out = {};
    S.data.questions.forEach(q => { out[q.id] = q.aPole === d[q.axis] ? -strength : strength; });
    return out;
  }

  test('крайние ответы → нужный тип на первом месте и ≥ 85 %', () => {
    S.data.types.forEach(t => {
      const r = SC().score(answersFor(t, 2), S.data.questions);
      eq(r.top.id, t.id, t.code);
      ok(r.top.pct >= 85, t.code + ': ' + r.top.pct + ' %');
    });
  });

  test('ответы «скорее» → нужный тип на первом месте', () => {
    S.data.types.forEach(t => eq(SC().score(answersFor(t, 1), S.data.questions).top.id, t.id, t.code));
  });

  test('все «поровну» → равномерно, по 6–7 %', () => {
    const zeros = {};
    S.data.questions.forEach(q => { zeros[q.id] = 0; });
    const r = SC().score(zeros, S.data.questions);
    ok(r.dist.every(x => x.pct === 6 || x.pct === 7), JSON.stringify(r.dist.map(x => x.pct)));
  });

  test('5 000 случайных анкет: сумма по типам и по квадрам ровно 100, без отрицательных', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 5000; i++) {
      const answers = {};
      S.data.questions.forEach(q => { answers[q.id] = Math.floor(rnd() * 5) - 2; });
      const r = SC().score(answers, S.data.questions);
      eq(r.dist.reduce((s, x) => s + x.pct, 0), 100, 'анкета ' + i);
      ok(r.dist.every(x => x.pct >= 0), 'анкета ' + i + ': отрицательный процент');
      eq(Object.values(r.quadras).reduce((s, v) => s + v, 0), 100, 'квадры, анкета ' + i);
    }
  });

  test('калибровка: балл 6 по всем осям → топ 60–80 %, балл 3 → 25–45 %', () => {
    const top = s => SC().result(SC().axisPercents({ EI: s, NS: s, TF: s, RP: s })).top.pct;
    const confident = top(6), fuzzy = top(3);
    ok(confident >= 60 && confident <= 80, 'уверенные: ' + confident + ' %');
    ok(fuzzy >= 25 && fuzzy <= 45, 'размытые: ' + fuzzy + ' %');
  });

  test('неполные и мусорные ответы считаются как «поровну»', () => {
    const r = SC().score({ q01: 7, q02: 'x', q03: 1.5 }, S.data.questions);
    eq(r.axes, { EI: 50, NS: 50, TF: 50, RP: 50 });
  });

  // ---------- ссылка на результат ----------

  test('код результата кодируется и раскодируется без потерь', () => {
    eq(P().encode({ EI: 72, NS: 64, TF: 58, RP: 19 }), '1-72-64-58-19');
    eq(P().decode('1-72-64-58-19'), { EI: 72, NS: 64, TF: 58, RP: 19 });
    S.data.types.forEach(t => {
      const r = SC().score(answersFor(t, 1), S.data.questions);
      const back = SC().result(P().decode(P().encode(r.axes)));
      eq(back, r, t.code + ': результат по ссылке отличается');
    });
  });

  test('битые и чужие коды результата отклоняются', () => {
    ['', '1-72-64-58', '1-72-64-58-19-1', '2-50-50-50-50', '1-101-0-0-0', '1--1-0-0-0', 'abc',
      '1-50-50-50-50<script>', ' 1-50-50-50-50', '1-50-50-50-50 ', null, undefined, 42]
      .forEach(x => eq(P().decode(x), null, JSON.stringify(x)));
  });

  // ---------- банк вопросов ----------

  test('банк вопросов: 20 штук, по 5 на ось, одна ось не идёт два раза подряд', () => {
    const qs = S.data.questions;
    eq(qs.length, 20, 'вопросов');
    eq(new Set(qs.map(q => q.id)).size, 20, 'уникальных id');
    SC().AXES.forEach(ax => eq(qs.filter(q => q.axis === ax).length, 5, ax));
    qs.forEach((q, i) => ok(i === 0 || q.axis !== qs[i - 1].axis, q.id + ': та же ось, что у предыдущего'));
  });

  test('банк вопросов: первый полюс справа ровно в 10, утверждения ≤ 90 знаков, заголовки ≤ 24, без родовых окончаний', () => {
    const qs = S.data.questions, FIRST = SC().FIRST, SECOND = SC().SECOND;
    eq(qs.filter(q => q.aPole !== FIRST[q.axis]).length, 10, 'первый полюс справа');
    const gendered = /(^|[\s«])(сам|сама|уверен|уверена|готов|готова|должен|должна|рад|рада)(?=[\s,.!?…»]|$)/i;
    qs.forEach(q => {
      ok(q.aPole === FIRST[q.axis] || q.aPole === SECOND[q.axis], q.id + ': полюс не с этой оси');
      ['a', 'b'].forEach(k => ok(q[k].length <= 90, q.id + '.' + k + ': ' + q[k].length + ' знаков'));
      ['prompt', 'a', 'b', 'as', 'bs'].forEach(k => ok(!gendered.test(q[k]), q.id + '.' + k + ': родовое окончание'));
      ['as', 'bs'].forEach(k => ok(q[k] && q[k].length <= 24, q.id + '.' + k + ': короткий заголовок до 24 знаков'));
    });
  });

  // ---------- пара: карта общих функций ----------

  const PR = () => S.core.pair;
  // Эталон из промпта: набор видов взаимодействия по восьми сферам для каждой позиции отношений
  const PAIR_KINDS = {
    dual: { complement: 4, cover: 4 }, activation: { complement: 4, cover: 4 },
    identity: { shared: 2, need: 2, background: 2, blind: 2 }, mirror: { shared: 2, need: 2, background: 2, blind: 2 },
    semidual: { complement: 2, cover: 2, values: 2, unanswered: 2 }, mirage: { complement: 2, cover: 2, values: 2, unanswered: 2 },
    benefactor: { complement: 2, cover: 2, values: 2, unanswered: 2 }, beneficiary: { complement: 2, cover: 2, values: 2, unanswered: 2 },
    kindred: { press: 2, ask: 2, shared: 1, need: 1, background: 1, blind: 1 }, business: { press: 2, ask: 2, shared: 1, need: 1, background: 1, blind: 1 },
    supervisor: { press: 2, ask: 2, shared: 1, need: 1, background: 1, blind: 1 }, supervisee: { press: 2, ask: 2, shared: 1, need: 1, background: 1, blind: 1 },
    quasi: { values: 4, unanswered: 4 }, extinguish: { values: 4, unanswered: 4 },
    conflict: { press: 4, ask: 4 }, superego: { press: 4, ask: 4 }
  };
  const countKinds = zones => {
    const c = {};
    zones.forEach(z => { c[z.kind] = (c[z.kind] || 0) + 1; });
    return Object.keys(c).sort().reduce((o, k) => { o[k] = c[k]; return o; }, {});
  };
  const sorted = o => Object.keys(o).sort().reduce((x, k) => { x[k] = o[k]; return x; }, {});

  test('карта пары: для всех 256 пар набор взаимодействий совпадает с эталоном своего вида отношений', () => {
    S.data.types.forEach(a => S.data.types.forEach(b => {
      const r = M().relation(a, b), zones = PR().map(a, b);
      eq(zones.length, 8, a.code + ' → ' + b.code + ': сфер');
      eq(zones.map(z => z.aspect), PR().ORDER, 'порядок сфер');
      eq(countKinds(zones), sorted(PAIR_KINDS[r.id]), a.code + ' → ' + b.code + ' (' + r.id + ')');
    }));
  });

  test('карта пары: глазами партнёра виды те же, стороны меняются местами', () => {
    const flip = { me: 'partner', partner: 'me', both: 'both' };
    S.data.types.forEach(a => S.data.types.forEach(b => {
      const ab = PR().map(a, b), ba = PR().map(b, a);
      ab.forEach((z, i) => {
        eq(ba[i].kind, z.kind, a.code + ' ↔ ' + b.code + ' · ' + z.aspect);
        eq(ba[i].side, flip[z.side], a.code + ' ↔ ' + b.code + ' · ' + z.aspect + ': сторона');
      });
    }));
  });

  test('карта пары: у дуалов ИЛЭ и СЭИ ты даёшь идеи и порядок, партнёр — уют и настроение', () => {
    const z = {};
    PR().map(T('ile'), T('sei')).forEach(x => { z[x.aspect] = x.kind + ':' + x.side; });
    eq(z, { Fi: 'cover:partner', Fe: 'complement:partner', Ne: 'complement:me', Ni: 'cover:me', Ti: 'complement:me', Te: 'cover:me', Se: 'cover:partner', Si: 'complement:partner' });
  });

  test('группы зон: пять, покрывают все виды; ни у одной пары карта не состоит из одних трудных зон', () => {
    eq(PR().GROUPS.length, 5, 'групп');
    eq(PR().GROUPS.reduce((n, g) => n + g.kinds.length, 0), PR().KINDS.length, 'видов в группах');
    PR().KINDS.forEach(k => ok(PR().GROUP_OF[k], k + ': без группы'));
    S.data.types.forEach(a => S.data.types.forEach(b => {
      const s = PR().summary(a, b);
      eq(Object.values(s).reduce((x, y) => x + y, 0), 8, a.code + ' → ' + b.code + ': сумма');
      ok(s.fit + s.common + s.ask > 0, a.code + ' → ' + b.code + ': нет ни одной ресурсной зоны');
    }));
  });

  S.runTests = function () {
    const results = cases.map(c => {
      try {
        c.fn();
        return { name: c.name, ok: true };
      } catch (e) {
        return { name: c.name, ok: false, error: e.message };
      }
    });
    return { total: results.length, failed: results.filter(r => !r.ok).length, results };
  };
})(typeof window !== 'undefined' ? window : globalThis);
