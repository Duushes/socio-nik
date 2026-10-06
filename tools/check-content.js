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
// иконки знаменитостей: набор, на который ссылаются герои в celebs.js
const ICONS_FILE = path.join(__dirname, '..', 'site', 'js', 'art', 'celeb-icons.js');
vm.runInContext(fs.readFileSync(ICONS_FILE, 'utf8'), ctx, { filename: ICONS_FILE });
const ICONS = (ctx.Socio && ctx.Socio.art && ctx.Socio.art.celebIcons) || {};
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

// ---------- отрисованные иконки знаменитостей ----------
if (full) {
  const IMG = path.join(__dirname, '..', 'site', 'img', 'celebs');
  Object.keys(C.celebs || {}).forEach(id => (C.celebs[id] || []).forEach(c => {
    if (c.icon && !fs.existsSync(path.join(IMG, c.icon + '.webp'))) err(`celebs.${id}`, `нет картинки img/celebs/${c.icon}.webp`);
  }));
}

// ---------- короткие черты для героя ----------
if (full) {
  const tr = C.traits || {};
  TYPES.forEach(id => {
    const list = tr[id];
    if (!Array.isArray(list) || list.length !== 3) return err(`traits.${id}`, 'нужно ровно 3 черты');
    list.forEach((x, i) => checkText(`traits.${id}[${i}]`, x, 22));
    checkText(`cheers.${id}`, (C.cheers || {})[id], 34);
  });
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
const seenIcons = new Map();
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
    if (!str(c.icon) || !ICONS[c.icon]) err(`${wc}.icon`, `нет иконки «${c.icon}» в art/celeb-icons.js`);
    else if (seenIcons.has(c.icon)) err(`${wc}.icon`, `иконка «${c.icon}» уже у «${seenIcons.get(c.icon)}»`); else seenIcons.set(c.icon, c.name);
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
  // у каждого варианта ответа теста — своя 3D-картинка img/q/<id>-a|b.webp
  const qctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'site', 'js', 'data', 'questions.js'), 'utf8'), qctx);
  const QIMG = path.join(__dirname, '..', 'site', 'img', 'q');
  (qctx.Socio.data.questions || []).forEach(q => ['a', 'b'].forEach(side => {
    if (!fs.existsSync(path.join(QIMG, `${q.id}-${side}.webp`))) err('тест', `нет картинки img/q/${q.id}-${side}.webp`);
  }));
  // превью ссылок для мессенджеров: og.jpg главной и у каждого типа — картинка og/<id>.jpg и страница r/<id>/ (tools/og.js)
  const SITE_DIR = path.join(__dirname, '..', 'site');
  if (!fs.existsSync(path.join(SITE_DIR, 'og.jpg'))) err('превью', 'нет site/og.jpg — запусти tools/og.js');
  TYPES.forEach(id => {
    if (!fs.existsSync(path.join(SITE_DIR, 'og', id + '.jpg'))) err('превью', `нет og/${id}.jpg — запусти tools/og.js`);
    const stub = path.join(SITE_DIR, 'r', id, 'index.html');
    if (!fs.existsSync(stub)) { err('превью', `нет r/${id}/index.html — запусти tools/og.js`); return; }
    const html = fs.readFileSync(stub, 'utf8');
    if (!html.includes(`og/${id}.jpg`) || !html.includes(`#/types/${id}`)) err('превью', `r/${id}/index.html ссылается не на свой тип`);
  });
}

if (notes.length) console.log(notes.join(' · '));
if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):\n` + errors.map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
