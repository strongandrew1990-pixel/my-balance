(function () {
  'use strict';
  const C = window.BalanceCore;
  // Ссылка для обратной связи: меняется только здесь.
  const TELEGRAM_URL = 'https://t.me/andreypaliy';
  const content = document.getElementById('content');
  const icons = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    wallet: '<path d="M19 7V4H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7"/><path d="M20 12h-5v5h5M16 14.5h.01"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.7"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12a24 24 0 0 0 18 0M12 11v4"/>',
    leaf: '<path d="M5 17C2 8 10 3 19 5c1 9-5 15-14 12ZM4 21l10-11"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1V10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>'
  };
  function icon(name, extra = '') { return `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.leaf}</svg>`; }
  function escape(value) { return String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])); }
  function dateLabel(date, year = true) { return new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long', ...(year ? {year:'numeric'} : {})}).format(new Date(`${date}T12:00:00`)); }
  function plural(n, forms) { const x = Math.abs(n) % 100, y = x % 10; return forms[x > 10 && x < 20 ? 2 : y === 1 ? 0 : y >= 2 && y <= 4 ? 1 : 2]; }
  function delta(value) { return value === null || value === undefined ? '<span class="delta neutral">Первый замер</span>' : `<span class="delta ${value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'}">${value > 0 ? '↑ +' : value < 0 ? '↓ ' : ''}${value === 0 ? 'Без изменений' : value}</span>`; }
  let reviews = [], storageError = '', draft = null, dirty = false, currentRoute = '', noticeTimer;
  try { reviews = C.loadReviews(window.localStorage); } catch (error) { storageError = error.message; }
  function notice(message) {
    const el = document.getElementById('notice'); el.textContent = message; el.hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => {el.hidden = true;}, 5000);
  }
  function warning() { return storageError ? `<div class="error-banner" role="alert">${escape(storageError)}</div>` : ''; }
  function pageHeading(eyebrow, title, subtitle, right = '') {
    return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${right}</div>`;
  }
  function actionList(review, caption) {
    const done = review.actions.filter(a => a.done).length;
    return `<div class="action-list" data-review-id="${escape(review.id)}">${review.actions.map(a => `<label class="action-item ${a.done ? 'completed' : ''}"><input type="checkbox" data-action-id="${escape(a.id)}" ${a.done ? 'checked' : ''} ${storageError ? 'disabled' : ''}><span class="custom-check" aria-hidden="true">${icon('check')}</span><span class="action-text">${escape(a.text)}</span></label>`).join('')}<p class="action-progress">${caption ? escape(caption) + ' · ' : ''}${done} из ${review.actions.length} ${plural(done, ['действия выполнено','действий выполнено','действий выполнено'])}</p></div>`;
  }
  function sphereCards(review, previous) {
    const changes = review ? C.compareReview(review, previous) : null;
    return `<div class="sphere-grid">${C.SPHERES.map((s, i) => `<article class="sphere-card" data-sphere="${s.id}"><div class="sphere-top"><span class="sphere-icon ${s.color}">${icon(s.icon)}</span><span class="sphere-number">0${i+1}</span></div><h3>${escape(s.name)}</h3><div class="score-row"><div class="score">${review ? review.scores[s.id] : '—'}<span>/ 10</span></div>${review ? delta(changes?.deltas[s.id]) : '<span class="delta neutral">Пока без оценки</span>'}</div><div class="score-track" aria-hidden="true"><span style="width:${review ? review.scores[s.id] * 10 : 0}%"></span></div><p class="sphere-reason ${!review?.reasons[s.id] ? 'muted' : ''}">${escape(review?.reasons[s.id] || (review ? 'Без пояснения' : s.hint))}</p></article>`).join('')}</div>`;
  }
  function changeSummary(review, previous) {
    const changes = C.compareReview(review, previous);
    if (!changes) return '<p class="summary-first">Первый обзор — ваша точка отсчёта.<br>После следующей сверки здесь появятся изменения.</p>';
    return `<p class="comparison-caption">По сравнению с ${dateLabel(previous.date, false)}</p><div class="change-stats"><div><strong class="positive">${changes.improved}</strong><span>стали лучше</span></div><div><strong class="negative">${changes.declined}</strong><span>стали ниже</span></div><div><strong>${changes.unchanged}</strong><span>без изменений</span></div></div>`;
  }
  function renderHome() {
    const latest = reviews[0], previous = latest ? C.previousReview(reviews, latest.date) : null;
    const hero = `<section class="home-hero"><div><p class="eyebrow">ЛИЧНАЯ СВЕРКА</p><h1>Мой баланс</h1><p class="hero-thought">Пауза, чтобы понять, что важно сейчас.</p>${latest ? `<a class="latest-review-link" href="#review/${escape(latest.id)}">Последний обзор · <time datetime="${latest.date}">${dateLabel(latest.date)}</time> ${icon('arrow')}</a>` : '<p class="latest-review-link muted">Ваш первый обзор — начало личной истории.</p>'}</div><a class="button button-primary hero-button" href="#new">${icon('spark')} Новый обзор</a></section>`;
    const focus = `<section class="panel focus-panel"><div class="focus-intro"><p class="eyebrow">ФОКУС ПЕРИОДА</p><h2>Один шаг.<br>С вниманием к себе.</h2><p class="muted">${latest ? 'Ваши главные действия до следующего обзора.' : 'Выберите 1–2 конкретных действия после первой сверки.'}</p></div><div class="focus-content">${latest ? actionList(latest, 'До следующей сверки') : '<p class="focus-empty">Не нужно менять всё сразу.<br>Начните с того, что сейчас важнее всего.</p>'}</div></section>`;
    const note = `<section class="panel reflection journal-note"><p class="eyebrow">НАБЛЮДЕНИЯ</p><h2>Заметка себе</h2><p class="reflection-text ${!latest?.conclusion ? 'muted' : ''}">${escape(latest?.conclusion || (latest ? 'В этом обзоре вы не оставили вывод.' : 'После первой сверки здесь появится ваш короткий вывод.'))}</p></section>`;
    const recent = `<section class="recent-history"><div class="section-heading"><div><p class="eyebrow">СТРАНИЦЫ ВАШЕЙ ИСТОРИИ</p><h2>Последние обзоры</h2></div><a class="text-link" href="#history">Вся история ${icon('arrow')}</a></div>${reviews.length ? `<div class="recent-list">${reviews.slice(0,3).map(r => `<a class="recent-entry" href="#review/${escape(r.id)}"><time datetime="${r.date}">${dateLabel(r.date)}</time><span>${escape(r.conclusion || 'Личная сверка восьми сфер')}</span>${icon('arrow')}</a>`).join('')}</div>` : '<p class="muted">История начнётся с вашего первого обзора.</p>'}</section>`;
    content.innerHTML = warning() + hero + `<div class="balance-overview">${window.BalanceWheel.render(latest, {dateText:latest ? dateLabel(latest.date) : ''})}<aside class="insights-column"><div class="insights-heading"><p class="eyebrow">${latest ? 'ПОСЛЕДНИЙ ОБЗОР' : 'ТОЧКА ОТСЧЁТА'}</p><h2>Что важно сейчас</h2></div>${window.BalanceAnalytics.render(reviews)}</aside></div><section class="spheres-section"><div class="section-heading"><div><p class="eyebrow">ВНИМАНИЕ К ДЕТАЛЯМ</p><h2>Восемь сфер вашей жизни</h2></div><p class="muted">${latest ? 'Оценки и то, что за ними стоит' : 'Ваша личная шкала от 1 до 10'}</p></div>${sphereCards(latest, previous)}</section>${focus}${previous ? `<section class="previous-panel"><div class="section-heading"><h2>Из прошлого периода</h2><a class="text-link" href="#review/${escape(previous.id)}">${dateLabel(previous.date, false)} ${icon('arrow')}</a></div>${actionList(previous, '')}</section>` : ''}${note}${recent}<section class="feedback-panel" aria-label="Обратная связь"><p>Есть идеи, замечания или хочешь обсудить приложение?</p><a class="button button-subtle" href="${escape(TELEGRAM_URL)}" target="_blank" rel="noopener noreferrer">Написать мне в Telegram</a></section>`;
  }
  function renderHistory() {
    content.innerHTML = warning() + pageHeading('ЛИЧНЫЙ ЖУРНАЛ', 'История обзоров', 'Ваши наблюдения, решения и изменения со временем.', `<span class="count-badge">${reviews.length} ${plural(reviews.length, ['обзор','обзора','обзоров'])}</span>`) + (reviews.length ? `<div class="history-list">${reviews.map((r, i) => {
      const changes = C.compareReview(r, C.previousReview(reviews, r.date));
      const done = r.actions.filter(a => a.done).length;
      return `<a class="panel history-card" href="#review/${escape(r.id)}"><div class="history-icon">${icon('clock')}</div><div class="history-info"><div class="history-date"><h2>${dateLabel(r.date)}</h2>${i === 0 ? '<span class="pill">Последний</span>' : ''}</div><p>${escape(r.conclusion || 'Короткий вывод не добавлен')}</p><div class="history-meta"><span>${changes ? `↑ ${changes.improved} лучше · ↓ ${changes.declined} ниже · ${changes.unchanged} без изменений` : 'Первый обзор · точка отсчёта'}</span><span>${done}/${r.actions.length} действий выполнено</span></div></div>${icon('arrow', 'history-arrow')}</a>`;
    }).join('')}</div>` : `<section class="panel empty-history"><span class="empty-icon">${icon('clock')}</span><h2>История начинается с первого обзора</h2><p>Сохраните оценки сегодня, чтобы позже увидеть, что изменилось.</p><a class="button button-primary" href="#new">Создать первый обзор ${icon('arrow')}</a></section>`);
  }
  function renderReview(id) {
    const review = reviews.find(r => r.id === id);
    if (!review) { content.innerHTML = '<section class="panel empty-history"><h1>Обзор не найден</h1><a class="text-link" href="#history">Вернуться к истории</a></section>'; return; }
    const previous = C.previousReview(reviews, review.date);
    content.innerHTML = warning() + `<a class="text-link back-link" href="#history">${icon('back')} К истории обзоров</a>` + pageHeading('СОХРАНЁННАЯ СВЕРКА', dateLabel(review.date), 'Ваши оценки, наблюдения и действия на этот период.', '<span class="pill">Сохранён</span>') + `${window.BalanceWheel.render(review, {dateText: dateLabel(review.date)})}<section class="panel review-comparison"><h2>Что изменилось?</h2>${changeSummary(review, previous)}</section><section class="spheres-section"><div class="section-heading"><h2>Восемь сфер</h2><p class="muted">Шкала от 1 до 10</p></div>${sphereCards(review, previous)}</section><div class="review-bottom"><section class="panel journal-note"><p class="eyebrow">ВАШИ НАБЛЮДЕНИЯ</p><h2>Короткий вывод</h2><p class="reflection-text ${!review.conclusion ? 'muted' : ''}">${escape(review.conclusion || 'Вывод не добавлен.')}</p></section><section class="panel"><p class="eyebrow">СЛЕДУЮЩИЕ ШАГИ</p><h2>Действия на период</h2>${actionList(review, '')}</section></div>`;
  }
  function newDraft() {
    return {date: C.localToday(), scores: Object.fromEntries(C.SPHERES.map(s => [s.id, null])), reasons: Object.fromEntries(C.SPHERES.map(s => [s.id, ''])), conclusion: '', actions: ['']};
  }
  function formCard(s, i) {
    const score = draft.scores[s.id];
    return `<fieldset class="panel form-sphere" data-sphere="${s.id}" id="field-${s.id}"><legend><span class="sphere-icon ${s.color}">${icon(s.icon)}</span><span><span class="sphere-step">СФЕРА 0${i+1}</span><span class="legend-title">${escape(s.name)}</span></span></legend><div class="form-score-heading"><p>${escape(s.hint)}</p><output id="value-${s.id}" aria-label="Текущая оценка">${score || '—'}<span>/10</span></output></div><div class="rating-options" role="radiogroup" aria-label="${escape(s.name)}: оценка от 1 до 10" aria-describedby="error-${s.id}">${Array.from({length:10}, (_,n) => `<label class="rating-option"><input type="radio" name="score-${s.id}" value="${n+1}" ${score === n+1 ? 'checked' : ''} aria-label="${escape(s.name)}: ${n+1} из 10"><span>${n+1}</span></label>`).join('')}</div><div class="rating-labels"><span>Совсем не устраивает</span><span>Полностью устраивает</span></div><div class="form-sphere-footer"><span class="inline-comparison" id="compare-${s.id}"></span><span class="field-error" id="error-${s.id}"></span></div><details class="reason-details" ${draft.reasons[s.id] ? 'open' : ''}><summary>Почему такая оценка? <span>Необязательно</span></summary><label class="sr-only" for="reason-${s.id}">Пояснение: ${escape(s.name)}</label><textarea id="reason-${s.id}" data-reason="${s.id}" rows="2" maxlength="400" placeholder="Можно в паре слов: что радует или чего не хватает?">${escape(draft.reasons[s.id])}</textarea></details></fieldset>`;
  }
  function renderNew() {
    if (!draft) draft = newDraft();
    content.innerHTML = warning() + pageHeading('ВРЕМЯ ДЛЯ СЕБЯ', 'Новый обзор', 'Оцените, как обстоят дела сейчас. Здесь нет правильных ответов.', '<span class="form-tag">8 сфер · 1–2 действия</span>') + `<form id="review-form" novalidate><section class="panel date-panel"><div><label for="review-date">Дата обзора</label><p class="muted">Сверка за один момент времени</p></div><div><input type="date" id="review-date" name="date" value="${escape(draft.date)}" min="1900-01-01" max="${C.localToday()}" required aria-describedby="error-date"><p class="field-error" id="error-date"></p></div></section><div class="section-heading form-section-heading"><div><p class="eyebrow">01 / ОЦЕНКИ</p><h2>Как вы чувствуете себя в каждой сфере?</h2></div><span id="score-progress" class="count-badge" aria-live="polite"></span></div><p class="form-hint">Выберите оценку от 1 до 10. Пояснение — только если хочется что-то отметить.</p><div class="form-sphere-grid">${C.SPHERES.map(formCard).join('')}</div><section class="panel changes-panel"><p class="eyebrow">02 / НАБЛЮДЕНИЯ</p><h2>Что изменилось?</h2><div id="form-changes"></div><label class="field-label" for="conclusion">Ваш короткий вывод <span>Необязательно</span></label><textarea id="conclusion" rows="3" maxlength="800" placeholder="Что вы заметили? Что сейчас требует внимания?">${escape(draft.conclusion)}</textarea><p class="field-error" id="error-conclusion"></p></section><section class="panel next-actions"><p class="eyebrow">03 / ПРИОРИТЕТ</p><h2>Что вы сделаете до следующего обзора?</h2><p class="muted">Выберите 1–2 главных действия на весь период. Небольших и конкретных.</p><div id="action-fields"></div><button class="button button-subtle" type="button" id="add-action">＋ Добавить второе действие</button><p class="field-error" id="error-actions" role="alert"></p></section><div class="form-bottom"><div><p id="form-error" class="field-error" role="alert"></p><p class="save-note">Сохранится только в этом браузере</p></div><div class="form-buttons"><button type="button" class="button button-subtle" id="cancel-review">Отменить</button><button type="submit" class="button button-primary" ${storageError ? 'disabled' : ''}>Сохранить обзор ${icon('check')}</button></div></div></form>`;
    renderActionFields(); updateFormComparisons();
  }
  function renderActionFields() {
    document.getElementById('action-fields').innerHTML = draft.actions.map((value, i) => `<div class="action-field"><label for="next-action-${i}">Действие ${i+1}</label><div><input type="text" id="next-action-${i}" data-next-action="${i}" maxlength="240" placeholder="${i === 0 ? 'Например, запланировать два вечера без работы' : 'Ещё один конкретный шаг'}" value="${escape(value)}" aria-describedby="error-actions" required>${i === 1 ? '<button type="button" id="remove-action" class="remove-action" aria-label="Удалить второе действие">×</button>' : ''}</div></div>`).join('');
    document.getElementById('add-action').hidden = draft.actions.length === 2;
  }
  function updateFormComparisons() {
    const previous = C.previousReview(reviews, draft.date), count = C.SPHERES.filter(s => draft.scores[s.id] !== null).length;
    document.getElementById('score-progress').textContent = `${count} из 8 оценено`;
    C.SPHERES.forEach(s => {
      const score = draft.scores[s.id], el = document.getElementById(`compare-${s.id}`);
      el.innerHTML = score === null ? '' : previous ? `${delta(score - previous.scores[s.id])}<span class="previous-score">Было ${previous.scores[s.id]}</span>` : '<span class="muted">Ваша точка отсчёта</span>';
      document.getElementById(`value-${s.id}`).innerHTML = `${score || '—'}<span>/10</span>`;
    });
    const el = document.getElementById('form-changes');
    el.innerHTML = previous ? `<p class="comparison-caption">Сравнение с обзором от ${dateLabel(previous.date)}</p><div class="change-chips">${C.SPHERES.map(s => `<span class="change-chip">${escape(s.name)} ${draft.scores[s.id] !== null ? delta(draft.scores[s.id] - previous.scores[s.id]) : '<span class="muted">—</span>'}</span>`).join('')}</div>` : `<p class="first-form-note">${reviews.length ? 'Для этой даты нет более раннего обзора.' : 'Это ваш первый обзор.'} Сейчас вы создаёте точку отсчёта. Изменения появятся при следующей сверке.</p>`;
  }
  function displayErrors(errors) {
    C.SPHERES.forEach(s => {
      const message = errors.scores[s.id] || '';
      document.getElementById(`error-${s.id}`).textContent = message;
      document.getElementById(`field-${s.id}`).classList.toggle('invalid', Boolean(message));
      document.querySelectorAll(`[name="score-${s.id}"]`).forEach(radio => radio.setAttribute('aria-invalid', message ? 'true' : 'false'));
    });
    for (const field of ['date', 'actions', 'conclusion']) document.getElementById(`error-${field}`).textContent = errors[field] || '';
    document.getElementById('review-date').setAttribute('aria-invalid', errors.date ? 'true' : 'false');
    document.querySelectorAll('[data-next-action]').forEach(el => el.setAttribute('aria-invalid', errors.actions ? 'true' : 'false'));
    const first = errors.date ? document.getElementById('review-date') : C.SPHERES.find(s => errors.scores[s.id]) ? document.querySelector(`[name="score-${C.SPHERES.find(s => errors.scores[s.id]).id}"]`) : errors.actions ? document.getElementById('next-action-0') : document.getElementById('conclusion');
    first.focus(); first.scrollIntoView({behavior:'smooth', block:'center'});
    document.getElementById('form-error').textContent = 'Проверьте отмеченные поля — обзор ещё не сохранён.';
  }
  content.addEventListener('input', event => {
    if (!event.target.closest('#review-form')) return;
    const el = event.target;
    dirty = true;
    if (el.id === 'review-date') { draft.date = el.value; document.getElementById('error-date').textContent = ''; updateFormComparisons(); }
    else if (el.name?.startsWith('score-')) {
      const id = el.name.slice(6); draft.scores[id] = Number(el.value); document.getElementById(`error-${id}`).textContent = ''; document.getElementById(`field-${id}`).classList.remove('invalid');
      document.querySelectorAll(`[name="score-${id}"]`).forEach(radio => radio.setAttribute('aria-invalid','false')); updateFormComparisons();
    }
    else if (el.dataset.reason) draft.reasons[el.dataset.reason] = el.value;
    else if (el.id === 'conclusion') draft.conclusion = el.value;
    else if (el.dataset.nextAction !== undefined) {draft.actions[Number(el.dataset.nextAction)] = el.value; document.getElementById('error-actions').textContent = '';}
  });
  content.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'add-action') { draft.actions.push(''); dirty = true; renderActionFields(); document.getElementById('next-action-1').focus(); }
    if (button.id === 'remove-action') { draft.actions.pop(); dirty = true; renderActionFields(); document.getElementById('add-action').focus(); }
    if (button.id === 'cancel-review') {
      if (dirty && !window.confirm('Отменить обзор и удалить введённый черновик?')) return;
      dirty = false; draft = null; window.location.hash = 'home';
    }
  });
  content.addEventListener('change', event => {
    const el = event.target;
    if (!el.matches('[data-action-id]')) return;
    if (storageError) {el.checked = !el.checked; return;}
    const reviewId = el.closest('[data-review-id]').dataset.reviewId;
    const updated = C.setActionDone(reviews, reviewId, el.dataset.actionId, el.checked);
    try { C.saveReviews(window.localStorage, updated); reviews = C.sortReviews(updated); }
    catch (error) { el.checked = !el.checked; notice(error.message.replace('Ваши записи остались в форме — попробуйте ещё раз.', 'Отметка не сохранена — попробуйте ещё раз.')); return; }
    const list = el.closest('.action-list'), review = reviews.find(r => r.id === reviewId);
    el.closest('.action-item').classList.toggle('completed', el.checked);
    const progress = list.querySelector('.action-progress'), done = review.actions.filter(a => a.done).length;
    const prefix = progress.textContent.includes(' · ') ? progress.textContent.split(' · ')[0] + ' · ' : '';
    progress.textContent = `${prefix}${done} из ${review.actions.length} действий выполнено`;
    const analyticsActions = document.getElementById('analytics-actions-value');
    if (analyticsActions) analyticsActions.textContent = window.BalanceAnalytics.actionsText(reviews[0]);
    notice(el.checked ? 'Действие отмечено выполненным' : 'Отметка выполнения снята');
  });
  content.addEventListener('submit', event => {
    if (event.target.id !== 'review-form') return;
    event.preventDefault();
    if (storageError) return;
    const errors = C.validateReview(draft, reviews);
    if (C.hasErrors(errors)) {displayErrors(errors); return;}
    try {
      const review = C.createReview(draft, reviews), updated = C.sortReviews([...reviews, review]);
      C.saveReviews(window.localStorage, updated);
      reviews = updated; draft = null; dirty = false; window.location.hash = `review/${review.id}`; notice('Обзор сохранён. Вы уделили время тому, что важно.');
    } catch (error) { document.getElementById('form-error').textContent = error.message; }
  });
  function route() {
    let next = window.location.hash.slice(1) || 'home';
    if (next === 'content') { content.focus(); history.replaceState(null, '', `#${currentRoute || 'home'}`); return; }
    if (currentRoute === 'new' && next !== 'new' && dirty && !window.confirm('Покинуть форму? Черновик останется доступен в «Новом обзоре» до перезагрузки страницы.')) {history.replaceState(null, '', '#new'); return;}
    currentRoute = next;
    document.querySelectorAll('[data-nav]').forEach(a => { const active = a.dataset.nav === next || (a.dataset.nav === 'history' && next.startsWith('review/')); a.classList.toggle('active',active); if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    if (next === 'new') renderNew(); else if (next === 'history') renderHistory(); else if (next.startsWith('review/')) renderReview(next.slice(7)); else {currentRoute = 'home'; renderHome();}
    document.title = `${currentRoute === 'new' ? 'Новый обзор' : currentRoute === 'history' ? 'История' : currentRoute.startsWith('review/') ? 'Сохранённый обзор' : 'Главная'} — Мой баланс`;
    window.scrollTo({top:0}); content.focus({preventScroll:true});
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', event => { if (dirty) {event.preventDefault(); event.returnValue = '';}});
  window.addEventListener('storage', event => {
    if (event.key !== C.STORAGE_KEY && event.key !== null) return;
    const previousError = storageError;
    try { reviews = C.loadReviews(window.localStorage); storageError = ''; } catch (error) {storageError = error.message;}
    if (currentRoute === 'new') {
      let banner = content.querySelector('.error-banner');
      if (storageError) {
        if (!banner) {banner = document.createElement('div'); banner.className = 'error-banner'; banner.setAttribute('role','alert'); content.prepend(banner);}
        banner.textContent = storageError;
      } else if (banner) banner.remove();
      document.querySelector('#review-form button[type="submit"]').disabled = Boolean(storageError);
      const formError = document.getElementById('form-error');
      if (storageError) formError.textContent = storageError;
      else if (formError.textContent === previousError) formError.textContent = '';
      if (!storageError) updateFormComparisons();
      notice(storageError || 'Данные изменились в другой вкладке. Ваш черновик сохранён.');
    }
    else route();
  });
  route();
})();
