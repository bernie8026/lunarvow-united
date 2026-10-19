"use strict";
(() => {
  const zone = document.querySelector('[data-filter-zone="skills"]');
  const roster = zone?.querySelector('.skill-roster');
  const items = Array.from(zone?.querySelectorAll('.skill-item') || []);
  if (!roster || !items.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {
    'zh-HK': {index:'技能索引',category:'技能分類',select:'拖動模型旋轉 · 使用箭嘴或下方刻度切換技能',previous:'上一項技能',next:'下一項技能',credit:'介面參考：'},
    en: {index:'Skill index',category:'Skill categories',select:'Drag to rotate · Use arrows or bars to switch skills',previous:'Previous skill',next:'Next skill',credit:'Interface reference: '},
    'zh-CN': {index:'技能索引',category:'技能分类',select:'拖动模型旋转 · 使用箭头或下方刻度切换技能',previous:'上一项技能',next:'下一项技能',credit:'界面参考：'}
  };
  const objectNames = {
    'zh-HK':['響應式頁面','事件與程式邏輯','運算與資料處理','相機與光學','影像編排','四旋翼無人機概念','協作網絡','溝通與時間規劃'],
    en:['Responsive layout','Events & runtime logic','Computation & data','Camera & optics','Image composition','Quadrotor concept','Collaborative network','Communication & planning'],
    'zh-CN':['响应式页面','事件与程序逻辑','运算与数据处理','相机与光学','影像编排','四旋翼无人机概念','协作网络','沟通与时间规划']
  };
  function objectCaption() {
    const index = items.indexOf(selected);
    zone.querySelector('[data-skill-object]').textContent = (objectNames[document.documentElement.lang] || objectNames['zh-HK'])[index];
    zone.querySelector('[data-skill-object-index]').textContent = String(index + 1).padStart(2,'0') + ' / ';
  }
  const t = () => labels[document.documentElement.lang] || labels['zh-HK'];
  const announcement = document.createElement('p');
  announcement.className = 'sr-only';
  announcement.setAttribute('role','status');
  zone.append(announcement);
  let selected = items[0];
  let textAnimation;
  const available = () => items.filter(item => !item.hidden);
  const motionAllowed = () => !reduced.matches && !document.hidden && !document.body.classList.contains('motion-paused') && !document.body.classList.contains('is-booting');
  const tabs = items.map((item,index) => {
    const id = String(index + 1).padStart(2,'0');
    item.id = 'capability-' + id;
    item.setAttribute('role','tabpanel');
    item.setAttribute('aria-labelledby','capability-tab-' + id);
    item.setAttribute('tabindex','0');
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'capability-tab-' + id;
    tab.className = 'skill-index-entry';
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-controls',item.id);
    const name = document.createElement('span');
    name.className = 'sr-only';
    tab.append(name);
    tab.addEventListener('click',() => select(item,true));
    roster.append(tab);
    return tab;
  });
  function select(item,animate = false) {
    if (!item || item.hidden) return;
    const changed = selected !== item;
    selected = item;
    const index = items.indexOf(item);
    items.forEach((entry,i) => {
      const current = entry === item;
      entry.classList.toggle('is-selected',current);
      tabs[i].setAttribute('aria-selected',String(current));
      tabs[i].tabIndex = current ? 0 : -1;
    });
    zone.querySelector('[data-skill-current]').textContent = String(available().indexOf(item) + 1).padStart(2,'0');
    zone.querySelector('[data-skill-total]').textContent = String(available().length).padStart(2,'0');
    window.SkillLoreScene?.select(index);
    const previousIndex = zone.dataset.skillIndex;
    zone.dataset.skillIndex = String(index);
    objectCaption();
    if (previousIndex !== String(index)) document.dispatchEvent(new CustomEvent('portfolio:skill',{detail:{index}}));
    if (changed && animate) {
      announcement.textContent = item.querySelector('h2').textContent + ' · ' + item.querySelector('.tag').textContent;
      textAnimation?.cancel();
      if (motionAllowed()) textAnimation = item.animate([
        {opacity:0,transform:'translateY(12px)',filter:'blur(3px)'},
        {opacity:1,transform:'none',filter:'none'}
      ],{duration:500,easing:'cubic-bezier(.2,.7,.3,1)'});
    }
  }
  function move(step,focus = false) {
    const list = available();
    const next = list[(list.indexOf(selected) + step + list.length) % list.length];
    if (!next) return;
    select(next,true);
    if (focus) tabs[items.indexOf(next)].focus();
  }
  function syncFilter() {
    items.forEach((item,i) => {tabs[i].hidden = item.hidden;});
    select(selected.hidden ? available()[0] : selected,true);
    zone.querySelector('.skill-stage').hidden = !available().length;
    zone.querySelector('.lore-navigation').hidden = !available().length;
  }
  function translate() {
    zone.querySelectorAll('[data-skills-text]').forEach(el => {el.textContent = t()[el.dataset.skillsText] || '';});
    objectCaption();
    roster.setAttribute('aria-label',t().index);
    roster.setAttribute('aria-orientation','horizontal');
    zone.querySelector('.filters').setAttribute('aria-label',t().category);
    items.forEach((item,i) => {
      const name = item.querySelector('h2').textContent;
      tabs[i].firstChild.textContent = name;
      tabs[i].title = name;
    });
    zone.querySelectorAll('[data-skill-step]').forEach(button => button.setAttribute('aria-label',t()[button.dataset.skillStep === '1' ? 'next' : 'previous']));
  }
  roster.addEventListener('keydown',event => {
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') {
      const list = available();
      const item = event.key === 'Home' ? list[0] : list.at(-1);
      if (!item) return;
      select(item,true);
      tabs[items.indexOf(item)].focus();
    } else move(['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1,true);
  });
  zone.querySelectorAll('[data-skill-step]').forEach(button => button.addEventListener('click',() => move(Number(button.dataset.skillStep))));
  const directory = zone.querySelector('.lore-directory');
  document.addEventListener('keydown',event => {if (event.key === 'Escape' && directory.open) {directory.open=false;directory.querySelector('summary').focus();}});
  function syncMotion() {
    zone.classList.toggle('skills-motion-idle',!motionAllowed());
    window.SkillLoreScene?.pause(!motionAllowed());
    window.SkillLoreOrbit?.pause(!motionAllowed());
    if (!motionAllowed()) textAnimation?.cancel();
  }
  document.addEventListener('portfolio:filter',event => {if(event.detail?.items?.some(item => items.includes(item))) syncFilter();});
  document.addEventListener('portfolio:language',translate);
  document.addEventListener('portfolio:motion',syncMotion);
  document.addEventListener('visibilitychange',syncMotion);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => zone.classList.toggle('skills-offscreen',!entries[0].isIntersecting)).observe(zone);
  reduced.addEventListener('change',syncMotion);
  new MutationObserver(syncMotion).observe(document.body,{attributes:true,attributeFilter:['class']});
  zone.classList.add('skills-enhanced');
  roster.hidden = false;
  zone.querySelector('.skill-visual').hidden = false;
  zone.querySelector('.skill-pager').hidden = false;
  translate();
  syncFilter();
  syncMotion();
})();
