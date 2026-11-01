'use strict';
// Owner recovery reads a separate private credential. Never place it in a URL,
// command argument, browser storage, repository, or console output.
const {readAccessConfig}=require('./prepare-protected-site.cjs');
async function main(){
  const target=process.argv[2]||'self';
  if(process.argv.length>3||target.length>64)throw new Error('Use: node scripts/unblock-site-ip.cjs [self|IP]');
  const config=readAccessConfig();
  if(typeof config.adminToken!=='string'||!/^[-A-Za-z0-9_]{32,256}$/.test(config.adminToken))throw new Error('Private owner recovery credential is missing');
  const response=await fetch(new URL('/v1/admin/unblock',config.authOrigin),{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.adminToken},
    body:JSON.stringify({ip:target}),redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw new Error('Recovery request failed (HTTP '+response.status+'); no counters were reset by this script');
  const reply=await response.json();
  if(reply.ok!==true||reply.failures!==0)throw new Error('Recovery response was invalid');
  console.log('IP access restored. Refresh the locked page before entering the password.');
}
main().catch(()=>{console.error('Could not restore access. Check the private owner configuration and connection, then try again.');process.exitCode=1;});
