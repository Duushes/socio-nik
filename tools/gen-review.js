// node tools/gen-review.js — собирает review/stage-1.md из данных и ядра сайта: таблицы и числа не пишутся руками
const fs = require('fs');
const path = require('path');
const { load } = require('./load');

const S = load();
const M = S.core.modelA, SC = S.core.scoring;
const types = S.data.types;

const POLE = {
  E: 'экстраверсия', I: 'интроверсия', N: 'интуиция', S: 'сенсорика',
  T: 'логика', F: 'этика', R: 'рациональность', P: 'иррациональность'
};
const AXIS = { EI: 'экстр. / интр.', NS: 'интуиция / сенсорика', TF: 'логика / этика', RP: 'рац. / иррац.' };

const out = [];
const w = (s = '') => out.push(s);

w('# Socio-Nik · этап 1 на ревью');
w();
w(`> Собрано \`tools/gen-review.js\` из данных и ядра сайта · ${new Date().toISOString().slice(0, 10)}`);
w();

// ---------- вопросы ----------
w('## 1. Банк из 20 вопросов');
w();
w('Под каждым вопросом шкала: «точно А · скорее А · поровну · скорее Б · точно Б». Полюс утверждения — курсивом, в интерфейсе его не видно.');
w();
w('| № | Ось | Вопрос | А — слева | Б — справа |');
w('|---|---|---|---|---|');
S.data.questions.forEach((q, i) => {
  const bPole = q.aPole === SC.FIRST[q.axis] ? SC.SECOND[q.axis] : SC.FIRST[q.axis];
  w(`| ${i + 1} | ${AXIS[q.axis]} | ${q.prompt} | ${q.a} · _${POLE[q.aPole]}_ | ${q.b} · _${POLE[bPole]}_ |`);
});
w();

// ---------- калибровка ----------
w('## 2. Калибровка подсчёта');
w();
w('Балл оси S — сумма 5 ответов от −10 до +10. Одинаковый балл по всем 4 осям → процент полюса и доли типов.');
w();
w('| Балл по всем осям | Полюс, % | 1-е место, % | 2–5-е места, % каждое |');
w('|---|---|---|---|');
[10, 8, 6, 4, 3, 2, 1, 0].forEach(s => {
  const axes = SC.axisPercents({ EI: s, NS: s, TF: s, RP: s });
  const r = SC.result(axes);
  const others = [...new Set(r.dist.slice(1, 5).map(x => x.pct))].join(' / ');
  w(`| ${s} | ${axes.EI} | ${r.top.pct} | ${others} |`);
});
w();
const mixed = SC.result(SC.axisPercents({ EI: 8, NS: 8, TF: 2, RP: 2 }));
const name = id => M.type(id).code;
w(`Смешанный профиль — две оси уверенно (8), две размыто (2): ${mixed.dist.slice(0, 4).map(x => `${name(x.id)} ${x.pct} %`).join(', ')}; плашка «ты между» — ${mixed.close ? 'да' : 'нет'}.`);
w();

// ---------- матрица ----------
w('## 3. Матрица отношений 16 × 16');
w();
w('Строка — я, столбец — партнёр: ячейка говорит, кем партнёр приходится мне. Пример: строка ИЛЭ, столбец ЭИИ — «Ревизор», то есть ЭИИ ревизует ИЛЭ.');
w();
w('| Я \\ партнёр | ' + types.map(t => t.code).join(' | ') + ' |');
w('|---|' + types.map(() => '---').join('|') + '|');
types.forEach(a => w(`| **${a.code}** | ` + types.map(b => M.relation(a, b).short).join(' | ') + ' |'));
w();
w('Сокращения: ' + S.data.relations.map(r => `${r.short} — ${r.name.toLowerCase()}${r.role ? ` (${r.role})` : ''}`).join('; ') + '.');
w();

// ---------- кольца ----------
function rings(rel) {
  const seen = new Set(), list = [];
  types.forEach(a => {
    if (seen.has(a.id)) return;
    const ring = [];
    let t = a;
    do { ring.push(t.code); seen.add(t.id); t = M.partner(t, rel); } while (t.id !== a.id);
    list.push(ring.concat(a.code).join(' → '));
  });
  return list;
}
w('## 4. Кольца');
w();
w('Ревизия — стрелка от ревизора к подревизному:');
w();
rings('supervisee').forEach(r => w('- ' + r));
w();
w('Заказ — стрелка от заказчика к подзаказному:');
w();
rings('beneficiary').forEach(r => w('- ' + r));
w();

// ---------- тесты ----------
const res = S.runTests();
w('## 5. Тесты ядра');
w();
w(`${res.total - res.failed} из ${res.total} прошли.`);
w();
res.results.forEach(r => w(`- ${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : ' — ' + r.error}`));
w();

const file = path.join(__dirname, '..', 'review', 'stage-1.md');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, out.join('\n'));
console.log('→ ' + path.relative(process.cwd(), file) + (res.failed ? ` (упало тестов: ${res.failed})` : ''));
