// node tools/check-content.js <файл.js …> — проверка текстов сайта: схема, длины, объём, родовые окончания.
// Без аргументов проверяет все файлы site/js/content/*.js и полноту контента.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONTENT = path.join(__dirname, '..', 'site', 'js', 'content');
const args = process.argv.slice(2);
const full = args.length === 0;
const files = full ? fs.readdirSync(CONTENT).filter(f => f.endsWith('.js')).map(f => path.join(CONTENT, f)) : args;

const ctx = vm.createContext({});
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const C = (ctx.Socio && ctx.Socio.content) || {};

const errors = [];
const notes = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const CATS = ['life', 'modelA', 'relations', 'quadra', 'alias', 'history'];
const TYPES = ['ile', 'sei', 'ese', 'lii', 'eie', 'lsi', 'sle', 'iei', 'see', 'ili', 'lie', 'esi', 'lse', 'eii', 'iee', 'sli'];
const QUADRAS = ['alpha', 'beta', 'gamma', 'delta'];
const KINDS = ['dual', 'activation', 'mirror', 'semidual', 'mirage', 'identity', 'kindred', 'business', 'quasi', 'request', 'extinguish', 'superego', 'supervision', 'conflict'];
const ROLES = { request: ['benefactor', 'beneficiary'], supervision: ['supervisor', 'supervisee'] };

// Слова с родовым окончанием — текст должен одинаково читаться всеми
const GENDERED = /(^|[^а-яё])(сам|сама|готов|готова|уверен|уверена|должен|должна|рад|рада|способен|способна|склонен|склонна|увлечён|увлечена|влюблён|влюблена|согласен|согласна|занят|занята|свободен|свободна|одинок|одинока|спокоен|спокойна|доволен|довольна|счастлив|счастлива|интересен|интересна|нужен|нужна|честен|честна|открыт|открыта)(?=[^а-яё]|$)/i;
const PAST = /(^|[^а-яё])(был|была)(?=[^а-яё]|$)/i;
const BANNED = /(https?:|www\.|wikisocion|socionics\.)/i;

const str = v => typeof v === 'string' && v.trim().length > 0;
const words = s => s.split(/\s+/).filter(Boolean).length;
const sentences = s => (s.match(/[.!?…](\s|$)/g) || []).length;

