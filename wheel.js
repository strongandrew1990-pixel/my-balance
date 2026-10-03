(function (root) {
  'use strict';
  const CENTER = 220;
  const RADIUS = 160;
  const COLORS = ['#bc8b89','#b4a06e','#789aa9','#9587ad','#7c9e7a','#a1aa72','#b79a7e','#77a59c'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const round = value => Math.round(value * 1000) / 1000;
  function point(radius, degrees) {
    const angle = degrees * Math.PI / 180;
    return [round(CENTER + radius * Math.cos(angle)), round(CENTER + radius * Math.sin(angle))];
  }
  function sectorPath(index, radius) {
    const start = point(radius, -90 + index * 45);
    const end = point(radius, -90 + (index + 1) * 45);
    return `M ${CENTER} ${CENTER} L ${start[0]} ${start[1]} A ${radius} ${radius} 0 0 1 ${end[0]} ${end[1]} Z`;
  }
  function render(review, {dateText = ''} = {}) {
    const spheres = root.BalanceCore.SPHERES;
    const scores = spheres.map(s => {
      const score = review?.scores[s.id];
      return Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;
    });
    const description = spheres.map((s,i) => `${s.name}: ${scores[i] === null ? 'пока без оценки' : scores[i] + ' из 10'}`).join('. ');
    const sectors = spheres.map((s,i) => `<g><title>${escape(s.name)}: ${scores[i] === null ? 'пока без оценки' : scores[i] + ' из 10'}</title><path d="${sectorPath(i,RADIUS)}" fill="${COLORS[i]}" fill-opacity="0.07"/>${scores[i] === null ? '' : `<path class="wheel-fill" data-sphere="${s.id}" data-score="${scores[i]}" d="${sectorPath(i,RADIUS * scores[i] / 10)}" fill="${COLORS[i]}" fill-opacity="0.68"/>`}</g>`).join('');
    const rings = Array.from({length:10}, (_,i) => `<circle cx="220" cy="220" r="${(i+1)*16}"/>`).join('');
    const spokes = spheres.map((_,i) => {const end = point(RADIUS,-90+i*45); return `<line x1="220" y1="220" x2="${end[0]}" y2="${end[1]}"/>`;}).join('');
    const numbers = spheres.map((_,i) => {const p = point(190,-67.5+i*45); return `<g><circle cx="${p[0]}" cy="${p[1]}" r="14" fill="${COLORS[i]}" fill-opacity="0.12"/><text x="${p[0]}" y="${p[1]+4}" class="wheel-sector-number">${i+1}</text></g>`;}).join('');
    const scale = Array.from({length:10},(_,i) => `<text x="227" y="${220-(i+1)*16+3}" class="wheel-scale">${i+1}</text>`).join('');
    return `<section class="panel balance-wheel" aria-labelledby="wheel-heading"><div class="section-heading"><div><p class="eyebrow">ОЦЕНКИ ВОСЬМИ СФЕР</p><h2 id="wheel-heading">Колесо баланса</h2></div>${dateText ? `<span class="wheel-date">${escape(dateText)}</span>` : '<span class="wheel-date">Ваша будущая точка отсчёта</span>'}</div><div class="wheel-layout"><div class="wheel-chart"><svg class="wheel-svg" viewBox="0 0 440 440" role="img" aria-labelledby="wheel-title wheel-description"><title id="wheel-title">Колесо баланса: восемь сфер, шкала от 1 до 10</title><desc id="wheel-description">${escape(description)}</desc>${sectors}<g class="wheel-grid" fill="none" stroke="#ced8c7" stroke-width="0.85">${rings}${spokes}</g><circle cx="220" cy="220" r="3" fill="#7b9170"/>${numbers}${scale}</svg><p class="wheel-chart-note">${review ? 'Чем дальше заполнение от центра, тем выше оценка.' : 'После первого обзора колесо заполнится вашими оценками.'}</p></div><ol class="wheel-legend" aria-label="Сферы и оценки">${spheres.map((s,i) => `<li class="wheel-legend-item"><span class="wheel-legend-number" style="--sector-color:${COLORS[i]}">${i+1}</span><span class="wheel-legend-name">${escape(s.name)}</span><span class="wheel-legend-score">${scores[i] ?? '—'}<small>/ 10</small></span></li>`).join('')}</ol></div></section>`;
  }
  root.BalanceWheel = Object.freeze({render});
})(globalThis);
