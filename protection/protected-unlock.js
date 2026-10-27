"use strict";
(() => {
  const base = new URL("./", document.currentScript.src);
  const form = document.getElementById("unlock-form");
  const input = document.getElementById("site-password");
  const submit = document.getElementById("unlock-button");
  const show = document.getElementById("show-password");
  const status = document.getElementById("gate-status");
  const loading = document.getElementById("gate-loading");
  const loadingStatus = document.getElementById("gate-loading-status");
  const loadingBar = document.getElementById("gate-loading-progress");
  const loadingAmount = document.getElementById("gate-loading-amount");
  const dictionary = {
    "zh-HK": {title:"網站已鎖定",intro:"輸入存取密碼，開啟個人作品集。",heading:"解鎖作品集",description:"有存取密碼？喺下面輸入就可以繼續。",label:"存取密碼",show:"顯示",hide:"隱藏",unlock:"解鎖網站",preparing:"正在準備安全解鎖…",ready:"準備好後，輸入密碼即可解鎖。",decrypting:"正在解鎖網站，請稍等…",opening:"已解鎖，正在開啟網站…",wrong:"密碼唔正確，或者加密檔案已損壞。請再試一次。",failed:"暫時未能載入網站。請檢查連線後重新整理。",unsupported:"請使用支援安全解鎖嘅新版瀏覽器，並透過 HTTPS 開啟網站。",session:"密碼唔會由網站儲存。閒置或關閉瀏覽器後，可能需要重新解鎖。",footer:"只向持有密碼嘅訪客開放"},
    en: {title:"This site is locked",intro:"Enter the access password to open the portfolio.",heading:"Unlock the portfolio",description:"Have an access password? Enter it below to continue.",label:"Access password",show:"Show",hide:"Hide",unlock:"Unlock website",preparing:"Preparing secure access…",ready:"Enter the password when you are ready.",decrypting:"Unlocking the website. Please wait…",opening:"Unlocked. Opening the website…",wrong:"The password is incorrect, or the encrypted file is damaged. Please try again.",failed:"The website could not be loaded. Check your connection and refresh.",unsupported:"Use a modern browser with secure access support and open this site over HTTPS.",session:"The website does not save your password. You may need to unlock it again after inactivity or closing the browser.",footer:"Access is limited to visitors with the password"},
    "zh-CN": {title:"网站已锁定",intro:"输入访问密码，打开个人作品集。",heading:"解锁作品集",description:"有访问密码？在下方输入即可继续。",label:"访问密码",show:"显示",hide:"隐藏",unlock:"解锁网站",preparing:"正在准备安全解锁…",ready:"准备好后，输入密码即可解锁。",decrypting:"正在解锁网站，请稍候…",opening:"已解锁，正在打开网站…",wrong:"密码不正确，或加密文件已损坏。请重试。",failed:"暂时无法加载网站。请检查连接后刷新。",unsupported:"请使用支持安全解锁的新版浏览器，并通过 HTTPS 打开网站。",session:"网站不会保存密码。闲置或关闭浏览器后，可能需要重新解锁。",footer:"仅向持有密码的访客开放"}
  };
  Object.assign(dictionary, {
    ja:{title:'このサイトはロックされています',intro:'アクセス用パスワードを入力して、ポートフォリオを開いてください。',heading:'ポートフォリオを開く',description:'アクセス用パスワードをお持ちの方は、下に入力してください。',label:'アクセス用パスワード',show:'表示',hide:'非表示',unlock:'ロックを解除',preparing:'安全なアクセスを準備しています…',ready:'パスワードを入力すると開けます。',decrypting:'ロックを解除しています。お待ちください…',opening:'解除しました。サイトを開いています…',wrong:'パスワードが違うか、暗号化ファイルが破損しています。もう一度お試しください。',failed:'サイトを読み込めませんでした。接続を確認して再読み込みしてください。',unsupported:'安全なアクセスに対応した新しいブラウザーで、HTTPSのURLを開いてください。',session:'このサイトはパスワードを保存しません。しばらく操作しなかった場合やブラウザーを閉じた後は、再度解除が必要なことがあります。',footer:'パスワードをお持ちの方のみ閲覧できます'},
    ko:{title:'사이트가 잠겨 있습니다',intro:'접속 비밀번호를 입력하여 포트폴리오를 열어 주세요.',heading:'포트폴리오 잠금 해제',description:'접속 비밀번호가 있으면 아래에 입력해 주세요.',label:'접속 비밀번호',show:'표시',hide:'숨기기',unlock:'사이트 잠금 해제',preparing:'보안 접속을 준비하고 있습니다…',ready:'준비되면 비밀번호를 입력해 주세요.',decrypting:'잠금을 해제하고 있습니다. 잠시 기다려 주세요…',opening:'잠금이 해제되었습니다. 사이트를 여는 중…',wrong:'비밀번호가 틀리거나 암호화된 파일이 손상되었습니다. 다시 시도해 주세요.',failed:'사이트를 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.',unsupported:'보안 접속을 지원하는 최신 브라우저에서 HTTPS 주소로 접속해 주세요.',session:'사이트는 비밀번호를 저장하지 않습니다. 장시간 사용하지 않거나 브라우저를 닫으면 다시 잠금을 해제해야 할 수 있습니다.',footer:'비밀번호가 있는 방문자만 볼 수 있습니다'},
    th:{title:'เว็บไซต์นี้ถูกล็อก',intro:'กรอกรหัสผ่านเพื่อเปิดแฟ้มผลงาน',heading:'ปลดล็อกแฟ้มผลงาน',description:'หากมีรหัสผ่าน ให้กรอกด้านล่างเพื่อดำเนินการต่อ',label:'รหัสผ่านเข้าเว็บไซต์',show:'แสดง',hide:'ซ่อน',unlock:'ปลดล็อกเว็บไซต์',preparing:'กำลังเตรียมการเข้าถึงอย่างปลอดภัย…',ready:'กรอกรหัสผ่านเมื่อพร้อม',decrypting:'กำลังปลดล็อกเว็บไซต์ โปรดรอสักครู่…',opening:'ปลดล็อกแล้ว กำลังเปิดเว็บไซต์…',wrong:'รหัสผ่านไม่ถูกต้องหรือไฟล์ที่เข้ารหัสเสียหาย โปรดลองอีกครั้ง',failed:'โหลดเว็บไซต์ไม่ได้ โปรดตรวจสอบการเชื่อมต่อและรีเฟรช',unsupported:'โปรดใช้เบราว์เซอร์รุ่นใหม่ที่รองรับการเข้าถึงอย่างปลอดภัย และเปิดเว็บไซต์ผ่าน HTTPS',session:'เว็บไซต์จะไม่บันทึกรหัสผ่าน คุณอาจต้องปลดล็อกอีกครั้งเมื่อไม่ได้ใช้งานนานหรือปิดเบราว์เซอร์',footer:'เฉพาะผู้เข้าชมที่มีรหัสผ่านเท่านั้น'},
    ru:{title:'Сайт заблокирован',intro:'Введите пароль доступа, чтобы открыть портфолио.',heading:'Разблокировать портфолио',description:'Если у вас есть пароль доступа, введите его ниже.',label:'Пароль доступа',show:'Показать',hide:'Скрыть',unlock:'Разблокировать сайт',preparing:'Подготовка безопасного доступа…',ready:'Введите пароль, когда будете готовы.',decrypting:'Разблокировка сайта. Подождите…',opening:'Доступ открыт. Загружаем сайт…',wrong:'Неверный пароль или повреждён зашифрованный файл. Повторите попытку.',failed:'Не удалось загрузить сайт. Проверьте соединение и обновите страницу.',unsupported:'Откройте сайт по HTTPS в современном браузере с поддержкой безопасного доступа.',session:'Сайт не сохраняет ваш пароль. После долгого бездействия или закрытия браузера может потребоваться повторная разблокировка.',footer:'Доступ только для посетителей с паролем'}
  });
  const loadingCopy = {
    'zh-HK':{downloading:'正在下載加密網站…',decrypting:'正在驗證密碼及解密…',unpacking:'正在準備網站內容…',opening:'正在開啟頁面及準備畫面…',download:'加密檔案下載'},
    en:{downloading:'Downloading the encrypted website…',decrypting:'Verifying the password and decrypting…',unpacking:'Preparing the website content…',opening:'Opening the page and preparing visuals…',download:'Encrypted file download'},
    'zh-CN':{downloading:'正在下载加密网站…',decrypting:'正在验证密码及解密…',unpacking:'正在准备网站内容…',opening:'正在打开页面并准备画面…',download:'加密文件下载'},
    ja:{downloading:'暗号化されたサイトをダウンロード中…',decrypting:'パスワードを確認して復号中…',unpacking:'サイトのコンテンツを準備中…',opening:'ページと画面を準備中…',download:'暗号化ファイルのダウンロード'},
    ko:{downloading:'암호화된 웹사이트 다운로드 중…',decrypting:'비밀번호 확인 및 복호화 중…',unpacking:'웹사이트 콘텐츠 준비 중…',opening:'페이지와 화면 준비 중…',download:'암호화 파일 다운로드'},
    th:{downloading:'กำลังดาวน์โหลดเว็บไซต์ที่เข้ารหัส…',decrypting:'กำลังตรวจสอบรหัสผ่านและถอดรหัส…',unpacking:'กำลังเตรียมเนื้อหาเว็บไซต์…',opening:'กำลังเปิดหน้าและเตรียมภาพ…',download:'ดาวน์โหลดไฟล์ที่เข้ารหัส'},
    ru:{downloading:'Загрузка зашифрованного сайта…',decrypting:'Проверка пароля и расшифровка…',unpacking:'Подготовка содержимого сайта…',opening:'Открытие страницы и подготовка графики…',download:'Загрузка зашифрованного файла'}
  };
  let language = new URL(location.href).searchParams.get("lang");
  if (!dictionary[language]) { try { language=localStorage.getItem('bernie-portfolio-language'); } catch {} }
  if (!dictionary[language]) language = "zh-HK";
  let state = "preparing", kind = "", busy = false, worker;
  let archivePromise=null, download={loaded:0,total:0};
  function renderLoading() {
    if(!loading)return;
    const text=loadingCopy[language];
    const downloading=state==='downloading',known=downloading&&download.total>0;
    loading.dataset.phase=state;
    const phase=text[state]||text.opening;
    if(loadingStatus.textContent!==phase)loadingStatus.textContent=phase;
    loadingBar.dataset.determinate=String(known);
    loadingBar.setAttribute('aria-label',text.download);
    if(known){
      const percent=Math.min(100,Math.floor(download.loaded/download.total*100));
      loadingBar.setAttribute('aria-valuenow',String(percent));
      loadingBar.style.setProperty('--loaded',percent+'%');
      loadingAmount.textContent=percent+'%';
    }else{
      loadingBar.removeAttribute('aria-valuenow');
      loadingAmount.textContent=downloading?`${(download.loaded/1048576).toFixed(1)} MB`:'';
    }
  }
  function render() {
    const text = dictionary[language];
    document.documentElement.lang = language;
    document.title = text.heading + " · Bernie Leung";
    document.querySelectorAll("[data-gate-copy]").forEach(node => {node.textContent = text[node.dataset.gateCopy] || "";});
    show.textContent = input.type === "password" ? text.show : text.hide;
    status.textContent = text[state] || loadingCopy[language][state];
    status.dataset.kind = kind;
    renderLoading();
    document.querySelectorAll("[data-gate-language]").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.gateLanguage === language)));
  }
  function setStatus(value, error=false) {state=value;kind=error?"error":"";render();}
  function setBusy(value) {
    busy=value;form.setAttribute("aria-busy",String(value));input.disabled=value;show.disabled=value;submit.disabled=value;
    if(loading){
      loading.hidden=!value;
      document.querySelectorAll('body > header, body > main, body > footer').forEach(node=>{node.inert=value;});
      if(value){renderLoading();loading.focus({preventScroll:true});}
    }
  }
  document.querySelectorAll("[data-gate-language]").forEach(button => button.addEventListener("click",() => {
    language=button.dataset.gateLanguage;
    try { localStorage.setItem('bernie-portfolio-language', language); } catch {}
    const url=new URL(location.href);url.searchParams.set("lang",language);history.replaceState(null,"",url);render();
  }));
  show.addEventListener("click",() => {input.type=input.type==="password"?"text":"password";show.setAttribute("aria-pressed",String(input.type==="text"));render();});
  function request(message, transfer=[]) {
    return new Promise((resolve,reject) => {
      const channel=new MessageChannel();
      const timeout=setTimeout(() => {channel.port1.close();reject(new Error("Worker unavailable"));},15000);
      channel.port1.onmessage=event => {clearTimeout(timeout);channel.port1.close();event.data?.ok?resolve(event.data):reject(new Error("Worker rejected archive"));};
      worker.postMessage(message,[channel.port2,...transfer]);
    });
  }
  function bytes(value) {
    if(typeof value!=="string"||value.length>40000000||! /^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("Invalid encrypted data");
    const decoded=atob(value),result=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)result[i]=decoded.charCodeAt(i);
    return result;
  }
  function targetFor(paths) {
    let path;
    try {path=decodeURIComponent(location.pathname.slice(base.pathname.length));}catch{path="";}
    if(!path||path.endsWith("/"))path+="index.html";
    const target=paths.has(path)?new URL(location.href):new URL("index.html"+location.search+location.hash,base);
    return target.href;
  }
  // Warm only public ciphertext while the visitor enters a password. No key,
  // plaintext, password or decrypted response is cached or persisted.
  function prepareArchive() {
    if(archivePromise)return archivePromise;
    download={loaded:0,total:0};
    archivePromise=(async()=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),60000);
      try{
        const response=await fetch(new URL('protected-site.json',base),{cache:'no-store',credentials:'same-origin',signal:controller.signal});
        if(!response.ok)throw new Error('Load failed');
        const length=Number(response.headers.get('Content-Length'));
        download.total=Number.isSafeInteger(length)&&length>0&&!response.headers.get('Content-Encoding')?length:0;
        if(download.total>40000000)throw new Error('Archive too large');
        let content;
        if(response.body?.getReader){
          const reader=response.body.getReader(),decoder=new TextDecoder(),parts=[];
          try{
            while(true){
              const {done,value}=await reader.read();if(done)break;
              download.loaded+=value.byteLength;
              if(download.loaded>40000000){controller.abort();throw new Error('Archive too large');}
              parts.push(decoder.decode(value,{stream:true}));renderLoading();
            }
            parts.push(decoder.decode());content=parts.join('');
          }finally{reader.releaseLock();}
        }else{content=await response.text();download.loaded=new TextEncoder().encode(content).length;if(download.loaded>40000000)throw new Error('Archive too large');}
        if(download.total&&download.loaded!==download.total)throw new Error('Incomplete archive');
        return JSON.parse(content);
      }finally{clearTimeout(timer);}
    })().catch(error=>{archivePromise=null;throw error;});
    return archivePromise;
  }
  input.addEventListener('focus',()=>{if(kind!=='error')prepareArchive().catch(()=>{});});
  input.addEventListener('input',()=>{prepareArchive().catch(()=>{});});
  const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  async function decrypt(password) {
    const envelope=await prepareArchive();
    setStatus('decrypting');await paint();
    if(envelope.version!==1||envelope.kdf!=="PBKDF2-SHA-256"||envelope.iterations!==600000||envelope.compression!=="gzip")throw new Error("Invalid envelope");
    const salt=bytes(envelope.salt),iv=bytes(envelope.iv),ciphertext=bytes(envelope.ciphertext);
    if(salt.length!==32||iv.length!==12||ciphertext.length<17)throw new Error("Invalid envelope");
    const encoded=new TextEncoder().encode(password);
    const material=await crypto.subtle.importKey("raw",encoded,"PBKDF2",false,["deriveKey"]);encoded.fill(0);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:envelope.iterations},material,{name:"AES-GCM",length:256},false,["decrypt"]);
    let compressed;
    try {compressed=await crypto.subtle.decrypt({name:"AES-GCM",iv,tagLength:128},key,ciphertext);}catch{throw new DOMException("Password or archive invalid","OperationError");}
    setStatus('unpacking');await paint();
    const unpacked=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    new Uint8Array(compressed).fill(0);
    const archive=JSON.parse(new TextDecoder().decode(unpacked));unpacked.fill(0);
    if(archive.version!==1||!Array.isArray(archive.files)||archive.files.length>4096)throw new Error("Invalid archive");
    const paths=new Set();let size=0;
    const files=archive.files.map(file => {
      if(typeof file.path!=="string"||! /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(file.path)||file.path.split("/").some(part=>part==="."||part==="..")||paths.has(file.path)||typeof file.type!=="string"||/[\r\n]/.test(file.type))throw new Error("Invalid file");
      paths.add(file.path);const data=bytes(file.data);size+=data.byteLength;if(size>64000000)throw new Error("Archive too large");
      return {path:file.path,type:file.type,data:data.buffer};
    });
    if(!paths.has("index.html"))throw new Error("Missing homepage");
    return {files,paths};
  }
  form.addEventListener("submit",async event => {
    event.preventDefault();if(busy||!worker||!input.value)return;
    const password=input.value;setStatus("downloading");setBusy(true);
    try {
      await paint();
      const {files,paths}=await decrypt(password);
      input.value="";input.type="password";
      setStatus('opening');await paint();
      await request({type:"UNLOCK",files},files.map(file=>file.data));
      setStatus("opening");location.replace(targetFor(paths));
    } catch(error) {
      setBusy(false);setStatus(error.name==="OperationError"?"wrong":"failed",true);input.focus();
    }
  });
  async function initialise() {
    render();
    if(!isSecureContext||!crypto.subtle||!navigator.serviceWorker||!window.DecompressionStream){setStatus("unsupported",true);return;}
    await navigator.serviceWorker.register(new URL("protected-worker.js",base),{scope:base.pathname,updateViaCache:"none"});
    await navigator.serviceWorker.ready;
    const correct=()=>navigator.serviceWorker.controller?.scriptURL===new URL("protected-worker.js",base).href;
    if(!correct())await new Promise((resolve,reject) => {
      const timer=setTimeout(() => {navigator.serviceWorker.removeEventListener("controllerchange",check);reject(new Error("Control unavailable"));},10000);
      function check(){if(correct()){clearTimeout(timer);navigator.serviceWorker.removeEventListener("controllerchange",check);resolve();}}
      navigator.serviceWorker.addEventListener("controllerchange",check);check();
    });
    worker=navigator.serviceWorker.controller;
    const session=await request({type:"STATE"});
    if(session.unlocked){setStatus("opening");location.replace(location.href);return;}
    setBusy(false);setStatus("ready");
  }
  initialise().catch(() => setStatus("failed",true));
})();
