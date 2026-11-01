'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
async function buildAccessWorker(){
  const {build}=require(path.join(root,'cloudflare/node_modules/esbuild'));
  const output=path.join(root,'.private','passkey-worker.mjs');
  fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});
  await build({entryPoints:[path.join(root,'cloudflare/auth-worker.mjs')],outfile:output,bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],minify:true,sourcemap:false,legalComments:'inline',logLevel:'silent'});
  const data=fs.readFileSync(output);
  return {output,bytes:data.length,gzipBytes:zlib.gzipSync(data).length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
}
module.exports={buildAccessWorker};
if(require.main===module)buildAccessWorker().then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Access Worker bundle failed. Check the pinned Cloudflare project dependencies.');process.exitCode=1;});
