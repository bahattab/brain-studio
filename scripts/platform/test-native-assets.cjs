'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {run,smoke}=require('./native-smoke.cjs');
const root=path.resolve('dist/native'),evidence=path.resolve('dist/platform-evidence');
function one(extension) {
  const matches=fs.readdirSync(root).filter(f=>f.endsWith(`-${process.arch}.${extension}`));
  if(matches.length!==1)throw new Error(`Expected one ${extension} for ${process.arch}`);
  return path.join(root,matches[0]);
}
function executableBelow(directory) {
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const child=path.join(directory,entry.name);
    if(entry.isFile()&&entry.name==='brain-studio')return child;
    if(entry.isDirectory()){const found=executableBelow(child);if(found)return found;}
  }
}
try {
  if(!process.env.CI)throw new Error('Native asset checks require an isolated CI host');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'brain-studio-assets-'));
  if(process.platform==='darwin') {
    const mount=path.join(temporary,'mount');fs.mkdirSync(mount);
    run('hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,one('dmg')]);
    try{smoke(path.join(mount,'Brain Studio.app/Contents/MacOS/Brain Studio'),path.join(evidence,'dmg'));}
    finally{run('hdiutil',['detach',mount]);}
    const extracted=path.join(temporary,'zip');fs.mkdirSync(extracted);
    run('ditto',['-x','-k',one('zip'),extracted]);
    smoke(path.join(extracted,'Brain Studio.app/Contents/MacOS/Brain Studio'),path.join(evidence,'zip'));
  } else if(process.platform==='linux') {
    const extracted=path.join(temporary,'deb');fs.mkdirSync(extracted);
    run('dpkg-deb',['--extract',one('deb'),extracted]);
    const binary=executableBelow(extracted);if(!binary)throw new Error('deb application executable missing');
    smoke(binary,path.join(evidence,'deb'));
    run(one('AppImage'),['--appimage-extract'],temporary);
    smoke(path.join(temporary,'squashfs-root','AppRun'),path.join(evidence,'appimage'),path.join(temporary,'squashfs-root'));
  } else throw new Error('Use test-installer.ps1 on Windows');
  fs.mkdirSync(evidence,{recursive:true});
  fs.writeFileSync(path.join(evidence,`${process.platform}-${process.arch}-assets.json`),JSON.stringify({platform:process.platform,arch:process.arch,assetRuntime:true,systemInstall:false}));
}catch(error){console.error(error);process.exitCode=1;}
