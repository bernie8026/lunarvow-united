(() => {
  'use strict';
  const link=document.querySelector('[data-realm-return]');
  if(!link)return;
  const labels={'zh-HK':'返回整合總覽',en:'Unified archive','zh-CN':'返回整合总览'};
  function update(){
    let language=window.BHR_I18N?.language||document.documentElement.lang;
    try {language=window.BHR_I18N?.language||localStorage.getItem('bhr-language')||language;}catch{}
    link.textContent=labels[language]||labels['zh-HK'];
    link.setAttribute('aria-label',link.textContent);
  }
  update();
  window.addEventListener('bhr:languagechange',update);
  window.addEventListener('bhr:translationsready',update);
})();
