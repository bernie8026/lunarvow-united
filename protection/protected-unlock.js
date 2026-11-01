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
  const authOrigin = document.querySelector('meta[name="portfolio-auth-origin"]')?.content;
  const passkeyButton=document.getElementById('passkey-button');
  const registerButton=document.getElementById('passkey-register-button');
  const setupPanel=document.getElementById('passkey-setup');
  const passkeySupported=!!(window.PublicKeyCredential&&navigator.credentials?.create&&navigator.credentials?.get);
  let setupToken='';
  try{
    const hash=new URLSearchParams(location.hash.slice(1));
    if(hash.has('passkey-setup')){
      const candidate=hash.get('passkey-setup');
      if(/^[A-Za-z0-9_-]{32,256}$/.test(candidate||''))setupToken=candidate;
      // An invitation is a bearer credential: remove it before navigation or copying the URL.
      history.replaceState(null,'',location.pathname+location.search);
    }
  }catch{}
  if(setupPanel)setupPanel.hidden=!setupToken;
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
  const accessCopy = {
    'zh-HK':{authenticating:'正在驗證密碼及檢查存取權限…',decrypting:'正在解密網站…',wrong:'密碼唔正確。',cooldown:'呢個 IP 暫時鎖定，請 {time} 後再試。',permanent:'呢個 IP 累計輸錯 10 次，已永久鎖定。請聯絡網站擁有人解封。',policy:'輸錯 3 次會鎖定 IP 5 分鐘；累計輸錯 10 次會永久鎖定。',session:'密碼會透過 HTTPS 傳送至網站嘅 Cloudflare 驗證服務。網站唔會將密碼或解密金鑰寫入瀏覽器儲存空間。',stale:'網站版本已更新，請重新整理後再試。'},
    en:{authenticating:'Verifying the password and access permissions…',decrypting:'Decrypting the website…',wrong:'The password is incorrect.',cooldown:'This IP is temporarily locked. Try again in {time}.',permanent:'This IP is permanently locked after 10 incorrect attempts. Contact the website owner to unblock it.',policy:'3 incorrect attempts lock the IP for 5 minutes; 10 cumulative incorrect attempts lock it permanently.',session:'Your password is sent over HTTPS to this website’s Cloudflare authentication service. This website does not write the password or decryption key to browser storage.',stale:'The website has been updated. Refresh the page and try again.'},
    'zh-CN':{authenticating:'正在验证密码和访问权限…',decrypting:'正在解密网站…',wrong:'密码不正确。',cooldown:'此 IP 暂时锁定，请在 {time} 后重试。',permanent:'此 IP 累计输错 10 次，已永久锁定。请联系网站所有者解封。',policy:'输错 3 次会锁定 IP 5 分钟；累计输错 10 次会永久锁定。',session:'密码通过 HTTPS 发送至本网站的 Cloudflare 验证服务。网站不会将密码或解密密钥写入浏览器存储空间。',stale:'网站版本已更新，请刷新页面后重试。'},
    ja:{authenticating:'パスワードとアクセス権限を確認中…',decrypting:'サイトを復号中…',wrong:'パスワードが違います。',cooldown:'このIPは一時的にロックされています。{time} 後に再試行してください。',permanent:'パスワードを合計10回間違えたため、このIPは無期限でロックされました。管理者に解除を依頼してください。',policy:'3回間違えるとIPを5分間ロックし、合計10回で無期限にロックします。',session:'パスワードはHTTPS経由でこのサイトのCloudflare認証サービスに送信されます。このサイトはブラウザーストレージにパスワードや復号鍵を書き込みません。',stale:'サイトが更新されました。ページを再読み込みしてください。'},
    ko:{authenticating:'비밀번호와 접속 권한 확인 중…',decrypting:'웹사이트 복호화 중…',wrong:'비밀번호가 올바르지 않습니다.',cooldown:'이 IP는 일시적으로 잠겨 있습니다. {time} 후에 다시 시도해 주세요.',permanent:'비밀번호를 총 10회 틀려 이 IP가 영구적으로 잠겼습니다. 사이트 관리자에게 해제를 요청해 주세요.',policy:'3회 오류 시 IP가 5분간 잠기며, 누적 10회 오류 시 영구 잠깁니다.',session:'비밀번호는 HTTPS를 통해 이 사이트의 Cloudflare 인증 서비스로 전송됩니다. 이 사이트는 브라우저 저장소에 비밀번호나 복호화 키를 기록하지 않습니다.',stale:'사이트가 업데이트되었습니다. 페이지를 새로고침해 주세요.'},
    th:{authenticating:'กำลังตรวจสอบรหัสผ่านและสิทธิ์เข้าถึง…',decrypting:'กำลังถอดรหัสเว็บไซต์…',wrong:'รหัสผ่านไม่ถูกต้อง',cooldown:'IP นี้ถูกล็อกชั่วคราว ลองอีกครั้งใน {time}',permanent:'IP นี้ถูกล็อกถาวรหลังกรอกรหัสผ่านผิดสะสม 10 ครั้ง โปรดติดต่อเจ้าของเว็บไซต์เพื่อปลดล็อก',policy:'กรอกรหัสผ่านผิด 3 ครั้งจะล็อก IP 5 นาที และผิดสะสม 10 ครั้งจะล็อกถาวร',session:'รหัสผ่านจะถูกส่งผ่าน HTTPS ไปยังบริการยืนยันตัวตน Cloudflare ของเว็บไซต์นี้ เว็บไซต์นี้จะไม่บันทึกรหัสผ่านหรือกุญแจถอดรหัสลงในพื้นที่จัดเก็บของเบราว์เซอร์',stale:'เว็บไซต์ได้รับการอัปเดต โปรดรีเฟรชหน้าแล้วลองอีกครั้ง'},
    ru:{authenticating:'Проверка пароля и прав доступа…',decrypting:'Расшифровка сайта…',wrong:'Неверный пароль.',cooldown:'Этот IP временно заблокирован. Повторите через {time}.',permanent:'После 10 неверных попыток этот IP заблокирован бессрочно. Обратитесь к владельцу сайта для разблокировки.',policy:'3 неверные попытки блокируют IP на 5 минут; 10 ошибок суммарно — бессрочно.',session:'Пароль передаётся по HTTPS сервису авторизации Cloudflare этого сайта. Сайт не записывает пароль или ключ расшифровки в хранилище браузера.',stale:'Сайт обновлён. Обновите страницу и повторите попытку.'}
  };
  for(const locale of Object.keys(accessCopy)){
    Object.assign(dictionary[locale],accessCopy[locale]);
    Object.assign(loadingCopy[locale],{authenticating:accessCopy[locale].authenticating,decrypting:accessCopy[locale].decrypting});
  }
  const passkeyCopy={
    'zh-HK':{passkey:'使用通行密鑰',passkeyHint:'使用 Face ID、Touch ID，或選擇另一部裝置。',passkeyUnavailable:'呢個瀏覽器未能使用通行密鑰，請使用密碼解鎖。',setupTitle:'新增你嘅通行密鑰',setupHelp:'呢個係擁有人提供嘅一次性登記邀請。確認後，通行密鑰會由你嘅裝置或密碼管理工具保存。',registerPasskey:'新增通行密鑰',passkeyWaiting:'請喺裝置確認通行密鑰…',registering:'請喺裝置確認新增通行密鑰…',passkeyCancelled:'已取消通行密鑰操作，或者操作已逾時。你可以重新開始，或使用密碼。',passkeyRejected:'通行密鑰未能通過驗證。請重試或使用密碼。',passkeyRegistered:'通行密鑰已新增。撳「使用通行密鑰」即可解鎖。',inviteInvalid:'登記邀請已失效或已使用，請向擁有人取得新邀請。',passkeyDuplicate:'呢部裝置已有登記嘅通行密鑰，請使用佢登入。',passkeyThrottled:'通行密鑰請求太頻密，請稍後再試。'},
    en:{passkey:'Use a passkey',passkeyHint:'Use Face ID, Touch ID, or choose another device.',passkeyUnavailable:'Passkeys are unavailable in this browser. Use the password to unlock.',setupTitle:'Add your passkey',setupHelp:'This is a one-time invitation from the owner. Your device or password manager will save the passkey after you confirm.',registerPasskey:'Add a passkey',passkeyWaiting:'Confirm the passkey on your device…',registering:'Confirm the new passkey on your device…',passkeyCancelled:'The passkey request was cancelled or timed out. Try again or use the password.',passkeyRejected:'The passkey could not be verified. Try again or use the password.',passkeyRegistered:'Passkey added. Choose “Use a passkey” to unlock.',inviteInvalid:'The invitation has expired or was already used. Ask the owner for a new invitation.',passkeyDuplicate:'A passkey is already registered on this device. Use it to sign in.',passkeyThrottled:'Too many passkey requests. Please try again shortly.'},
    'zh-CN':{passkey:'使用通行密钥',passkeyHint:'使用 Face ID、Touch ID，或选择另一台设备。',passkeyUnavailable:'此浏览器无法使用通行密钥，请使用密码解锁。',setupTitle:'新增你的通行密钥',setupHelp:'这是网站所有者提供的一次性登记邀请。确认后，通行密钥由你的设备或密码管理工具保存。',registerPasskey:'新增通行密钥',passkeyWaiting:'请在设备上确认通行密钥…',registering:'请在设备上确认新增通行密钥…',passkeyCancelled:'通行密钥操作已取消或超时。请重试或使用密码。',passkeyRejected:'通行密钥未能通过验证。请重试或使用密码。',passkeyRegistered:'通行密钥已新增。点击“使用通行密钥”即可解锁。',inviteInvalid:'登记邀请已失效或已使用，请向网站所有者获取新邀请。',passkeyDuplicate:'此设备已有登记的通行密钥，请使用它登录。',passkeyThrottled:'通行密钥请求过于频繁，请稍后重试。'},
    ja:{passkey:'パスキーを使う',passkeyHint:'Face ID、Touch ID、または別のデバイスを選択します。',passkeyUnavailable:'このブラウザーではパスキーを利用できません。パスワードを使ってください。',setupTitle:'パスキーを追加',setupHelp:'管理者からの一度限りの登録招待です。確認後、デバイスまたはパスワード管理ツールがパスキーを保存します。',registerPasskey:'パスキーを追加',passkeyWaiting:'デバイスでパスキーを確認してください…',registering:'デバイスで新しいパスキーを確認してください…',passkeyCancelled:'操作がキャンセルされたか、時間切れになりました。再試行するかパスワードを使ってください。',passkeyRejected:'パスキーを確認できませんでした。再試行するかパスワードを使ってください。',passkeyRegistered:'パスキーを追加しました。「パスキーを使う」でロックを解除できます。',inviteInvalid:'招待は期限切れか使用済みです。管理者に新しい招待を依頼してください。',passkeyDuplicate:'このデバイスには登録済みのパスキーがあります。それを使ってログインしてください。',passkeyThrottled:'パスキーの要求が多すぎます。しばらくしてから再試行してください。'},
    ko:{passkey:'패스키 사용',passkeyHint:'Face ID, Touch ID 또는 다른 기기를 선택하세요.',passkeyUnavailable:'이 브라우저에서 패스키를 사용할 수 없습니다. 비밀번호로 잠금을 해제하세요.',setupTitle:'패스키 추가',setupHelp:'관리자가 보낸 일회용 등록 초대입니다. 확인 후 기기나 비밀번호 관리자가 패스키를 저장합니다.',registerPasskey:'패스키 추가',passkeyWaiting:'기기에서 패스키를 확인해 주세요…',registering:'기기에서 새 패스키를 확인해 주세요…',passkeyCancelled:'패스키 요청을 취소했거나 시간이 초과되었습니다. 다시 시도하거나 비밀번호를 사용하세요.',passkeyRejected:'패스키를 확인하지 못했습니다. 다시 시도하거나 비밀번호를 사용하세요.',passkeyRegistered:'패스키를 추가했습니다. “패스키 사용”을 선택하여 잠금을 해제하세요.',inviteInvalid:'초대가 만료되었거나 이미 사용되었습니다. 관리자에게 새 초대를 요청하세요.',passkeyDuplicate:'이 기기에 등록된 패스키가 있습니다. 해당 패스키로 로그인하세요.',passkeyThrottled:'패스키 요청이 너무 많습니다. 잠시 후 다시 시도하세요.'},
    th:{passkey:'ใช้พาสคีย์',passkeyHint:'ใช้ Face ID, Touch ID หรือเลือกอุปกรณ์อื่น',passkeyUnavailable:'เบราว์เซอร์นี้ใช้พาสคีย์ไม่ได้ โปรดใช้รหัสผ่านเพื่อปลดล็อก',setupTitle:'เพิ่มพาสคีย์ของคุณ',setupHelp:'นี่คือคำเชิญลงทะเบียนแบบใช้ครั้งเดียวจากเจ้าของเว็บไซต์ หลังยืนยัน อุปกรณ์หรือแอปจัดการรหัสผ่านจะบันทึกพาสคีย์',registerPasskey:'เพิ่มพาสคีย์',passkeyWaiting:'โปรดยืนยันพาสคีย์บนอุปกรณ์ของคุณ…',registering:'โปรดยืนยันพาสคีย์ใหม่บนอุปกรณ์ของคุณ…',passkeyCancelled:'ยกเลิกคำขอพาสคีย์หรือหมดเวลาแล้ว ลองอีกครั้งหรือใช้รหัสผ่าน',passkeyRejected:'ตรวจสอบพาสคีย์ไม่สำเร็จ โปรดลองอีกครั้งหรือใช้รหัสผ่าน',passkeyRegistered:'เพิ่มพาสคีย์แล้ว เลือก “ใช้พาสคีย์” เพื่อปลดล็อก',inviteInvalid:'คำเชิญหมดอายุหรือถูกใช้แล้ว โปรดขอคำเชิญใหม่จากเจ้าของเว็บไซต์',passkeyDuplicate:'อุปกรณ์นี้มีพาสคีย์ที่ลงทะเบียนแล้ว โปรดใช้พาสคีย์นั้นเข้าสู่ระบบ',passkeyThrottled:'มีคำขอพาสคีย์มากเกินไป โปรดลองอีกครั้งภายหลัง'},
    ru:{passkey:'Войти с ключом доступа',passkeyHint:'Используйте Face ID, Touch ID или выберите другое устройство.',passkeyUnavailable:'В этом браузере ключи доступа недоступны. Используйте пароль.',setupTitle:'Добавить ключ доступа',setupHelp:'Это одноразовое приглашение от владельца. После подтверждения устройство или менеджер паролей сохранит ключ доступа.',registerPasskey:'Добавить ключ доступа',passkeyWaiting:'Подтвердите ключ доступа на устройстве…',registering:'Подтвердите новый ключ доступа на устройстве…',passkeyCancelled:'Запрос отменён или время ожидания истекло. Повторите попытку или используйте пароль.',passkeyRejected:'Не удалось проверить ключ доступа. Повторите попытку или используйте пароль.',passkeyRegistered:'Ключ доступа добавлен. Выберите «Войти с ключом доступа» для разблокировки.',inviteInvalid:'Приглашение истекло или уже использовано. Запросите новое у владельца.',passkeyDuplicate:'На этом устройстве уже есть зарегистрированный ключ доступа. Используйте его для входа.',passkeyThrottled:'Слишком много запросов ключа доступа. Попробуйте позже.'}
  };
  for(const locale of Object.keys(passkeyCopy)){
    Object.assign(dictionary[locale],passkeyCopy[locale]);
    Object.assign(loadingCopy[locale],passkeyCopy[locale]);
  }
  const noPasskeys={
    'zh-HK':'目前未登記通行密鑰。請使用密碼，或用擁有人提供嘅邀請登記。',
    en:'No passkey is registered yet. Use the password, or register with an invitation from the owner.',
    'zh-CN':'目前尚未登记通行密钥。请使用密码，或通过网站所有者提供的邀请登记。',
    ja:'パスキーはまだ登録されていません。パスワードを使うか、管理者からの招待で登録してください。',
    ko:'등록된 패스키가 없습니다. 비밀번호를 사용하거나 관리자의 초대로 등록하세요.',
    th:'ยังไม่มีพาสคีย์ที่ลงทะเบียน โปรดใช้รหัสผ่านหรือลงทะเบียนผ่านคำเชิญจากเจ้าของเว็บไซต์',
    ru:'Ключ доступа ещё не зарегистрирован. Используйте пароль или зарегистрируйте ключ по приглашению владельца.'
  };
  for(const locale of Object.keys(noPasskeys))dictionary[locale].noPasskeys=noPasskeys[locale];
  let language = new URL(location.href).searchParams.get("lang");
  if (!dictionary[language]) { try { language=localStorage.getItem('bernie-portfolio-language'); } catch {} }
  if (!dictionary[language]) language = "zh-HK";
  let state = "preparing", kind = "", busy = false, worker;
  let archivePromise=null, download={loaded:0,total:0};
  let blockedUntil=0,permanentlyBlocked=false,blockTimer;
  const isBlocked=()=>permanentlyBlocked||blockedUntil>Date.now();
  function syncControls(){
    input.disabled=busy||isBlocked();show.disabled=busy||isBlocked();submit.disabled=busy||isBlocked();
    if(passkeyButton)passkeyButton.disabled=busy||isBlocked()||!worker||!passkeySupported;
    if(registerButton)registerButton.disabled=busy||isBlocked()||!worker||!passkeySupported||!setupToken;
  }
  function showBlock(reply){
    permanentlyBlocked=reply.code==='permanent_lock';
    blockedUntil=permanentlyBlocked?0:Date.now()+Math.max(1,Math.min(300,Number(reply.retryAfterSeconds)||300))*1000;
    clearInterval(blockTimer);setStatus(permanentlyBlocked?'permanent':'cooldown',true);syncControls();
    if(!permanentlyBlocked)blockTimer=setInterval(()=>{
      if(!isBlocked()){clearInterval(blockTimer);blockedUntil=0;syncControls();setStatus('ready');}
      else render();
    },1000);
  }
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
    const note=document.getElementById('passkey-note');
    if(note)note.textContent=passkeySupported?text.passkeyHint:text.passkeyUnavailable;
    const seconds=Math.max(0,Math.ceil((blockedUntil-Date.now())/1000));
    const remaining=String(Math.floor(seconds/60))+':'+String(seconds%60).padStart(2,'0');
    status.textContent = (text[state] || loadingCopy[language][state] || '').replace('{time}',remaining);
    status.dataset.kind = kind;
    renderLoading();
    document.querySelectorAll("[data-gate-language]").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.gateLanguage === language)));
  }
  function setStatus(value, error=false) {state=value;kind=error?"error":"";render();}
  function setBusy(value) {
    busy=value;form.setAttribute("aria-busy",String(value));syncControls();
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
  async function accessRequest(path,body){
    const origin=new URL(authOrigin);
    if(origin.protocol!=='https:'||origin.origin!==authOrigin||!origin.hostname.endsWith('.workers.dev'))throw new Error('Invalid authentication origin');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(new URL(path,origin),{method:body?'POST':'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
      const reply=await response.json();
      if(!response.ok||reply.ok!==true){
        const error=new Error('Access denied');
        error.accessCode=reply.code;error.accessReply=reply;throw error;
      }
      return reply;
    }finally{clearTimeout(timer);}
  }
  async function decrypt(getAccess) {
    const envelope=await prepareArchive();
    // Old password-derived bundles are never accepted by the browser runtime.
    if(envelope.version!==2||envelope.cipher!=='AES-256-GCM'||typeof envelope.archiveId!=='string'||envelope.compression!=='gzip')throw new Error('Invalid envelope');
    const iv=bytes(envelope.iv),ciphertext=bytes(envelope.ciphertext);
    if(iv.length!==12||ciphertext.length<17)throw new Error('Invalid envelope');
    setStatus('authenticating');await paint();
    const access=await getAccess(envelope.archiveId);
    if(access.archiveId!==envelope.archiveId)throw new Error('Archive mismatch');
    const raw=bytes(access.key);access.key='';
    if(raw.length!==32){raw.fill(0);throw new Error('Invalid key');}
    let key;
    try{key=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);}
    finally{raw.fill(0);}
    input.value='';input.type='password';
    setStatus('decrypting');await paint();
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
  function webauthnBytes(value){
    if(typeof value!=='string'||value.length>65536||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid credential data');
    return bytes(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  }
  function webauthnBase64(value){
    if(!(value instanceof ArrayBuffer)&&!ArrayBuffer.isView(value))throw new Error('Invalid credential data');
    const data=value instanceof ArrayBuffer?new Uint8Array(value):new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
    if(data.length>65536)throw new Error('Credential data too large');
    let binary='';for(const byte of data)binary+=String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function credentialOptions(options,registration){
    if(!options||typeof options!=='object')throw new Error('Missing credential options');
    const next={...options,challenge:webauthnBytes(options.challenge)};
    if(registration){
      next.user={...options.user,id:webauthnBytes(options.user?.id)};
      next.authenticatorSelection={...options.authenticatorSelection,residentKey:'required',userVerification:'required'};
    }else next.userVerification='required';
    for(const field of ['allowCredentials','excludeCredentials'])if(next[field]){
      if(!Array.isArray(next[field])||next[field].length>100)throw new Error('Invalid credential list');
      next[field]=next[field].map(item=>({...item,id:webauthnBytes(item.id)}));
    }
    return next;
  }
  function credentialJSON(credential,registration){
    if(!credential||credential.type!=='public-key')throw new Error('Missing credential');
    const data=credential.response;
    const response={clientDataJSON:webauthnBase64(data.clientDataJSON)};
    if(registration){
      response.attestationObject=webauthnBase64(data.attestationObject);
      if(typeof data.getTransports==='function')response.transports=data.getTransports();
    }else{
      response.authenticatorData=webauthnBase64(data.authenticatorData);
      response.signature=webauthnBase64(data.signature);
      response.userHandle=data.userHandle?webauthnBase64(data.userHandle):null;
    }
    return {id:credential.id,rawId:webauthnBase64(credential.rawId),type:credential.type,response,
      clientExtensionResults:credential.getClientExtensionResults(),
      ...(credential.authenticatorAttachment?{authenticatorAttachment:credential.authenticatorAttachment}:{})};
  }
  async function openArchive(result){
    input.value='';input.type='password';
    setStatus('opening');await paint();
    await request({type:'UNLOCK',files:result.files},result.files.map(file=>file.data));
    location.replace(targetFor(result.paths));
  }
  function passkeyError(error){
    setBusy(false);
    if(['cooldown','permanent_lock'].includes(error.accessCode)){showBlock(error.accessReply);return;}
    if(['NotAllowedError','AbortError'].includes(error.name)){setStatus('passkeyCancelled');return;}
    if(error.name==='InvalidStateError'){setStatus('passkeyDuplicate',true);return;}
    if(error.accessCode==='archive_mismatch'){setStatus('stale',true);return;}
    if(error.accessCode==='no_passkeys'){setStatus('noPasskeys',true);return;}
    if(['invalid_invitation','invitation_expired','invitation_used','invite_invalid'].includes(error.accessCode)){setStatus('inviteInvalid',true);return;}
    if(['rate_limited','passkey_rate_limited','passkey_rate_limit','passkey_busy'].includes(error.accessCode)){setStatus('passkeyThrottled',true);return;}
    setStatus(error.accessCode?'passkeyRejected':'failed',true);
  }
  passkeyButton?.addEventListener('click',async()=>{
    if(busy||isBlocked()||!worker||!passkeySupported)return;
    setStatus('downloading');setBusy(true);
    try{
      await paint();
      const result=await decrypt(async archiveId=>{
        const start=await accessRequest('/v1/passkeys/auth/options',{archiveId});
        setStatus('passkeyWaiting');await paint();
        const response=await navigator.credentials.get({publicKey:credentialOptions(start.options,false)});
        setStatus('authenticating');await paint();
        return accessRequest('/v1/passkeys/auth/verify',{archiveId,flowId:start.flowId,response:credentialJSON(response,false)});
      });
      await openArchive(result);
    }catch(error){passkeyError(error);}
  });
  registerButton?.addEventListener('click',async()=>{
    if(busy||isBlocked()||!worker||!passkeySupported||!setupToken)return;
    setStatus('registering');setBusy(true);
    try{
      await paint();
      const envelope=await prepareArchive();
      if(envelope.version!==2||typeof envelope.archiveId!=='string')throw new Error('Invalid archive');
      const start=await accessRequest('/v1/passkeys/register/options',{token:setupToken,archiveId:envelope.archiveId});
      const response=await navigator.credentials.create({publicKey:credentialOptions(start.options,true)});
      const result=await accessRequest('/v1/passkeys/register/verify',{archiveId:envelope.archiveId,flowId:start.flowId,response:credentialJSON(response,true)});
      if(result.registered!==true)throw new Error('Registration incomplete');
      setupToken='';setupPanel.hidden=true;setBusy(false);setStatus('passkeyRegistered');passkeyButton.focus();
    }catch(error){passkeyError(error);}
  });
  form.addEventListener("submit",async event => {
    event.preventDefault();if(busy||isBlocked()||!worker||!input.value)return;
    const password=input.value;setStatus("downloading");setBusy(true);
    try {
      await paint();
      const {files,paths}=await decrypt(archiveId=>accessRequest('/v1/unlock',{password,archiveId}));
      await openArchive({files,paths});
    } catch(error) {
      setBusy(false);
      if(['cooldown','permanent_lock'].includes(error.accessCode)){showBlock(error.accessReply);return;}
      setStatus(error.accessCode==='invalid_password'?'wrong':error.accessCode==='archive_mismatch'?'stale':'failed',true);input.focus();
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
    if(session.unlocked&&!setupToken){setStatus("opening");location.replace(location.pathname.endsWith('/unlock.html')?new URL('index.html'+location.search,base).href:location.href);return;}
    setBusy(false);setStatus("ready");
    try{await accessRequest('/v1/status');}
    catch(error){if(['cooldown','permanent_lock'].includes(error.accessCode))showBlock(error.accessReply);}
  }
  initialise().catch(() => setStatus("failed",true));
})();
