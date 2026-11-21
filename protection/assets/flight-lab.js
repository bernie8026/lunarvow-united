/* Browser-only flight programming workbench. Commands are a fixed vocabulary,
   not executable code. The simulation never opens a connection to a drone. */
(() => {
  'use strict';
  if (window.PORTFOLIO_FLIGHT_LAB) return;

  const locales = {
    'zh-HK': [
      '無人機編程實驗室','編一條航線，親手試飛','無人機由原點面向北方起飛。排好前進、後退同轉向指令，再播放或者逐步執行，對照預計航線同實際軌跡。','飛行指令','模擬飛行區','虛線係預計航線，實線係已飛路線。每格代表一個單位。','位置 X','位置 Y','朝向','進度','前進','後退','左轉','右轉','格','度','指令','數值','上移','下移','刪除','加一行','正方形範例','清空','試飛','暫停','繼續','逐步執行','返起點','就緒','飛行中','已暫停','航線已完成','加入第一行指令就可以開始。','指令數目已達上限。','請揀有效指令。','移動請輸入 1 至 10 嘅整數；轉向請用 90、180 或 270 度。','航線飛出界，試下縮短距離或者轉向。','第 {n} 行','重新試飛','指令清單','直行 1–10 格；轉向 90°、180° 或 270°。'
    ],
    'zh-CN': [
      '无人机编程实验室','编写航线，模拟试飞','无人机从原点朝北出发。排列前进、后退和转向指令，然后播放或单步执行，对比预计航线与实际轨迹。','飞行指令','模拟飞行区','虚线为预计航线，实线为已飞路线。每格代表一个单位。','位置 X','位置 Y','朝向','进度','前进','后退','左转','右转','格','度','指令','数值','上移','下移','删除','添加一行','正方形示例','清空','试飞','暂停','继续','单步执行','回到起点','就绪','飞行中','已暂停','航线已完成','添加第一行指令即可开始。','指令数量已达上限。','请选择有效指令。','移动请输入 1 至 10 的整数；转向请用 90、180 或 270 度。','航线超出范围，请缩短距离或转向。','第 {n} 行','再次试飞','指令列表','直行 1–10 格；转向 90°、180° 或 270°。'
    ],
    en: [
      'Drone programming lab','Programme a flight','Start at the origin, facing north. Arrange movements and turns, then run the programme or step through it to compare the planned route with the flight trail.','Flight programme','Simulated airspace','Dashed: planned route. Solid: flown route. Each grid square is one unit.','Position X','Position Y','Heading','Progress','Forward','Back','Turn left','Turn right','cells','degrees','Instruction','Amount','Move up','Move down','Delete','Add a line','Square example','Clear','Run','Pause','Resume','Step','Rewind','Ready','Flying','Paused','Flight complete','Add your first instruction to begin.','The instruction limit has been reached.','Choose a valid instruction.','Move 1–10 whole cells, or turn by 90, 180 or 270 degrees.','This route leaves the grid. Shorten the distance or add a turn.','Line {n}','Run again','Instruction list','Move 1–10 cells; turn 90°, 180° or 270°.'
    ],
    ja: [
      'ドローンプログラミングラボ','飛行ルートを組んでみよう','ドローンは原点から北向きに出発します。移動と旋回を並べ、再生または一手ずつ実行して、計画と飛行軌跡を比べましょう。','飛行プログラム','模擬飛行エリア','破線は予定経路、実線は飛行済みの経路です。1 マスが 1 単位です。','X 座標','Y 座標','機首の向き','進行状況','前進','後退','左旋回','右旋回','マス','度','命令','値','上へ','下へ','削除','行を追加','正方形の例','すべて消去','実行','一時停止','再開','一手進める','始点に戻す','準備完了','飛行中','一時停止中','飛行完了','最初の命令を追加してください。','命令数が上限に達しました。','有効な命令を選んでください。','移動は 1～10 の整数、旋回は 90、180、270 度を選んでください。','範囲を超えます。距離を縮めるか旋回を追加してください。','{n} 行目','もう一度実行','命令一覧','移動は 1～10 マス、旋回は 90°、180°、270°です。'
    ],
    ko: [
      '드론 프로그래밍 실험실','나만의 비행 경로 만들기','드론은 원점에서 북쪽을 향해 출발합니다. 이동과 회전 명령을 배열한 뒤 실행하거나 한 단계씩 진행해 계획과 비행 궤적을 비교하세요.','비행 프로그램','모의 비행 구역','점선은 계획 경로, 실선은 비행한 경로입니다. 격자 한 칸이 한 단위입니다.','X 좌표','Y 좌표','기수 방향','진행','전진','후진','좌회전','우회전','칸','도','명령','값','위로','아래로','삭제','줄 추가','정사각형 예시','전체 삭제','실행','일시 정지','계속','한 단계','원점으로','준비됨','비행 중','일시 정지됨','비행 완료','첫 번째 명령을 추가하세요.','명령 수가 한도에 도달했습니다.','올바른 명령을 선택하세요.','이동은 1~10칸의 정수, 회전은 90도, 180도 또는 270도로 입력하세요.','경로가 구역을 벗어납니다. 거리를 줄이거나 방향을 바꾸세요.','{n}번째 줄','다시 실행','명령 목록','이동 1~10칸, 회전 90°, 180° 또는 270°.'
    ],
    th: [
      'ห้องทดลองเขียนโปรแกรมโดรน','เขียนเส้นทางบินของคุณ','โดรนเริ่มจากจุดกำเนิดโดยหันหน้าไปทางทิศเหนือ เรียงคำสั่งเคลื่อนที่และเลี้ยว จากนั้นกดเริ่มหรือทำทีละขั้นเพื่อเปรียบเทียบเส้นทางที่วางแผนไว้กับเส้นทางที่บินจริง','โปรแกรมการบิน','พื้นที่บินจำลอง','เส้นประคือเส้นทางที่วางแผนไว้ เส้นทึบคือเส้นทางที่บินแล้ว หนึ่งช่องเท่ากับหนึ่งหน่วย','ตำแหน่ง X','ตำแหน่ง Y','ทิศหัวโดรน','ความคืบหน้า','เดินหน้า','ถอยหลัง','เลี้ยวซ้าย','เลี้ยวขวา','ช่อง','องศา','คำสั่ง','ค่า','เลื่อนขึ้น','เลื่อนลง','ลบ','เพิ่มบรรทัด','ตัวอย่างสี่เหลี่ยม','ล้างทั้งหมด','เริ่มบิน','พัก','บินต่อ','ทีละขั้น','กลับจุดเริ่ม','พร้อม','กำลังบิน','หยุดชั่วคราว','บินเสร็จแล้ว','เพิ่มคำสั่งแรกเพื่อเริ่มต้น','จำนวนคำสั่งถึงขีดจำกัดแล้ว','กรุณาเลือกคำสั่งที่ถูกต้อง','ระยะทางต้องเป็นจำนวนเต็ม 1–10 ช่อง และมุมเลี้ยวต้องเป็น 90, 180 หรือ 270 องศา','เส้นทางออกนอกพื้นที่ ให้ลดระยะทางหรือเพิ่มคำสั่งเลี้ยว','บรรทัดที่ {n}','บินอีกครั้ง','รายการคำสั่ง','เคลื่อนที่ 1–10 ช่อง เลี้ยว 90°, 180° หรือ 270°'
    ],
    ru: [
      'Лаборатория программирования дронов','Запрограммируйте полёт','Дрон стартует из начала координат носом на север. Расставьте команды движения и поворота, затем запустите программу или выполняйте её по шагам, сравнивая план с траекторией.','Программа полёта','Полётное поле','Пунктир — план, сплошная линия — пройденный путь. Одна клетка равна одной единице.','Координата X','Координата Y','Курс','Выполнено','Вперёд','Назад','Влево','Вправо','кл.','град.','Команда','Значение','Выше','Ниже','Удалить','Добавить строку','Пример: квадрат','Очистить','Запуск','Пауза','Продолжить','Один шаг','В начало','Готово','Полёт','На паузе','Полёт завершён','Добавьте первую команду.','Достигнут предел числа команд.','Выберите допустимую команду.','Для движения задайте целое число от 1 до 10, для поворота — 90, 180 или 270 градусов.','Маршрут выходит за поле. Сократите расстояние или добавьте поворот.','Строка {n}','Ещё раз','Список команд','Движение: 1–10 клеток. Поворот: 90°, 180° или 270°.'
    ]
  };
  const keys = 'eyebrow title intro editor map legend x y heading progress forward back left right cells degrees instruction amount up down remove add example clear run pause resume step reset ready playing paused complete empty limit op invalidAmount bounds line replay list guide'.split(' ');
  const dictionaries = Object.fromEntries(Object.entries(locales).map(([tag,strings])=>[tag,Object.fromEntries(keys.map((k,j)=>[k,strings[j]]))]));
  const ops = ['forward','back','left','right'];
  const make = (tag,cls,attr) => {
    const n=document.createElement(tag); if(cls)n.className=cls;
    for(const [k,v] of Object.entries(attr||{}))n.setAttribute(k,v);
    return n;
  };
  const svg = (tag,attrs) => {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);
    return n;
  };
  function makeFlightCraft() {
    const craft=svg('g',{class:'flight-lab-craft','data-flight-craft':'','aria-hidden':'true'});
    const frame=svg('g',{fill:'none',stroke:'none','stroke-linejoin':'round','stroke-linecap':'round'});
    craft.append(frame);
    const dark='var(--fl-craft-dark,#15201e)', metal='var(--fl-craft-metal,#abc2bb)';
    const light='var(--fl-craft-light,#ecf5ef)', gold='var(--fl-craft-gold,#ffda54)';
    const path=(d,attrs)=>svg('path',{d,...attrs});
    // Each rotor spins around its own (0,0). The motor's outer group carries its offset.
    for (const [x,y,phase] of [[-9,-8,28],[9,-8,-28],[-9,8,-35],[9,8,35]]) {
      const arm='M'+(Math.sign(x)*2)+' '+(Math.sign(y)*2)+' L'+x+' '+y;
      frame.append(path(arm,{stroke:dark,'stroke-width':4}),path(arm,{stroke:metal,'stroke-width':2.3}));
      const motor=svg('g',{transform:'translate('+x+' '+y+')'});
      const phaseGroup=svg('g',{transform:'rotate('+phase+')'});
      const prop=svg('g',{class:'flight-lab-prop','data-spin':x*y>0?'cw':'ccw'});
      const blade='M-.48-.65Q1.9-2.1 4.9-1.9Q5.3-1.65 5.05-.95Q3.2.1 .6.55Z';
      prop.append(path(blade,{fill:light}),path(blade,{fill:light,transform:'rotate(180)'}));
      phaseGroup.append(prop);
      motor.append(svg('circle',{r:5.7,fill:dark,stroke:metal,'stroke-width':.85}),phaseGroup,
        svg('circle',{r:1.15,fill:gold,stroke:dark,'stroke-width':.42}));
      frame.append(motor);
    }
    // The gold forward cowling and camera bar identify the nose; the stern carries the battery.
    frame.append(path('M-4.6-5Q-4.6-7.3-2-7.3H2Q4.6-7.3 4.6-5L3.5 5.7Q3.2 7.2 1.9 7.2H-1.9Q-3.2 7.2-3.5 5.7Z',
      {fill:metal,stroke:dark,'stroke-width':1}),
      path('M-3.7-4.5Q-3.7-6.3-2.2-6.3H2.2Q3.7-6.3 3.7-4.5L2.8-1.6H-2.8Z',{fill:gold}),
      svg('rect',{x:-2.25,y:-9.15,width:4.5,height:2.3,rx:.85,fill:dark,stroke:light,'stroke-width':.75}),
      svg('circle',{cx:0,cy:-8,r:.65,fill:gold}),
      svg('rect',{x:-2.1,y:.05,width:4.2,height:5.7,rx:.8,fill:dark}),
      path('M-.95 1.7H.95M-.95 3.65H.95',{stroke:metal,'stroke-width':.65}));
    return craft;
  }
  const copy=(n,key)=>{n.dataset.flightCopy=key;return n;};
  const action=(name,cls='')=>make('button',cls,{'type':'button','data-flight-action':name});
  const square=()=>Array.from({length:4},()=>[{op:'forward',amount:4},{op:'right',amount:90}]).flat();
  let count=0;
  const instances=new WeakMap();
  function mount(host) {
    const engine=window.PORTFOLIO_FLIGHT_ENGINE;
    if(!host || !engine || typeof engine.compile!=='function')return ()=>{};
    if(instances.has(host))return instances.get(host);
    const controller=new AbortController(), on=(target,event,fn)=>target.addEventListener(event,fn,{signal:controller.signal});
    const id='flight-lab-'+(++count), gridID=id+'-grid';
    const language=()=>{const tag=document.documentElement.lang;return dictionaries[tag]||dictionaries[tag.split('-')[0]]||dictionaries.en;};
    let words=language(), commands=[{op:'forward',amount:4},{op:'right',amount:90},{op:'forward',amount:3}];
    let plan=engine.compile(commands), state='ready', cursor=0, phase=0, raf=0, stamp=null, dead=false;
    const qt=window.matchMedia('(prefers-reduced-motion: reduce)');
    host.classList.add('flight-lab');host.setAttribute('data-flight-lab','');host.setAttribute('aria-labelledby',id+'-title');
    const head=make('header','flight-lab-head');
    const title=copy(make('h2','',{id:id+'-title'}),'title');
    head.append(copy(make('p','ref-eyebrow'),'eyebrow'),title,copy(make('p','flight-lab-intro'),'intro'));
    const deck=make('div','flight-lab-deck'),stage=make('figure','flight-lab-stage',{id:id+'-stage',tabindex:'-1'}),bench=make('div','flight-lab-workbench');
    const map=svg('svg',{class:'flight-lab-map',viewBox:'0 0 320 320',role:'img','aria-labelledby':id+'-map '+id+'-legend'});
    const mapTitle=svg('title',{id:id+'-map'}), defs=svg('defs');
    const pattern=svg('pattern',{id:gridID,x:'20',y:'20',width:'14',height:'14',patternUnits:'userSpaceOnUse'});
    pattern.append(svg('path',{class:'flight-lab-grid',d:'M 14 0 H 0 V 14',fill:'none'}));defs.append(pattern);
    const backdrop=svg('rect',{class:'flight-lab-field',x:20,y:20,width:280,height:280});
    const grid=svg('rect',{x:20,y:20,width:280,height:280,fill:'url(#'+gridID+')'});
    const axis=svg('path',{class:'flight-lab-axis',d:'M20 160H300M160 20V300',fill:'none'});
    const preview=svg('polyline',{class:'flight-lab-planned',fill:'none'}),trail=svg('polyline',{class:'flight-lab-trail',fill:'none'});
    const origin=svg('circle',{class:'flight-lab-start',cx:160,cy:160,r:4});
    const footprint=svg('g',{'aria-hidden':'true'});
    footprint.append(svg('ellipse',{class:'flight-lab-shadow',rx:10.2,ry:5.8}));
    const craft=makeFlightCraft();
    map.append(mapTitle,defs,backdrop,grid,axis,preview,trail,origin);
    for(const [x,y,label] of [[160,14,'N'],[306,163,'X'],[20,314,'−10'],[286,314,'+10']]){
      const t=svg('text',{class:'flight-lab-side',x,y,'text-anchor':label==='N'?'middle':'start'});t.textContent=label;map.append(t);
    }
    map.append(footprint,craft);
    const legend=copy(make('figcaption','flight-lab-legend',{id:id+'-legend'}),'legend');
    const readout=make('dl','flight-lab-readout'), fields={};
    for(const key of ['x','y','heading','progress']){
      const pair=make('div');fields[key]=make('dd','',{['data-flight-'+key]:''});
      pair.append(copy(make('dt'),key),fields[key]);readout.append(pair);
    }

    const editorTitle=copy(make('h3','',{id:id+'-editor'}),'editor'), guide=copy(make('p','flight-lab-guide',{id:id+'-guide'}),'guide');
    const rows=make('ol','flight-lab-program',{'aria-labelledby':id+'-editor'});
    const controls=make('div','flight-lab-controls'), transport=make('div','flight-lab-transport'),buttons={};
    for(const key of ['add','example','clear','run','step','reset']){
      buttons[key]=copy(action(key),key);
      (['add','example','clear'].includes(key)?controls:transport).append(buttons[key]);
    }
    const status=make('p','flight-lab-status',{'data-flight-status':'',role:'status','aria-live':'polite','aria-atomic':'true'});
    // Keep flight controls with the map on small screens; a long programme
    // always has a direct route back to the stage after its last instruction.
    const viewLink=copy(make('a','flight-lab-view',{href:'#'+stage.id}),'map');
    controls.append(viewLink);
    stage.append(map,readout,transport,legend);
    bench.append(editorTitle,guide,rows,controls,status);deck.append(stage,bench);host.replaceChildren(head,deck);
    const isTurn=op=>op==='right'||op==='left';
    const coord=s=>[(160+s.x*14),(160-s.y*14)];
    const points=states=>states.map(s=>coord(s).join(',')).join(' ');
    function draw(position) {
      const base=plan.states[cursor] || {x:0,y:0,heading:0}, pose=position||base;
      const [x,y]=coord(pose);
      const location='translate('+x+' '+y+')';
      footprint.setAttribute('transform',location);
      craft.setAttribute('transform',location+' rotate('+pose.heading+')');
      trail.setAttribute('points',points(plan.states.slice(0,cursor+1).concat([pose])));
      for(const [key,text] of [['x',String(base.x)],['y',String(base.y)],['heading',base.heading+'°'],['progress',cursor+' / '+commands.length]]) {
        if(fields[key].textContent!==text)fields[key].textContent=text;
      }
    }
    function stateUI() {
      host.dataset.flightState=state;
      const playing=state==='playing';
      buttons.run.textContent=words[playing?'pause':state==='paused'?'resume':state==='complete'?'replay':'run'];
      buttons.run.disabled=!plan.ok;buttons.step.disabled=playing||!plan.ok||state==='complete';
      buttons.reset.disabled=state==='ready'||state==='invalid';
      buttons.add.disabled=playing||commands.length>=engine.limits.maxCommands;
      buttons.clear.disabled=playing||!commands.length;buttons.example.disabled=playing;
      Array.from(rows.children).forEach((row,i)=>{
        const [op,value]=[row.querySelector('select'),row.querySelector('input')];
        op.disabled=playing;value.disabled=playing;
        const actions=row.querySelectorAll('button');
        actions[0].disabled=playing||i===0;actions[1].disabled=playing||i===commands.length-1;actions[2].disabled=playing;
        if(i===cursor&&(state==='playing'||state==='paused')) row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');
        const error=plan.error?.index===i&&plan.error.code==='amount';
        if(error)value.setAttribute('aria-invalid','true');else value.removeAttribute('aria-invalid');
      });
      let msg=words[state];
      if(!plan.ok){
        const e=plan.error, err=words[e.code==='amount'?'invalidAmount':e.code]||words.op;
        msg=(e.code==='bounds'||e.code==='amount'||e.code==='op'?words.line.replace('{n}',String(e.index+1))+': ':'')+err;
      }else if(playing||state==='paused')msg+=' · '+words.line.replace('{n}',String(Math.min(cursor+1,commands.length)));
      if(status.textContent!==msg)status.textContent=msg;
    }
    function showRows() {
      const frag=document.createDocumentFragment();
      commands.forEach(({op,amount},i)=>{
        const row=make('li','flight-lab-row',{'data-flight-row':i}), line=make('span','flight-lab-line',{'aria-hidden':'true'}), name=words.line.replace('{n}',String(i+1));
        line.textContent=String(i+1).padStart(2,'0');
        const sel=make('select','flight-lab-op',{'data-flight-op':'','aria-label':name+' · '+words.instruction});
        for(const type of ops) {const opt=make('option','',{value:type});opt.textContent=words[type];sel.append(opt);}sel.value=op;
        const turn=isTurn(op), unit=turn?'degrees':'cells';
        const num=make('input','flight-lab-value',{type:'number',min:turn?'90':'1',max:turn?'270':'10',step:turn?'90':'1','data-flight-value':'','aria-label':name+' · '+words.amount+' ('+words[unit]+')','aria-describedby':id+'-guide'});
        num.value=amount;
        const suffix=copy(make('span','flight-lab-unit',{'aria-hidden':'true'}),unit);suffix.textContent=words[unit];
        const group=make('span','flight-lab-row-tools');
        for(const [key,label] of [['up','↑'],['down','↓'],['remove','×']]) {
          const b=action(key);b.textContent=label;b.setAttribute('aria-label',name+' · '+words[key]);b.title=words[key];group.append(b);
        }
        row.append(line,sel,num,suffix,group);frag.append(row);
      });
      rows.replaceChildren(frag);
    }
    function cancel(){if(raf)cancelAnimationFrame(raf);raf=0;stamp=null;}
    function calculate(render=true){
      cancel();cursor=0;phase=0;plan=engine.compile(commands.map(c=>({op:c.op,amount:typeof c.amount==='number'?c.amount:Number(c.amount)})));
      state=plan.ok?'ready':'invalid';if(render)showRows();
      preview.setAttribute('points',points(plan.states));draw();stateUI();
    }
    function updateCopy(){
      words=language();for(const el of host.querySelectorAll('[data-flight-copy]'))el.textContent=words[el.dataset.flightCopy];
      mapTitle.textContent=words.map;showRows();stateUI();
    }
    function pause(){
      if(state!=='playing')return;
      cancel();state='paused';stateUI();
    }
    function tick(now){
      raf=0;if(state!=='playing'||dead)return;
      if(document.hidden||!host.isConnected){pause();return;}
      const cmd=commands[cursor],a=plan.states[cursor],b=plan.states[cursor+1];
      const reduced=qt.matches||document.body.classList.contains('motion-paused');
      const elapsed=stamp===null?0:Math.max(0,Math.min(now-stamp,100));
      stamp=now;phase=Math.min(1,phase+elapsed/(reduced?650:(isTurn(cmd.op)?360+cmd.amount*2.1:350+cmd.amount*135)));
      if(phase>=1){
        cursor++;phase=0;draw();
        if(cursor===commands.length){state='complete';stamp=null;stateUI();return;}
        stateUI();
      }else if(!reduced){
        const t=phase*phase*(3-2*phase);
        const delta=isTurn(cmd.op)?(cmd.op==='left'?-1:1)*cmd.amount:0;
        draw({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:a.heading+delta*t});
      }
      raf=requestAnimationFrame(tick);
    }
    function run(){
      if(state==='playing'){pause();return;}
      if(!plan.ok||document.hidden)return;
      if(state==='complete'){cursor=0;phase=0;draw();}
      state='playing';stamp=null;stateUI();raf=requestAnimationFrame(tick);
    }
    function focusAt(i,selector){
      const row=rows.children[i];(row?.querySelector(selector)||buttons.add).focus({preventScroll:true});
    }
    on(host,'click',event=>{
      const b=event.target.closest('button[data-flight-action]');if(!b||!host.contains(b)||b.disabled)return;
      const key=b.dataset.flightAction;
      if(key==='run'){run();return;}
      if(key==='reset'){calculate(false);return;}
      if(key==='step'){
        if(!plan.ok||state==='playing'||cursor>=commands.length)return;
        cursor++;phase=0;state=cursor===commands.length?'complete':'paused';draw();stateUI();return;
      }
      if(state==='playing')return;
      if(key==='add'&&commands.length<engine.limits.maxCommands){commands.push({op:'forward',amount:1});calculate();focusAt(commands.length-1,'select');return;}
      if(key==='example'){commands=square();calculate();return;}
      if(key==='clear'){commands=[];calculate();buttons.add.focus();return;}
      const target=b.closest('[data-flight-row]');if(!target)return;
      const i=Number(target.dataset.flightRow), step=key==='up'?-1:key==='down'?1:0;
      if(key==='remove'){commands.splice(i,1);calculate();focusAt(Math.min(i,commands.length-1),'select');return;}
      if(step&&commands[i+step]){
        [commands[i],commands[i+step]]=[commands[i+step],commands[i]];calculate();
        const selector='[data-flight-action="'+key+'"]:not(:disabled)';
        focusAt(i+step,rows.children[i+step]?.querySelector(selector)?selector:'select');
      }
    });
    on(rows,'change',event=>{
      if(!event.target.matches('select'))return;
      const i=Number(event.target.closest('li').dataset.flightRow), action=event.target.value;
      if(!ops.includes(action))return;
      if(isTurn(commands[i].op)!==isTurn(action))commands[i].amount=isTurn(action)?90:1;
      commands[i].op=action;calculate();focusAt(i,'select');
    });
    on(rows,'input',event=>{
      if(!event.target.matches('input'))return;
      const i=Number(event.target.closest('li').dataset.flightRow);
      commands[i].amount=event.target.value;calculate(false);
    });
    on(document,'visibilitychange',()=>{if(document.hidden)pause();});
    on(document,'portfolio:language',updateCopy);
    on(window,'pagehide',pause);
    function dispose(){if(dead)return;dead=true;cancel();controller.abort();instances.delete(host);}
    instances.set(host,dispose);calculate();updateCopy();return dispose;
  }
  window.PORTFOLIO_FLIGHT_LAB=Object.freeze({mount});
})();
