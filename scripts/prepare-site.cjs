const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'docs');
const publicRoot=path.join(root,'public');
function filesIn(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);
  return entry.isDirectory()?filesIn(file):[file];
});}
const resources=filesIn(publicRoot).map(file=>path.relative(publicRoot,file).split(path.sep).join('/'))
  .filter(file=>/\.(html|css|js|webp)$/.test(file)||file==='assets/brand.svg')
  .map(url=>({url,type:/\.(webp|svg)$/.test(url)?'image':'file'}));
fs.writeFileSync(path.join(publicRoot,'assets/preload-manifest.json'),JSON.stringify({resources},null,2)+'\n');
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
