/* Socio-Nik · 8 информационных аспектов и функции модели А */
(function (root) {
  const S = root.Socio = root.Socio || {};
  S.data = S.data || {};

  // Интуиция и сенсорика — иррациональные стихии, логика и этика — рациональные.
  // glyph — объёмный знак в иллюстрациях (спека, раздел 11).
  S.data.elements = {
    I: { name: 'Интуиция', glyph: 'pyramid', rational: false },
    S: { name: 'Сенсорика', glyph: 'sphere', rational: false },
    L: { name: 'Логика', glyph: 'cube', rational: true },
    E: { name: 'Этика', glyph: 'corner', rational: true }
  };

  // vert: e — экстравертный («чёрный») аспект, i — интровертный («белый»)
  S.data.aspects = {
    Ne: { id: 'Ne', short: 'ЧИ', name: 'Интуиция возможностей', element: 'I', vert: 'e', hint: 'возможности, идеи, потенциал, «а что, если…»' },
    Ni: { id: 'Ni', short: 'БИ', name: 'Интуиция времени', element: 'I', vert: 'i', hint: 'время, ход событий, прогнозы, предчувствия' },
    Se: { id: 'Se', short: 'ЧС', name: 'Волевая сенсорика', element: 'S', vert: 'e', hint: 'воля, сила, напор, влияние на пространство' },
    Si: { id: 'Si', short: 'БС', name: 'Сенсорика ощущений', element: 'S', vert: 'i', hint: 'ощущения, комфорт, здоровье, красота быта' },
    Te: { id: 'Te', short: 'ЧЛ', name: 'Деловая логика', element: 'L', vert: 'e', hint: 'польза, эффективность, технологии, дело' },
    Ti: { id: 'Ti', short: 'БЛ', name: 'Структурная логика', element: 'L', vert: 'i', hint: 'системы, законы, порядок, классификации' },
    Fe: { id: 'Fe', short: 'ЧЭ', name: 'Этика эмоций', element: 'E', vert: 'e', hint: 'эмоции, настроение, атмосфера, выразительность' },
    Fi: { id: 'Fi', short: 'БЭ', name: 'Этика отношений', element: 'E', vert: 'i', hint: 'отношения, симпатии, дистанция, мораль' }
  };

  // Модель А: 8 функций в 4 блоках
  S.data.blocks = [
    { id: 'ego', name: 'Эго', functions: [1, 2] },
    { id: 'superego', name: 'Суперэго', functions: [3, 4] },
    { id: 'superid', name: 'Суперид', functions: [5, 6] },
    { id: 'id', name: 'Ид', functions: [7, 8] }
  ];

  S.data.functions = [
    { n: 1, name: 'Базовая' },
    { n: 2, name: 'Творческая' },
    { n: 3, name: 'Ролевая' },
    { n: 4, name: 'Болевая' },
    { n: 5, name: 'Суггестивная' },
    { n: 6, name: 'Активационная' },
    { n: 7, name: 'Ограничительная' },
    { n: 8, name: 'Демонстрационная' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
