/* Socio-Nik · интертипные отношения: 14 видов, 16 позиций (заказ и ревизия — по две стороны).
   rule [a, b]: у партнёра базовая функция = моя a-я, творческая = моя b-я (по модели А).
   inverse — как та же пара выглядит со стороны партнёра (только у асимметричных). */
(function (root) {
  const S = root.Socio = root.Socio || {};
  S.data = S.data || {};

  S.data.tones = {
    support: 'поддерживающие',
    work: 'рабочие',
    tense: 'напряжённые'
  };

  S.data.relations = [
    { id: 'dual', kind: 'dual', name: 'Дуальные', short: 'Дуал', rule: [5, 6], tone: 'support' },
    { id: 'activation', kind: 'activation', name: 'Активации', short: 'Актив', rule: [6, 5], tone: 'support' },
    { id: 'mirror', kind: 'mirror', name: 'Зеркальные', short: 'Зеркал', rule: [2, 1], tone: 'support' },
    { id: 'semidual', kind: 'semidual', name: 'Полудуальные', short: 'Полудуал', rule: [5, 8], tone: 'support' },
    { id: 'mirage', kind: 'mirage', name: 'Миражные', short: 'Мираж', rule: [7, 6], tone: 'support' },

    { id: 'identity', kind: 'identity', name: 'Тождественные', short: 'Тождеств', rule: [1, 2], tone: 'work' },
    { id: 'kindred', kind: 'kindred', name: 'Родственные', short: 'Родств', rule: [1, 4], tone: 'work' },
    { id: 'business', kind: 'business', name: 'Деловые', short: 'Делов', rule: [3, 2], tone: 'work' },
    { id: 'quasi', kind: 'quasi', name: 'Квазитождественные', short: 'Квази', rule: [7, 8], tone: 'work' },
    { id: 'benefactor', kind: 'request', name: 'Заказ', role: 'мой заказчик', short: 'Заказчик', rule: [8, 5], tone: 'work', inverse: 'beneficiary' },
    { id: 'beneficiary', kind: 'request', name: 'Заказ', role: 'мой подзаказный', short: 'Подзаказ', rule: [6, 7], tone: 'work', inverse: 'benefactor' },

    { id: 'extinguish', kind: 'extinguish', name: 'Погашения', short: 'Погаш', rule: [8, 7], tone: 'tense' },
    { id: 'superego', kind: 'superego', name: 'Суперэго', short: 'Суперэго', rule: [3, 4], tone: 'tense' },
    { id: 'supervisor', kind: 'supervision', name: 'Ревизия', role: 'мой ревизор', short: 'Ревизор', rule: [4, 1], tone: 'tense', inverse: 'supervisee' },
    { id: 'supervisee', kind: 'supervision', name: 'Ревизия', role: 'мой подревизный', short: 'Подревиз', rule: [2, 3], tone: 'tense', inverse: 'supervisor' },
    { id: 'conflict', kind: 'conflict', name: 'Конфликтные', short: 'Конфликт', rule: [4, 3], tone: 'tense' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
