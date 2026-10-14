'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function run(executable,args=[],cwd=process.cwd()) {
  const result=spawnSync(executable,args,{cwd,stdio:'inherit',timeout:240000,env:{...process.env}});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${path.basename(executable)} failed: ${result.status}`);
}
function findExecutable(root) {
  if(process.platform==='win32')return path.join(root,'win-unpacked','Brain Studio.exe');
  if(process.platform==='darwin') {
    const folder=process.arch==='arm64'?'mac-arm64':'mac';
    return path.join(root,folder,'Brain Studio.app','Contents','MacOS','Brain Studio');
  }
  return path.join(root,process.arch==='arm64'?'linux-arm64-unpacked':'linux-unpacked','brain-studio');
}
function smoke(executable,evidence,cwd) {
  if(!fs.existsSync(executable))throw new Error('Packaged executable missing');
  const args=['--smoke-test',`--evidence-dir=${path.resolve(evidence)}`];
  if(process.platform==='linux')run('xvfb-run',['-a',executable,'--no-sandbox',...args],cwd);
  else run(executable,args,cwd);
  const failure=path.join(evidence,'smoke-failure.txt');
  if(fs.existsSync(failure))throw new Error(fs.readFileSync(failure,'utf8'));
  if(!fs.existsSync(evidence)||!fs.readdirSync(evidence).length)throw new Error('Smoke run returned no evidence');
}
if(require.main===module) {
  try{smoke(findExecutable(path.resolve('dist/native')),path.resolve('dist/platform-evidence/packaged'));}
  catch(error){console.error(error);process.exitCode=1;}
}
module.exports={run,smoke,findExecutable};
