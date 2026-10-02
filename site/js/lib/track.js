/* Socio-Nik · аналитика: S.track(событие, параметры).
   Пока владелец не впишет ID Метрики в config.js, события никуда не уходят: только в память (S.track.log —
   для сквозных проверок) и в консоль, если сайт открыт с диска. Аналитика никогда не ломает сайт. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const log = [];

  function track(event, props) {
    const e = { event, props: props || {}, at: Date.now() };
    log.push(e);
    if (log.length > 300) log.shift();
    try {
      const id = S.config && S.config.METRICA_ID;
      if (id && typeof root.ym === 'function') root.ym(Number(id), 'reachGoal', event, e.props);
      else if (root.location && root.location.protocol === 'file:' && root.console) root.console.debug('[track]', event, e.props);
    } catch (err) { /* без аналитики сайт работает так же */ }
    return e;
  }

  track.log = log;
  S.track = track;
})(typeof window !== 'undefined' ? window : globalThis);