function checkText(where, s, max, { you = false } = {}) {
  if (!str(s)) return err(where, 'пусто');
  if (max && s.length > max) err(where, `${s.length} знаков > ${max}`);
  if (GENDERED.test(s)) err(where, `родовое окончание: «${s.match(GENDERED)[2]}»`);
  if (you && PAST.test(s)) err(where, 'прошедшее время «был/была» в тексте на «ты»');
  if (BANNED.test(s)) err(where, 'ссылка или источник в тексте');
  if (/'/.test(s)) err(where, 'апостроф — используй «ёлочки»');
}

function checkFact(where, f) {
  if (!f || !CATS.includes(f.cat)) err(where, `категория «${f && f.cat}» не из ${CATS.join(', ')}`);
  checkText(where, f && f.text, 280);
  if (f && str(f.text) && f.text.length < 40) err(where, 'факт короче 40 знаков');
}

// ---------- типы ----------
const types = C.types || {};
Object.keys(types).forEach(id => {
  const t = types[id], w = `types.${id}`;
  if (!TYPES.includes(id)) return err(w, 'неизвестный id типа');
  checkText(`${w}.tagline`, t.tagline, 90, { you: true });
  if (!Array.isArray(t.about) || t.about.length !== 3) err(`${w}.about`, 'нужно ровно 3 абзаца');
  else {
    t.about.forEach((p, i) => checkText(`${w}.about[${i}]`, p, 700, { you: true }));
    const n = t.about.reduce((s, p) => s + words(p), 0);
    if (n < 140 || n > 220) err(`${w}.about`, `${n} слов — нужно 140–220`);
    notes.push(`${id}: ${n} слов`);
  }
  if (!Array.isArray(t.strengths) || t.strengths.length !== 4) err(`${w}.strengths`, 'нужно ровно 4');
  else t.strengths.forEach((s, i) => checkText(`${w}.strengths[${i}]`, s, 90, { you: true }));
  if (!Array.isArray(t.growth) || t.growth.length !== 3) err(`${w}.growth`, 'нужно ровно 3');
  else t.growth.forEach((s, i) => checkText(`${w}.growth[${i}]`, s, 100, { you: true }));
  checkText(`${w}.inRelations`, t.inRelations, 420, { you: true });
  if (str(t.inRelations) && (sentences(t.inRelations) < 2 || sentences(t.inRelations) > 3)) err(`${w}.inRelations`, 'нужно 2–3 предложения');
  if (!Array.isArray(t.facts) || t.facts.length < 10) err(`${w}.facts`, 'нужно не меньше 10 фактов');
  else t.facts.forEach((f, i) => checkFact(`${w}.facts[${i}]`, f));
});

// ---------- квадры ----------
const quadras = C.quadras || {};
Object.keys(quadras).forEach(id => {
  const q = quadras[id], w = `quadras.${id}`;
  if (!QUADRAS.includes(id)) return err(w, 'неизвестная квадра');
  checkText(`${w}.motto`, q.motto, 60);
  checkText(`${w}.about`, q.about, 420);
  checkText(`${w}.values`, q.values, 320);
  checkText(`${w}.rejects`, q.rejects, 320);
  if (!Array.isArray(q.atmosphere) || q.atmosphere.length !== 4) err(`${w}.atmosphere`, 'нужно ровно 4 тега');
  else q.atmosphere.forEach((s, i) => checkText(`${w}.atmosphere[${i}]`, s, 24));
});

// ---------- отношения ----------
const rels = C.relations || {};
Object.keys(rels).forEach(kind => {
  const r = rels[kind], w = `relations.${kind}`;
  if (!KINDS.includes(kind)) return err(w, 'неизвестный вид отношений');
  checkText(`${w}.line`, r.line, 90);
  checkText(`${w}.about`, r.about, 520);
  if (str(r.about) && (sentences(r.about) < 2 || sentences(r.about) > 4)) err(`${w}.about`, 'нужно 2–4 предложения');
  checkText(`${w}.tip`, r.tip, 200);
  if (ROLES[kind]) ROLES[kind].forEach(role => checkText(`${w}.roles.${role}`, r.roles && r.roles[role], 220));
});

// ---------- модель А: как каждая функция проявляется у типа ----------
const modelA = C.modelA || {};
Object.keys(modelA).forEach(id => {
  const m = modelA[id], w = `modelA.${id}`;
  if (!TYPES.includes(id)) return err(w, 'неизвестный id типа');
  for (let n = 1; n <= 8; n++) {
    const f = m[n], wf = `${w}[${n}]`;
    if (!f) { err(wf, 'нет функции'); continue; }
    checkText(`${wf}.text`, f.text, 560, { you: true });
    if (str(f.text) && f.text.length < 200) err(`${wf}.text`, `${f.text.length} знаков — нужно от 200`);
    if (str(f.text) && (sentences(f.text) < 2 || sentences(f.text) > 5)) err(`${wf}.text`, 'нужно 2–5 предложений');
    checkText(`${wf}.tip`, f.tip, 170, { you: true });
    if (str(f.tip) && f.tip.length < 40) err(`${wf}.tip`, 'совет короче 40 знаков');
  }
});

// ---------- знаменитости с похожим типом ----------
const celebs = C.celebs || {};
const seenNames = new Map();
Object.keys(celebs).forEach(id => {
  const list = celebs[id], w = `celebs.${id}`;
  if (!TYPES.includes(id)) return err(w, 'неизвестный id типа');
  if (!Array.isArray(list) || list.length !== 6) return err(w, 'нужно ровно 6');
  const real = list.filter(c => c.kind === 'real').length, fiction = list.filter(c => c.kind === 'fiction').length;
  if (real !== 3 || fiction !== 3) err(w, `нужно 3 реальных и 3 персонажа, сейчас ${real} и ${fiction}`);
  list.forEach((c, i) => {
    const wc = `${w}[${i}]`;
    if (!str(c.name) || c.name.length > 40) err(`${wc}.name`, 'имя пустое или длиннее 40');
    if (!str(c.who) || c.who.length > 48) err(`${wc}.who`, 'пояснение «кто это» пустое или длиннее 48');
    if (!str(c.note) || c.note.length < 30 || c.note.length > 120) err(`${wc}.note`, `«почему» — 30–120 знаков, сейчас ${c.note ? c.note.length : 0}`);
    [c.name, c.who, c.note].forEach(x => { if (str(x) && /'/.test(x)) err(wc, 'апостроф — используй «ёлочки»'); if (str(x) && BANNED.test(x)) err(wc, 'ссылка в тексте'); });
    const key = String(c.name).toLowerCase().replace(/ё/g, 'е').trim();
    if (seenNames.has(key)) err(wc, `«${c.name}» уже есть у ${seenNames.get(key)}`); else seenNames.set(key, id);
  });
});

// ---------- общие факты ----------
const general = (C.facts && C.facts.general) || [];
general.forEach((f, i) => checkFact(`facts.general[${i}]`, f));

// ---------- полнота (без аргументов) ----------
if (full) {
  TYPES.forEach(id => { if (!types[id]) err('полнота', `нет текстов типа ${id}`); });
  QUADRAS.forEach(id => { if (!quadras[id]) err('полнота', `нет текстов квадры ${id}`); });
  KINDS.forEach(k => { if (!rels[k]) err('полнота', `нет текстов отношения ${k}`); });
  if (general.length < 18) err('полнота', `общих фактов ${general.length} < 18`);
  TYPES.forEach(id => { if (!modelA[id]) err('полнота', `нет текстов модели А для ${id}`); });
  TYPES.forEach(id => { if (!celebs[id]) err('полнота', `нет знаменитостей для ${id}`); });
}

if (notes.length) console.log(notes.join(' · '));
if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):\n` + errors.map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
