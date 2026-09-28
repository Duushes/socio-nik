/* Socio-Nik · подсчёт теста: ответы → проценты полюсов 4 осей → распределение по 16 типам */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const core = S.core = S.core || {};

  const VERSION = 1;                                     // версия подсчёта — первое число в ссылке на результат
  const AXES = ['EI', 'NS', 'TF', 'RP'];
  const FIRST = { EI: 'E', NS: 'N', TF: 'T', RP: 'R' };  // «плюс» оси
  const SECOND = { EI: 'I', NS: 'S', TF: 'F', RP: 'P' };
  const K = 4;                                           // крутизна сигмоиды, калибровка — в тестах
  const P_MIN = 0.03, P_MAX = 0.97;                      // не обещаем 100 %

  const toAnswer = v => (Number.isInteger(v) && v >= -2 && v <= 2 ? v : 0);

  // answers: { q01: −2…+2 }; минус — к утверждению А (слева), плюс — к Б (справа)
  function axisSums(answers, questions) {
    const sums = { EI: 0, NS: 0, TF: 0, RP: 0 };
    questions.forEach(q => {
      const v = toAnswer(answers[q.id]);
      sums[q.axis] += q.aPole === FIRST[q.axis] ? -v : v;
    });
    return sums;
  }

  // Максимальный балл оси: 2 за каждый её вопрос
  function axisMax(questions) {
    const max = { EI: 0, NS: 0, TF: 0, RP: 0 };
    questions.forEach(q => { max[q.axis] += 2; });
    return max;
  }

  // Процент первого полюса по каждой оси — целое от 3 до 97
  function axisPercents(sums, max) {
    const out = {};
    AXES.forEach(ax => {
      const x = sums[ax] / ((max && max[ax]) || 10);
      const p = Math.min(P_MAX, Math.max(P_MIN, 1 / (1 + Math.exp(-K * x))));
      out[ax] = Math.round(p * 100);
    });
    return out;
  }

  // Вероятность типа — произведение вероятностей его полюсов; целые проценты — методом наибольшего остатка
  function distribution(axes) {
    const rows = S.data.types.map((t, i) => {
      const d = core.modelA.dichotomies(t.ego);
      const p = AXES.reduce((acc, ax) => {
        const first = axes[ax] / 100;
        return acc * (d[ax] === FIRST[ax] ? first : 1 - first);
      }, 1);
      const raw = p * 100;
      return { id: t.id, i, p, pct: Math.floor(raw), rem: raw - Math.floor(raw) };
    });
    let rest = 100 - rows.reduce((s, r) => s + r.pct, 0);
    const byRemainder = rows.slice().sort((a, b) => b.rem - a.rem || b.p - a.p || a.i - b.i);
    for (let k = 0; rest > 0; k++, rest--) byRemainder[k].pct += 1;
    return rows
      .sort((a, b) => b.pct - a.pct || b.p - a.p || a.i - b.i)
      .map(r => ({ id: r.id, p: r.p, pct: r.pct }));
  }

  // Полный результат из 4 процентов осей — так же считается результат по ссылке
  function result(axes) {
    const dist = distribution(axes);
    const quadras = {};
    S.data.quadras.forEach(q => { quadras[q.id] = 0; });
    dist.forEach(r => { quadras[core.modelA.type(r.id).quadra] += r.pct; });
    const clean = {};
    AXES.forEach(ax => { clean[ax] = axes[ax]; });
    return {
      version: VERSION,
      axes: clean,
      dist,
      top: dist[0],
      next: dist.slice(1, 3),
      close: dist[0].pct - dist[1].pct < 10,   // «ты между X и Y»
      quadras
    };
  }

  const score = (answers, questions) => result(axisPercents(axisSums(answers, questions), axisMax(questions)));

  core.scoring = { VERSION, AXES, FIRST, SECOND, K, axisSums, axisMax, axisPercents, distribution, result, score };
})(typeof window !== 'undefined' ? window : globalThis);
