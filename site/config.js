/* Socio-Nik · настройки сайта */
(function (root) {
  const S = root.Socio = root.Socio || {};

  S.config = {
    SITE_NAME: 'Socio-Nik',
    // Адрес выложенного сайта: включает ссылки на результат, приглашение партнёра и ссылку на пару.
    // Пусто — ссылки выключены, шер только картинкой
    SITE_URL: 'https://duushes.github.io/socio-nik/',
    // ID счётчика Яндекс Метрики. Пусто — события никуда не уходят: S.track пишет в память и в консоль на file://
    METRICA_ID: '',
    // Разбор пары за пейволом.
    // off — всё открыто; fakedoor — кнопка с ценой и честная бета (денег не берём);
    // live — оплата через адаптер S.paywall (интерфейс есть, интеграции нет — нужны НПД, чеки и хостинг в России).
    // prices — случайная цена на устройство в режиме fakedoor (проверка спроса, спека discovery §9.3);
    // surveyShare — доля устройств, которым после открытия задаём 4 вопроса о цене (Ван Вестендорп)
    PAYWALL: { mode: 'fakedoor', price: 490, prices: [390, 690, 990], surveyShare: 0.1 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
