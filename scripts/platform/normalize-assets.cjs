'use strict';
const fs=require('node:fs'),path=require('node:path');
function normalize(directory=path.resolve('dist/native')){
  const root=path.resolve(directory),renamed=[];
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    if(!entry.isFile())continue;
    const match=entry.name.match(/^Brain-Studio-2\.0\.0-linux-(amd64|x86_64|aarch64)\.(deb|AppImage)$/);
    if(!match)continue;
    const arch=match[1]==='aarch64'?'arm64':'x64';
    const name=`Brain-Studio-2.0.0-linux-${arch}.${match[2]}`;
    const source=path.resolve(root,entry.name),target=path.resolve(root,name);
    if(path.dirname(source)!==root||path.dirname(target)!==root)throw new Error('Asset escaped the build directory');
    if(fs.existsSync(target))throw new Error('Normalized asset already exists: '+name);
    fs.renameSync(source,target);renamed.push({from:entry.name,to:name});
  }
  return renamed;
}
if(require.main===module){try{console.log(JSON.stringify({normalized:normalize()}));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={normalize};
