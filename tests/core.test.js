/* Run in tests/run.html or a Node VM after loading core.js. */
(function (root) {
  'use strict';
  root.runBalanceTests = function () {
    const C = root.BalanceCore || {};
    const results = [];
    function equal(actual, expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    function ok(value) { if (!value) throw new Error('Expected truthy value'); }
    function throws(fn, pattern) { let caught = false; try { fn(); } catch (e) { caught = pattern.test(e.message); } ok(caught); }
    function test(name, fn) { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } }
    const keys = ['relationships', 'money', 'community', 'career', 'health', 'growth', 'comfort', 'hobbies'];
    const input = (date = '2026-09-01') => ({date, scores: Object.fromEntries(keys.map(k => [k, 6])), reasons: {health: 'Сплю лучше'}, conclusion: 'Больше отдыха', actions: ['Запланировать отпуск']});
    const make = date => C.createReview(input(date), [], '2026-10-02');
    const memory = () => { let value = null; return {getItem: () => value, setItem: (_, v) => {value = v;}}; };

    test('Первый обзор сохраняет восемь оценок, причину и одно действие', () => {
      const r = make('2026-09-01'); equal(Object.keys(r.scores).length, 8); equal(r.scores.health, 6); equal(r.reasons.health, 'Сплю лучше'); equal(r.actions[0].text, 'Запланировать отпуск'); equal(r.actions[0].done, false); ok(r.id);
    });
    test('Пустая оценка, дробь, 0 и 11 отклоняются', () => {
      for (const score of [null, '', 0, 11, 6.5]) { const i = input(); i.scores.health = score; ok(C.validateReview(i, [], '2026-10-02').scores.health); }
    });
    test('Нужно одно или два непустых действия', () => {
      for (const actions of [[], ['  '], ['a', 'b', 'c']]) { const i = input(); i.actions = actions; ok(C.validateReview(i, [], '2026-10-02').actions); }
      const i = input(); i.actions = ['a', 'b']; equal(C.validateReview(i, [], '2026-10-02').actions, undefined);
    });
    test('Невозможная, будущая и повторная дата отклоняются', () => {
      for (const date of ['2026-02-30', '2026-13-01', '', '2026-10-03']) ok(C.validateReview(input(date), [], '2026-10-02').date);
      ok(C.validateReview(input(), [make('2026-09-01')], '2026-10-02').date);
    });
    test('Сравнение обзора задним числом использует ближайший более ранний обзор', () => {
      const early = make('2026-08-01'), late = make('2026-10-01'), middle = make('2026-09-01');
      equal(C.previousReview([late, early, middle], '2026-09-01').date, '2026-08-01'); equal(C.previousReview([late, early], '2026-07-01'), null);
      equal(C.sortReviews([early, middle, late]).map(r => r.date), ['2026-10-01', '2026-09-01', '2026-08-01']);
    });
    test('Изменения первого обзора отсутствуют; рост и спад вычисляются в баллах', () => {
      const r = make('2026-09-01'), p = make('2026-08-01'); r.scores.health = 8; r.scores.money = 4;
      equal(C.compareReview(r, null), null); const change = C.compareReview(r, p); equal(change.deltas.health, 2); equal(change.deltas.money, -2); equal(change.improved, 1); equal(change.declined, 1); equal(change.unchanged, 6);
    });
    test('Запись и чтение хранилища сохраняют обзор целиком', () => {
      const storage = memory(), r = make('2026-09-01'); C.saveReviews(storage, [r]); equal(C.loadReviews(storage), [r]); equal(C.loadReviews(memory()), []);
    });
    test('Повреждённое хранилище отклоняется и остаётся без перезаписи', () => {
      for (const value of ['{', '{}', '{"version":1,"reviews":[{"id":"broken"}]}']) { let writes = 0; const s = {getItem: () => value, setItem: () => {writes++;}}; throws(() => C.loadReviews(s), /Сохранённые данные/); equal(writes, 0); }
    });
    test('Недоступное хранилище и превышение квоты сообщают ошибку', () => {
      throws(() => C.loadReviews({getItem: () => {throw new Error('denied');}}), /прочитать данные/); throws(() => C.saveReviews({setItem: () => {throw new Error('quota');}}, [make('2026-09-01')]), /Не удалось сохранить/);
    });
    test('Выполнение действия меняет только нужный обзор и сохраняется после чтения', () => {
      const first = make('2026-08-01'), second = make('2026-09-01'); const next = C.setActionDone([first, second], first.id, first.actions[0].id, true);
      equal(first.actions[0].done, false); equal(next[0].actions[0].done, true); equal(next[1].actions[0].done, false);
      const s = memory(); C.saveReviews(s, next); equal(C.loadReviews(s)[1].actions[0].done, true);
    });
    test('Личный текст сохраняется без преобразования в HTML', () => {
      const i = input(); i.reasons.health = '<img src=x onerror=alert(1)>'; equal(C.createReview(i, [], '2026-10-02').reasons.health, '<img src=x onerror=alert(1)>');
    });
    return results;
  };
})(globalThis);
