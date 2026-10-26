'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function stage(root=path.resolve('release-input'),output=path.resolve('release-assets')) {
  fs.mkdirSync(output,{recursive:true});
  if(fs.readdirSync(output).length)throw new Error('Release staging must start empty');
  const assets=[];
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const source=path.join(dir,item.name);if(item.isSymbolicLink())throw new Error('No symlinks in release inputs');if(item.isDirectory())walk(source);else{
    if(!/^Brain-Studio-2\.2\.1-(win-x64\.exe|mac-(x64|arm64)\.(dmg|zip)|linux-(x64|arm64)\.(AppImage|deb)|web\.zip)$/.test(item.name))throw new Error(`Unexpected release asset: ${item.name}`);
    if(assets.some(a=>a.name===item.name))throw new Error('Duplicate release asset');
    const data=fs.readFileSync(source);if(!data.length)throw new Error('Empty release asset');
    fs.writeFileSync(path.join(output,item.name),data);assets.push({name:item.name,sha256:crypto.createHash('sha256').update(data).digest('hex')});
  }}}
  walk(root);
  if(assets.length!==10)throw new Error(`Expected 10 approved assets, received ${assets.length}`);
  assets.sort((a,b)=>a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),assets.map(a=>`${a.sha256}  ${a.name}`).join('\n')+'\n');
  return assets;
}
if(require.main===module){try{stage();}catch(error){console.error(error);process.exitCode=1;}}
module.exports={stage};
