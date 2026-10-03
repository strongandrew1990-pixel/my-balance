(function (root) {
  'use strict';
  const STORAGE_KEY = 'my-balance.reviews.v1';
  const SPHERES = Object.freeze([
    { id: 'relationships', name: 'Отношения / семья', hint: 'Близость, поддержка и время вместе', icon: 'heart', color: 'rose' },
    { id: 'money', name: 'Финансы / инвестиции / деньги', hint: 'Устойчивость и спокойствие в деньгах', icon: 'wallet', color: 'sand' },
    { id: 'community', name: 'Окружение / друзья / связи', hint: 'Люди, с которыми вам хорошо', icon: 'people', color: 'blue' },
    { id: 'career', name: 'Карьера / работа / бизнес', hint: 'Смысл, движение и удовольствие от дела', icon: 'briefcase', color: 'violet' },
    { id: 'health', name: 'Здоровье', hint: 'Энергия, сон и забота о себе', icon: 'leaf', color: 'green' },
    { id: 'growth', name: 'Саморазвитие / личностный рост', hint: 'Новое понимание и полезные навыки', icon: 'spark', color: 'violet' },
    { id: 'comfort', name: 'Быт / комфорт / материальные ценности', hint: 'Пространство и вещи для удобной жизни', icon: 'home', color: 'sand' },
    { id: 'hobbies', name: 'Хобби / путешествия', hint: 'Впечатления и время для своих интересов', icon: 'sun', color: 'blue' }
  ]);
  const text = value => typeof value === 'string' ? value.trim() : '';
  const uid = () => root.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function validDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01') return false;
    const d = new Date(`${date}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
  }
  function validateReview(input, reviews = [], today = localToday()) {
    const errors = { scores: {} };
    if (!validDate(input.date)) errors.date = 'Укажите корректную дату.';
    else if (input.date > today) errors.date = 'Дата обзора не может быть в будущем.';
    else if (reviews.some(r => r.date === input.date)) errors.date = 'Обзор на эту дату уже есть. Выберите другую дату.';
    SPHERES.forEach(s => {
      const score = input.scores?.[s.id];
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) errors.scores[s.id] = 'Выберите оценку от 1 до 10.';
    });
    const actions = Array.isArray(input.actions) ? input.actions : [];
    if (actions.length < 1 || actions.length > 2 || actions.some(a => !text(a))) errors.actions = 'Добавьте одно или два действия. Удалите пустое второе поле.';
    else if (actions.some(a => a.length > 240)) errors.actions = 'Действие должно быть не длиннее 240 символов.';
    if (SPHERES.some(s => (input.reasons?.[s.id] || '').length > 400)) errors.reasons = 'Пояснение должно быть не длиннее 400 символов.';
    if ((input.conclusion || '').length > 800) errors.conclusion = 'Вывод должен быть не длиннее 800 символов.';
    return errors;
  }
  function hasErrors(errors) { return Object.keys(errors).some(k => k === 'scores' ? Object.keys(errors.scores).length > 0 : Boolean(errors[k])); }
  function createReview(input, reviews = [], today = localToday()) {
    const errors = validateReview(input, reviews, today);
    if (hasErrors(errors)) { const e = new Error('Проверьте поля обзора.'); e.fields = errors; throw e; }
    return {
      id: uid(), date: input.date, createdAt: new Date().toISOString(),
      scores: Object.fromEntries(SPHERES.map(s => [s.id, input.scores[s.id]])),
      reasons: Object.fromEntries(SPHERES.map(s => [s.id, text(input.reasons?.[s.id])])),
      conclusion: text(input.conclusion), actions: input.actions.map(a => ({id: uid(), text: text(a), done: false}))
    };
  }
  function sortReviews(reviews) { return [...reviews].sort((a, b) => b.date.localeCompare(a.date)); }
  function previousReview(reviews, date) { return sortReviews(reviews).find(r => r.date < date) || null; }
  function compareReview(review, previous) {
    if (!previous) return null;
    const deltas = Object.fromEntries(SPHERES.map(s => [s.id, review.scores[s.id] - previous.scores[s.id]]));
    const values = Object.values(deltas);
    return {deltas, improved: values.filter(v => v > 0).length, declined: values.filter(v => v < 0).length, unchanged: values.filter(v => v === 0).length};
  }
  function validStoredReview(r) {
    return r && typeof r.id === 'string' && r.id.length > 0 && validDate(r.date) && typeof r.createdAt === 'string'
      && SPHERES.every(s => typeof r.scores?.[s.id] === 'number' && Number.isInteger(r.scores[s.id]) && r.scores[s.id] >= 1 && r.scores[s.id] <= 10 && typeof r.reasons?.[s.id] === 'string')
      && typeof r.conclusion === 'string' && Array.isArray(r.actions) && r.actions.length >= 1 && r.actions.length <= 2
      && r.actions.every(a => a && typeof a.id === 'string' && a.id.length > 0 && typeof a.text === 'string' && a.text.trim().length > 0 && typeof a.done === 'boolean')
      && new Set(r.actions.map(a => a.id)).size === r.actions.length;
  }
  function loadReviews(storage) {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); } catch (_) { throw new Error('Не удалось прочитать данные браузера. Проверьте доступ к локальному хранилищу и перезагрузите страницу.'); }
    if (raw === null) return [];
    try {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.reviews) || !data.reviews.every(validStoredReview)
        || new Set(data.reviews.map(r => r.id)).size !== data.reviews.length || new Set(data.reviews.map(r => r.date)).size !== data.reviews.length) throw new Error();
      return sortReviews(data.reviews);
    } catch (_) { throw new Error('Сохранённые данные не удалось прочитать. Они не изменены. Сохранение новых обзоров приостановлено, чтобы не потерять историю.'); }
  }
  function saveReviews(storage, reviews) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify({version: 1, reviews: sortReviews(reviews)})); }
    catch (_) { throw new Error('Не удалось сохранить обзор. Возможно, хранилище браузера недоступно или заполнено. Ваши записи остались в форме — попробуйте ещё раз.'); }
  }
  function setActionDone(reviews, reviewId, actionId, done) {
    return reviews.map(r => r.id !== reviewId ? r : {...r, actions: r.actions.map(a => a.id !== actionId ? a : {...a, done: Boolean(done)})});
  }
  root.BalanceCore = Object.freeze({SPHERES, STORAGE_KEY, localToday, validateReview, hasErrors, createReview, sortReviews, previousReview, compareReview, loadReviews, saveReviews, setActionDone});
})(globalThis);
