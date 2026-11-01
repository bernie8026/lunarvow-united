'use strict';
// Owner-only tool. The admin credential and invitation never enter command arguments or logs.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {readAccessConfig,assertNoSymlinks}=require('./prepare-protected-site.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
  const [action='list',...args]=process.argv.slice(2);
  const config=readAccessConfig();
  if(!/^[-A-Za-z0-9_]{32,256}$/.test(config.adminToken||''))throw new Error('Missing owner credential');
  if(!['invite','list','revoke'].includes(action))throw new Error('Unknown action');
  if(action==='invite'&&args.some(arg=>arg!=='--open')||action==='list'&&args.length||action==='revoke'&&(args.length!==1||!/^[-A-Za-z0-9_]{1,2048}$/.test(args[0])))throw new Error('Invalid arguments');
  const route=action==='invite'?'/v1/admin/passkeys/invitations':action==='revoke'?'/v1/admin/passkeys/revoke':'/v1/admin/passkeys';
  const response=await fetch(new URL(route,config.authOrigin),{
    method:action==='list'?'GET':'POST',headers:{Authorization:'Bearer '+config.adminToken,...(action==='list'?{}:{'Content-Type':'application/json'})},
    ...(action==='list'?{}:{body:JSON.stringify(action==='revoke'?{credentialId:args[0]}:{})}),
    redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'
  });
  if(!response.ok)throw new Error('Owner request failed');
  const reply=await response.json();if(reply.ok!==true)throw new Error('Invalid owner response');
  if(action==='invite'){
    if(!/^[-A-Za-z0-9_]{32,256}$/.test(reply.token||'')||!Number.isFinite(reply.expiresAt))throw new Error('Invalid invitation');
    const url=new URL('https://bernie8026.github.io/lunarvow-united/unlock.html?lang=zh-HK');
    url.hash='passkey-setup='+reply.token;
    const filename=path.resolve(root,'../lunarvow-private/register-passkey.html');assertNoSymlinks(filename);
    const expiry=new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short'}).format(reply.expiresAt);
    const html='<!doctype html><html lang="zh-HK"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;"><title>登記通行密鑰 · Bernie Leung</title><style>body{margin:0;background:#070d18;color:#eaf5ff;font:17px/1.9 system-ui;padding:10vh 7vw}main{max-width:660px;margin:auto}h1{font-size:36px;font-weight:500}a{display:inline-block;background:#00d5ff;color:#04121e;padding:12px 24px;border-radius:12px;text-decoration:none}p{color:#a4bdd0}small{display:block;margin-top:32px}</style><main><h1>登記你嘅通行密鑰</h1><p>喺 iPhone／Mac 用 Safari 或 Chrome 開啟下面嘅網站，再撳「新增通行密鑰」，跟系統提示確認 Face ID、Touch ID 或裝置解鎖。</p><a rel="noreferrer" href="'+url.href+'">前往安全登記頁 ↗</a><p>邀請只可成功登記一次，有效至 '+expiry+'（香港時間）。呢個私人檔案包含登記邀請，請留喺自己裝置。</p><small>成功登記後，網站會顯示「使用通行密鑰」；你可以選擇裝置上儲存嘅通行密鑰或其他裝置。</small></main></html>';
    fs.writeFileSync(filename,html,{mode:0o600});fs.chmodSync(filename,0o600);
    if(args.includes('--open')){
      const opened=spawnSync('open',[url.href],{stdio:'ignore'});
      if(opened.status!==0)throw new Error('Invitation saved but browser could not open');
    }
    console.log(JSON.stringify({invitationFile:filename,expiresAt:reply.expiresAt,opened:args.includes('--open')}));
  }else if(action==='list'){
    const credentials=reply.credentials;
    if(!Array.isArray(credentials))throw new Error('Invalid registry response');
    console.log(JSON.stringify({credentials:credentials.map(item=>({credentialId:item.id,name:item.name,createdAt:item.createdAt,lastUsedAt:item.lastUsed,revokedAt:item.revokedAt}))}));
  }else console.log('Passkey revoked. It can no longer unlock the website.');
}
main().catch(()=>{console.error('Passkey owner operation failed. Check the private owner configuration, arguments and connection.');process.exitCode=1;});
