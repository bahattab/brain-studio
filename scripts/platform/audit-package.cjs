'use strict';
const fs=require('node:fs');
const path=require('node:path');
const asar=require('@electron/asar');
const {findExecutable}=require('./native-smoke.cjs');
function audit(file) {
  const entries=asar.listPackage(file).map(name=>name.replace(/\\/g,'/').replace(/^\//,''));
  for(const name of entries) {
    if(!(name==='app'||name.startsWith('app/')||name==='package.json'))throw new Error(`Unexpected packaged file: ${name}`);
    if(/(^|\/)(private|evidence|node_modules|\.git)(\/|$)|\.(log|map)$/i.test(name))throw new Error(`Forbidden packaged file: ${name}`);
  }
  for(const expected of ['app/index.html','app/main.cjs','app/preload.cjs','app/ui.js','app/research-core.js','app/thinking-core.js','app/ai-core.js','app/ai-ui.js','app/print-layout.js','app/THIRD-PARTY-NOTICES.txt','package.json'])if(!entries.includes(expected))throw new Error(`Missing application file: ${expected}`);
  const packageInfo=JSON.parse(asar.extractFile(file,'package.json'));
  if(packageInfo.main!=='app/main.cjs')throw new Error('Packaged main entry mismatch');
  const local=JSON.parse(fs.readFileSync('package.json','utf8'));
  if(packageInfo.version!==local.version)throw new Error('Packaged version mismatch');
  console.log(`Audited ${entries.length} packaged entries for ${local.version}`);
  return entries;
}
if(require.main===module) {
  try {
    const exe=findExecutable(path.resolve('dist/native'));
    const resources=process.platform==='darwin'?path.resolve(path.dirname(exe),'../Resources'):path.join(path.dirname(exe),'resources');
    audit(process.argv[2]||path.join(resources,'app.asar'));
  }catch(error){console.error(error);process.exitCode=1;}
}
module.exports={audit};
