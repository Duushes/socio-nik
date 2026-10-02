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

// ---------- пара: тексты экрана пары и разбора ----------
const PAIR = C.pair || {};
const ASPECTS = ['Fi', 'Fe', 'Ne', 'Ni', 'Ti', 'Te', 'Se', 'Si'];
const PAIR_KINDS = ['complement', 'cover', 'shared', 'background', 'ask', 'values', 'press', 'need', 'blind', 'unanswered'];
const PAIR_SYM = ['shared', 'background', 'need', 'blind'];
const sidesOf = k => (PAIR_SYM.includes(k) ? ['both'] : ['me', 'partner']);
const REL_IDS = ['dual', 'activation', 'mirror', 'semidual', 'mirage', 'identity', 'kindred', 'business', 'quasi', 'benefactor', 'beneficiary', 'extinguish', 'superego', 'supervisor', 'supervisee', 'conflict'];
const GROUP_IDS = ['fit', 'common', 'ask', 'care', 'gap'];
// Без эзотерики и приговоров; про партнёра — без «он/она»; без прошедшего времени после «ты» и «партнёр» (оно даёт род)
const PAIR_STOP = /(судьб|карм[аеуы]|вселенн|энергетик|обреч|несовместим|идеальн(ая|ой|ую) пар|вы не подходите|половинк|гороскоп)/i;
const PRONOUN = /(^|[^а-яё])(он|она)(?=[^а-яё]|$)/i;
// слова, которые выдают род пары: «вы оба», «обе», «каждый из вас», «ни один из вас»;
// «в обе стороны», «с обеих сторон» — про стороны, а не про людей, это можно
const PAIR_GENDER_RE = /(^|[^а-яё])(оба|обе|обоим|обеим|обоих|обеих|каждый из вас|каждая из вас|ни один из вас|ни одна из вас)(?=[^а-яё]|$)/gi;
const pairGender = s => {
  for (const m of s.matchAll(PAIR_GENDER_RE)) {
    const after = s.slice(m.index + m[0].length).trimStart().toLowerCase();
    if (/^(оба|обе|обоим|обеим|обоих|обеих)$/i.test(m[2]) && /^(сторон|рук|руками|концов|концах)/.test(after)) continue;
    return m[2];
  }
  return '';
};
const PAST_SUBJ = /(^|[^а-яё])(ты|партн[её]р)\s+(?:[а-яё]+\s+)?([а-яё]*[аеёиоуыяю]л(?:а|ся|ась|ось)?)(?=[^а-яё]|$)/gi;
// существительные на -л, которые не глаголы: «накрываешь стол», «много сил»
const NOT_VERB = new Set(['стол', 'пол', 'зал', 'сил', 'дел', 'тел', 'предел', 'отдел', 'идеал', 'финал', 'сериал', 'канал', 'сигнал', 'материал', 'вокзал', 'футбол', 'козёл', 'угол', 'орёл', 'мол', 'школа', 'сила', 'тела', 'дела', 'стола', 'начала', 'правила', 'зала',
  'сначала', 'тепла', 'числа', 'игла', 'скала', 'мгла', 'пчела', 'стрела', 'весла', 'села', 'мыла', 'смысла', 'угла', 'зла', 'стекла', 'масла']);
const pastSubj = s => {
  for (const m of s.matchAll(PAST_SUBJ)) if (!NOT_VERB.has(m[3].toLowerCase())) return m[0].trim();
  return '';
};
const seenPair = new Map();

function checkPair(where, s, { min, max, sMin, sMax }) {
  checkText(where, s, max, { you: true });
  if (!str(s)) return;
  if (min && s.length < min) err(where, `${s.length} знаков < ${min}`);
  if (sMin) {
    const n = sentences(s);
    if (n < sMin || n > sMax) err(where, `${n} предложений — нужно ${sMin}–${sMax}`);
  }
  if (PAIR_STOP.test(s)) err(where, `стоп-слово «${s.match(PAIR_STOP)[0]}»`);
  if (PRONOUN.test(s)) err(where, `«${s.match(PRONOUN)[2]}» — про партнёра пишем без местоимений с родом`);
  const g = pairGender(s);
  if (g) err(where, `«${g}» выдаёт род — лучше «вы двое», «никто из вас», «вам двоим»`);
  const past = pastSubj(s);
  if (past) err(where, `прошедшее время даёт род: «${past}»`);
  // одно и то же предложение в двух местах разбора
  s.split(/(?<=[.!?…])\s+/).forEach(x => {
    const k = x.trim().toLowerCase();
    if (k.length < 30) return;
    if (seenPair.has(k) && seenPair.get(k) !== where) err(where, `повтор предложения из ${seenPair.get(k)}`);
    else seenPair.set(k, where);
  });
}

