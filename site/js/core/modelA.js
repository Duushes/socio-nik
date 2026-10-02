/* Socio-Nik · модель А: функции, дихотомии и интертипные отношения — всё выводится из Эго типа */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const core = S.core = S.core || {};

  // Аспект той же стихии с противоположной вертностью: ЧИ ↔ БИ
  const OPPOSITE_VERT = { Ne: 'Ni', Ni: 'Ne', Se: 'Si', Si: 'Se', Te: 'Ti', Ti: 'Te', Fe: 'Fi', Fi: 'Fe' };
  // Второй аспект той же рациональности и вертности: ЧИ ↔ ЧС, БЛ ↔ БЭ
  const SIBLING = { Ne: 'Se', Se: 'Ne', Ni: 'Si', Si: 'Ni', Te: 'Fe', Fe: 'Te', Ti: 'Fi', Fi: 'Ti' };

  const aspect = id => S.data.aspects[id];
  const isRational = id => S.data.elements[aspect(id).element].rational;

  // [1 базовая, 2 творческая, 3 ролевая, 4 болевая, 5 суггестивная, 6 активационная, 7 ограничительная, 8 демонстрационная]
  function modelA(ego) {
    const [f1, f2] = ego;
    const f3 = SIBLING[f1], f4 = SIBLING[f2];
    return [f1, f2, f3, f4, OPPOSITE_VERT[f3], OPPOSITE_VERT[f4], OPPOSITE_VERT[f1], OPPOSITE_VERT[f2]];
  }

  // Базовая и творческая функции — разной вертности и разной рациональности
  function isValidEgo(ego) {
    const a = aspect(ego[0]), b = aspect(ego[1]);
    return Boolean(a && b) && a.vert !== b.vert && isRational(ego[0]) !== isRational(ego[1]);
  }

  // Полюса: EI — E|I, NS — N|S, TF — T (логика) | F (этика), RP — R (рационал) | P (иррационал)
  function dichotomies(ego) {
    const els = ego.map(id => aspect(id).element);
    return {
      EI: aspect(ego[0]).vert === 'e' ? 'E' : 'I',
      NS: els.includes('I') ? 'N' : 'S',
      TF: els.includes('L') ? 'T' : 'F',
      RP: isRational(ego[0]) ? 'R' : 'P'
    };
  }

  let byId = null, byEgo = null;
  function index() {
    if (byId) return;
    byId = {};
    byEgo = {};
    S.data.types.forEach(t => {
      byId[t.id] = t;
      byEgo[t.ego.join('-')] = t;
    });
  }

  function type(id) {
    index();
    return byId[id] || null;
  }

  function typeByEgo(f1, f2) {
    index();
    return byEgo[f1 + '-' + f2] || null;
  }

  function typeByPoles(poles) {
    return S.data.types.find(t => {
      const d = dichotomies(t.ego);
      return d.EI === poles.EI && d.NS === poles.NS && d.TF === poles.TF && d.RP === poles.RP;
    }) || null;
  }

  const relationById = id => S.data.relations.find(r => r.id === id) || null;

  // Кто стоит в позиции relId относительно типа t
  function partner(t, relId) {
    const rel = relationById(relId);
    if (!rel) return null;
    const m = modelA(t.ego);
    return typeByEgo(m[rel.rule[0] - 1], m[rel.rule[1] - 1]);
  }

  // Кем тип b приходится типу a — позиция с точки зрения a
  function relation(a, b) {
    const m = modelA(a.ego);
    return S.data.relations.find(r => m[r.rule[0] - 1] === b.ego[0] && m[r.rule[1] - 1] === b.ego[1]) || null;
  }

  // Квадра — та, в ценностях которой оба аспекта Эго
  const quadraOf = t => S.data.quadras.find(q => t.ego.every(id => q.values.includes(id))) || null;

  // Код MBTI — по буквам дихотомий: рационал → J, иррационал → P. Тест меряет поведение,
  // и тот, кто ответил «планирую заранее», должен увидеть J. Руками коды не храним.
  function mbti(t) {
    const d = dichotomies(t.ego);
    return d.EI + d.NS + d.TF + (d.RP === 'R' ? 'J' : 'P');
  }

  // Тип по коду MBTI: «ENTP», «entp», «ENTP-A» (хвост 16Personalities отбрасываем)
  function typeByMbti(code) {
    const c = String(code == null ? '' : code).trim().toUpperCase().replace(/-[AT]$/, '');
    return S.data.types.find(t => mbti(t) === c) || null;
  }

  // Тип по id соционики (ile) или по коду MBTI (entp)
  const find = x => type(String(x == null ? '' : x).toLowerCase()) || typeByMbti(x);

  // Код MBTI — производное поле для шаблонов, считается здесь же
  if (S.data && S.data.types) S.data.types.forEach(t => { t.mbti = mbti(t); });

  core.modelA = { modelA, isValidEgo, dichotomies, type, typeByEgo, typeByPoles, relationById, partner, relation, quadraOf, mbti, typeByMbti, find };
})(typeof window !== 'undefined' ? window : globalThis);
