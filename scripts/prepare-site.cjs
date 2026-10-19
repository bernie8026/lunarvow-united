const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'docs');
const publicRoot=path.join(root,'public');
const editorialAssets=new Set(['motion.css','immersive.css','showcase.css','education.css','equipment.css','editorial.css','motion.js','showcase.js'].map(file=>'assets/'+file));
const motionAssets=new Set(['motion.css','motion.js','immersive.css','immersive.js','showcase.css','showcase.js','interactions.css','interactions.js','education-motion.css','education-motion.js'].map(file=>'assets/'+file));
const layoutAssets=new Set(["site.css", "site.js", "editorial.css", "education.css", "education-motion.js", "showcase.css", "immersive.css", "immersive.js", "interactions.js"].map(file=>'assets/'+file));
const contentVersions={'assets/skills-console.css':'skills-particles-2','assets/skills-console.js':'skills-particles-2','assets/skills-lore-scene.js':'skills-particles-2','assets/skills-lore-orbit.js':'skills-particles-2','assets/skills-diagram.svg':'endfield-1','assets/education-content.js':'education-1','assets/equipment-content.js':'research-1'};
const reportAssets=new Set(['site.js','interactions.js','showcase.js','motion.js','preloader.js','seo.js'].map(file=>'assets/'+file));
const themeAssets=new Set(['skills-console.css','theme.css','theme-home.css','theme-skills.css','site.js','motion.js','brand.svg','identity.webp','skills-lore-scene.js','skills-lore-orbit.js'].map(file=>'assets/'+file));
const navigationAssets=new Set(['assets/site.js', 'assets/showcase.js', 'assets/immersive.js', 'assets/motion.js', 'assets/interactions.js', 'assets/education-motion.js', 'assets/seo.js', 'assets/skills-lore-scene.js', 'assets/skills-lore-orbit.js', 'assets/skills-console.js', 'assets/navigation.js', 'assets/navigation.css']);
const versionFor=url=>navigationAssets.has(url)?'soft-navigation-1':themeAssets.has(url)?'cyber-blue-1':url==='assets/editorial.css'?'numbers-1':url==='assets/interactions.js'?'console-1':reportAssets.has(url)?'report-1':layoutAssets.has(url)?'layout-1':contentVersions[url]|| (motionAssets.has(url)?'motion-2':editorialAssets.has(url)?'editorial-1':/assets\/(site\.css|arrival-cinematic\.css|brand\.svg|identity\.webp|drone\.webp|camera\.webp)$/.test(url)?'blue-violet-2':'');
// Only the active page's scripts, styles and eager imagery belong to its intro.
// Lazy images, other HTML pages and sharing artwork remain outside this queue.
const pages={};
const attribute=(tag,name)=>tag.match(new RegExp('\\b'+name+'=["\\\']([^"\\\']+)["\\\']','i'))?.[1];
for(const file of fs.readdirSync(publicRoot).filter(file=>file.endsWith('.html'))){
  const html=fs.readFileSync(path.join(publicRoot,file),'utf8');
  const resources=new Map();
  const add=(url,type)=>{
    if(!url?.startsWith('assets/'))return;
    const pathname=url.split('?')[0];
    if(!fs.existsSync(path.join(publicRoot,pathname)))throw new Error('Missing preload asset: '+url);
    const version=versionFor(pathname);
    const versioned=version?pathname+'?v='+version:url;
    resources.set(versioned,{url:versioned,type});
  };
  for(const tag of html.match(/<(?:script|link|img)\b[^>]*>/gi)||[]){
    if(/^<script\b/i.test(tag))add(attribute(tag,'src'),'file');
    else if(/^<link\b/i.test(tag)&&attribute(tag,'rel')==='stylesheet')add(attribute(tag,'href'),'file');
    else if(/^<img\b/i.test(tag)&&attribute(tag,'loading')!=='lazy')add(attribute(tag,'src'),'image');
  }
  add('assets/identity.webp','image');
  pages[path.basename(file,'.html')]=[...resources.values()];
}
// Existing open tabs use the old schema when replaying the intro; retain its
// shared artwork entry without restoring the previous whole-site download.
const resources=[{url:'assets/identity.webp?v=cyber-blue-1',type:'image'}];
fs.writeFileSync(path.join(publicRoot,'assets/preload-manifest.json'),JSON.stringify({version:2,pages,resources},null,2)+'\n');
fs.rmSync(dist,{recursive:true,force:true});
fs.cpSync(publicRoot,dist,{recursive:true});
// Preserve old links to the copied site while presenting portfolio content.
// The original source snapshot is kept in source/lunarvow and is not published.
const redirects={
  'index.html':'index.html','news.html':'projects.html','guide.html':'skills.html',
  'hi3.html':'about.html','gallery.html':'projects.html#photography',
  'story.html':'education.html','captain-line.html':'experience.html',
  'honkai-info.html':'sitemap.html','lunar-vow-guide.html':'projects.html#lunar'
};
fs.mkdirSync(path.join(dist,'lunarvow'),{recursive:true});
for(const [from,to] of Object.entries(redirects)){
  const href='../'+to;
  fs.writeFileSync(path.join(dist,'lunarvow',from),`<!doctype html>\n<html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${href}"><title>Bernie Leung Portfolio</title></head><body><p>此複製版已改成個人作品集 / This copy is now a personal portfolio.</p><a href="${href}">開啟作品集 / Open portfolio</a></body></html>\n`);
}
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
console.log(JSON.stringify({portfolio_pages:8,legacy_redirects:Object.keys(redirects).length,output:dist}));
