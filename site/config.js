/* Socio-Nik · настройки сайта */
(function (root) {
  const S = root.Socio = root.Socio || {};

  S.config = {
    SITE_NAME: 'Socio-Nik',
    // Адрес выложенного сайта: включает ссылку на результат и сравнение с другом по ссылке.
    // Пусто — ссылки выключены, шер только картинкой
    SITE_URL: 'https://duushes.github.io/socio-nik/'
  };
})(typeof window !== 'undefined' ? window : globalThis);
