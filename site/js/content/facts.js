/* Socio-Nik · реестр фактов для mystery box: тексты из content/*.js + факты, собранные из данных модели А
   (такие всегда верны). Грузится после остальных файлов контента. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const C = S.content = S.content || {};

  S.factCats = {
    life: 'В жизни',
    modelA: 'Модель А',
    relations: 'Отношения',
    quadra: 'Квадра',
    alias: 'Псевдоним',
    history: 'История'
  };

  // Короткое имя типа для текста: «Максим», «Джек», остальные — псевдоним целиком
  const nm = t => t.short || t.alias;
  // Аспект словами, без аббревиатур
  const PLAIN = {
    Ne: 'чутьё на новые идеи', Ni: 'чувство времени', Se: 'воля и напор', Si: 'чувство комфорта',
    Te: 'деловая хватка', Ti: 'системное мышление', Fe: 'эмоциональность', Fi: 'чуткость к отношениям'
  };

  function generated(t) {
    const M = S.core.modelA;
    const m = M.modelA(t.ego);
    const q = S.data.quadras.find(x => x.id === t.quadra);
    const mates = S.data.types.filter(x => x.quadra === t.quadra && x.id !== t.id).map(nm);
    const act = M.partner(t, 'activation'), mirror = M.partner(t, 'mirror');
    // псевдонимы — в именительном падеже и в кавычках: склонять «Дюма» или «Гексли» нельзя, а «Дон Кихота» легко исказить
    return [
      { cat: 'modelA', text: `У типа «${nm(t)}» две сильнейшие стороны: ${PLAIN[m[0]]} и ${PLAIN[m[1]]}. Первое — то, чем этот тип живёт, второе — то, чем действует. Из этой пары выводится вся модель А.` },
      { cat: 'quadra', text: `«${nm(t)}» — из квадры ${q.name}, там же «${mates[0]}», «${mates[1]}» и «${mates[2]}». Пара «${nm(t)} — ${nm(act)}» здесь в отношениях активации, «${nm(t)} — ${nm(mirror)}» — в зеркальных: внутри квадры все ценят одно и то же.` }
    ];
  }

  let cache = null;
  S.facts = {
    all() {
      if (cache) return cache;
      const out = [];
      S.data.types.forEach(t => {
        const written = (C.types && C.types[t.id] && C.types[t.id].facts) || [];
        written.concat(generated(t)).forEach((f, i) => out.push({ id: `${t.id}-${i}`, type: t.id, cat: f.cat, text: f.text }));
      });
      ((C.facts && C.facts.general) || []).forEach((f, i) => out.push({ id: `gen-${i}`, type: null, cat: f.cat, text: f.text }));
      cache = out;
      return out;
    },
    byType(id) { return this.all().filter(f => f.type === id); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
