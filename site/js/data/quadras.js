/* Socio-Nik · 4 квадры.
   Цвета — набор, проверенный валидатором dataviz на все пары сразу (--pairs all) в светлой и тёмной теме:
   все четыре квадры видны одновременно (распределение результата), поэтому соседних пар мало.
   Дубль — в css/tokens.css (--q-*). */
(function (root) {
  const S = root.Socio = root.Socio || {};
  S.data = S.data || {};

  S.data.quadras = [
    { id: 'alpha', name: 'Альфа', values: ['Ne', 'Ti', 'Fe', 'Si'], color: { light: '#2a78d6', dark: '#3987e5' } },
    { id: 'beta', name: 'Бета', values: ['Fe', 'Ti', 'Se', 'Ni'], color: { light: '#e2571f', dark: '#e2652f' } },
    { id: 'gamma', name: 'Гамма', values: ['Se', 'Fi', 'Te', 'Ni'], color: { light: '#b8479c', dark: '#c85fa8' } },
    { id: 'delta', name: 'Дельта', values: ['Te', 'Fi', 'Ne', 'Si'], color: { light: '#1baf7a', dark: '#17a774' } }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
