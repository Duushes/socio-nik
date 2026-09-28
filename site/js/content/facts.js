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

  function generated(t) {
    const M = S.core.modelA, A = S.data.aspects;
    const m = M.modelA(t.ego);
    const q = S.data.quadras.find(x => x.id === t.quadra);
    const mates = S.data.types.filter(x => x.quadra === t.quadra && x.id !== t.id).map(x => x.code);
    const act = M.partner(t, 'activation'), mirror = M.partner(t, 'mirror');
    return [
      { cat: 'modelA', text: `Эго ${t.code} — ${A[m[0]].short} и ${A[m[1]].short}: базовая функция — ${A[m[0]].name.toLowerCase()}, творческая — ${A[m[1]].name.toLowerCase()}. Всё остальное в модели А этого типа выводится из этой пары.` },
      { cat: 'quadra', text: `${t.code} живёт в квадре ${q.name} вместе с ${mates.join(', ')}. С ${act.code} у него отношения активации, с ${mirror.code} — зеркальные: внутри квадры все ценят одно и то же.` }
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
