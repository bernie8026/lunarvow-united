(() => {
  'use strict';
  const COPY = {
    'zh-HK': {
      title:'月下誓約 — 整合檔案庫 | Bernie’s Honkai Realm',skip:'跳至主要內容',mainNav:'主要導覽',language:'介面語言',navDirectory:'全部檔案',navNews:'最新消息',navCaptain:'艦長自述',heroKicker:'月下誓約整合檔案庫',heroSubtitle:'月下誓約・予愛以心',heroDescription:'每一份檔案，都係寫畀月下嘅情書。攻略、角色、劇情同影像，喺呢度一次過收藏。',openMain:'進入完整月下主站',browse:'瀏覽全部檔案',heroImage:'月下誓約・予愛以心與赤紅月亮的收藏插畫',heroArtCaption:'赤月之下，誓約依然',startExploring:'向下展開檔案',overview:'檔案概況',pageCount:'完整網站頁面',familyCount:'女武神角色群組',suitCount:'裝甲與玩法檔案',languageCount:'介面語言',featuredTitle:'由月下開始',featuredDescription:'先打開核心攻略，再探索佢嘅故事同影像',featureImage:'月下收藏插畫',coreTitle:'月下核心攻略',coreDescription:'角色定位、裝備、星之環同實戰循環',rosterTitle:'女武神與所有分支',rosterDescription:'按角色搜尋裝甲、增幅核心、艦長線同後崩壞書檔案',storyTitle:'由聖芙蕾雅去到火星',storyDescription:'第一部、第一部半、第二部，同艦長宇宙嘅閱讀次序',spoilerNote:'劇情檔案包含劇透',directoryTitle:'所有檔案，一個入口',filesLabel:'個頁面',searchLabel:'搜尋網站頁面',searchPlaceholder:'搵攻略、角色、劇情、圖片…',filters:'篩選檔案',filterAll:'全部',filterLunar:'月下專屬',filterWorld:'崩壞世界',homeTitle:'完整月下主站',homeDescription:'原有首頁、最新重點、六大模組同艦長自述',guideTitle:'戰術紀錄',guideDescription:'攻略總覽同本機暫存筆記，整理你嘅戰鬥心得',galleryTitle:'月下影像收藏',galleryDescription:'角色立繪、桌面同手機桌布，連同原有來源紀錄',storyArchiveTitle:'劇情檔案',captainTitle:'艦長線敘事紀錄',captainDescription:'世界泡、相關人物，同月下喺艦長宇宙嘅故事',infoTitle:'崩壞綜合資料庫',infoDescription:'世界觀、主要角色同遊戲系統嘅資料入口',newsTitle:'官方消息檔案',newsDescription:'原站消息完整保留，按台港澳、國際服同大陸服整理',emptyTitle:'暫時搵唔到相符頁面',emptyDescription:'試下「月下」、「女武神」或者「劇情」',reset:'清除搜尋同篩選',closingQuote:'白天被 assignment 追殺，\n晚上返艦橋整理月下檔案',meetCaptain:'認識艦長',disclaimer:'非官方、非商業個人檔案庫；遊戲素材權利屬原權利持有人',snapshot:'原站內容快照',newsChecked:'消息核對',backTop:'返回頁首',resultAll:'顯示全部 9 個頁面',resultPrefix:'搵到 ',resultSuffix:' 個頁面'
    },
    en: {
      title:'Lunar Vow — Unified Archive | Bernie’s Honkai Realm',skip:'Skip to main content',mainNav:'Main navigation',language:'Interface language',navDirectory:'All files',navNews:'Latest news',navCaptain:'The Captain',heroKicker:'LUNAR VOW · UNIFIED ARCHIVE',heroSubtitle:'Lunar Vow: Crimson Love',heroDescription:'Every file is a letter to Lunar Vow. Combat guides, characters, stories and treasured images, collected in one place.',openMain:'Enter the complete main site',browse:'Explore every file',heroImage:'Lunar Vow: Crimson Love artwork beneath a crimson moon',heroArtCaption:'Beneath the crimson moon, the vow remains',startExploring:'Scroll to explore',overview:'Archive overview',pageCount:'Complete site pages',familyCount:'Character families',suitCount:'Battlesuit & gameplay files',languageCount:'Interface languages',featuredTitle:'Begin with Lunar Vow',featuredDescription:'Start with her core guide, then explore the stories and images',featureImage:'Lunar Vow collection artwork',coreTitle:'Lunar Vow core guide',coreDescription:'Role, equipment, Astral Ring and combat rotations',rosterTitle:'Valkyries & every branch',rosterDescription:'Search battlesuits, augments, Captainverse forms and APHO entries by character',storyTitle:'From St. Freya to Mars',storyDescription:'Part 1, Part 1.5, Part 2 and the Captainverse reading order',spoilerNote:'Story files contain spoilers',directoryTitle:'Every file. One entrance.',filesLabel:'pages',searchLabel:'Search site pages',searchPlaceholder:'Find guides, characters, stories, images…',filters:'Filter files',filterAll:'All',filterLunar:'Lunar Vow',filterWorld:'Honkai world',homeTitle:'Complete Lunar Vow main site',homeDescription:'The original homepage, news highlights, six archive modules and Captain’s profile',guideTitle:'Tactical records',guideDescription:'Guide index and browser-local notes for your combat ideas',galleryTitle:'Lunar Vow image collection',galleryDescription:'Character artwork, desktop and mobile wallpapers, with their original source records',storyArchiveTitle:'Story archive',captainTitle:'Captainverse narrative log',captainDescription:'Bubble worlds, related characters and Lunar Vow’s Captainverse story',infoTitle:'Honkai general database',infoDescription:'An entry point to worldbuilding, principal characters and game systems',newsTitle:'Official news archive',newsDescription:'The copied news archive, organised by TW/HK/MO, Global and Mainland China regions',emptyTitle:'No matching pages found',emptyDescription:'Try “Lunar Vow”, “Valkyrie” or “story”',reset:'Clear search and filters',closingQuote:'Assignments by day.\nLunar Vow archives on the bridge by night.',meetCaptain:'Meet the Captain',disclaimer:'Unofficial, non-commercial personal archive. Game assets belong to their respective rights holders.',snapshot:'Original site snapshot',newsChecked:'News checked',backTop:'Back to top',resultAll:'Showing all 9 pages',resultPrefix:'Found ',resultSuffix:' pages'
    },
    'zh-CN': {
      title:'月下誓约 — 整合档案库 | Bernie’s Honkai Realm',skip:'跳至主要内容',mainNav:'主要导航',language:'界面语言',navDirectory:'全部档案',navNews:'最新消息',navCaptain:'舰长自述',heroKicker:'月下誓约整合档案库',heroSubtitle:'月下誓约・予爱以心',heroDescription:'每一份档案，都是写给月下的情书。攻略、角色、剧情与影像，在这里一次收藏。',openMain:'进入完整月下主站',browse:'浏览全部档案',heroImage:'月下誓约・予爱以心与赤红月亮的收藏插画',heroArtCaption:'赤月之下，誓约依然',startExploring:'向下展开档案',overview:'档案概况',pageCount:'完整网站页面',familyCount:'女武神角色群组',suitCount:'装甲与玩法档案',languageCount:'界面语言',featuredTitle:'从月下开始',featuredDescription:'先打开核心攻略，再探索她的故事与影像',featureImage:'月下收藏插画',coreTitle:'月下核心攻略',coreDescription:'角色定位、装备、星之环与实战循环',rosterTitle:'女武神与所有分支',rosterDescription:'按角色搜索装甲、增幅核心、舰长线与后崩坏书档案',storyTitle:'从圣芙蕾雅到火星',storyDescription:'第一部、第一部半、第二部，以及舰长宇宙的阅读顺序',spoilerNote:'剧情档案包含剧透',directoryTitle:'所有档案，一个入口',filesLabel:'个页面',searchLabel:'搜索网站页面',searchPlaceholder:'找攻略、角色、剧情、图片…',filters:'筛选档案',filterAll:'全部',filterLunar:'月下专属',filterWorld:'崩坏世界',homeTitle:'完整月下主站',homeDescription:'原有首页、最新重点、六大模块与舰长自述',guideTitle:'战术记录',guideDescription:'攻略总览与本机暂存笔记，整理你的战斗心得',galleryTitle:'月下影像收藏',galleryDescription:'角色立绘、桌面与手机壁纸，连同原有来源记录',storyArchiveTitle:'剧情档案',captainTitle:'舰长线叙事记录',captainDescription:'世界泡、相关人物，以及月下在舰长宇宙的故事',infoTitle:'崩坏综合资料库',infoDescription:'世界观、主要角色与游戏系统的资料入口',newsTitle:'官方消息档案',newsDescription:'原站消息完整保留，按台港澳、国际服与大陆服整理',emptyTitle:'暂时找不到相符页面',emptyDescription:'试试“月下”、“女武神”或者“剧情”',reset:'清除搜索与筛选',closingQuote:'白天被 assignment 追杀，\n晚上回舰桥整理月下档案',meetCaptain:'认识舰长',disclaimer:'非官方、非商业个人档案库；游戏素材权利属于原权利持有人',snapshot:'原站内容快照',newsChecked:'消息核对',backTop:'返回页首',resultAll:'显示全部 9 个页面',resultPrefix:'找到 ',resultSuffix:' 个页面'
    }
  };
  const ENTRY_KEYS = {
    home:['homeTitle','homeDescription'], core:['coreTitle','coreDescription'], guide:['guideTitle','guideDescription'], roster:['rosterTitle','rosterDescription'], gallery:['galleryTitle','galleryDescription'], story:['storyArchiveTitle','storyTitle','storyDescription'], captain:['captainTitle','captainDescription'], info:['infoTitle','infoDescription'], news:['newsTitle','newsDescription']
  };
  const ALIASES = {
    home:'首頁 首页 主站 home main about profile 關於 关于',core:'Theresa 德麗莎 德丽莎 雷傷 雷伤 雷电 雷電 流血 裝備 装备 星之環 星之环 lightning bleed equipment 8.7',guide:'攻略 戰鬥 战斗 筆記 笔记 notes tactics combat',roster:'角色 character 琪亞娜 琪亚娜 芽衣 布洛妮婭 布洛妮娅 德麗莎 德丽莎 Elysia 愛莉希雅 爱莉希雅 battlesuit augment APHO',gallery:'圖片 图片 相片 wallpaper photograph photo image 桌布 壁紙 壁纸',story:'聖芙蕾雅 圣芙蕾雅 火星 主線 主线 reading Mars chapters',captain:'月下 Lunar Vow 艦長 舰长 Theresa 德麗莎 德丽莎 Captainverse',info:'崩壞 崩坏 Honkai 世界 world setting system',news:'官方 消息 news update version 活動 活动 TW HK MO Global CN'
  };
  const rows = [...document.querySelectorAll('[data-entry]')];
  const search = document.getElementById('archive-search');
  const status = document.getElementById('search-status');
  const empty = document.getElementById('empty-state');
  const normalise = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  const readLanguage = () => {
    try { const stored=localStorage.getItem('bhr-language'); return Object.hasOwn(COPY,stored) ? stored : 'zh-HK'; } catch { return 'zh-HK'; }
  };
  let language=readLanguage(), filter='all';
  const index = new Map(rows.map(row => [row,normalise([
    ...Object.values(COPY).flatMap(copy => ENTRY_KEYS[row.dataset.entry].map(key => copy[key])),
    ALIASES[row.dataset.entry], row.querySelector('.file-label').textContent
  ].join(' '))]));
  function filterRows() {
    const terms=normalise(search.value).split(/\s+/).filter(Boolean);
    let count=0;
    for(const row of rows) {
      const visible=(filter==='all'||row.dataset.category===filter)&&terms.every(term=>index.get(row).includes(term));
      row.hidden=!visible;
      if(visible)count++;
    }
    empty.hidden=count>0;
    status.textContent=filter==='all'&&!terms.length ? COPY[language].resultAll : COPY[language].resultPrefix+count+COPY[language].resultSuffix;
  }
  function setLanguage(value, persist=true) {
    language=Object.hasOwn(COPY,value)?value:'zh-HK';
    if(persist)try {localStorage.setItem('bhr-language',language);} catch { /* The interface works with storage disabled. */ }
    const copy=COPY[language];
    document.documentElement.lang=language;
    document.body.dataset.language=language;
    document.title=copy.title;
    for(const node of document.querySelectorAll('[data-text]'))node.textContent=copy[node.dataset.text];
    for(const node of document.querySelectorAll('[data-aria]'))node.setAttribute('aria-label',copy[node.dataset.aria]);
    for(const node of document.querySelectorAll('[data-alt]'))node.alt=copy[node.dataset.alt];
    for(const node of document.querySelectorAll('[data-placeholder]'))node.placeholder=copy[node.dataset.placeholder];
    for(const button of document.querySelectorAll('[data-language]'))button.setAttribute('aria-pressed',String(button.dataset.language===language));
    filterRows();
    window.dispatchEvent(new CustomEvent('bhr:languagechange',{detail:{language}}));
  }
  window.BHR_I18N={get language(){return language;},setLanguage};
  for(const button of document.querySelectorAll('[data-language]'))button.addEventListener('click',()=>setLanguage(button.dataset.language));
  for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{
    filter=button.dataset.filter;
    for(const item of document.querySelectorAll('[data-filter]'))item.setAttribute('aria-pressed',String(item===button));
    filterRows();
  });
  search.addEventListener('input',filterRows);
  document.getElementById('reset-search').addEventListener('click',()=>{
    search.value='';filter='all';
    for(const button of document.querySelectorAll('[data-filter]'))button.setAttribute('aria-pressed',String(button.dataset.filter==='all'));
    filterRows();search.focus();
  });
  document.addEventListener('keydown',event=>{
    const editing=/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable;
    if(event.key==='/'&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();search.focus();}
    if(event.key==='Escape'&&document.activeElement===search){search.value='';filterRows();}
  });
  window.addEventListener('pageshow',()=>setLanguage(readLanguage(),false));
  window.addEventListener('storage',event=>{if(event.key==='bhr-language')setLanguage(readLanguage(),false);});
  setLanguage(language,false);
})();
