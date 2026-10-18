"use strict";
(() => {
  const zone = document.querySelector('[data-filter-zone="skills"]');
  const roster = zone?.querySelector('.skill-roster');
  const items = Array.from(zone?.querySelectorAll('.skill-item') || []);
  if (!roster || !items.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const visual = zone.querySelector('.skill-visual');
  const readout = zone.querySelector('.skill-stage');
  const announcement = document.createElement('p');
  announcement.className = 'sr-only';
  announcement.setAttribute('role','status');
  announcement.setAttribute('aria-live','polite');
  zone.append(announcement);
  const labels = {
    'zh-HK': {index:'技能索引',category:'技能分類',select:'選擇技能，查看實作方向',detail:'能力檔案',evidence:'實作記錄',previous:'上一項技能',next:'下一項技能'},
    en: {index:'Skill index',category:'Skill categories',select:'Select a skill to explore its practice',detail:'Capability file',evidence:'Practice & evidence',previous:'Previous skill',next:'Next skill'},
    'zh-CN': {index:'技能索引',category:'技能分类',select:'选择技能，查看实践方向',detail:'能力档案',evidence:'实践记录',previous:'上一项技能',next:'下一项技能'}
  };
  const categories = {web:['WEB DEVELOPMENT','</>'],tech:['TECHNOLOGY','{ }'],creative:['VISUAL PRACTICE','[ + ]'],people:['COLLABORATION','↗ ↙']};
  const t = () => labels[document.documentElement.lang] || labels['zh-HK'];
  let selected = items[0];
  let visible = true;
  const animations = new Set();
  const motionAllowed = () => !reduced.matches && !document.hidden && !body.classList.contains('motion-paused') && !body.classList.contains('is-booting');
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
    const number = document.createElement('span');
    number.className = 'skill-index-number';
    number.textContent = id;
    number.setAttribute('aria-hidden','true');
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    const status = document.createElement('small');
    copy.append(name,status);
    const arrow = document.createElement('span');
    arrow.className = 'skill-index-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden','true');
    tab.append(number,copy,arrow);
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
    const category = item.dataset.category;
    visual.dataset.category = category;
    const image = visual.querySelector('img');
    const src = 'assets/skills-diagram' + (category === 'tech' ? '' : '-' + category) + '.svg?v=endfield-1';
    if (image.getAttribute('src') !== src) image.src = src;
    visual.querySelector('[data-skill-code]').textContent = categories[category][1];
    visual.querySelector('[data-skill-domain]').textContent = categories[category][0];
    zone.querySelectorAll('[data-skill-current]').forEach(el => {el.textContent = String(index + 1).padStart(2,'0');});
    if (changed && animate) announcement.textContent = item.querySelector('h2').textContent + ' · ' + item.querySelector('.tag').textContent;
    if (matchMedia('(max-width: 760px)').matches) {
      const tabRect = tabs[index].getBoundingClientRect();
      const railRect = roster.getBoundingClientRect();
      const offset = tabRect.left < railRect.left ? tabRect.left - railRect.left : tabRect.right > railRect.right ? tabRect.right - railRect.right : 0;
      if (offset) roster.scrollTo({left:roster.scrollLeft + offset,behavior:animate && motionAllowed() ? 'smooth' : 'instant'});
    }
    if (changed && animate && motionAllowed()) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
      for (const [target,frames] of [
        [item,[{opacity:.35,transform:'translateX(20px)',clipPath:'inset(0 0 0 8%)'},{opacity:1,transform:'none',clipPath:'inset(0)'}]],
        [visual.querySelector('img'),[{opacity:.35,translate:'0 12px'},{opacity:1,translate:'0 0'}]]
      ]) {
        const animation = target.animate(frames,{duration:440,easing:'cubic-bezier(.2,.7,.3,1)'});
        animations.add(animation);
        animation.finished.catch(() => {}).then(() => animations.delete(animation));
      }
    }
  }

  function syncFilter() {
    items.forEach((item,i) => {tabs[i].hidden = item.hidden;});
    if (selected.hidden) select(items.find(item => !item.hidden),true);
    else select(selected);
    readout.hidden = items.every(item => item.hidden);
  }
  function translate() {
    zone.querySelectorAll('[data-skills-text]').forEach(el => {el.textContent = t()[el.dataset.skillsText];});
    roster.setAttribute('aria-label',t().index);
    zone.querySelector('.filters').setAttribute('aria-label',t().category);
    items.forEach((item,i) => {
      tabs[i].querySelector('strong').textContent = item.querySelector('h2').textContent;
      tabs[i].querySelector('small').textContent = item.querySelector('.tag').textContent;
    });
    zone.querySelectorAll('[data-skill-step]').forEach(button => {button.setAttribute('aria-label',t()[button.dataset.skillStep === '1' ? 'next' : 'previous']);});
  }
  function move(step,focus = false) {
    const available = items.filter(item => !item.hidden);
    const index = available.indexOf(selected);
    const next = available[(index + step + available.length) % available.length];
    if (!next) return;
    select(next,true);
    if (focus) tabs[items.indexOf(next)].focus();
  }
  roster.addEventListener('keydown',event => {
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') {
      const available = items.filter(item => !item.hidden);
      const item = event.key === 'Home' ? available[0] : available.at(-1);
      select(item,true);
      tabs[items.indexOf(item)].focus();
    } else move(['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1,true);
  });
  zone.querySelectorAll('[data-skill-step]').forEach(button => button.addEventListener('click',() => move(Number(button.dataset.skillStep))));
  function syncMotion() {
    zone.classList.toggle('skills-motion-idle',!visible || !motionAllowed());
    if (!motionAllowed()) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
  }
  document.addEventListener('portfolio:filter',event => {if(event.detail?.items?.some(item => items.includes(item))) syncFilter();});
  document.addEventListener('portfolio:language',translate);
  document.addEventListener('portfolio:motion',syncMotion);
  document.addEventListener('visibilitychange',syncMotion);
  reduced.addEventListener('change',syncMotion);
  new MutationObserver(syncMotion).observe(body,{attributes:true,attributeFilter:['class']});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {visible=entries[0].isIntersecting;syncMotion();}).observe(zone);
  const mobile = matchMedia('(max-width: 760px)');
  function orientation() {
    roster.setAttribute('aria-orientation',mobile.matches ? 'horizontal' : 'vertical');
    select(selected);
  }
  mobile.addEventListener('change',orientation);
  zone.classList.add('skills-enhanced');
  roster.hidden = false;
  visual.hidden = false;
  zone.querySelector('.skill-pager').hidden = false;
  select(selected);
  translate();
  syncFilter();
  syncMotion();
  orientation();
})();
