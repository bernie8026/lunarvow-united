"use strict";
(() => {
  const runtime = window.PORTFOLIO_REFERENCE_MEDIA;
  if (!runtime?.register) return;
  runtime.register("stem", ctx => {
    const chapter = document.createElement("div");
    chapter.className = "ref-chapter ref-stem";
    chapter.innerHTML = `
      <style>
        .ref-stem{--stem-accent:var(--ref-accent,#16c8e3)}.ref-stem .ref-eyebrow{color:var(--stem-accent)}
        .ref-stem-hero-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(28px,5vw,72px);align-items:center}
        .ref-stem .ref-stem-hero-title{font-size:clamp(42px,6.1vw,84px);font-weight:500;line-height:1.16;letter-spacing:-.055em;margin:20px 0 28px;text-wrap:balance}
        .ref-stem-tags{display:flex;gap:8px;flex-wrap:wrap;margin:28px 0 0}.ref-stem-tags span{border:1px solid #4bc2d94a;padding:8px 11px;color:inherit;font:10px/1.5 monospace;letter-spacing:.07em}
        .ref-stem-product{margin:0;border:1px solid #6fb4c142;background:#fff;overflow:hidden}.ref-stem-product img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:contain}
        .ref-stem-product figcaption{padding:16px 20px;background:#081621;color:#bdd2dc;border-top:1px solid #285565;font-size:12px;line-height:1.7}
        .ref-stem-section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.75fr);gap:32px;align-items:end;margin-bottom:32px}.ref-stem .ref-stem-section-head .ref-section-title{margin-bottom:0!important}.ref-stem-section-head p{margin:0}
        .ref-stem-hardware-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.7fr);gap:clamp(24px,4vw,58px);align-items:start}
        .ref-stem-hardware-photo{position:relative;overflow:hidden;background:#e8e5db}.ref-stem-hardware-photo img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
        .ref-stem-marker{position:absolute;display:grid;place-items:center;left:var(--marker-x);top:var(--marker-y);transform:translate(-50%,-50%);width:36px;height:36px;border:1px solid #e3fcff;background:#062d3ae6;color:#fff;font:11px/1 monospace;box-shadow:0 0 0 6px #08c1db20;transition:opacity .2s,box-shadow .2s;opacity:.45;border-radius:50%}
        .ref-stem-marker[data-active=true]{opacity:1;box-shadow:0 0 0 9px #00d0eb35}
        .ref-stem-parts{display:grid;gap:0;border-top:1px solid #66adc53d}.ref-stem-part{display:block;width:100%;border:0;border-bottom:1px solid #66adc53d;background:transparent;color:inherit;text-align:left;padding:20px 0;cursor:pointer;min-height:68px}
        .ref-stem-part-heading{display:flex;align-items:center;gap:15px;font-size:clamp(17px,1.8vw,22px);line-height:1.5}.ref-stem-part-number{font:11px/1.5 monospace;color:#7f9eab}.ref-stem-part[aria-pressed=true] .ref-stem-part-number{color:var(--stem-accent)}.ref-stem-part[aria-pressed=true] .ref-stem-part-heading{color:var(--stem-accent)}
        .ref-stem-part-copy{display:block;margin:11px 0 0 31px;font-size:13px;line-height:1.9;opacity:.75}.ref-stem-part[aria-pressed=false] .ref-stem-part-copy{display:none}.ref-stem-part:focus-visible{outline:2px solid var(--stem-accent);outline-offset:5px}
        .ref-stem-photo-caption{font-size:11px;line-height:1.8;opacity:.65;margin:14px 0 0}.ref-stem-lab-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(28px,5vw,72px);align-items:center}.ref-stem-lab-figure{margin:0}.ref-stem-lab-figure img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
        .ref-stem-mission-list{counter-reset:mission;margin:32px 0 0;padding:0;list-style:none}.ref-stem-mission-list li{counter-increment:mission;display:grid;grid-template-columns:32px minmax(0,1fr);gap:14px;padding:17px 0;border-top:1px solid #66adc52d}.ref-stem-mission-list li:before{content:"0" counter(mission);font:11px/1.8 monospace;color:var(--stem-accent)}.ref-stem-mission-list strong{display:block;font-size:16px;font-weight:500;line-height:1.5}.ref-stem-mission-list p{font-size:12px;line-height:1.8;opacity:.7;margin:6px 0 0}
        .ref-stem-flight{margin:0}.ref-stem-flight video{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#091520;object-fit:cover}.ref-stem-flight figcaption{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:18px 0;font-size:12px;line-height:1.8;opacity:.72;border-bottom:1px solid #66adc533}.ref-stem-film-index{font:11px/1.8 monospace;letter-spacing:.1em;color:var(--stem-accent)}
        @media(max-width:900px){.ref-stem-hero-grid,.ref-stem-hardware-grid,.ref-stem-lab-grid{grid-template-columns:1fr}.ref-stem-section-head{grid-template-columns:1fr;gap:18px}.ref-stem-hero-title{max-width:680px}.ref-stem-parts{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.ref-stem-lab-figure{order:2}}
        @media(max-width:540px){.ref-stem .ref-stem-hero-title{font-size:clamp(38px,10vw,55px)}.ref-stem-product figcaption{padding:13px 16px}.ref-stem-marker{width:29px;height:29px;font-size:10px}.ref-stem-parts{grid-template-columns:1fr}.ref-stem-part{padding:15px 0}.ref-stem-part-copy{font-size:12px}.ref-stem-tags{margin-top:22px}.ref-stem-flight figcaption{font-size:11px;gap:6px}}
        @media(prefers-reduced-motion:reduce){.ref-stem-marker{transition:none}}
      </style>
      <header class="ref-hero">
        <p class="ref-eyebrow">08 / AEROVATE — STEM STUDIES</p>
        <div class="ref-stem-hero-grid">
          <div>
            <h1 class="ref-stem-hero-title" data-ref-copy="heroTitle"></h1>
            <p class="ref-lead" data-ref-copy="heroLead"></p>
            <div class="ref-stem-tags"><span data-ref-copy="conceptTag"></span><span data-ref-copy="referenceTag"></span></div>
          </div>
          <figure class="ref-stem-product">
            <img data-stem-image="tello-reference.jpg" data-ref-alt="telloAlt" width="1280" height="853" fetchpriority="high" decoding="async">
            <figcaption data-ref-copy="telloCaption"></figcaption>
          </figure>
        </div>
      </header>
      <section class="ref-section" aria-labelledby="ref-stem-hardware-title">
        <div class="ref-stem-section-head">
          <div><p class="ref-eyebrow">01 / HARDWARE</p><h2 id="ref-stem-hardware-title" class="ref-section-title" data-ref-copy="hardwareTitle"></h2></div>
          <p class="ref-lead" data-ref-copy="hardwareLead"></p>
        </div>
        <div class="ref-stem-hardware-grid">
          <figure class="ref-figure">
            <div class="ref-stem-hardware-photo">
              <img data-stem-image="drone-components.jpg" data-ref-alt="componentsAlt" width="1280" height="960" loading="lazy" decoding="async">
              <span class="ref-stem-marker" data-stem-marker="0" data-active="true" style="--marker-x:50%;--marker-y:51%" aria-hidden="true">01</span>
              <span class="ref-stem-marker" data-stem-marker="1" style="--marker-x:23%;--marker-y:23%" aria-hidden="true">02</span>
              <span class="ref-stem-marker" data-stem-marker="2" style="--marker-x:49%;--marker-y:31%" aria-hidden="true">03</span>
              <span class="ref-stem-marker" data-stem-marker="3" style="--marker-x:54%;--marker-y:72%" aria-hidden="true">04</span>
            </div>
            <figcaption class="ref-stem-photo-caption" data-ref-copy="componentsCaption"></figcaption>
          </figure>
          <div class="ref-stem-parts" role="group" aria-labelledby="ref-stem-hardware-title">
            <button type="button" class="ref-stem-part" data-stem-part="0" aria-pressed="true"><span class="ref-stem-part-heading"><span class="ref-stem-part-number" aria-hidden="true">01</span><span data-ref-copy="batteryTitle"></span></span><span class="ref-stem-part-copy" data-ref-copy="batteryCopy"></span></button>
            <button type="button" class="ref-stem-part" data-stem-part="1" aria-pressed="false"><span class="ref-stem-part-heading"><span class="ref-stem-part-number" aria-hidden="true">02</span><span data-ref-copy="motorTitle"></span></span><span class="ref-stem-part-copy" data-ref-copy="motorCopy"></span></button>
            <button type="button" class="ref-stem-part" data-stem-part="2" aria-pressed="false"><span class="ref-stem-part-heading"><span class="ref-stem-part-number" aria-hidden="true">03</span><span data-ref-copy="wiringTitle"></span></span><span class="ref-stem-part-copy" data-ref-copy="wiringCopy"></span></button>
            <button type="button" class="ref-stem-part" data-stem-part="3" aria-pressed="false"><span class="ref-stem-part-heading"><span class="ref-stem-part-number" aria-hidden="true">04</span><span data-ref-copy="frameTitle"></span></span><span class="ref-stem-part-copy" data-ref-copy="frameCopy"></span></button>
          </div>
        </div>
      </section>
      <section class="ref-section">
        <div class="ref-stem-lab-grid">
          <figure class="ref-stem-lab-figure">
            <img data-stem-image="tello-classroom.jpg" data-ref-alt="classroomAlt" width="1280" height="960" loading="lazy" decoding="async">
            <figcaption class="ref-stem-photo-caption" data-ref-copy="classroomCaption"></figcaption>
          </figure>
          <div>
            <p class="ref-eyebrow">02 / LEARN · PLAN · REVIEW</p>
            <h2 class="ref-section-title" data-ref-copy="missionTitle"></h2>
            <p class="ref-lead" data-ref-copy="missionLead"></p>
            <ol class="ref-stem-mission-list">
              <li><div><strong data-ref-copy="observeTitle"></strong><p data-ref-copy="observeCopy"></p></div></li>
              <li><div><strong data-ref-copy="planTitle"></strong><p data-ref-copy="planCopy"></p></div></li>
              <li><div><strong data-ref-copy="compareTitle"></strong><p data-ref-copy="compareCopy"></p></div></li>
              <li><div><strong data-ref-copy="reviewTitle"></strong><p data-ref-copy="reviewCopy"></p></div></li>
            </ol>
          </div>
        </div>
      </section>
      <section class="ref-section" aria-labelledby="ref-stem-flight-title">
        <div class="ref-stem-section-head">
          <div><p class="ref-eyebrow">03 / FLIGHT IN MOTION</p><h2 id="ref-stem-flight-title" class="ref-section-title" data-ref-copy="flightTitle"></h2></div>
          <p class="ref-lead" data-ref-copy="flightLead"></p>
        </div>
        <figure class="ref-stem-flight">
          <video data-ref-video data-ref-autoplay controls muted playsinline loop preload="metadata" width="960" height="540" aria-labelledby="ref-stem-flight-title"></video>
          <figcaption><span data-ref-copy="flightCaption"></span><span class="ref-stem-film-index">REFERENCE FILM / 10 SEC</span></figcaption>
        </figure>
      </section>`;

    const dictionaries = {
      "zh-HK": {
        heroTitle: "由實物，理解飛行。", heroLead: "Aerovate 係一個學生概念。由 Tello 教育無人機同真實硬件影像出發，將結構、編程同觀察連埋一齊。", conceptTag: "AEROVATE / 學生概念", referenceTag: "TELLO / 教育參考", telloAlt: "裝有螺旋槳保護罩嘅白色 Ryze Tello 四旋翼實物相", telloCaption: "Ryze Tello 實物參考 · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "睇得見嘅結構。", hardwareLead: "按各個部件，對照真實 DIY 四旋翼入面嘅電源、推進同連接方式。", componentsAlt: "DIY 四旋翼俯視相，可見綠色螺旋槳、中央電池、線材同機架", componentsCaption: "DIY 四旋翼結構參考，並非 Tello 內部構造或 Aerovate 原型。攝影：SKsiddhartthan。", partsLabel: "選擇硬件部件", batteryTitle: "電池與重心", batteryCopy: "中央電池為四組馬達供電。觀察佢喺機身中間嘅位置，同固定方式。", motorTitle: "馬達與螺旋槳", motorCopy: "四角嘅馬達帶動螺旋槳。真實葉片、安裝位置同旋轉空間，都比抽象線條更容易理解。", wiringTitle: "線材與連接", wiringCopy: "沿住機臂睇電線點樣連到中央，理解電源同訊號要經過邊啲位置。", frameTitle: "機架與配置", frameCopy: "機架連接四組推進部件，亦承托電池同線路。對照佈局，思考重量同空間分配。",
        missionTitle: "先觀察，再設計。", missionLead: "Tello EDU 係教育編程嘅參考；Aerovate 由呢啲可見嘅實物同學習步驟，整理自己嘅概念方向。", classroomAlt: "實驗室桌面上擺放一架白色 Tello 同兩架黑色 Tello EDU", classroomCaption: "Tello / Tello EDU 教育器材參考 · ZLEA / Wikimedia Commons", observeTitle: "對照器材", observeCopy: "先分清機身、螺旋槳、電池同可用空間。", planTitle: "安排步驟", planCopy: "將一個任務拆成起點、動作同結束條件。", compareTitle: "觀察動態", compareCopy: "睇機身懸停時點樣微調，將動作同原本計劃對照。", reviewTitle: "記錄與修正", reviewCopy: "保留觀察結果，再調整下一輪嘅想法。",
        flightTitle: "真實飛行，細看動態。", flightLead: "用播放進度逐段睇清楚懸停時嘅機身同螺旋槳。影片係外部四旋翼參考。", videoLabel: "四旋翼懸停參考影片，Project Kei 攝影", flightCaption: "四旋翼懸停參考 · Project Kei。並非 Tello 或 Aerovate 試飛紀錄。"
      },
      en: {
        heroTitle: "Understand flight through real things.", heroLead: "Aerovate is a student concept. Real hardware and Tello educational drones provide a starting point for connecting structure, programming and observation.", conceptTag: "AEROVATE / STUDENT CONCEPT", referenceTag: "TELLO / EDUCATIONAL REFERENCE", telloAlt: "A white Ryze Tello quadcopter with propeller guards", telloCaption: "Ryze Tello hardware reference · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "Structure you can see.", hardwareLead: "Select a component and compare power, propulsion and connections on a real DIY quadcopter.", componentsAlt: "Top view of a DIY quadcopter with green propellers, a central battery, wiring and frame", componentsCaption: "DIY quadcopter reference, not Tello internals or an Aerovate prototype. Photo: SKsiddhartthan.", partsLabel: "Choose a hardware component", batteryTitle: "Battery and balance", batteryCopy: "The central battery powers four motors. Observe its position and how it is secured to the frame.", motorTitle: "Motors and propellers", motorCopy: "Four corner motors drive the propellers. Real blades, mounting points and clearances make the layout tangible.", wiringTitle: "Wiring and connections", wiringCopy: "Follow the cables along the arms towards the centre to see how power and signals reach the components.", frameTitle: "Frame and layout", frameCopy: "The frame connects the propulsion units and carries the battery and wiring. Compare how weight and space are arranged.",
        missionTitle: "Observe first. Then design.", missionLead: "Tello EDU is an educational programming reference. Aerovate uses visible hardware and a simple learning process to shape its concept.", classroomAlt: "One white Tello and two black Tello EDU drones on a classroom workbench", classroomCaption: "Tello / Tello EDU education reference · ZLEA / Wikimedia Commons", observeTitle: "Compare the hardware", observeCopy: "Identify the body, propellers, battery and available space.", planTitle: "Arrange the steps", planCopy: "Break a task into its starting point, actions and finishing conditions.", compareTitle: "Watch the movement", compareCopy: "Observe the small adjustments during hovering and compare them with the plan.", reviewTitle: "Record and revise", reviewCopy: "Keep the observations and use them to refine the next idea.",
        flightTitle: "Real flight. A closer look.", flightLead: "Use the playback timeline to study the body and propellers during a hover. This is external quadcopter reference footage.", videoLabel: "Quadcopter hovering reference video by Project Kei", flightCaption: "Hovering quadcopter reference · Project Kei. This is not Tello or Aerovate test footage."
      },
      "zh-CN": {
        heroTitle: "从实物，理解飞行。", heroLead: "Aerovate 是一个学生概念。从 Tello 教育无人机和真实硬件影像出发，连接结构、编程与观察。", conceptTag: "AEROVATE / 学生概念", referenceTag: "TELLO / 教育参考", telloAlt: "装有螺旋桨保护罩的白色 Ryze Tello 四旋翼实物照片", telloCaption: "Ryze Tello 实物参考 · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "看得见的结构。", hardwareLead: "选择各个部件，对照真实 DIY 四旋翼中的电源、推进与连接方式。", componentsAlt: "DIY 四旋翼俯视照片，可见绿色螺旋桨、中央电池、线材与机架", componentsCaption: "DIY 四旋翼结构参考，并非 Tello 内部构造或 Aerovate 原型。摄影：SKsiddhartthan。", partsLabel: "选择硬件部件", batteryTitle: "电池与重心", batteryCopy: "中央电池为四组电机供电。观察它在机身中间的位置和固定方式。", motorTitle: "电机与螺旋桨", motorCopy: "四角的电机带动螺旋桨。真实叶片、安装位置与旋转空间，让布局更容易理解。", wiringTitle: "线材与连接", wiringCopy: "沿机臂观察电线如何连接到中央，理解电源与信号的路径。", frameTitle: "机架与布局", frameCopy: "机架连接四组推进部件，也承托电池和线路。对照布局，思考重量与空间分配。",
        missionTitle: "先观察，再设计。", missionLead: "Tello EDU 是教育编程的参考；Aerovate 从这些可见的实物和学习步骤，整理自己的概念方向。", classroomAlt: "实验室桌面上摆放一架白色 Tello 和两架黑色 Tello EDU", classroomCaption: "Tello / Tello EDU 教育器材参考 · ZLEA / Wikimedia Commons", observeTitle: "对照器材", observeCopy: "先分清机身、螺旋桨、电池和可用空间。", planTitle: "安排步骤", planCopy: "将任务拆成起点、动作和结束条件。", compareTitle: "观察动态", compareCopy: "观察悬停时的机身微调，并与原计划对照。", reviewTitle: "记录与修正", reviewCopy: "保留观察结果，再调整下一轮的想法。",
        flightTitle: "真实飞行，细看动态。", flightLead: "使用播放进度，逐段看清悬停时的机身与螺旋桨。影片是外部四旋翼参考。", videoLabel: "Project Kei 拍摄的四旋翼悬停参考视频", flightCaption: "四旋翼悬停参考 · Project Kei。并非 Tello 或 Aerovate 试飞记录。"
      },
      ja: {
        heroTitle: "実物から、飛行を知る。", heroLead: "Aerovate は学生の構想です。Tello 教育用ドローンと実際の機材を手がかりに、構造・プログラミング・観察をつなげます。", conceptTag: "AEROVATE / 学生の構想", referenceTag: "TELLO / 教育用の参考", telloAlt: "プロペラガード付きの白い Ryze Tello クアッドコプター", telloCaption: "Ryze Tello の実機参考 · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "目で確かめる構造。", hardwareLead: "部品を選び、実際の自作クアッドコプターの電源・推進・配線を見比べます。", componentsAlt: "緑のプロペラ、中央のバッテリー、配線、フレームが見える自作機の上面写真", componentsCaption: "自作クアッドコプターの参考写真。Tello の内部構造や Aerovate の試作機ではありません。撮影：SKsiddhartthan。", partsLabel: "機体の部品を選択", batteryTitle: "バッテリーと重心", batteryCopy: "中央のバッテリーが四つのモーターに電力を供給します。配置と固定方法を観察します。", motorTitle: "モーターとプロペラ", motorCopy: "四隅のモーターがプロペラを回します。実際の形状と取り付け位置、周囲の空間を見ます。", wiringTitle: "配線と接続", wiringCopy: "アームから中央へ延びるケーブルを追い、電力と信号のつながりを確かめます。", frameTitle: "フレームと配置", frameCopy: "フレームは推進部とバッテリー、配線を支えます。重量と空間の配分を考えます。",
        missionTitle: "観察してから、設計する。", missionLead: "Tello EDU は教育用プログラミングの参考です。Aerovate は実物と学習の手順から構想を整理します。", classroomAlt: "教室の作業台に置かれた白い Tello 一機と黒い Tello EDU 二機", classroomCaption: "Tello / Tello EDU の教育用参考 · ZLEA / Wikimedia Commons", observeTitle: "機材を見比べる", observeCopy: "機体、プロペラ、バッテリーと空間を確認します。", planTitle: "手順を組み立てる", planCopy: "課題を開始地点、動作、終了条件に分けます。", compareTitle: "動きを観察する", compareCopy: "ホバリング中の小さな調整を計画と見比べます。", reviewTitle: "記録して見直す", reviewCopy: "観察結果を残し、次の案を修正します。",
        flightTitle: "実際の飛行を、じっくり。", flightLead: "再生位置を動かし、ホバリング中の機体とプロペラを観察できます。外部の参考映像です。", videoLabel: "Project Kei 撮影のホバリング参考動画", flightCaption: "ホバリングするクアッドコプター · Project Kei。Tello や Aerovate の試験飛行ではありません。"
      },
      ko: {
        heroTitle: "실물에서 비행을 배우다.", heroLead: "Aerovate는 학생의 구상입니다. Tello 교육용 드론과 실제 하드웨어를 보며 구조, 프로그래밍, 관찰을 연결합니다.", conceptTag: "AEROVATE / 학생 구상", referenceTag: "TELLO / 교육용 참고", telloAlt: "프로펠러 보호대를 장착한 흰색 Ryze Tello 쿼드콥터", telloCaption: "Ryze Tello 실물 참고 · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "눈으로 보는 구조.", hardwareLead: "부품을 선택하고 실제 DIY 쿼드콥터의 전원, 추진 장치와 배선을 비교합니다.", componentsAlt: "초록색 프로펠러, 중앙 배터리, 배선과 프레임이 보이는 DIY 쿼드콥터의 위쪽 사진", componentsCaption: "DIY 쿼드콥터 참고 사진이며 Tello 내부나 Aerovate 시제품이 아닙니다. 사진: SKsiddhartthan.", partsLabel: "하드웨어 부품 선택", batteryTitle: "배터리와 무게중심", batteryCopy: "중앙 배터리는 네 모터에 전원을 공급합니다. 위치와 프레임에 고정한 방식을 살펴봅니다.", motorTitle: "모터와 프로펠러", motorCopy: "네 모서리의 모터가 프로펠러를 돌립니다. 실제 날개 모양, 장착 위치와 여유 공간을 관찰합니다.", wiringTitle: "배선과 연결", wiringCopy: "암을 따라 중앙으로 이어지는 전선을 보며 전원과 신호의 경로를 이해합니다.", frameTitle: "프레임과 배치", frameCopy: "프레임은 추진 장치를 연결하고 배터리와 배선을 지탱합니다. 무게와 공간의 배분을 살펴봅니다.",
        missionTitle: "먼저 관찰하고 설계하다.", missionLead: "Tello EDU는 교육용 프로그래밍의 참고 사례입니다. Aerovate는 실물과 학습 과정을 바탕으로 구상을 정리합니다.", classroomAlt: "교실 작업대 위의 흰색 Tello 한 대와 검은색 Tello EDU 두 대", classroomCaption: "Tello / Tello EDU 교육용 참고 · ZLEA / Wikimedia Commons", observeTitle: "기재 비교", observeCopy: "기체, 프로펠러, 배터리와 사용 가능한 공간을 구분합니다.", planTitle: "단계 계획", planCopy: "과제를 출발점, 동작과 종료 조건으로 나눕니다.", compareTitle: "움직임 관찰", compareCopy: "호버링 중 작은 자세 조정을 계획과 비교합니다.", reviewTitle: "기록과 수정", reviewCopy: "관찰 결과를 남기고 다음 아이디어를 개선합니다.",
        flightTitle: "실제 비행을 자세히.", flightLead: "재생 타임라인을 움직여 호버링 중 기체와 프로펠러를 살펴보세요. 외부 참고 영상입니다.", videoLabel: "Project Kei의 쿼드콥터 호버링 참고 영상", flightCaption: "쿼드콥터 호버링 참고 · Project Kei. Tello나 Aerovate 시험 비행 기록이 아닙니다."
      },
      th: {
        heroTitle: "เข้าใจการบินจากของจริง", heroLead: "Aerovate เป็นแนวคิดของนักเรียน ใช้โดรนการศึกษา Tello และภาพฮาร์ดแวร์จริงเป็นจุดเริ่มต้น เพื่อเชื่อมโครงสร้าง การเขียนโปรแกรม และการสังเกต", conceptTag: "AEROVATE / แนวคิดนักเรียน", referenceTag: "TELLO / สื่ออ้างอิงการศึกษา", telloAlt: "โดรน Ryze Tello สีขาวพร้อมโครงป้องกันใบพัด", telloCaption: "ภาพอ้างอิง Ryze Tello · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "โครงสร้างที่มองเห็นได้", hardwareLead: "เลือกชิ้นส่วนเพื่อเทียบแหล่งจ่ายไฟ ระบบขับเคลื่อน และสายเชื่อมต่อบนโดรน DIY จริง", componentsAlt: "ภาพมุมบนของโดรน DIY แสดงใบพัดสีเขียว แบตเตอรี่กลางลำ สายไฟ และโครง", componentsCaption: "ภาพอ้างอิงโดรน DIY ไม่ใช่ภายใน Tello หรือต้นแบบ Aerovate ภาพ: SKsiddhartthan", partsLabel: "เลือกชิ้นส่วนฮาร์ดแวร์", batteryTitle: "แบตเตอรี่และสมดุล", batteryCopy: "แบตเตอรี่ตรงกลางจ่ายไฟให้มอเตอร์สี่ตัว สังเกตตำแหน่งและวิธียึดกับโครง", motorTitle: "มอเตอร์และใบพัด", motorCopy: "มอเตอร์ที่มุมทั้งสี่หมุนใบพัด ดูรูปทรง จุดติดตั้ง และระยะว่างจากชิ้นส่วนจริง", wiringTitle: "สายไฟและการเชื่อมต่อ", wiringCopy: "ตามแนวสายจากแขนเข้าสู่ส่วนกลาง เพื่อเข้าใจเส้นทางของกำลังไฟและสัญญาณ", frameTitle: "โครงและการจัดวาง", frameCopy: "โครงเชื่อมระบบขับเคลื่อนและรองรับแบตเตอรี่กับสายไฟ ลองเทียบการกระจายน้ำหนักและพื้นที่",
        missionTitle: "สังเกตก่อน แล้วค่อยออกแบบ", missionLead: "Tello EDU เป็นตัวอย่างการเขียนโปรแกรมเพื่อการศึกษา Aerovate ใช้ของจริงและขั้นตอนการเรียนรู้เพื่อพัฒนาแนวคิด", classroomAlt: "Tello สีขาวหนึ่งลำและ Tello EDU สีดำสองลำบนโต๊ะในห้องเรียน", classroomCaption: "สื่ออ้างอิง Tello / Tello EDU · ZLEA / Wikimedia Commons", observeTitle: "เทียบอุปกรณ์", observeCopy: "แยกลำตัว ใบพัด แบตเตอรี่ และพื้นที่ที่ใช้ได้", planTitle: "จัดลำดับขั้นตอน", planCopy: "แบ่งงานเป็นจุดเริ่มต้น การเคลื่อนที่ และเงื่อนไขสิ้นสุด", compareTitle: "สังเกตการเคลื่อนที่", compareCopy: "ดูการปรับตัวเล็กน้อยขณะลอยนิ่ง แล้วเทียบกับแผน", reviewTitle: "บันทึกและปรับปรุง", reviewCopy: "เก็บผลการสังเกตเพื่อปรับแนวคิดครั้งต่อไป",
        flightTitle: "ดูการบินจริงอย่างใกล้ชิด", flightLead: "เลื่อนไทม์ไลน์เพื่อสังเกตลำตัวและใบพัดขณะลอยนิ่ง นี่คือวิดีโออ้างอิงจากภายนอก", videoLabel: "วิดีโออ้างอิงโดรนลอยนิ่ง โดย Project Kei", flightCaption: "วิดีโออ้างอิงโดรนลอยนิ่ง · Project Kei ไม่ใช่การทดสอบ Tello หรือ Aerovate"
      },
      ru: {
        heroTitle: "Понять полёт через реальные вещи.", heroLead: "Aerovate — студенческий концепт. Учебные дроны Tello и настоящие устройства помогают связать конструкцию, программирование и наблюдение.", conceptTag: "AEROVATE / СТУДЕНЧЕСКИЙ КОНЦЕПТ", referenceTag: "TELLO / УЧЕБНЫЙ ПРИМЕР", telloAlt: "Белый квадрокоптер Ryze Tello с защитой пропеллеров", telloCaption: "Реальный Ryze Tello · SimonWaldherr / Wikimedia Commons",
        hardwareTitle: "Конструкция, которую видно.", hardwareLead: "Выберите компонент и изучите питание, двигатели и соединения настоящего самодельного квадрокоптера.", componentsAlt: "Вид сверху на самодельный квадрокоптер с зелёными пропеллерами, аккумулятором, проводами и рамой", componentsCaption: "Пример самодельного квадрокоптера, а не устройство Tello или прототип Aerovate. Фото: SKsiddhartthan.", partsLabel: "Выбор компонента", batteryTitle: "Аккумулятор и баланс", batteryCopy: "Центральный аккумулятор питает четыре двигателя. Посмотрите, где он расположен и как закреплён.", motorTitle: "Двигатели и пропеллеры", motorCopy: "Четыре двигателя вращают пропеллеры. Настоящие лопасти, крепления и зазоры помогают понять компоновку.", wiringTitle: "Провода и соединения", wiringCopy: "Проследите провода от лучей к центру, чтобы увидеть путь питания и сигналов.", frameTitle: "Рама и компоновка", frameCopy: "Рама соединяет двигатели и удерживает аккумулятор и проводку. Сравните распределение веса и пространства.",
        missionTitle: "Сначала наблюдать, потом проектировать.", missionLead: "Tello EDU служит примером для учебного программирования. Aerovate формирует концепт на основе реальных устройств и последовательного обучения.", classroomAlt: "Один белый Tello и два чёрных Tello EDU на учебном столе", classroomCaption: "Учебные Tello / Tello EDU · ZLEA / Wikimedia Commons", observeTitle: "Сравнить оборудование", observeCopy: "Определить корпус, пропеллеры, аккумулятор и свободное место.", planTitle: "Спланировать этапы", planCopy: "Разделить задачу на начало, действия и условия завершения.", compareTitle: "Наблюдать движение", compareCopy: "Сравнить небольшие коррекции при зависании с планом.", reviewTitle: "Записать и уточнить", reviewCopy: "Сохранить наблюдения и улучшить следующую идею.",
        flightTitle: "Реальный полёт крупным планом.", flightLead: "Передвигайте ползунок воспроизведения, чтобы изучить корпус и пропеллеры при зависании. Это сторонняя справочная съёмка.", videoLabel: "Справочное видео зависания квадрокоптера, автор Project Kei", flightCaption: "Зависание квадрокоптера · Project Kei. Это не испытание Tello или Aerovate."
      }
    };

    for (const image of chapter.querySelectorAll("[data-stem-image]")) image.src = ctx.asset(image.getAttribute("data-stem-image"));
    const video = chapter.querySelector("video");
    video.src = ctx.asset("drone-hover.mp4");
    video.poster = ctx.asset("drone-hover-poster.jpg");
    video.muted = true;
    video.defaultMuted = true;

    const buttons = [...chapter.querySelectorAll("[data-stem-part]")];
    const markers = [...chapter.querySelectorAll("[data-stem-marker]")];
    for (const button of buttons) ctx.on(button, "click", () => {
      const selected = button.getAttribute("data-stem-part");
      for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
      for (const marker of markers) marker.setAttribute("data-active", String(marker.getAttribute("data-stem-marker") === selected));
    });
    ctx.bindCopy(chapter, dictionaries);
    const credits = ctx.credits(["tello", "classroom", "components", "hover"]);
    if (credits) chapter.append(credits);
    return chapter;
  });
})();
