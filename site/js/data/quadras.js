/* Socio-Nik · 4 квадры. Цвета квадр — только в css/tokens.css (--q-*), их отдаёт S.theme.quadraColor() */
(function (root) {
  const S = root.Socio = root.Socio || {};
  S.data = S.data || {};

  S.data.quadras = [
    { id: 'alpha', name: 'Альфа', values: ['Ne', 'Ti', 'Fe', 'Si'] },
    { id: 'beta', name: 'Бета', values: ['Fe', 'Ti', 'Se', 'Ni'] },
    { id: 'gamma', name: 'Гамма', values: ['Se', 'Fi', 'Te', 'Ni'] },
    { id: 'delta', name: 'Дельта', values: ['Te', 'Fi', 'Ne', 'Si'] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
