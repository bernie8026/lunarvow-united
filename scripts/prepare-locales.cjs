'use strict';
// Compile private working translations into one synchronous, preloaded module.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const supported=['zh-HK','en','zh-CN','ja','ko','th','ru'];
function prepareLocales(){
  const sandbox={window:{PORTFOLIO_TEXT:{}}};vm.createContext(sandbox);
  for(const name of ['content','education-content','equipment-content','home-content','about-apple-content'])vm.runInContext(fs.readFileSync(path.join(root,'public/assets',name+'.js'),'utf8'),sandbox);
  const source=sandbox.window.PORTFOLIO_TEXT,messages={};
  for(const locale of supported.slice(3)){
    const values=JSON.parse(fs.readFileSync(path.join(root,'public/assets/locales',locale+'.json'),'utf8'));
    if(Object.keys(values).length!==Object.keys(source).length)throw new Error('Translation key count mismatch: '+locale);
    for(const [key,entry] of Object.entries(source)){
      if(typeof values[key]!=='string'||!values[key].trim())throw new Error('Missing '+locale+' translation: '+key);
      const slots=text=>[...text.matchAll(/\{[^{}]+\}/g)].map(match=>match[0]).sort().join('|');
      if(slots(entry.en)!==slots(values[key]))throw new Error('Translation placeholders changed: '+locale+'/'+key);
    }
    messages[locale]=values;
  }
  const controls={
    'zh-HK':{language:'選擇語言',top:'返回頂部',nameRequired:'請輸入稱呼。',messageRequired:'請輸入至少 10 個非空白字元。'},
    en:{language:'Choose language',top:'Back to top',nameRequired:'Please enter your name.',messageRequired:'Please enter at least 10 non-blank characters.'},
    'zh-CN':{language:'选择语言',top:'返回顶部',nameRequired:'请输入称呼。',messageRequired:'请输入至少 10 个非空白字符。'},
    ja:{language:'言語を選択',top:'ページの先頭へ',nameRequired:'お名前を入力してください。',messageRequired:'空白以外の文字を10文字以上入力してください。'},
    ko:{language:'언어 선택',top:'맨 위로',nameRequired:'이름을 입력해 주세요.',messageRequired:'공백을 제외하고 10자 이상 입력해 주세요.'},
    th:{language:'เลือกภาษา',top:'กลับด้านบน',nameRequired:'กรุณากรอกชื่อของคุณ',messageRequired:'กรุณากรอกอย่างน้อย 10 อักขระที่ไม่ใช่ช่องว่าง'},
    ru:{language:'Выбрать язык',top:'Наверх',nameRequired:'Введите ваше имя.',messageRequired:'Введите не менее 10 символов без учёта пробелов.'}
  };
  fs.writeFileSync(path.join(root,'public/assets/locales.js'),'"use strict";\nwindow.PORTFOLIO_LOCALES = '+JSON.stringify({supported,messages,controls})+';\n');
  return {languages:supported.length,translatedKeys:Object.keys(source).length};
}
module.exports={prepareLocales};
if(require.main===module)console.log(JSON.stringify(prepareLocales()));
