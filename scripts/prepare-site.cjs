'use strict';
// Validate backend-gated encryption before any public output mutation.
const {readAccessConfig,prepareProtectedSite}=require('./prepare-protected-site.cjs');
const {prepareContent}=require('./prepare-content.cjs');
const {prepareLocales}=require('./prepare-locales.cjs');
function prepareSite(){
  const accessConfig=readAccessConfig();
  prepareLocales();
  const content=prepareContent({quiet:true});
  const result=prepareProtectedSite({accessConfig,sourceRoot:content.output});
  console.log(JSON.stringify(result));return result;
}
module.exports={prepareSite};
if(require.main===module){try{prepareSite();}catch(error){console.error('Protected build failed: '+error.message);process.exitCode=1;}}
