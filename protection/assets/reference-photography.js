/* Real, attributed media references for the photography chapter. */
(() => {
  "use strict";

  const media = window.PORTFOLIO_REFERENCE_MEDIA;
  if (!media || typeof media.register !== "function") return;

  const dictionaries = {
    "zh-HK": {
      heroTag: "PHOTOGRAPHY / 影像觀察", heroTitle: "由眼神，到角色嘅故事。",
      heroLead: "先睇人物同光線，再決定構圖。用真實角色人像，觀察眼神、服裝同道具點樣一齊交代角色。",
      referenceNote: "網絡參考示例・攝影作品屬原作者，並非本人作品。", galleryLabel: "角色攝影參考圖集",
      slide1Title: "01 / 眼神與景深", slide1Caption: "近鏡保留眼神同劍身，柔化嘅背景令注意力留喺人物。",
      slide1Alt: "綠色長髮角色扮演者近鏡人像，劍身位於面孔左側，背景柔化。",
      slide2Title: "02 / 全身與服裝", slide2Caption: "由頭飾到靴子保留完整輪廓，觀察刺繡、布料同腰繩嘅層次。",
      slide2Alt: "雷電角色扮演者喺會場中擺全身姿勢，服裝繡紋、腰繩及靴子清晰可見。",
      slide3Title: "03 / 姿勢與道具", slide3Caption: "衣袖、身體同劍身形成方向感；畫面右邊亦見到現場柔光箱。",
      slide3Alt: "刻晴角色扮演者伸展衣袖並持發光劍擺姿勢，右方可見現場柔光箱。",
      previous: "上一張", next: "下一張", thumb1: "眼神", thumb2: "服裝", thumb3: "道具",
      compareTag: "COLOUR STUDY / 色調觀察", compareTitle: "同一張相，試兩種色調。",
      compareIntro: "左右拖動分界，比較來源原色同偏冷色調。留意膚色、綠色假髮同金屬細節點樣改變感覺。",
      compareSource: "來源原色", compareCool: "偏冷色調示範", compareLabel: "拖動比較色調", compareNote: "呢個係同一張參考相嘅網頁色調試驗，並非攝影師提供嘅修圖前後對比。",
      detailTag: "LOOK CLOSER / 睇清細節", detailTitle: "一個畫面，三個觀察起點。",
      detail1Title: "先找眼神", detail1Body: "眼睛、面部方向同道具位置，共同決定觀眾先睇邊度。近鏡亦要留意畫面邊緣。",
      detail2Title: "保留服裝輪廓", detail2Body: "全身構圖要交代頭飾、衣襬同鞋。布料與刺繡嘅細節，有助表達角色造型。",
      detail3Title: "讓道具參與構圖", detail3Body: "劍身嘅角度同衣袖走向形成視線引導。拍攝時亦要留意道具同背景有冇重疊。",
      workflowTag: "ON SET / 真實拍攝現場", workflowTitle: "由布光，到按下快門。",
      workflowIntro: "睇一段真實人像拍攝幕後：上方柔光箱配合銀色弧形反光板，攝影師再調整機位同人物姿勢。",
      step1: "先觀察主光方向同面部陰影。", step2: "拍近鏡、全身同道具細節，逐張檢查邊緣。", step3: "比較曝光與色調，再作少量調整。",
      videoCaption: "真實布光幕後・Airam Dato-on / Pexels・8.5 秒靜音參考短片。"
    },
    en: {
      heroTag: "PHOTOGRAPHY / VISUAL OBSERVATION", heroTitle: "From a glance to a character’s story.",
      heroLead: "Observe the person and the light before choosing a frame. These real character portraits show how expression, costume and props work together.",
      referenceNote: "External reference examples. Photographs belong to their credited creators; these are not my own work.", galleryLabel: "Character photography reference gallery",
      slide1Title: "01 / Gaze and depth", slide1Caption: "The close frame keeps the eyes and the blade together while a soft background holds attention on the person.",
      slide1Alt: "Close portrait of a green-haired cosplayer, with a sword beside the face and a softly blurred background.",
      slide2Title: "02 / The complete costume", slide2Caption: "A full silhouette, from headwear to boots, reveals embroidery, fabric layers and the rope belt.",
      slide2Alt: "A Raiden cosplayer posing at a convention, with the full embroidered outfit, belt and boots visible.",
      slide3Title: "03 / Pose and prop", slide3Caption: "The sleeve, body and sword create direction. The working softbox is also visible on the right.",
      slide3Alt: "A Keqing cosplayer holding a glowing sword and extending a sleeve, with an actual softbox visible on the right.",
      previous: "Previous", next: "Next", thumb1: "Gaze", thumb2: "Costume", thumb3: "Prop",
      compareTag: "COLOUR STUDY / ONE SOURCE IMAGE", compareTitle: "One photograph, two colour treatments.",
      compareIntro: "Move the divider to compare the source colours with a cooler treatment. Watch the skin, green wig and metal details.",
      compareSource: "Source colours", compareCool: "Cooler colour study", compareLabel: "Move to compare colours", compareNote: "This is a browser colour study of one reference image, not the photographer’s original before-and-after edit.",
      detailTag: "LOOK CLOSER / THREE OBSERVATIONS", detailTitle: "Three ways to read a frame.",
      detail1Title: "Start with the eyes", detail1Body: "The eyes, the direction of the face and the position of the prop guide the first glance. Check the frame edges too.",
      detail2Title: "Keep the costume readable", detail2Body: "A full-length frame includes headwear, hems and shoes. Fabric and embroidery help communicate the character’s design.",
      detail3Title: "Compose with the prop", detail3Body: "The blade and the flowing sleeve lead the eye. Watch for awkward overlaps between the prop and the background.",
      workflowTag: "ON SET / REAL PORTRAIT SESSION", workflowTitle: "From lighting to the shutter.",
      workflowIntro: "Watch a real portrait session: an overhead softbox and a curved silver reflector shape the light as the photographer adjusts the camera position and pose.",
      step1: "Read the key light and the shadows on the face.", step2: "Make close, full-length and detail frames; inspect the edges.", step3: "Compare exposure and colour, then make small adjustments.",
      videoCaption: "Real portrait session · Airam Dato-on / Pexels · 8.5-second silent reference clip."
    },
    "zh-CN": {
      heroTag: "PHOTOGRAPHY / 影像观察", heroTitle: "从眼神，到角色的故事。",
      heroLead: "先观察人物与光线，再决定构图。通过真实角色人像，观察眼神、服装与道具如何一起交代角色。",
      referenceNote: "网络参考示例・摄影作品属于原作者，并非本人作品。", galleryLabel: "角色摄影参考图集",
      slide1Title: "01 / 眼神与景深", slide1Caption: "近景保留眼神与剑身，柔化的背景让注意力留在人物身上。",
      slide1Alt: "绿色长发角色扮演者的近景人像，剑身位于面孔左侧，背景柔化。",
      slide2Title: "02 / 全身与服装", slide2Caption: "从头饰到靴子保留完整轮廓，观察刺绣、布料与腰绳的层次。",
      slide2Alt: "雷电角色扮演者在会场摆出全身姿势，服装绣纹、腰绳及靴子清晰可见。",
      slide3Title: "03 / 姿势与道具", slide3Caption: "衣袖、身体与剑身形成方向感；画面右边还能看到现场柔光箱。",
      slide3Alt: "刻晴角色扮演者伸展衣袖并持发光剑摆姿势，右方可见现场柔光箱。",
      previous: "上一张", next: "下一张", thumb1: "眼神", thumb2: "服装", thumb3: "道具",
      compareTag: "COLOUR STUDY / 色调观察", compareTitle: "同一张照片，试两种色调。",
      compareIntro: "左右拖动分界，比较来源原色与偏冷色调。留意肤色、绿色假发与金属细节的变化。",
      compareSource: "来源原色", compareCool: "偏冷色调示范", compareLabel: "拖动比较色调", compareNote: "这是同一张参考照片的网页色调试验，并非摄影师提供的修图前后对比。",
      detailTag: "LOOK CLOSER / 细看细节", detailTitle: "一个画面，三个观察起点。",
      detail1Title: "先找眼神", detail1Body: "眼睛、面部方向与道具位置，共同决定观众先看哪里。近景也要留意画面边缘。",
      detail2Title: "保留服装轮廓", detail2Body: "全身构图需要交代头饰、衣摆与鞋。布料和刺绣的细节，有助表达角色造型。",
      detail3Title: "让道具参与构图", detail3Body: "剑身角度与衣袖走向形成视线引导。拍摄时也要留意道具与背景是否重叠。",
      workflowTag: "ON SET / 真实拍摄现场", workflowTitle: "从布光，到按下快门。",
      workflowIntro: "观看一段真实人像拍摄幕后：上方柔光箱配合银色弧形反光板，摄影师再调整机位与人物姿势。",
      step1: "先观察主光方向与面部阴影。", step2: "拍近景、全身与道具细节，逐张检查边缘。", step3: "比较曝光与色调，再做少量调整。",
      videoCaption: "真实布光幕后・Airam Dato-on / Pexels・8.5 秒静音参考短片。"
    },
    ja: {
      heroTag: "PHOTOGRAPHY / 写真の観察", heroTitle: "まなざしから、キャラクターの物語へ。",
      heroLead: "人物と光を観察してから構図を選びます。実際のコスプレ写真を通して、表情・衣装・小道具の関係を見ていきます。",
      referenceNote: "外部の参考作品です。写真の権利は各作者に帰属し、私自身の撮影作品ではありません。", galleryLabel: "キャラクター写真の参考ギャラリー",
      slide1Title: "01 / まなざしと被写界深度", slide1Caption: "顔と剣を同じフレームに収め、ぼけた背景で人物に視線を集めています。",
      slide1Alt: "緑の長髪のコスプレイヤーの顔と、その横の剣。背景は柔らかくぼけている。",
      slide2Title: "02 / 衣装の全体像", slide2Caption: "頭飾りからブーツまでを写し、刺繍や布の重なり、腰のロープを見せています。",
      slide2Alt: "イベント会場でポーズを取るライデンのコスプレイヤー。刺繍の衣装、帯、ブーツまで見える。",
      slide3Title: "03 / ポーズと小道具", slide3Caption: "袖・身体・剣が画面に方向を作ります。右側には撮影用ソフトボックスも見えます。",
      slide3Alt: "光る剣を持って袖を広げる刻晴のコスプレイヤー。右側に実際のソフトボックスが見える。",
      previous: "前の写真", next: "次の写真", thumb1: "まなざし", thumb2: "衣装", thumb3: "小道具",
      compareTag: "COLOUR STUDY / 色の比較", compareTitle: "一枚の写真、二つの色調。",
      compareIntro: "境界を動かして元の色と寒色寄りの処理を比較します。肌・緑のウィッグ・金属の印象に注目してください。",
      compareSource: "元の色", compareCool: "寒色寄りの試作", compareLabel: "動かして色調を比較", compareNote: "同じ参考写真を使ったブラウザー上の色調実験です。撮影者による修整前後の比較ではありません。",
      detailTag: "LOOK CLOSER / 細部の観察", detailTitle: "写真を見る、三つの視点。",
      detail1Title: "まず目を見る", detail1Body: "目・顔の向き・小道具の位置が最初の視線を導きます。画面の端も確認します。",
      detail2Title: "衣装の輪郭を残す", detail2Body: "全身写真では頭飾り・裾・靴までを見せます。布や刺繍の質感もキャラクターを伝えます。",
      detail3Title: "小道具を構図に生かす", detail3Body: "剣と流れる袖が視線を導きます。小道具と背景の不自然な重なりにも注意します。",
      workflowTag: "ON SET / 実際の撮影現場", workflowTitle: "ライティングから、シャッターまで。",
      workflowIntro: "実際のポートレート撮影の舞台裏です。頭上のソフトボックスと銀色の曲面レフ板を使い、撮影者が位置とポーズを調整します。",
      step1: "主光の方向と顔の影を観察する。", step2: "寄り・全身・細部を撮り、画面の端を確認する。", step3: "露出と色を比較し、少しずつ調整する。",
      videoCaption: "実際の撮影風景 · Airam Dato-on / Pexels · 約8.5秒の無音参考映像。"
    },
    ko: {
      heroTag: "PHOTOGRAPHY / 사진 관찰", heroTitle: "시선에서 시작되는 캐릭터의 이야기.",
      heroLead: "인물과 빛을 먼저 관찰한 다음 구도를 정합니다. 실제 코스프레 사진으로 표정, 의상, 소품이 함께 캐릭터를 표현하는 방식을 살펴봅니다.",
      referenceNote: "외부 참고 자료입니다. 사진의 권리는 원작자에게 있으며, 제가 촬영한 작품이 아닙니다.", galleryLabel: "캐릭터 사진 참고 갤러리",
      slide1Title: "01 / 시선과 심도", slide1Caption: "눈과 검을 함께 담은 근접 구도와 부드러운 배경이 인물에 시선을 모읍니다.",
      slide1Alt: "초록색 긴 머리 코스프레 인물의 근접 사진. 얼굴 옆에 검이 있고 배경은 흐릿하다.",
      slide2Title: "02 / 의상 전체 보기", slide2Caption: "머리 장식부터 부츠까지 담아 자수, 천의 겹침, 허리끈을 보여 줍니다.",
      slide2Alt: "행사장에서 포즈를 취하는 라이덴 코스프레 인물. 자수 의상, 허리끈, 부츠가 모두 보인다.",
      slide3Title: "03 / 포즈와 소품", slide3Caption: "소매와 몸, 검이 방향을 만듭니다. 오른쪽에는 실제 촬영용 소프트박스도 보입니다.",
      slide3Alt: "빛나는 검을 들고 소매를 펼친 각청 코스프레 인물. 오른쪽에 실제 소프트박스가 보인다.",
      previous: "이전 사진", next: "다음 사진", thumb1: "시선", thumb2: "의상", thumb3: "소품",
      compareTag: "COLOUR STUDY / 색감 관찰", compareTitle: "사진 한 장, 두 가지 색감.",
      compareIntro: "경계를 움직여 원본 색상과 차가운 색감의 처리를 비교해 보세요. 피부, 초록 가발, 금속의 느낌을 살펴봅니다.",
      compareSource: "원본 색상", compareCool: "차가운 색감 실험", compareLabel: "움직여 색감 비교", compareNote: "같은 참고 사진을 활용한 브라우저 색감 실험입니다. 촬영자가 제공한 보정 전후 비교가 아닙니다.",
      detailTag: "LOOK CLOSER / 자세히 보기", detailTitle: "사진을 읽는 세 가지 관점.",
      detail1Title: "눈에서 시작하기", detail1Body: "눈, 얼굴 방향, 소품의 위치가 첫 시선을 이끕니다. 프레임 가장자리도 확인합니다.",
      detail2Title: "의상의 윤곽 남기기", detail2Body: "전신 구도에는 머리 장식, 옷자락, 신발을 담습니다. 천과 자수의 질감도 캐릭터를 전달합니다.",
      detail3Title: "소품으로 구도 만들기", detail3Body: "검과 흐르는 소매가 시선을 이끕니다. 소품이 배경과 어색하게 겹치지 않는지 살펴봅니다.",
      workflowTag: "ON SET / 실제 촬영 현장", workflowTitle: "조명부터 셔터까지.",
      workflowIntro: "실제 인물 촬영의 현장입니다. 위쪽 소프트박스와 은색 곡면 반사판을 사용하며 촬영자가 카메라 위치와 포즈를 조정합니다.",
      step1: "주광의 방향과 얼굴의 그림자를 관찰합니다.", step2: "근접, 전신, 세부 사진을 찍고 가장자리를 확인합니다.", step3: "노출과 색을 비교한 뒤 조금씩 조정합니다.",
      videoCaption: "실제 인물 촬영 현장 · Airam Dato-on / Pexels · 약 8.5초 무음 참고 영상."
    },
    th: {
      heroTag: "PHOTOGRAPHY / สังเกตภาพ", heroTitle: "จากสายตา สู่เรื่องราวของตัวละคร",
      heroLead: "สังเกตคนและแสงก่อนเลือกองค์ประกอบภาพ ภาพคอสเพลย์จริงเหล่านี้แสดงความสัมพันธ์ระหว่างสีหน้า เครื่องแต่งกาย และอุปกรณ์ประกอบฉาก",
      referenceNote: "ตัวอย่างอ้างอิงจากภายนอก ภาพเป็นผลงานของผู้สร้างที่ระบุ ไม่ใช่ผลงานที่ฉันถ่ายเอง", galleryLabel: "แกลเลอรีภาพอ้างอิงการถ่ายตัวละคร",
      slide1Title: "01 / สายตาและระยะชัด", slide1Caption: "ภาพระยะใกล้เก็บทั้งดวงตาและดาบ ฉากหลังที่นุ่มช่วยให้สนใจตัวแบบ",
      slide1Alt: "ภาพระยะใกล้ของผู้แต่งคอสเพลย์ผมยาวสีเขียว มีดาบข้างใบหน้าและฉากหลังเบลอ",
      slide2Title: "02 / เครื่องแต่งกายครบชุด", slide2Caption: "เห็นตั้งแต่หมวกถึงรองเท้าบูต จึงสังเกตลายปัก ชั้นผ้า และเชือกคาดเอวได้",
      slide2Alt: "ผู้แต่งคอสเพลย์เป็นไรเดนในงานแสดง เห็นเครื่องแต่งกายลายปัก เข็มขัด และรองเท้าครบชุด",
      slide3Title: "03 / ท่าทางและอุปกรณ์", slide3Caption: "แขนเสื้อ ร่างกาย และดาบสร้างทิศทางในภาพ พร้อมเห็นซอฟต์บ็อกซ์จริงทางขวา",
      slide3Alt: "ผู้แต่งคอสเพลย์เป็นเค่อฉิงถือดาบเรืองแสงและกางแขนเสื้อ มีซอฟต์บ็อกซ์อยู่ทางขวา",
      previous: "ภาพก่อนหน้า", next: "ภาพถัดไป", thumb1: "สายตา", thumb2: "ชุด", thumb3: "อุปกรณ์",
      compareTag: "COLOUR STUDY / ศึกษาโทนสี", compareTitle: "ภาพเดียว สองโทนสี",
      compareIntro: "เลื่อนเส้นแบ่งเพื่อเทียบสีต้นฉบับกับโทนเย็น สังเกตผิว วิกสีเขียว และรายละเอียดโลหะ",
      compareSource: "สีจากต้นฉบับ", compareCool: "ทดลองโทนเย็น", compareLabel: "เลื่อนเพื่อเปรียบเทียบสี", compareNote: "นี่คือการทดลองสีในเบราว์เซอร์จากภาพอ้างอิงเดียวกัน ไม่ใช่ภาพก่อนและหลังแต่งของช่างภาพ",
      detailTag: "LOOK CLOSER / ดูรายละเอียด", detailTitle: "สามจุดเริ่มต้นในการอ่านภาพ",
      detail1Title: "เริ่มจากดวงตา", detail1Body: "ดวงตา ทิศทางใบหน้า และตำแหน่งอุปกรณ์นำสายตาผู้ชม อย่าลืมตรวจขอบภาพด้วย",
      detail2Title: "เก็บรูปทรงของชุด", detail2Body: "ภาพเต็มตัวควรเห็นหมวก ชายชุด และรองเท้า รายละเอียดผ้าและลายปักช่วยบอกบุคลิกตัวละคร",
      detail3Title: "ใช้อุปกรณ์จัดองค์ประกอบ", detail3Body: "แนวดาบและแขนเสื้อช่วยนำสายตา ตรวจว่าอุปกรณ์ไม่ซ้อนกับฉากหลังอย่างรบกวนภาพ",
      workflowTag: "ON SET / เบื้องหลังกองถ่ายจริง", workflowTitle: "จากจัดแสง สู่กดชัตเตอร์",
      workflowIntro: "ชมเบื้องหลังการถ่ายภาพบุคคลจริง ซอฟต์บ็อกซ์ด้านบนและแผ่นสะท้อนแสงโค้งสีเงินช่วยจัดแสง ขณะช่างภาพปรับมุมกล้องและท่าทาง",
      step1: "ดูทิศทางแสงหลักและเงาบนใบหน้า", step2: "ถ่ายระยะใกล้ เต็มตัว และรายละเอียด พร้อมตรวจขอบภาพ", step3: "เทียบแสงและสี แล้วปรับทีละน้อย",
      videoCaption: "เบื้องหลังการถ่ายจริง · Airam Dato-on / Pexels · คลิปอ้างอิงไม่มีเสียง 8.5 วินาที"
    },
    ru: {
      heroTag: "PHOTOGRAPHY / НАБЛЮДЕНИЕ", heroTitle: "От взгляда — к истории персонажа.",
      heroLead: "Сначала наблюдайте за человеком и светом, затем выбирайте композицию. Реальные фотографии косплея показывают связь выражения лица, костюма и реквизита.",
      referenceNote: "Внешние примеры для изучения. Фотографии принадлежат указанным авторам; это не мои работы.", galleryLabel: "Галерея примеров фотографии персонажей",
      slide1Title: "01 / Взгляд и глубина", slide1Caption: "Крупный план объединяет глаза и клинок, а мягкий фон удерживает внимание на человеке.",
      slide1Alt: "Крупный портрет косплеера с длинными зелёными волосами, мечом рядом с лицом и размытым фоном.",
      slide2Title: "02 / Костюм целиком", slide2Caption: "Кадр от головного убора до сапог показывает вышивку, слои ткани и верёвочный пояс.",
      slide2Alt: "Косплеер в образе Рейдена на фестивале: видны весь костюм с вышивкой, пояс и сапоги.",
      slide3Title: "03 / Поза и реквизит", slide3Caption: "Рукав, тело и меч задают направление. Справа также виден рабочий софтбокс.",
      slide3Alt: "Косплеер в образе Кэ Цин со светящимся мечом и расправленным рукавом; справа виден софтбокс.",
      previous: "Предыдущее фото", next: "Следующее фото", thumb1: "Взгляд", thumb2: "Костюм", thumb3: "Реквизит",
      compareTag: "COLOUR STUDY / ИЗУЧЕНИЕ ЦВЕТА", compareTitle: "Одна фотография, два цветовых решения.",
      compareIntro: "Двигайте границу, сравнивая исходные цвета и более холодную обработку. Следите за кожей, зелёным париком и металлом.",
      compareSource: "Исходные цвета", compareCool: "Холодный вариант", compareLabel: "Двигайте для сравнения цвета", compareNote: "Это цветовой эксперимент в браузере с одним исходным снимком, а не авторское сравнение до и после ретуши.",
      detailTag: "LOOK CLOSER / ДЕТАЛИ", detailTitle: "Три способа прочитать кадр.",
      detail1Title: "Начните с глаз", detail1Body: "Глаза, поворот лица и положение реквизита направляют первый взгляд. Проверяйте и края кадра.",
      detail2Title: "Сохраните силуэт костюма", detail2Body: "Полный рост позволяет показать головной убор, подол и обувь. Ткань и вышивка раскрывают образ персонажа.",
      detail3Title: "Включите реквизит в композицию", detail3Body: "Клинок и летящий рукав ведут взгляд. Следите за неудачными пересечениями реквизита с фоном.",
      workflowTag: "ON SET / РЕАЛЬНАЯ СЪЁМКА", workflowTitle: "От постановки света до спуска затвора.",
      workflowIntro: "Посмотрите на реальную портретную съёмку: верхний софтбокс и изогнутый серебристый отражатель формируют свет, пока фотограф меняет точку съёмки и позу модели.",
      step1: "Изучите направление основного света и тени на лице.", step2: "Снимите крупный план, полный рост и детали; проверьте края.", step3: "Сравните экспозицию и цвет, затем внесите небольшие изменения.",
      videoCaption: "Реальная портретная съёмка · Airam Dato-on / Pexels · Учебный ролик без звука, 8,5 секунды."
    }
  };

  media.register("photography", ctx => {
    const root = document.createElement("div");
    root.className = "ref-chapter ref-photography";
    root.innerHTML = `
      <style>
        .ref-photography .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        .ref-photography .ref-photo-gallery{min-width:0;padding:14px;border:1px solid var(--line,#ffffff20);border-radius:20px;background:#0c1016;color:#eef3f9}
        .ref-photography .ref-photo-gallery:focus-visible{outline:2px solid #d6bc90;outline-offset:5px}
        .ref-photography .ref-photo-slide{margin:0}
        .ref-photography .ref-photo-slide>img{display:block;width:100%;height:clamp(310px,43vw,570px);object-fit:contain;background:#080b10;border-radius:10px}
        .ref-photography .ref-photo-slide .ref-caption{padding:15px 4px 4px;min-height:92px}
        .ref-photography .ref-photo-slide .ref-caption strong{display:block;margin-bottom:7px;font-size:1rem;color:inherit}
        .ref-photography .ref-photo-slide .ref-caption p{margin:0;font-size:.88rem;line-height:1.75}
        .ref-photography .ref-photo-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}
        .ref-photography .ref-photo-position{font:12px/1.4 ui-monospace,monospace;color:#bfcbd5;white-space:nowrap}
        .ref-photography .ref-photo-thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
        .ref-photography .ref-photo-thumb{display:flex;align-items:center;justify-content:flex-start;gap:9px;min-height:60px;min-width:0;padding:6px;border:1px solid #ffffff20;border-radius:10px;background:#ffffff04;color:inherit;text-align:left;cursor:pointer;font:inherit;font-size:.78rem}
        .ref-photography .ref-photo-thumb img{width:39px;height:46px;object-fit:cover;border-radius:5px;flex:none}
        .ref-photography .ref-photo-thumb span{min-width:0;overflow-wrap:anywhere}
        .ref-photography .ref-photo-thumb[aria-pressed=true]{border-color:#d9bf97;background:#d9bf9713}
        .ref-photography .ref-photo-study{margin:0;max-width:800px}
        .ref-photography .ref-photo-comparison{position:relative;width:100%;height:clamp(320px,49vw,560px);overflow:hidden;border-radius:16px;background:#080b10;--ref-compare:50%}
        .ref-photography .ref-photo-comparison>img{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
        .ref-photography .ref-photo-comparison .ref-photo-cool{filter:saturate(.8) hue-rotate(13deg) contrast(1.025);clip-path:inset(0 0 0 var(--ref-compare))}
        .ref-photography .ref-photo-comparison:after{content:"";position:absolute;inset:0 auto 0 var(--ref-compare);width:2px;background:#fff9;transform:translateX(-1px);pointer-events:none}
        .ref-photography .ref-photo-compare-labels{display:flex;justify-content:space-between;gap:16px;margin:13px 0 8px;font-size:.8rem;line-height:1.6;color:var(--muted,#c6d2db)}
        .ref-photography .ref-photo-range-label{display:block;font-size:.85rem;margin-top:12px;color:var(--muted,#c6d2db)}
        .ref-photography input[type=range]{display:block;width:100%;min-height:44px;margin:0;accent-color:#d6bc90;cursor:ew-resize}
        .ref-photography .ref-photo-observations .ref-card{min-width:0;padding:14px}
        .ref-photography .ref-photo-observations img{display:block;width:100%;height:280px;object-fit:contain;border-radius:10px;background:#080b10}
        .ref-photography .ref-photo-observations h3{font-size:1.05rem;margin:18px 0 10px}
        .ref-photography .ref-photo-observations p{font-size:.9rem;line-height:1.85;margin:0}
        .ref-photography .ref-photo-workflow .ref-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        @media(max-width:800px){.ref-photography .ref-photo-workflow .ref-grid{grid-template-columns:1fr}}
        .ref-photography .ref-photo-workflow video{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:14px;background:#080b10}
        .ref-photography .ref-photo-workflow figure{margin:0}
        .ref-photography .ref-photo-workflow ol{margin:20px 0 0;padding-inline-start:24px}
        .ref-photography .ref-photo-workflow li{padding:6px 0 12px;line-height:1.8}
        .ref-photography .ref-photo-disclosure{max-width:820px;font-size:.82rem;line-height:1.8;opacity:.78;margin-top:20px}
        @media(max-width:540px){.ref-photography .ref-photo-thumbs{gap:5px}.ref-photography .ref-photo-thumb{flex-direction:column;justify-content:center;text-align:center;font-size:.72rem}.ref-photography .ref-photo-thumb img{width:100%;height:55px}.ref-photography .ref-photo-controls .ref-button{padding-inline:12px}.ref-photography .ref-photo-slide>img{height:350px}.ref-photography .ref-photo-slide .ref-caption{min-height:110px}}
      </style>
      <section class="ref-hero" aria-labelledby="ref-photo-title">
        <div class="ref-hero-copy">
          <p class="ref-eyebrow" data-ref-copy="heroTag"></p>
          <h1 id="ref-photo-title" data-ref-copy="heroTitle"></h1>
          <p class="ref-lead" data-ref-copy="heroLead"></p>
          <p class="ref-photo-disclosure" data-ref-copy="referenceNote"></p>
        </div>
        <div class="ref-photo-gallery" role="group" tabindex="0" aria-labelledby="ref-photo-gallery-label">
          <span id="ref-photo-gallery-label" class="sr-only" data-ref-copy="galleryLabel"></span>
          <figure class="ref-photo-slide" data-ref-photo-slide="0">
            <img src="${ctx.asset("cosplay-sword-portrait.webp")}" width="982" height="1200" decoding="async" fetchpriority="high" data-ref-alt="slide1Alt" alt="">
            <figcaption class="ref-caption"><strong data-ref-copy="slide1Title"></strong><p data-ref-copy="slide1Caption"></p></figcaption>
          </figure>
          <figure class="ref-photo-slide" data-ref-photo-slide="1" hidden>
            <img src="${ctx.asset("cosplay-raiden-costume.webp")}" width="858" height="1200" decoding="async" loading="lazy" data-ref-alt="slide2Alt" alt="">
            <figcaption class="ref-caption"><strong data-ref-copy="slide2Title"></strong><p data-ref-copy="slide2Caption"></p></figcaption>
          </figure>
          <figure class="ref-photo-slide" data-ref-photo-slide="2" hidden>
            <img src="${ctx.asset("cosplay-keqing-prop.webp")}" width="1200" height="901" decoding="async" loading="lazy" data-ref-alt="slide3Alt" alt="">
            <figcaption class="ref-caption"><strong data-ref-copy="slide3Title"></strong><p data-ref-copy="slide3Caption"></p></figcaption>
          </figure>
          <div class="ref-photo-controls">
            <button type="button" class="ref-button" data-ref-photo-direction="-1"><span aria-hidden="true">← </span><span data-ref-copy="previous"></span></button>
            <span class="ref-photo-position" aria-live="polite" aria-atomic="true">01 / 03</span>
            <button type="button" class="ref-button" data-ref-photo-direction="1"><span data-ref-copy="next"></span><span aria-hidden="true"> →</span></button>
          </div>
          <div class="ref-photo-thumbs" role="group" aria-labelledby="ref-photo-gallery-label">
            <button type="button" class="ref-photo-thumb" data-ref-photo-select="0" aria-pressed="true"><img src="${ctx.asset("cosplay-sword-portrait.webp")}" width="39" height="46" alt="" decoding="async"><span data-ref-copy="thumb1"></span></button>
            <button type="button" class="ref-photo-thumb" data-ref-photo-select="1" aria-pressed="false"><img src="${ctx.asset("cosplay-raiden-costume.webp")}" width="39" height="46" alt="" loading="lazy" decoding="async"><span data-ref-copy="thumb2"></span></button>
            <button type="button" class="ref-photo-thumb" data-ref-photo-select="2" aria-pressed="false"><img src="${ctx.asset("cosplay-keqing-prop.webp")}" width="39" height="46" alt="" loading="lazy" decoding="async"><span data-ref-copy="thumb3"></span></button>
          </div>
        </div>
      </section>
      <section class="ref-section field-photo-compare-bench" aria-labelledby="ref-photo-compare-title">
        <p class="ref-eyebrow" data-ref-copy="compareTag"></p>
        <h2 id="ref-photo-compare-title" class="ref-section-title" data-ref-copy="compareTitle"></h2>
        <p class="ref-lead" data-ref-copy="compareIntro"></p>
        <figure class="ref-photo-study">
          <div class="ref-photo-comparison">
            <img src="${ctx.asset("cosplay-sword-portrait.webp")}" width="982" height="1200" loading="lazy" decoding="async" data-ref-alt="slide1Alt" alt="">
            <img class="ref-photo-cool" src="${ctx.asset("cosplay-sword-portrait.webp")}" width="982" height="1200" loading="lazy" decoding="async" aria-hidden="true" alt="">
          </div>
          <div class="ref-photo-compare-labels"><span data-ref-copy="compareSource"></span><span data-ref-copy="compareCool"></span></div>
          <label class="ref-photo-range-label" for="ref-photo-compare" data-ref-copy="compareLabel"></label>
          <input id="ref-photo-compare" type="range" min="0" max="100" value="50" step="1" aria-describedby="ref-photo-compare-note">
          <figcaption id="ref-photo-compare-note" class="ref-caption" data-ref-copy="compareNote"></figcaption>
        </figure>
      </section>
      <section class="ref-section" aria-labelledby="ref-photo-details-title">
        <p class="ref-eyebrow" data-ref-copy="detailTag"></p>
        <h2 id="ref-photo-details-title" class="ref-section-title" data-ref-copy="detailTitle"></h2>
        <div class="ref-grid ref-photo-observations">
          <article class="ref-card"><img src="${ctx.asset("cosplay-sword-portrait.webp")}" width="982" height="1200" loading="lazy" decoding="async" data-ref-alt="slide1Alt" alt=""><h3 data-ref-copy="detail1Title"></h3><p data-ref-copy="detail1Body"></p></article>
          <article class="ref-card"><img src="${ctx.asset("cosplay-raiden-costume.webp")}" width="858" height="1200" loading="lazy" decoding="async" data-ref-alt="slide2Alt" alt=""><h3 data-ref-copy="detail2Title"></h3><p data-ref-copy="detail2Body"></p></article>
          <article class="ref-card"><img src="${ctx.asset("cosplay-keqing-prop.webp")}" width="1200" height="901" loading="lazy" decoding="async" data-ref-alt="slide3Alt" alt=""><h3 data-ref-copy="detail3Title"></h3><p data-ref-copy="detail3Body"></p></article>
        </div>
      </section>
      <section class="ref-section ref-photo-workflow" aria-labelledby="ref-photo-workflow-title">
        <p class="ref-eyebrow" data-ref-copy="workflowTag"></p>
        <h2 id="ref-photo-workflow-title" class="ref-section-title" data-ref-copy="workflowTitle"></h2>
        <div class="ref-grid">
          <figure class="ref-figure"><video data-ref-video data-ref-autoplay controls muted playsinline loop preload="metadata" width="960" height="540" poster="${ctx.asset("studio-lighting-demo-poster.jpg")}" aria-describedby="ref-photo-video-caption"><source src="${ctx.asset("studio-lighting-demo.mp4")}" type="video/mp4"></video><figcaption id="ref-photo-video-caption" class="ref-caption" data-ref-copy="videoCaption"></figcaption></figure>
          <div><p class="ref-lead" data-ref-copy="workflowIntro"></p><ol><li data-ref-copy="step1"></li><li data-ref-copy="step2"></li><li data-ref-copy="step3"></li></ol></div>
        </div>
      </section>
      <div data-ref-photo-credits></div>`;

    const slides = Array.from(root.querySelectorAll("[data-ref-photo-slide]"));
    const thumbnails = Array.from(root.querySelectorAll("[data-ref-photo-select]"));
    const position = root.querySelector(".ref-photo-position");
    const gallery = root.querySelector(".ref-photo-gallery");
    let current = 0;
    const show = next => {
      current = (next + slides.length) % slides.length;
      slides.forEach((slide, index) => { slide.hidden = index !== current; });
      thumbnails.forEach((button, index) => { button.setAttribute("aria-pressed", String(index === current)); });
      position.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    };
    root.querySelectorAll("[data-ref-photo-direction]").forEach(button => {
      ctx.on(button, "click", () => show(current + Number(button.dataset.refPhotoDirection)));
    });
    thumbnails.forEach(button => {
      ctx.on(button, "click", () => show(Number(button.dataset.refPhotoSelect)));
    });
    ctx.on(gallery, "keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const directions = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
      if (!Object.prototype.hasOwnProperty.call(directions, event.key)) return;
      event.preventDefault();
      show(directions[event.key]);
    });
    const range = root.querySelector("#ref-photo-compare");
    const comparison = root.querySelector(".ref-photo-comparison");
    ctx.on(range, "input", () => {
      comparison.style.setProperty("--ref-compare", `${Math.max(0, Math.min(100, Number(range.value)))}%`);
    });
    root.querySelector("[data-ref-photo-credits]").append(ctx.credits(["photo-gaze", "photo-costume", "photo-prop", "studio-photo", "studio-video"]));
    ctx.bindCopy(root, dictionaries);
    return root;
  });
})();
