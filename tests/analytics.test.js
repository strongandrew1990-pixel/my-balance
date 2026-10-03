(function (root) {
  'use strict';
  root.runAnalyticsTests = function () {
    const A = root.BalanceAnalytics || {}, results = [];
    const keys = ['relationships','money','community','career','health','growth','comfort','hobbies'];
    const review = (date,values,actions=[]) => ({date,scores:Object.fromEntries(keys.map((key,i)=>[key,values[i]])),actions});
    const equal = (actual,expected) => {if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);};
    const check = (condition,message) => {if(!condition)throw new Error(message);};
    const test = (name,fn) => {try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}};
    test('Без обзоров аналитика показывает честное пустое состояние',()=>{
      const data=A.summarize([]); equal(data.attention,null);equal(data.growth,null);equal(data.dynamics,null);equal(data.actions,{completed:0,total:0});
      check(A.render([]).includes('Сохраните первый обзор'),'Нет сообщения первого запуска');
    });
    test('Первый обзор показывает минимум, но не выдумывает рост и динамику',()=>{
      const data=A.summarize([review('2026-09-01',[8,7,6,5,2,9,6,7])]);equal(data.attention.score,2);equal(data.attention.spheres.map(s=>s.id),['health']);equal(data.growth,null);equal(data.dynamics,null);
      check(A.render([review('2026-09-01',Array(8).fill(6))]).includes('Динамика появится после следующего замера.'),'Нет пояснения динамики');
    });
    test('Все сферы с одинаковым минимумом показаны без произвольного выбора',()=>{
      const data=A.summarize([review('2026-09-01',[6,3,6,6,3,6,6,6])]);equal(data.attention.score,3);equal(data.attention.spheres.map(s=>s.id),['money','health']);
      equal(A.summarize([review('2026-09-01',Array(8).fill(6))]).attention.spheres.length,8);
      check(A.render([review('2026-09-01',Array(8).fill(6))]).includes('Все 8 сфер'),'Всеобщее равенство непонятно');
    });
    test('Равный максимальный рост сохраняет обе сферы и правильные счётчики',()=>{
      const old=review('2026-09-01',Array(8).fill(5)),latest=review('2026-09-20',[8,8,5,4,5,5,5,5]);const data=A.summarize([old,latest]);
      equal(data.growth.delta,3);equal(data.growth.spheres.map(s=>s.id),['relationships','money']);equal(data.dynamics,{improved:2,unchanged:5,declined:1});
    });
    test('Среди трёх обзоров сравнение идёт с ближайшим предыдущим по дате',()=>{
      const earliest=review('2026-09-01',Array(8).fill(1)),middle=review('2026-09-15',Array(8).fill(5)),latest=review('2026-09-30',[6,5,5,5,5,5,5,5]);const input=[middle,latest,earliest];const snapshot=JSON.stringify(input);const data=A.summarize(input);
      equal(data.growth.delta,1);equal(data.growth.spheres.map(s=>s.id),['relationships']);equal(data.previous.date,'2026-09-15');equal(JSON.stringify(input),snapshot);
    });
    test('Отсутствие положительного роста отражено при равенстве и снижении',()=>{
      const old=review('2026-09-01',Array(8).fill(7));for(const values of [Array(8).fill(7),Array(8).fill(6)]){const data=A.summarize([old,review('2026-09-20',values)]);equal(data.growth,null);check(A.render([old,review('2026-09-20',values)]).includes('Положительного роста нет.'),'Нет сообщения об отсутствии роста');}
    });
    test('Показатель действий корректен для 0, 1 и 2 действий',()=>{
      const fixtures=[{actions:[],want:'Действия не заданы',completed:0,total:0},{actions:[{done:false}],want:'0 из 1 выполнено',completed:0,total:1},{actions:[{done:true}],want:'1 из 1 выполнено',completed:1,total:1},{actions:[{done:true},{done:false}],want:'1 из 2 выполнено',completed:1,total:2},{actions:[{done:true},{done:true}],want:'2 из 2 выполнено',completed:2,total:2}];
      for(const f of fixtures){const r=review('2026-09-01',Array(8).fill(6),f.actions);equal(A.actionsText(r),f.want);equal(A.summarize([r]).actions,{completed:f.completed,total:f.total});}
    });
    return results;
  };
})(globalThis);
