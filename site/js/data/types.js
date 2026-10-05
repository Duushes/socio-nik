/* Socio-Nik · 16 типов.
   Руками хранится только Эго [базовая, творческая]; модель А, дихотомии и отношения
   выводятся из него в core/modelA.js. Роли — по В. Гуленко.
   short — короткое имя для крупного заголовка («Привет, я Максим»); в подписях — полный alias. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  S.data = S.data || {};

  S.data.types = [
    { id: 'ile', code: 'ИЛЭ', name: 'Интуитивно-логический экстраверт', alias: 'Дон Кихот', role: 'Искатель', quadra: 'alpha', ego: ['Ne', 'Ti'] },
    { id: 'sei', code: 'СЭИ', name: 'Сенсорно-этический интроверт', alias: 'Дюма', role: 'Посредник', quadra: 'alpha', ego: ['Si', 'Fe'] },
    { id: 'ese', code: 'ЭСЭ', name: 'Этико-сенсорный экстраверт', alias: 'Гюго', role: 'Энтузиаст', quadra: 'alpha', ego: ['Fe', 'Si'] },
    { id: 'lii', code: 'ЛИИ', name: 'Логико-интуитивный интроверт', alias: 'Робеспьер', role: 'Аналитик', quadra: 'alpha', ego: ['Ti', 'Ne'] },

    { id: 'eie', code: 'ЭИЭ', name: 'Этико-интуитивный экстраверт', alias: 'Гамлет', role: 'Наставник', quadra: 'beta', ego: ['Fe', 'Ni'] },
    { id: 'lsi', code: 'ЛСИ', name: 'Логико-сенсорный интроверт', alias: 'Максим Горький', short: 'Максим', role: 'Инспектор', quadra: 'beta', ego: ['Ti', 'Se'] },
    { id: 'sle', code: 'СЛЭ', name: 'Сенсорно-логический экстраверт', alias: 'Жуков', role: 'Маршал', quadra: 'beta', ego: ['Se', 'Ti'] },
    { id: 'iei', code: 'ИЭИ', name: 'Интуитивно-этический интроверт', alias: 'Есенин', role: 'Лирик', quadra: 'beta', ego: ['Ni', 'Fe'] },

    { id: 'see', code: 'СЭЭ', name: 'Сенсорно-этический экстраверт', alias: 'Наполеон', role: 'Политик', quadra: 'gamma', ego: ['Se', 'Fi'] },
    { id: 'ili', code: 'ИЛИ', name: 'Интуитивно-логический интроверт', alias: 'Бальзак', role: 'Критик', quadra: 'gamma', ego: ['Ni', 'Te'] },
    { id: 'lie', code: 'ЛИЭ', name: 'Логико-интуитивный экстраверт', alias: 'Джек Лондон', short: 'Джек', role: 'Предприниматель', quadra: 'gamma', ego: ['Te', 'Ni'] },
    { id: 'esi', code: 'ЭСИ', name: 'Этико-сенсорный интроверт', alias: 'Драйзер', role: 'Хранитель', quadra: 'gamma', ego: ['Fi', 'Se'] },

    { id: 'lse', code: 'ЛСЭ', name: 'Логико-сенсорный экстраверт', alias: 'Штирлиц', role: 'Администратор', quadra: 'delta', ego: ['Te', 'Si'] },
    { id: 'eii', code: 'ЭИИ', name: 'Этико-интуитивный интроверт', alias: 'Достоевский', role: 'Гуманист', quadra: 'delta', ego: ['Fi', 'Ne'] },
    { id: 'iee', code: 'ИЭЭ', name: 'Интуитивно-этический экстраверт', alias: 'Гексли', role: 'Советчик', quadra: 'delta', ego: ['Ne', 'Fi'] },
    { id: 'sli', code: 'СЛИ', name: 'Сенсорно-логический интроверт', alias: 'Габен', role: 'Мастер', quadra: 'delta', ego: ['Si', 'Te'] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
