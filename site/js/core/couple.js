/* Socio-Nik · пара на этом устройстве: партнёр (код результата или выбранный тип), его имя, шаг теста вдвоём.
   Всё живёт только в localStorage. В ссылках — только коды результатов: ни имён, ни ответов. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const core = S.core = S.core || {};

  // Сторона пары в ссылке: код результата «1-72-64-58-19» или тип — «entp» / «ile»
  function side(code) {
    const axes = core.payload.decode(code);
    if (axes) return { code, axes, type: core.modelA.type(core.scoring.result(axes).top.id) };
    const t = core.modelA.find(code);
    return t ? { code: t.mbti.toLowerCase(), axes: null, type: t } : null;
  }

  // Код для ссылки: результат теста, если он есть, иначе тип
  const codeOf = (axes, t) => (axes ? core.payload.encode(axes) : t.mbti.toLowerCase());

  const NAME_MAX = 24;
  const clean = s => String(s == null ? '' : s).replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

  const couple = {
    side,
    codeOf,
    // Партнёр: { code, at, name? } — code стороны пары из ссылки
    partner() {
      const p = S.store.get('partner', null);
      return p && typeof p.code === 'string' && side(p.code) ? p : null;
    },
    setPartner(code, extra) {
      const prev = couple.partner();
      const keepName = prev && prev.code === code ? prev.name : '';
      S.store.set('partner', Object.assign({ code, at: Date.now() }, keepName ? { name: keepName } : {}, extra || {}));
    },
    // Имя показываем только для своего партнёра и только в заголовках
    nameFor(code) {
      const p = couple.partner();
      return p && p.code === code && p.name ? p.name : '';
    },
    setName(code, name) {
      const p = couple.partner();
      const n = clean(name);
      if (!p || p.code !== code) couple.setPartner(code);
      const cur = couple.partner();
      if (n) cur.name = n; else delete cur.name;
      S.store.set('partner', cur);
    },
    forget() {
      S.store.del('partner');
      S.store.del('duo');
    },
    // Тест вдвоём на одном телефоне: { step: 1 | 2 } — кто сейчас отвечает
    duo() {
      const d = S.store.get('duo', null);
      return d && (d.step === 1 || d.step === 2) ? d : null;
    },
    setDuo(step) {
      if (step === 1 || step === 2) S.store.set('duo', { step, at: Date.now() });
      else S.store.del('duo');
    },
    NAME_MAX
  };

  core.couple = couple;
})(typeof window !== 'undefined' ? window : globalThis);
