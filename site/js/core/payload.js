/* Socio-Nik · код результата для ссылки: «1-72-64-58-19» = версия подсчёта + проценты первых полюсов осей.
   Только 4 числа — ни имён, ни ответов. Всё, что не совпадает с форматом, отбрасывается. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const core = S.core = S.core || {};

  const FORMAT = /^(\d{1,2})-(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/;

  function encode(axes) {
    const sc = core.scoring;
    return [sc.VERSION].concat(sc.AXES.map(ax => axes[ax])).join('-');
  }

  function decode(str) {
    if (typeof str !== 'string') return null;
    const m = FORMAT.exec(str);
    if (!m) return null;
    const sc = core.scoring;
    if (Number(m[1]) !== sc.VERSION) return null;
    const values = m.slice(2).map(Number);
    if (values.some(v => v > 100)) return null;
    const axes = {};
    sc.AXES.forEach((ax, i) => { axes[ax] = values[i]; });
    return axes;
  }

  core.payload = { encode, decode };
})(typeof window !== 'undefined' ? window : globalThis);
