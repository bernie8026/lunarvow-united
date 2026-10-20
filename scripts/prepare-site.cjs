'use strict';
// Validate the password before any source build or public output mutation.
const {readPasswordFile,prepareProtectedSite}=require('./prepare-protected-site.cjs');
const {prepareContent}=require('./prepare-content.cjs');
function prepareSite(){
  const password=readPasswordFile();
  try{
    const content=prepareContent({quiet:true});
    const result=prepareProtectedSite({password,sourceRoot:content.output});
    console.log(JSON.stringify(result));return result;
  }finally{password.fill(0);}
}
module.exports={prepareSite};
if(require.main===module){try{prepareSite();}catch(error){console.error('Protected build failed: '+error.message);process.exitCode=1;}}
