"use strict";
(() => {
  const api = window.PORTFOLIO_REFERENCE_MEDIA;
  if (!api) return;
  const copy = {
    "zh-HK": {
      title:"行入真實嘅打燈現場。", intro:"由柔光箱、反光板到攝影師嘅機位，直接睇現場點樣安排一張人像。", film:"人像拍攝幕後短片", caption:"Airam Dato-on · 網上參考影片 · 8.5 秒靜音循環", photo:"真實攝影現場，前景可見燈具同攝影設備。", reference:"MART PRODUCTION · 拍攝現場參考", notes:"由畫面入面，留意三個位置。", softbox:"柔光箱", softboxCopy:"觀察光源同面孔嘅距離，以及柔光箱對住人物嘅方向。", reflector:"反光板", reflectorCopy:"留意模特兒前方嘅弧形銀色反光板，以及下方陰影嘅補光位置。", camera:"攝影師機位", cameraCopy:"留意攝影師同人物之間嘅距離，再對照相機、光源同背景嘅關係。", note:"以上係外部實拍參考；可以用影片原生控制暫停、重播或逐段觀察。"
    },
    en: {
      title:"Step inside a real lighting setup.", intro:"Watch how a softbox, reflector and camera position come together on a portrait shoot.", film:"Behind the scenes of a portrait shoot", caption:"Airam Dato-on · External reference footage · 8.5-second silent loop", photo:"A real production setup with lighting and camera equipment in the foreground.", reference:"MART PRODUCTION · Production reference", notes:"Three things to look for in the scene.", softbox:"Softbox", softboxCopy:"Notice the light’s distance from the face and the direction of the softbox.", reflector:"Reflector", reflectorCopy:"Look for the curved silver reflector in front of the model and the area it fills from below.", camera:"Camera position", cameraCopy:"Compare the photographer’s distance from the subject with the positions of the light and background.", note:"External reference footage. Use the video controls to pause, replay or inspect a moment."
    },
    "zh-CN": {
      title:"走进真实的布光现场。", intro:"从柔光箱、反光板到摄影师机位，直接观察一张人像的现场安排。", film:"人像拍摄幕后短片", caption:"Airam Dato-on · 网络参考视频 · 8.5 秒静音循环", photo:"真实拍摄现场，前景可见灯具和摄影设备。", reference:"MART PRODUCTION · 拍摄现场参考", notes:"在画面中，留意三个位置。", softbox:"柔光箱", softboxCopy:"观察光源与面孔的距离，以及柔光箱朝向人物的方向。", reflector:"反光板", reflectorCopy:"留意模特前方的弧形银色反光板，以及下方阴影的补光位置。", camera:"摄影师机位", cameraCopy:"对照摄影师与人物的距离，再观察相机、光源和背景的关系。", note:"以上为外部实拍参考；可使用视频原生控制暂停、重播或分段观察。"
    },
    ja: {
      title:"実際のライティング現場へ。", intro:"ソフトボックス、レフ板、カメラの位置。ポートレート撮影での配置を実写で観察します。", film:"ポートレート撮影の舞台裏", caption:"Airam Dato-on · 外部参考映像 · 8.5秒の無音ループ", photo:"照明とカメラ機材が手前に見える実際の撮影現場。", reference:"MART PRODUCTION · 撮影現場の参考", notes:"映像で注目する三つの位置。", softbox:"ソフトボックス", softboxCopy:"顔と光源の距離、ソフトボックスの向きに注目します。", reflector:"レフ板", reflectorCopy:"モデルの前にある湾曲した銀色のレフ板と、下から光を補う位置を確認します。", camera:"カメラの位置", cameraCopy:"撮影者と人物の距離を、光源や背景の位置と比較します。", note:"外部の実写参考映像です。動画の操作で一時停止、リプレイ、場面の確認ができます。"
    },
    ko: {
      title:"실제 조명 현장을 살펴보세요.", intro:"소프트박스, 반사판, 카메라 위치가 인물 촬영 현장에서 어떻게 배치되는지 봅니다.", film:"인물 촬영 비하인드 영상", caption:"Airam Dato-on · 외부 참고 영상 · 8.5초 무음 반복", photo:"조명과 카메라 장비가 앞에 보이는 실제 촬영 현장.", reference:"MART PRODUCTION · 촬영 현장 참고", notes:"장면에서 살펴볼 세 가지 위치.", softbox:"소프트박스", softboxCopy:"얼굴과 광원의 거리, 소프트박스의 방향을 살펴보세요.", reflector:"반사판", reflectorCopy:"모델 앞의 곡선형 은색 반사판과 아래쪽 그림자를 채우는 위치를 확인하세요.", camera:"카메라 위치", cameraCopy:"촬영자와 인물 사이의 거리를 조명 및 배경의 위치와 비교하세요.", note:"외부 실사 참고 영상입니다. 영상 제어로 일시 정지하거나 다시 보며 관찰하세요."
    },
    th: {
      title:"ชมการจัดแสงในสถานที่ถ่ายจริง", intro:"ดูว่าซอฟต์บ็อกซ์ แผ่นสะท้อนแสง และตำแหน่งกล้องทำงานร่วมกันในการถ่ายภาพบุคคลอย่างไร", film:"เบื้องหลังการถ่ายภาพบุคคล", caption:"Airam Dato-on · วิดีโออ้างอิงภายนอก · วนแบบไม่มีเสียง 8.5 วินาที", photo:"สถานที่ถ่ายจริงที่เห็นอุปกรณ์แสงและกล้องอยู่ด้านหน้า", reference:"MART PRODUCTION · ภาพอ้างอิงสถานที่ถ่าย", notes:"สามตำแหน่งที่ควรสังเกตในภาพ", softbox:"ซอฟต์บ็อกซ์", softboxCopy:"สังเกตระยะจากแสงถึงใบหน้าและทิศทางของซอฟต์บ็อกซ์", reflector:"แผ่นสะท้อนแสง", reflectorCopy:"มองหาแผ่นสะท้อนแสงสีเงินทรงโค้งหน้าตัวแบบและบริเวณที่เติมแสงจากด้านล่าง", camera:"ตำแหน่งกล้อง", cameraCopy:"เปรียบเทียบระยะระหว่างช่างภาพกับตัวแบบกับตำแหน่งแสงและฉากหลัง", note:"วิดีโออ้างอิงจากการถ่ายจริง ใช้ตัวควบคุมเพื่อหยุด เล่นซ้ำ หรือสังเกตแต่ละช่วง"
    },
    ru: {
      title:"Внутри настоящей световой схемы.", intro:"Посмотрите, как софтбокс, отражатель и положение камеры сочетаются на портретной съёмке.", film:"За кадром портретной съёмки", caption:"Airam Dato-on · Внешний видеопример · Тихий цикл 8,5 секунды", photo:"Настоящая съёмочная площадка с осветительным и камерным оборудованием на переднем плане.", reference:"MART PRODUCTION · Пример съёмочной площадки", notes:"Три положения, на которые стоит обратить внимание.", softbox:"Софтбокс", softboxCopy:"Обратите внимание на расстояние до лица и направление софтбокса.", reflector:"Отражатель", reflectorCopy:"Найдите изогнутый серебристый отражатель перед моделью и область, которую он подсвечивает снизу.", camera:"Положение камеры", cameraCopy:"Сравните расстояние от фотографа до модели с расположением света и фона.", note:"Внешний пример реальной съёмки. Управление видео позволяет остановить, повторить и рассмотреть момент."
    }
  };
  api.register("equipment", ctx => {
    const root = document.createElement("section");
    root.className = "ref-equipment";
    root.innerHTML = `<div class="ref-section"><p class="ref-eyebrow">LIGHT STUDIO / ON SET</p><h2 data-ref-copy="title"></h2><p class="ref-lead" data-ref-copy="intro"></p><div class="ref-grid"><figure class="ref-figure"><img class="ref-studio-photo" src="${ctx.asset("studio-lighting.webp")}" width="800" height="1200" loading="lazy" decoding="async" data-ref-alt="photo"><figcaption class="ref-caption" data-ref-copy="reference"></figcaption></figure><figure class="ref-figure"><video data-ref-video data-ref-autoplay controls muted playsinline loop preload="metadata" src="${ctx.asset("studio-lighting-demo.mp4")}" poster="${ctx.asset("studio-lighting-demo-poster.jpg")}" data-ref-label="film"></video><figcaption class="ref-caption" data-ref-copy="caption"></figcaption><p class="ref-caption" data-ref-copy="note"></p></figure></div><h3 class="ref-section-title" style="margin-top:48px" data-ref-copy="notes"></h3><div class="ref-light-notes">${[["01","softbox"],["02","reflector"],["03","camera"]].map(([n,key])=>`<article><p class="ref-eyebrow">${n}</p><h3 data-ref-copy="${key}"></h3><p data-ref-copy="${key}Copy"></p></article>`).join("")}</div></div>`;
    root.append(ctx.credits(["studio-photo","studio-video"]));
    ctx.bindCopy(root, copy);
    return root;
  });
})();
