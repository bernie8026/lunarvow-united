/* Browser-test fixture only. It never contacts Cloudflare or implements real IP limits. */
'use strict';
const {readAccessConfig,prepareProtectedSite}=require('./prepare-protected-site.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');

function redactProtectionError(error,{config,password}={}){
  let message=String(error?.stack||error);
  for(const value of [password,config?.archiveKeyB64,config?.ipHmacKeyB64,config?.adminToken]){
    if(typeof value==='string'&&value.length)message=message.split(value).join('[REDACTED]');
  }
  return message;
}

async function installAuthRoute(context,options={}){
  const config=options.config||readAccessConfig();
  const origin=new URL(config.authOrigin).origin;
  const passkeyOnly=options.passkeyOnly===true;
  if(!passkeyOnly&&!options.password)throw new Error('The legacy password fixture requires a private test password');
  const state={events:[],unlocks:0,passkeyOptions:0,statusChecks:0,delay:options.delay||0,nextUnlock:null,statusResponse:null};
  if(passkeyOnly)await context.addInitScript(()=>{
    // A UI fixture, not a WebAuthn verifier. Real signatures are tested in verify-passkeys.cjs.
    Object.defineProperty(navigator.credentials,'get',{configurable:true,value:async()=>{
      const value=new Uint8Array([1,2,3]).buffer;
      return {id:'AQID',rawId:value,type:'public-key',response:{clientDataJSON:value,authenticatorData:value,signature:value,userHandle:null},getClientExtensionResults:()=>({})};
    }});
  });
  const defaultStatus=()=>({ok:true,archiveId:config.archiveId,code:'ready',failures:0});
  const responseHeaders=request=>({
    'Content-Type':'application/json',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':request.headers().origin||'*',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Expose-Headers':'Retry-After',
    'Vary':'Origin'
  });
  await context.route(url=>url.origin===origin,async route=>{
    const request=route.request(),url=new URL(request.url()),headers=responseHeaders(request);
    if(request.method()==='OPTIONS'){
      state.events.push({path:url.pathname,method:'OPTIONS',status:204});
      await route.fulfill({status:204,headers,body:''});return;
    }
    let result;
    if(url.pathname==='/v1/status'&&request.method()==='GET'){
      state.statusChecks++;result=state.statusResponse||{status:200,body:defaultStatus()};
    }else if(passkeyOnly&&url.pathname==='/v1/unlock'){
      result={status:410,body:{ok:false,code:'passkey_required'}};
    }else if(passkeyOnly&&url.pathname==='/v1/passkeys/auth/options'&&request.method()==='POST'){
      state.passkeyOptions++;
      let body;
      try{body=request.postDataJSON();}catch{}
      result=body?.archiveId===config.archiveId
        ?{status:200,body:{ok:true,flowId:'fixture-flow',options:{challenge:'AQID',userVerification:'required'}}}
        :{status:409,body:{ok:false,code:'archive_mismatch'}};
    }else if(request.method()==='POST'&&url.pathname===(passkeyOnly?'/v1/passkeys/auth/verify':'/v1/unlock')){
      state.unlocks++;
      if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
      let body;
      try{body=request.postDataJSON();}catch{}
      if(state.nextUnlock){result=typeof state.nextUnlock==='function'?state.nextUnlock():state.nextUnlock;state.nextUnlock=null;}
      else if(!body||body.archiveId!==config.archiveId)result={status:409,body:{ok:false,code:'archive_mismatch'}};
      else if(passkeyOnly?(body.flowId!=='fixture-flow'||body.response?.id!=='AQID'):body.password!==options.password)result={status:401,body:{ok:false,code:passkeyOnly?'invalid_passkey':'invalid_password',failures:passkeyOnly?0:1}};
      else result={status:200,body:{ok:true,archiveId:config.archiveId,key:config.archiveKeyB64,failures:0}};
    }else result={status:404,body:{ok:false,error:'not_found',code:'not_found'}};
    state.events.push({path:url.pathname,method:request.method(),status:result.status});
    if(result.abort){await route.abort('failed');return;}
    await route.fulfill({status:result.status,headers:{...headers,...result.headers},body:JSON.stringify(result.body)});
  });
  return state;
}

async function startPasskeyPreview({onArchive}={}){
  const root=path.resolve(__dirname,'..'),privateRoot=path.join(root,'.private');
  const sourceRoot=path.join(privateRoot,'plain-site');
  if(!fs.existsSync(path.join(sourceRoot,'index.html')))throw new Error('Prepare the local plaintext site with scripts/prepare-content.cjs first');
  const temporary=fs.mkdtempSync(path.join(privateRoot,'passkey-preview-')),outputRoot=path.join(temporary,'docs');
  const config={authOrigin:'https://local-passkey-fixture.workers.dev',archiveId:crypto.randomUUID(),archiveKeyB64:crypto.randomBytes(32).toString('base64')};
  const basePath='/lunarvow-united/';
  let server;
  async function close(){
    if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    fs.rmSync(temporary,{recursive:true,force:true});
  }
  try{
    prepareProtectedSite({sourceRoot,outputRoot,accessConfig:config,basePath});
    server=http.createServer((request,response)=>{
      let relative;
      try{
        const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
        if(pathname.startsWith(basePath))relative=pathname.slice(basePath.length)||'index.html';
      }catch{}
      if(!relative||relative.includes('\\')||relative.split('/').some(part=>!part||part==='.'||part==='..')||!['GET','HEAD'].includes(request.method)){
        response.writeHead(404).end();return;
      }
      fs.readFile(path.join(outputRoot,relative),(error,data)=>{
        if(error){response.writeHead(404).end();return;}
        if(relative==='protected-site.json'&&onArchive){onArchive(data,request,response);return;}
        const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(relative)]||'text/plain';
        response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Content-Length':data.length});
        response.end(request.method==='HEAD'?undefined:data);
      });
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    return {base:new URL(basePath,`http://127.0.0.1:${server.address().port}`),config,close};
  }catch(error){await close();throw error;}
}

module.exports={installAuthRoute,redactProtectionError,startPasskeyPreview};
