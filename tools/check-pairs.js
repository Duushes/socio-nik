// node tools/check-pairs.js — разбор пары собирается для всех 256 упорядоченных пар без пустых мест;
// считает, сколько текста совпадает у пар одного вида отношений (цель — не больше 70 %).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { SITE } = require('./load');

const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"(?: defer)?><\/script>/g)].map(m => m[1])
  .filter(src => /^(config|js\/lib|js\/data|js\/core|js\/content)/.test(src));
// всё, что сайт грузит по требованию: тексты библиотеки (в порядке app.js → PACKS) и тексты разбора пары
const PACK_FILES = ['types-alpha', 'types-beta', 'types-gamma', 'types-delta', 'relations', 'functions',
  'modelA-alpha', 'modelA-beta', 'modelA-gamma', 'modelA-delta', 'celebs', 'facts'].map(f => `js/content/${f}.js`);
const lazy = PACK_FILES.filter(f => !scripts.includes(f))
  .concat(fs.readdirSync(path.join(SITE, 'js', 'content')).filter(f => /^pair-.+\.js$/.test(f) && f !== 'pair.js').map(f => 'js/content/' + f));
const ctx = vm.createContext({ console });
for (const src of scripts.concat(lazy)) vm.runInContext(fs.readFileSync(path.join(SITE, src), 'utf8'), ctx, { filename: src });
const S = ctx.Socio, PR = S.core.pair, P = S.content.pair, M = S.core.modelA, MA = S.content.modelA;

const errors = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const sentencesOf = rep => {
  const parts = [];
  // что видно в разборе без шторок: своя строчка и текст сферы, пять договорённостей, вопросы, тексты отношений
  rep.zones.forEach(z => { if (z.own) parts.push(z.own); if (z.theirs) parts.push(z.theirs); if (z.copy) parts.push(z.copy.text); });
  rep.deals.forEach(d => parts.push(d.text));
  rep.questions.forEach(q => parts.push(q.text));
  if (rep.rel) parts.push(...rep.rel.story, rep.rel.ritual, rep.rel.repair, ...rep.rel.scripts.map(x => x.say));
  return parts.join(' ').split(/(?<=[.!?…])\s+/).map(x => x.trim().toLowerCase()).filter(x => x.length > 20);
};

const byRel = {};
let words = 0, n = 0;
S.data.types.forEach(a => S.data.types.forEach(b => {
  const w = `${a.mbti}→${b.mbti}`, rep = PR.report(a, b, P, MA);
  rep.zones.forEach(z => {
    if (!z.copy || !z.copy.text || !z.copy.deal) err(w, `нет текста для ${z.aspect}.${z.kind}.${z.side}`);
    if (!P.domains[z.aspect]) err(w, `нет сферы ${z.aspect}`);
  });
  if (rep.deals.length !== 5) err(w, `договорённостей ${rep.deals.length} ≠ 5`);
  if (new Set(rep.deals.map(d => d.text)).size !== rep.deals.length) err(w, 'договорённости повторяются');
  if (rep.questions.length !== 6) err(w, `вопросов ${rep.questions.length} ≠ 6`);
  if (!rep.rel || !rep.rel.story || !rep.rel.ritual || !rep.rel.repair || !rep.rel.scripts) err(w, `нет текстов отношений ${rep.relation.id}`);
  const roles = rep.lead.me.length + rep.lead.partner.length + rep.can.me.length + rep.can.partner.length + rep.cares.me.length + rep.cares.partner.length + rep.split.length;
  if (!roles) err(w, 'в «Кто за что» пусто');
  rep.zones.forEach(z => {
    if (!z.own) err(w, `нет своей строчки модели А для ${z.aspect} (позиция ${z.posA})`);
    if (!z.theirs) err(w, `нет строчки «у партнёра» для ${b.mbti}, позиция ${z.posB}`);
  });
  // начало сферы на карточке разбора (170), в бесплатной сфере тизера (200) и своя строка модели А — всегда с начала текста
  const cut = (t, max, what) => {
    if (!t) return;
    const head = PR.firstSentence(t, max);
    if (!head || !t.startsWith(head)) err(w, `${what}: начало текста потеряно — «${(head || '').slice(0, 40)}…»`);
    else if (/^[»"),.:;!?—–-]/.test(head)) err(w, `${what}: начинается со знака — «${head.slice(0, 40)}…»`);
  };
  rep.zones.forEach(z => {
    if (z.copy && z.copy.text) { cut(z.copy.text, 170, `сфера ${z.aspect}`); cut(z.copy.text, 200, `тизер ${z.aspect}`); }
    if (z.own) cut(z.own, 230, `модель А ${z.aspect}`);
  });
  const sents = sentencesOf(rep);
  const inner = new Set(sents);
  if (inner.size !== sents.length) err(w, 'одно и то же предложение дважды в одном разборе');
  words += sents.join(' ').split(/\s+/).length; n++;
  (byRel[rep.relation.id] = byRel[rep.relation.id] || []).push({ w, set: inner, couple: [a.id, b.id].sort().join('+') });
}));

// совпадение текста у разных пар одного вида отношений; та же пара глазами второго — не «другая пара»
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
const med = shares[Math.floor(shares.length / 2)];
console.log(`Разборов: ${n} · в среднем ${Math.round(words / n)} слов · совпадение текста у разных пар одного вида отношений: медиана ${Math.round(med * 100)} %, максимум ${(worst.share * 100).toFixed(1)} % (${worst.pair})`);
if (worst.share > 0.7) err('совпадение', `${Math.round(worst.share * 100)} % > 70 %: ${worst.pair}`);
if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):\n` + errors.slice(0, 40).map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
