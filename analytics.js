(function (root) {
  'use strict';
  const C = root.BalanceCore;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function summarize(reviews) {
    const latest = C.sortReviews(reviews)[0] || null;
    const previous = latest ? C.previousReview(reviews, latest.date) : null;
    const changes = latest ? C.compareReview(latest, previous) : null;
    const actions = latest?.actions || [];
    const result = {latest, previous, attention:null, growth:null, dynamics:null,
      actions:{completed:actions.filter(action => action.done).length, total:actions.length}};
    if (!latest) return result;
    const minimum = Math.min(...C.SPHERES.map(sphere => latest.scores[sphere.id]));
    result.attention = {score:minimum, spheres:C.SPHERES.filter(sphere => latest.scores[sphere.id] === minimum)};
    if (changes) {
      result.dynamics = {improved:changes.improved, unchanged:changes.unchanged, declined:changes.declined};
      const maximum = Math.max(...Object.values(changes.deltas));
      if (maximum > 0) result.growth = {delta:maximum, spheres:C.SPHERES.filter(sphere => changes.deltas[sphere.id] === maximum)};
    }
    return result;
  }

  function actionsText(review) {
    const actions = review?.actions || [];
    return actions.length ? `${actions.filter(action => action.done).length} из ${actions.length} выполнено` : 'Действия не заданы';
  }

  function sphereNames(spheres) {
    const names = `<ul class="analytics-names">${spheres.map(sphere => `<li>${escape(sphere.name)}</li>`).join('')}</ul>`;
    if (spheres.length <= 2) return names;
    const count = spheres.length === 8 ? 'Все 8 сфер' : `${spheres.length} ${spheres.length < 5 ? 'сферы' : 'сфер'}`;
    return `<details class="analytics-ties"><summary>${count} · показать</summary>${names}</details>`;
  }

  function render(reviews) {
    const data = summarize(reviews);
    const empty = '<p class="analytics-note">Сохраните первый обзор, чтобы увидеть показатели.</p>';
    const attention = data.attention ? `<p class="analytics-score">${data.attention.score}<span> / 10</span></p>${sphereNames(data.attention.spheres)}` : empty;
    const growth = data.growth ? `<p class="analytics-score positive">+${data.growth.delta}</p>${sphereNames(data.growth.spheres)}` : `<p class="analytics-note">${!data.latest ? 'Сохраните первый обзор, чтобы увидеть показатели.' : !data.previous ? 'Рост появится после следующего замера.' : 'Положительного роста нет.'}</p>`;
    const dynamics = data.dynamics ? `<ul class="analytics-dynamics"><li><span class="positive">↑ <strong>${data.dynamics.improved}</strong></span> улучшилось</li><li><span>→ <strong>${data.dynamics.unchanged}</strong></span> без изменений</li><li><span class="negative">↓ <strong>${data.dynamics.declined}</strong></span> снизилось</li></ul>` : `<p class="analytics-note">${data.latest ? 'Динамика появится после следующего замера.' : 'Сохраните первый обзор, чтобы увидеть показатели.'}</p>`;
    return `<section class="analytics-grid" aria-label="Аналитика последнего обзора">
      <article class="panel analytics-card"><h2>Требует внимания</h2>${attention}</article>
      <article class="panel analytics-card"><h2>Главный рост</h2>${growth}</article>
      <article class="panel analytics-card"><h2>Динамика</h2>${dynamics}</article>
      <article class="panel analytics-card"><h2>Действия</h2><p class="analytics-actions" id="analytics-actions-value" role="status" aria-live="polite">${actionsText(data.latest)}</p><p class="analytics-note">${data.latest ? 'На период из последнего обзора' : 'Выберите 1–2 действия в первом обзоре.'}</p></article>
    </section>`;
  }

  root.BalanceAnalytics = Object.freeze({summarize, actionsText, render});
})(globalThis);
