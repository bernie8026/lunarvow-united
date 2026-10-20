'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),iterations=600000,maximumBytes=64*1024*1024;
const mimeTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
function assertNoSymlinks(target){
  const absolute=path.resolve(target);let current=path.parse(absolute).root;
  for(const part of absolute.slice(current.length).split(path.sep).filter(Boolean)){
    current=path.join(current,part);
    let stat;try{stat=fs.lstatSync(current);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    if(stat.isSymbolicLink())throw new Error('Symbolic links are not permitted: '+current);
  }
}
function validPath(value){
  return typeof value==='string'&&value.length>0&&value.length<=1024&&!/[\\\x00-\x20\x7f?#%:]/.test(value)&&!value.startsWith('/')&&value===path.posix.normalize(value)&&value.split('/').every(part=>part!=='.'&&part!=='..'&&part!=='');
}
function walkFiles(folder){
  assertNoSymlinks(folder);if(!fs.statSync(folder).isDirectory())throw new Error('The source must be a directory');
  const files=[];
  function walk(current,prefix=''){
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const relative=prefix+entry.name;if(!validPath(relative))throw new Error('Unsafe site path: '+relative);
      const absolute=path.join(current,entry.name),stat=fs.lstatSync(absolute);
      if(stat.isSymbolicLink())throw new Error('Symbolic links are not permitted in site files');
      if(stat.isDirectory())walk(absolute,relative+'/');
      else if(stat.isFile())files.push({path:relative,absolute,size:stat.size});
      else throw new Error('Only regular site files are permitted');
    }
  }
  walk(folder);return files;
}
function passwordPath(value=process.env.PORTFOLIO_PASSWORD_FILE){return path.resolve(value||path.join(root,'..','lunarvow-private','access-password.txt'));}
function readPasswordFile(value){
  const filename=passwordPath(value);assertNoSymlinks(filename);
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())throw new Error('Password file is missing; create the private access-password.txt before building');
  if(fs.statSync(filename).size>8192)throw new Error('Password file is unexpectedly large');
  const text=fs.readFileSync(filename,'utf8').replace(/\r?\n$/,'');
  if(!text||/[\r\n\x00]/.test(text))throw new Error('Password file must contain one non-empty password line');
  return Buffer.from(text,'utf8');
}
function encryptArchive(archive,password){
  if(!password?.length)throw new Error('An access password is required');
  const salt=crypto.randomBytes(32),iv=crypto.randomBytes(12),key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');
  try{
    const packed=zlib.gzipSync(Buffer.from(JSON.stringify(archive)),{level:9}),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
    const ciphertext=Buffer.concat([cipher.update(packed),cipher.final(),cipher.getAuthTag()]);
    return {version:1,kdf:'PBKDF2-SHA-256',iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),compression:'gzip',ciphertext:ciphertext.toString('base64')};
  }finally{key.fill(0);}
}
function base64(value,label){
  if(typeof value!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new Error('Invalid '+label);
  return Buffer.from(value,'base64');
}
function validateArchive(archive){
  if(archive?.version!==1||!Array.isArray(archive.files)||!archive.files.length||archive.files.length>10000)throw new Error('Invalid site archive');
  const names=new Set();let bytes=0;
  for(const file of archive.files){
    if(!validPath(file?.path)||names.has(file.path))throw new Error('Invalid or duplicate archive path');
    if(typeof file.type!=='string'||!file.type||file.type.length>128||/[\r\n]/.test(file.type))throw new Error('Invalid archive content type');
    bytes+=base64(file.data,'archive data').length;if(bytes>maximumBytes)throw new Error('Site archive exceeds the supported size');names.add(file.path);
  }
  return archive;
}
function decryptArchive(envelope,password){
  if(envelope?.version!==1||envelope.kdf!=='PBKDF2-SHA-256'||envelope.iterations!==iterations||envelope.compression!=='gzip')throw new Error('Unsupported encrypted site format');
  const salt=base64(envelope.salt,'salt'),iv=base64(envelope.iv,'IV'),ciphertext=base64(envelope.ciphertext,'ciphertext');
  if(salt.length!==32||iv.length!==12||ciphertext.length<17||ciphertext.length>maximumBytes)throw new Error('Invalid encrypted site parameters');
  const key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');let packed;
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(ciphertext.subarray(-16));
    packed=Buffer.concat([decipher.update(ciphertext.subarray(0,-16)),decipher.final()]);
  }catch{throw new Error('Cannot unlock site: the password is incorrect or the bundle is damaged');}
  finally{key.fill(0);}
  return validateArchive(JSON.parse(zlib.gunzipSync(packed,{maxOutputLength:maximumBytes}).toString('utf8')));
}
function normalizedBase(value=process.env.PORTFOLIO_BASE_PATH||'/lunarvow-united/'){
  if(typeof value!=='string'||!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value))throw new Error('Base path must be an absolute directory path ending in /');return value;
}
function writeFile(folder,relative,data){
  if(!validPath(relative))throw new Error('Unsafe output path');
  const target=path.join(folder,...relative.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);
}
function prepareProtectedSite(options={}){
  const password=options.password;if(!password?.length)throw new Error('An access password is required');
  const sourceRoot=path.resolve(options.sourceRoot||path.join(root,'.private','plain-site'));
  const protectionRoot=path.resolve(options.protectionRoot||path.join(root,'protection'));
  const outputRoot=path.resolve(options.outputRoot||path.join(root,'docs')),basePath=normalizedBase(options.basePath);assertNoSymlinks(outputRoot);
  const inside=(parent,child)=>child===parent||child.startsWith(parent+path.sep);
  if([sourceRoot,protectionRoot].some(folder=>inside(folder,outputRoot)||inside(outputRoot,folder)))throw new Error('Public output must be separate from source and protection runtime directories');
  if(fs.existsSync(outputRoot)&&!fs.statSync(outputRoot).isDirectory())throw new Error('Public output must be a directory');
  const runtime=walkFiles(protectionRoot),template=runtime.find(file=>file.path==='index.html');
  if(!template||!['protected-worker.js','protected-session.js','protected-unlock.js'].every(name=>runtime.some(file=>file.path===name)))throw new Error('Protection runtime is incomplete; the gate and all three runtime scripts are required');
  const templateText=fs.readFileSync(template.absolute,'utf8');if(!templateText.includes('__BASE_PATH__'))throw new Error('Unlock template is missing its base path placeholder');
  const sources=walkFiles(sourceRoot),originalBytes=sources.reduce((sum,file)=>sum+file.size,0);
  if(originalBytes>maximumBytes)throw new Error('Site exceeds the supported size');
  const archive=validateArchive({version:1,files:sources.map(file=>({path:file.path,type:mimeTypes[path.extname(file.path).toLowerCase()]||'application/octet-stream',data:fs.readFileSync(file.absolute).toString('base64')}))});
  const envelope=encryptArchive(archive,password),checked=decryptArchive(envelope,password);
  if(checked.files.length!==sources.length)throw new Error('Encrypted archive verification failed');
  const shell=templateText.replaceAll('__BASE_PATH__',basePath),privateRoot=path.join(root,'.private');assertNoSymlinks(privateRoot);fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});
  const stage=fs.mkdtempSync(path.join(privateRoot,'.protected-stage-')),previous=path.join(privateRoot,'.docs-previous-'+crypto.randomUUID());
  let moved=false,installed=false;
  try{
    for(const file of runtime){
      if(file.path==='index.html')continue;
      if(file.path==='protected-site.json'||file.path==='robots.txt'||file.path==='.nojekyll'||file.path.endsWith('.html'))throw new Error('Reserved protection runtime path: '+file.path);
      writeFile(stage,file.path,fs.readFileSync(file.absolute));
    }
    const shellPaths=new Set(['index.html','404.html',...sources.filter(file=>file.path.endsWith('.html')).map(file=>file.path)]);
    for(const relative of shellPaths)writeFile(stage,relative,shell);
    writeFile(stage,'protected-site.json',JSON.stringify(envelope)+'\n');writeFile(stage,'robots.txt','User-agent: *\nDisallow: /\n');writeFile(stage,'.nojekyll','');
    fs.mkdirSync(path.dirname(outputRoot),{recursive:true});
    if(fs.existsSync(outputRoot)){fs.renameSync(outputRoot,previous);moved=true;}
    try{fs.renameSync(stage,outputRoot);installed=true;}
    catch(error){if(moved)fs.renameSync(previous,outputRoot);moved=false;throw error;}
    if(moved){fs.rmSync(previous,{recursive:true,force:true});moved=false;}
    return {protected:true,encrypted_files:sources.length,original_bytes:originalBytes,shell_pages:shellPaths.size,base_path:basePath,output:outputRoot};
  }finally{if(!installed)fs.rmSync(stage,{recursive:true,force:true});}
}
function restoreArchive(options){
  if(!options.bundle||!options.output)throw new Error('Restore requires --decrypt <bundle> --output <new directory>');
  const input=path.resolve(options.bundle),output=path.resolve(options.output);assertNoSymlinks(input);assertNoSymlinks(output);
  if(fs.existsSync(output))throw new Error('Restore output must be a new directory');
  if(fs.statSync(input).size>maximumBytes*2)throw new Error('Encrypted bundle is unexpectedly large');
  const archive=decryptArchive(JSON.parse(fs.readFileSync(input,'utf8')),options.password);fs.mkdirSync(output,{recursive:true,mode:0o700});
  try{for(const file of archive.files)writeFile(output,file.path,base64(file.data,'archive data'));}
  catch(error){fs.rmSync(output,{recursive:true,force:true});throw error;}
  return {restored_files:archive.files.length,output};
}
module.exports={assertNoSymlinks,readPasswordFile,passwordPath,walkFiles,validPath,encryptArchive,decryptArchive,prepareProtectedSite,restoreArchive};
if(require.main===module){
  let password;
  try{
    const args=process.argv.slice(2),values={};
    while(args.length){const option=args.shift();if(!['--decrypt','--output','--password-file'].includes(option)||!args.length)throw new Error('Use --decrypt <bundle> --output <new directory> [--password-file <private file>]');values[option]=args.shift();}
    if((values['--decrypt']&&!values['--output'])||(!values['--decrypt']&&values['--output']))throw new Error('Restore requires --decrypt <bundle> --output <new directory>');
    password=readPasswordFile(values['--password-file']);
    console.log(JSON.stringify(values['--decrypt']?restoreArchive({bundle:values['--decrypt'],output:values['--output'],password}):prepareProtectedSite({password})));
  }catch(error){console.error('Protection operation failed: '+error.message);process.exitCode=1;}
  finally{password?.fill(0);}
}
