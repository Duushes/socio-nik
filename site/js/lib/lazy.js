/* Socio-Nik · подгрузка скриптов по требованию: тексты разбора пары грузим, только когда разбор открывают.
   Обычный <script>, а не fetch: fetch по file:// не работает. В однофайловой сборке тексты уже встроены —
   тогда ready() сразу говорит «всё на месте», и ничего не грузится. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const pending = {};

  function script(src) {
    if (pending[src]) return pending[src];
    pending[src] = new Promise((ok, fail) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = () => ok(src);
      el.onerror = () => { delete pending[src]; el.remove(); fail(new Error('Не загрузилось: ' + src)); };
      document.head.appendChild(el);
    });
    return pending[src];
  }

  S.lazy = (srcs, ready) => (ready && ready() ? Promise.resolve() : Promise.all(srcs.map(script)));
})(typeof window !== 'undefined' ? window : globalThis);
