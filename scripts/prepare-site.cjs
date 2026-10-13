const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const original=path.join(root,'source/lunarvow');
const dist=path.join(root,'docs');
const mirror=path.join(dist,'lunarvow');
const development=new Set(['.github','.gitignore','tests','scripts','main.py','package.json','package-lock.json','requirements.txt','README.md']);
fs.rmSync(dist,{recursive:true,force:true});
fs.cpSync(path.join(root,'public'),dist,{recursive:true});
fs.cpSync(original,mirror,{recursive:true,filter:source=>{
  const relative=path.relative(original,source);
  return !relative||!development.has(relative.split(path.sep)[0]);
}});
const pages=fs.readdirSync(mirror).filter(name=>name.endsWith('.html'));
for(const page of pages){
  const file=path.join(mirror,page);
  let html=fs.readFileSync(file,'utf8');
  html=html.replace('</head>','    <link rel="stylesheet" href="assets/unified-nav.css">\n    <script src="assets/unified-nav.js" defer></script>\n</head>');
  html=html.replace('</body>','    <a class="realm-hub-return" href="../index.html" data-realm-return data-i18n-ignore aria-label="返回整合總覽">返回整合總覽</a>\n</body>');
  fs.writeFileSync(file,html);
}
for(const asset of ['unified-nav.css','unified-nav.js'])fs.copyFileSync(path.join(root,'public/assets',asset),path.join(mirror,'assets',asset));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);
  return entry.isDirectory()?walk(file):[path.relative(mirror,file).split(path.sep).join('/')];
});}
const {buildManifest}=require(path.join(original,'scripts/build-preload-manifest.cjs'));
const manifest=buildManifest(walk(mirror),JSON.parse(fs.readFileSync(path.join(mirror,'data/characters.json'),'utf8')),fs.readFileSync(path.join(mirror,'assets/music-player.js'),'utf8'),fs.readFileSync(path.join(mirror,'assets/i18n.js'),'utf8'));
fs.writeFileSync(path.join(mirror,'assets/preload-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
console.log(JSON.stringify({copied_pages:pages.length,preloaded_resources:manifest.resources.length,output:dist}));