if (PAIR.domains) ASPECTS.forEach(a => {
  const d = PAIR.domains[a], w = `pair.domains.${a}`;
  if (!d) return err(w, 'нет сферы');
  checkText(`${w}.short`, d.short, 14);
  checkText(`${w}.long`, d.long, 60);
});
if (PAIR.groups) GROUP_IDS.forEach(g => {
  const x = PAIR.groups[g], w = `pair.groups.${g}`;
  if (!x) return err(w, 'нет группы');
  checkText(`${w}.title`, x.title, 32);
  checkText(`${w}.short`, x.short, 14);
  checkPair(`${w}.about`, x.about, { min: 60, max: 220, sMin: 2, sMax: 2 });
});
if (PAIR.titles) REL_IDS.forEach(id => checkText(`pair.titles.${id}`, PAIR.titles[id], 36));
if (PAIR.questions) ASPECTS.forEach(a => ['hard', 'easy'].forEach(k => {
  const q = PAIR.questions[a] && PAIR.questions[a][k], w = `pair.questions.${a}.${k}`;
  checkPair(w, q, { min: 30, max: 140 });
  if (str(q) && !q.endsWith('?')) err(w, 'вопрос должен заканчиваться «?»');
}));
if (PAIR.texts) ['disclaimer', 'safety', 'third'].forEach(k => checkPair(`pair.texts.${k}`, PAIR.texts[k], { min: 80, max: 420 }));

const PZ = PAIR.zones || {};
Object.keys(PZ).forEach(asp => {
  const z = PZ[asp], w = `pair.zones.${asp}`;
  if (!ASPECTS.includes(asp)) return err(w, 'неизвестный аспект');
  Object.keys(z).forEach(k => { if (!PAIR_KINDS.includes(k)) err(`${w}.${k}`, 'неизвестный вид взаимодействия'); });
  PAIR_KINDS.forEach(k => sidesOf(k).forEach(side => {
    const e = z[k] && z[k][side], we = `${w}.${k}.${side}`;
    if (!e) return err(we, 'нет текста');
    checkPair(`${we}.text`, e.text, { min: 160, max: 460, sMin: 2, sMax: 4 });
    checkPair(`${we}.deal`, e.deal, { min: 50, max: 240, sMin: 1, sMax: 2 });
  }));
});

// как сфера выглядит у партнёра такого типа — со стороны, в третьем лице
const PV = PAIR.partnerView || {};
Object.keys(PV).forEach(id => {
  const w = `pair.partnerView.${id}`;
  if (!TYPES.includes(id)) return err(w, 'неизвестный id типа');
  for (let n = 1; n <= 8; n++) {
    const x = PV[id][n], wn = `${w}[${n}]`;
    checkPair(wn, x, { min: 90, max: 260, sMin: 1, sMax: 2 });
    if (str(x) && !/партн[её]р/i.test(x)) err(wn, 'текст про партнёра — слово «партнёр» должно быть в тексте');
  }
});

const PRel = PAIR.relations || {};
Object.keys(PRel).forEach(id => {
  const r = PRel[id], w = `pair.relations.${id}`;
  if (!REL_IDS.includes(id)) return err(w, 'неизвестная позиция отношений');
  if (!Array.isArray(r.story) || r.story.length !== 2) err(`${w}.story`, 'нужно ровно 2 абзаца');
  else {
    r.story.forEach((x, i) => checkPair(`${w}.story[${i}]`, x, { min: 200, max: 620, sMin: 2, sMax: 5 }));
    const n = r.story.reduce((sum, x) => sum + (str(x) ? words(x) : 0), 0);
    if (n < 80 || n > 180) err(`${w}.story`, `${n} слов — нужно 80–180`);
  }
  checkPair(`${w}.ritual`, r.ritual, { min: 80, max: 280, sMin: 1, sMax: 2 });
  checkPair(`${w}.repair`, r.repair, { min: 140, max: 420, sMin: 2, sMax: 3 });
  if (!Array.isArray(r.scripts) || r.scripts.length !== 3) err(`${w}.scripts`, 'нужно ровно 3 пары фраз');
  else r.scripts.forEach((x, i) => {
    checkPair(`${w}.scripts[${i}].instead`, x && x.instead, { min: 12, max: 100 });
    checkPair(`${w}.scripts[${i}].say`, x && x.say, { min: 20, max: 150 });
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
  ['domains', 'groups', 'titles', 'questions', 'texts'].forEach(k => { if (!PAIR[k]) err('полнота', `нет pair.${k}`); });
  ASPECTS.forEach(a => { if (!PZ[a]) err('полнота', `нет текстов разбора для сферы ${a}`); });
  REL_IDS.forEach(id => { if (!PRel[id]) err('полнота', `нет текстов разбора для отношений ${id}`); });
  TYPES.forEach(id => { if (!PV[id]) err('полнота', `нет взгляда со стороны для типа ${id}`); });
}

if (notes.length) console.log(notes.join(' · '));
if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):\n` + errors.map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
