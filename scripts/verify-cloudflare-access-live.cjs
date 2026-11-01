/* Live protection smoke test. Never prints credentials, responses, or client IPs. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {readAccessConfig,readPasswordFile,decryptArchive}=require('./prepare-protected-site.cjs');
const root=path.resolve(__dirname,'..');
const siteOrigin='https://bernie8026.github.io';
const results=[];
let config,passwordBytes,password,modified=false,currentStage='private_configuration';

class SafeFailure extends Error {
  constructor(label,status,code){super(label);this.label=label;this.status=status;this.code=code;}
}
function check(condition,label){if(!condition)throw new SafeFailure(label);}
function codeFor(value){
  const allowed=new Set(['ready','allowed','invalid_password','cooldown','permanent_lock','origin_not_allowed',
    'archive_mismatch','unauthorized','invalid_request','service_unavailable','not_found','https_required']);
  return allowed.has(value)?value:'unexpected_response';
}
async function api(route,{method='GET',body,headers={}}={}){
  let response;
  try{
    response=await fetch(config.authOrigin+route,{
      method,headers:{Origin:siteOrigin,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store',
    });
  }catch{throw new SafeFailure('network_request_failed');}
  let value;
  try{value=await response.json();}catch{throw new SafeFailure('non_json_response',response.status);}
  return {status:response.status,value,headers:response.headers};
}
function responseIs(result,status,code){
  if(result.status!==status||code&&result.value.code!==code){
    throw new SafeFailure('unexpected_status_or_code',result.status,codeFor(result.value?.code));
  }
}
function noKey(result){
  check(result.value&&typeof result.value==='object'&&!Object.hasOwn(result.value,'key'),'denied_response_must_not_have_key');
  check(/no-store/i.test(result.headers.get('cache-control')||''),'sensitive_response_must_not_be_cached');
}
async function test(label,operation){
  currentStage=label;await operation();results.push(label);console.log('PASS '+label);
}
const unlock=(candidate,extra={})=>api('/v1/unlock',{
  method:'POST',body:{password:candidate,archiveId:config.archiveId},...extra,
});
async function unblock(){
  const result=await api('/v1/admin/unblock',{
    method:'POST',body:{ip:'self'},headers:{Authorization:'Bearer '+config.adminToken},
  });
  responseIs(result,200,'ready');noKey(result);check(result.value.failures===0,'recovery_must_clear_counter');
  return result;
}

async function main(){
  config=readAccessConfig();passwordBytes=readPasswordFile();password=passwordBytes.toString('utf8');
  check(typeof config.adminToken==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(config.adminToken),'private_recovery_token_required');
  const envelope=JSON.parse(fs.readFileSync(path.join(root,'docs/protected-site.json'),'utf8'));
  check(envelope.version===2&&envelope.archiveId===config.archiveId,'local_envelope_generation_must_match');
  await test('live_health_and_empty_initial_counter',async()=>{
    // Only this non-mutating health GET is retried during workers.dev propagation.
    let ready=false;
    for(const delay of [0,1000,2000,4000,6000]){
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      try{const result=await api('/health');ready=result.status===200&&result.value.ok===true;}
      catch{}
      if(ready)break;
    }
    check(ready,'health_not_ready_after_bounded_get_retries');
    const initial=await api('/v1/status');responseIs(initial,200,'ready');noKey(initial);
    check(initial.value.failures===0,'initial_counter_not_zero_no_mutation_performed');
    check(initial.value.archiveId===config.archiveId,'server_generation_must_match');
  });
  await test('correct_login_key_decrypts_local_envelope',async()=>{
    const result=await unlock(password);responseIs(result,200);
    check(result.value.ok===true&&result.value.archiveId===config.archiveId&&result.value.failures===0,'correct_login_contract');
    const returned=Buffer.from(result.value.key||'','base64'),expected=Buffer.from(config.archiveKeyB64,'base64');
    try{check(returned.length===32&&expected.length===32&&crypto.timingSafeEqual(returned,expected),'server_key_must_match_private_key');}
    finally{returned.fill(0);expected.fill(0);}
    const archive=decryptArchive(envelope,{...config,archiveKeyB64:result.value.key});
    check(archive.files.length>0&&archive.files.some(file=>file.path==='index.html'),'released_key_must_decrypt_authenticated_archive');
    archive.files.length=0;delete result.value.key;
    check(/no-store/i.test(result.headers.get('cache-control')||''),'success_response_must_not_be_cached');
  });
  await test('wrong_password_counts_and_success_preserves_lifetime_count',async()=>{
    modified=true;
    const wrong=await unlock('live-smoke-intentionally-incorrect-'+crypto.randomBytes(12).toString('hex'));
    responseIs(wrong,401,'invalid_password');noKey(wrong);check(wrong.value.failures===1,'first_failure_must_count_once');
    const good=await unlock(password);responseIs(good,200);
    check(good.value.failures===1,'success_must_preserve_cumulative_failures');delete good.value.key;
    const status=await api('/v1/status');responseIs(status,200,'ready');noKey(status);
    check(status.value.failures===1,'status_must_preserve_first_failure');
  });
  await test('stale_archive_cors_and_spoofed_forwarded_ip_do_not_reset_counter',async()=>{
    const stale=await api('/v1/unlock',{method:'POST',body:{password,archiveId:'live-smoke-stale-archive-generation'}});
    responseIs(stale,409,'archive_mismatch');noKey(stale);
    const denied=await unlock(password,{headers:{Origin:'https://invalid-origin.example'}});
    responseIs(denied,403,'origin_not_allowed');noKey(denied);
    check(!denied.headers.has('access-control-allow-origin'),'denied_origin_must_not_receive_cors');
    const status=await api('/v1/status',{headers:{'X-Forwarded-For':'203.0.113.220','X-Real-IP':'203.0.113.220'}});
    responseIs(status,200,'ready');noKey(status);check(status.value.failures===1,'forwarded_ip_must_not_change_identity');
  });
  await test('third_failure_starts_five_minute_cooldown',async()=>{
    for(const expected of [2,3]){
      const result=await unlock('live-smoke-intentionally-incorrect-'+crypto.randomBytes(12).toString('hex'));
      responseIs(result,expected===3?429:401,expected===3?'cooldown':'invalid_password');noKey(result);
      check(result.value.failures===expected,'failure_counter_must_increment_exactly_once');
      if(expected===3){
        check(result.value.retryAfterSeconds>=295&&result.value.retryAfterSeconds<=300,'cooldown_must_be_five_minutes');
        check(Number(result.headers.get('retry-after'))===result.value.retryAfterSeconds,'retry_after_header_must_match');
        check(/Date/i.test(result.headers.get('access-control-expose-headers')||'')&&Number.isFinite(Date.parse(result.headers.get('date'))),'server_time_must_be_exposed');
      }
    }
  });
  await test('blocked_correct_wrong_and_spoofed_requests_never_release_key_or_increment',async()=>{
    for(const candidate of [password,'live-smoke-incorrect-while-blocked']){
      const result=await unlock(candidate,{headers:{'X-Forwarded-For':'198.51.100.221','X-Real-IP':'198.51.100.221'}});
      responseIs(result,429,'cooldown');noKey(result);check(result.value.failures===3,'blocked_requests_must_not_increment');
    }
    const status=await api('/v1/status');responseIs(status,429,'cooldown');noKey(status);
    check(status.value.failures===3,'cooldown_counter_must_remain_three');
  });
  await test('recovery_requires_independent_owner_token',async()=>{
    const denied=await api('/v1/admin/unblock',{method:'POST',body:{ip:'self'},headers:{Authorization:'Bearer live-smoke-invalid-recovery-token-00000000'}});
    responseIs(denied,401,'unauthorized');noKey(denied);
    const blocked=await api('/v1/status');responseIs(blocked,429,'cooldown');check(blocked.value.failures===3,'invalid_recovery_must_not_reset_counter');
    await unblock();
    const status=await api('/v1/status');responseIs(status,200,'ready');noKey(status);check(status.value.failures===0,'owner_recovery_must_clear_counter');
    const good=await unlock(password);responseIs(good,200);check(good.value.failures===0,'login_must_work_after_recovery');delete good.value.key;
  });
}

(async()=>{
  let failed=false;
  try{await main();}
  catch(error){
    failed=true;
    // Emit fixed labels and allowlisted status/code only; never exception messages or raw response data.
    const report={result:'FAIL',stage:currentStage,reason:error instanceof SafeFailure?error.label:'operation_failed'};
    if(error instanceof SafeFailure&&Number.isInteger(error.status))report.status=error.status;
    if(error instanceof SafeFailure&&error.code)report.code=error.code;
    console.error(JSON.stringify(report));
  }finally{
    if(modified){
      try{
        await unblock();
        const status=await api('/v1/status');responseIs(status,200,'ready');check(status.value.failures===0,'cleanup_counter_must_be_zero');
        console.log('PASS unconditional_owner_cleanup_counter_zero');
      }catch{
        failed=true;console.error(JSON.stringify({result:'FAIL',stage:'cleanup',reason:'owner_cleanup_requires_attention'}));
      }
    }
    passwordBytes?.fill(0);password='';config=null;
  }
  console.log(JSON.stringify({result:failed?'FAIL':'PASS',checks:results.length,cleanupAttempted:modified}));
  process.exitCode=failed?1:0;
})();
