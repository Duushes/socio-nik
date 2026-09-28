// node tools/run-tests.js — юнит-тесты ядра в Node (те же, что в site/tests.html)
const { load } = require('./load');

const res = load().runTests();
for (const r of res.results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok ? '' : '\n    ' + r.error));
}
console.log(`\n${res.total - res.failed}/${res.total} прошли`);
process.exit(res.failed ? 1 : 0);
