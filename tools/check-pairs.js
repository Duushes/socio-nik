// node tools/check-pairs.js — страница пары собирается для всех 256 упорядоченных пар без пустых мест:
// в каждой сфере есть сцена, дело на неделю, «у тебя» и «у партнёра»; пять договорённостей, шесть вопросов,
// тексты вида отношений; без родовых окончаний. Считает, сколько текста совпадает у пар одного вида (цель ≤ 70 %, ошибка > 80 %).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { SITE } = require('./load');

const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1])
  .filter(src => /^(config|js\/lib|js\/data|js\/core|js\/content)/.test(src));
// тексты пары грузятся по требованию (ui.pairTexts) — в index.html их нет
const LAZY = ['pair', 'pair-zones', 'pair-partner'].map(f => `js/content/${f}.js`);
const ctx = vm.createContext({ console });
for (const src of scripts.concat(LAZY)) vm.runInContext(fs.readFileSync(path.join(SITE, src), 'utf8'), ctx, { filename: src });
const S = ctx.Socio, PR = S.core.pair, P = S.content.pair, MA = S.content.modelA;

const errors = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
// тексты на «ты» без рода: ни «рад», ни «рада» (как в банке вопросов теста)
const GENDERED = /(^|[\s«(])(сам|сама|уверен|уверена|готов|готова|должен|должна|рад|рада|устал|устала|пришёл|пришла|сказал|сказала|был|была)(?=[\s,.!?…»)]|$)/i;
const sentencesOf = rep => {
  const parts = [];
  rep.zones.forEach(z => { if (z.own) parts.push(z.own); if (z.theirs) parts.push(z.theirs); if (z.copy) parts.push(z.copy.text, z.copy.deal); });
  rep.questions.forEach(q => parts.push(q.text));
  if (rep.rel) parts.push(...rep.rel.story, rep.rel.ritual, rep.rel.repair, ...rep.rel.scripts.map(x => x.say));
  return parts.join(' ').split(/(?<=[.!?…])\s+/).map(x => x.trim().toLowerCase()).filter(x => x.length > 20);
};

const byRel = {};
let words = 0, n = 0;
S.data.types.forEach(a => S.data.types.forEach(b => {
  const w = `${a.code}→${b.code}`, rep = PR.report(a, b, P, MA);
  rep.zones.forEach(z => {
    if (!z.copy || !z.copy.text || !z.copy.deal) err(w, `нет сцены или дела для ${z.aspect}.${z.kind}.${z.side}`);
    if (!P.domains[z.aspect]) err(w, `нет сферы ${z.aspect}`);
    if (!P.groups[z.group]) err(w, `нет группы ${z.group}`);
    if (!z.own) err(w, `нет строчки «у тебя» для ${z.aspect} (позиция ${z.posA})`);
    if (!z.theirs) err(w, `нет строчки «у партнёра» для ${b.code}, позиция ${z.posB}`);
    // анонс сферы в свёрнутой карточке — целые предложения с начала текста
    if (z.copy && z.copy.text) {
      const head = PR.firstSentence(z.copy.text, 140);
      if (!head || !z.copy.text.startsWith(head)) err(w, `анонс ${z.aspect}: начало текста потеряно`);
    }
  });
  if (rep.deals.length !== 5) err(w, `договорённостей ${rep.deals.length} ≠ 5`);
  if (new Set(rep.deals.map(d => d.text)).size !== rep.deals.length) err(w, 'договорённости повторяются');
  if (rep.questions.length !== 6) err(w, `вопросов ${rep.questions.length} ≠ 6`);
  const rel = rep.rel;
  if (!rel || !rel.story || rel.story.length < 2 || !rel.ritual || !rel.repair || !rel.scripts || rel.scripts.length < 3) err(w, `нет текстов отношений ${rep.relation.id}`);
  const sents = sentencesOf(rep);
  const inner = new Set(sents);
  if (inner.size !== sents.length) err(w, 'одно и то же предложение дважды на одной странице');
  words += sents.join(' ').split(/\s+/).length; n++;
  (byRel[rep.relation.id] = byRel[rep.relation.id] || []).push({ w, set: inner, couple: [a.id, b.id].sort().join('+') });
}));

// род: все тексты пары целиком, а не только то, что попало на страницы
const walk = (v, where) => {
  if (typeof v === 'string') { const m = v.match(GENDERED); if (m) err(where, `родовое слово «${m[2]}»: …${v.slice(Math.max(0, m.index - 30), m.index + 30)}…`); }
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, `${where}.${k}`));
};
walk(P, 'pair');

let worst = { share: 0, pair: '' };
const shares = [];
Object.entries(byRel).forEach(([rel, list]) => {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    if (list[i].couple === list[j].couple) continue;
    const A = list[i].set, B = list[j].set;
    const common = [...A].filter(x => B.has(x)).length;
    const share = common / Math.min(A.size, B.size);
    shares.push(share);
    if (share > worst.share) worst = { share, pair: `${list[i].w} и ${list[j].w} (${rel})` };
  }
});
shares.sort((x, y) => x - y);
const med = shares[Math.floor(shares.length / 2)] || 0;
console.log(`пар: ${n} · слов на странице в среднем: ${Math.round(words / n)} · совпадение текста у пар одного вида: медиана ${Math.round(med * 100)} %, максимум ${Math.round(worst.share * 100)} % (${worst.pair})`);
// у тождественных пар все сферы симметричны и тексты зависят только от сферы — до 80 % это предупреждение
if (worst.share > 0.8) err('совпадение', `у ${worst.pair} совпадает ${Math.round(worst.share * 100)} % текста`);
else if (worst.share > 0.7) console.log(`предупреждение: у ${worst.pair} совпадает ${Math.round(worst.share * 100)} % текста`);
if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):\n` + errors.slice(0, 40).map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
