(function (root) {
  'use strict';
  root.runWheelTests = function () {
    const results = [];
    const W = root.BalanceWheel || {};
    const keys = ['relationships','money','community','career','health','growth','comfort','hobbies'];
    const review = values => ({scores:Object.fromEntries(keys.map((key,i) => [key,values[i]]))});
    const check = (condition,message) => {if (!condition) throw new Error(message);};
    const test = (name,fn) => {try {fn(); results.push({name,pass:true});} catch(e) {results.push({name,pass:false,error:e.message});}};
    test('Пустое колесо показывает восемь сфер без вымышленных оценок', () => {
      const html = W.render(null);
      check((html.match(/class="wheel-legend-item"/g)||[]).length === 8,'Нет восьми сфер');
      check(!html.includes('class="wheel-fill"'),'Пустое колесо закрашено');
      check(html.includes('После первого обзора'), 'Нет пояснения пустого состояния');
    });
    test('Оценки 1 и 10 заполняют сектор до одной десятой и полного радиуса', () => {
      const low = W.render(review(Array(8).fill(1))), high = W.render(review(Array(8).fill(10)));
      check((low.match(/class="wheel-fill"/g)||[]).length === 8,'Не заполнены восемь секторов');
      check((low.match(/A 16 16 0 0 1/g)||[]).length === 8,'Оценка 1 не соответствует радиусу 16');
      check((high.match(/class="wheel-fill"[^>]*d="[^"]*A 160 160 0 0 1/g)||[]).length === 8,'Оценка 10 не соответствует радиусу 160');
      check(high.includes('M 220 220 L 220 60'),'Колесо не начинается сверху');
    });
    test('Разные оценки попадают в свои сферы и задают правильный радиус', () => {
      const html = W.render(review([1,2,3,4,5,6,7,8]));
      const paths = Array.from(html.matchAll(/<path class="wheel-fill" data-sphere="([^"]+)" data-score="(\d+)" d="([^"]+)"/g));
      check(paths.length === 8,'Не найдены восемь заполненных секторов');
      const radii = [16,32,48,64,80,96,112,128];
      paths.forEach((match,i) => {check(match[1]===keys[i] && match[2]===String(i+1),'Перепутаны сферы или оценки'); check(match[3].includes(`A ${radii[i]} ${radii[i]} 0 0 1`),'Неверная длина заполнения');});
    });
    test('Колесо имеет текстовое описание оценок и безопасно выводит подпись даты', () => {
      const html = W.render(review([1,2,3,4,5,6,7,8]), {dateText:'<b>Дата</b>'});
      check(html.includes('role="img"') && html.includes('<desc'),'Нет доступного описания');
      check(html.includes('Здоровье: 5 из 10'),'Оценка здоровья отсутствует в описании');
      check(html.includes('&lt;b&gt;Дата&lt;/b&gt;') && !html.includes('<b>Дата</b>'),'Подпись даты не экранирована');
    });
    return results;
  };
})(globalThis);
