/* Browser-test fixture only. It never contacts Cloudflare or implements real IP limits. */
'use strict';
const {readAccessConfig}=require('./prepare-protected-site.cjs');

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
  if(!options.password)throw new Error('The local auth fixture requires a private test password');
  const state={events:[],unlocks:0,statusChecks:0,delay:options.delay||0,nextUnlock:null,statusResponse:null};
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
    }else if(url.pathname==='/v1/unlock'&&request.method()==='POST'){
      state.unlocks++;
      if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
      let body;
      try{body=request.postDataJSON();}catch{}
      if(state.nextUnlock){result=typeof state.nextUnlock==='function'?state.nextUnlock():state.nextUnlock;state.nextUnlock=null;}
      else if(!body||body.archiveId!==config.archiveId)result={status:409,body:{ok:false,code:'archive_mismatch'}};
      else if(body.password!==options.password)result={status:401,body:{ok:false,code:'invalid_password',failures:1}};
      else result={status:200,body:{ok:true,archiveId:config.archiveId,key:config.archiveKeyB64,failures:0}};
    }else result={status:404,body:{ok:false,error:'not_found',code:'not_found'}};
    state.events.push({path:url.pathname,method:request.method(),status:result.status});
    if(result.abort){await route.abort('failed');return;}
    await route.fulfill({status:result.status,headers:{...headers,...result.headers},body:JSON.stringify(result.body)});
  });
  return state;
}

module.exports={installAuthRoute,redactProtectionError};
