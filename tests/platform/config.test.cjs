'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const yaml=require('js-yaml');
const {png,buildIcons}=require('../../scripts/platform/build-icons.cjs');
const {stage}=require('../../scripts/platform/stage-release.cjs');
const root=path.resolve(__dirname,'../..');
test('electron-builder 26.15.3 accepts the full native schema',async()=>{
  assert.equal(require('electron-builder/package.json').version,'26.15.3');
  const {validateConfiguration}=require('app-builder-lib/out/util/config/config.js');
  await validateConfiguration(yaml.load(fs.readFileSync(path.join(root,'electron-builder.yml'),'utf8')),null);
});
test('native delivery requires assisted per-user NSIS and retains data',()=>{
  const config=yaml.load(fs.readFileSync(path.join(root,'electron-builder.yml'),'utf8'));
  assert.equal(config.nsis.oneClick,false);assert.equal(config.nsis.perMachine,false);
  assert.equal(config.nsis.allowToChangeInstallationDirectory,true);assert.equal(config.nsis.allowElevation,false);
  assert.equal(config.nsis.createDesktopShortcut,true);assert.equal(config.nsis.createStartMenuShortcut,true);
  assert.equal(config.nsis.deleteAppDataOnUninstall,false);
  assert.equal(config.nsis.include,'installer/per-user.nsh');
  const hooks=fs.readFileSync(path.join(root,config.nsis.include),'utf8');
  assert.match(hooks,/!macro customInit/);assert.match(hooks,/!macro customUnInit/);
  assert.match(hooks,/StrCpy \$isForceCurrentInstall "1"/);
  assert.match(hooks,/GetOptions.*"\/allusers"/);
  assert.deepEqual(config.files.filter(x=>!x.startsWith('!')),['app/**/*','package.json']);
  assert.equal(config.publish,null);assert.equal(config.asar,true);
  for(const target of config.mac.target)assert.deepEqual(target.arch,['x64','arm64']);
  for(const target of config.linux.target)assert.deepEqual(target.arch,['x64','arm64']);
  assert.deepEqual(config.mac.target.map(t=>t.target),['dmg','zip']);
  assert.deepEqual(config.linux.target.map(t=>t.target),['AppImage','deb']);
});
test('icons are deterministic, valid PNG dimensions and native containers',()=>{
  assert.deepEqual(png(192),png(192));
  for(const size of [192,512]){const bytes=png(size);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);assert.equal(bytes.subarray(1,4).toString(),'PNG');}
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'brain-icons-'));buildIcons(out);
  const ico=fs.readFileSync(path.join(out,'icon.ico'));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt32LE(18),22);
  const icns=fs.readFileSync(path.join(out,'icon.icns'));assert.equal(icns.subarray(0,4).toString(),'icns');assert.equal(icns.readUInt32BE(4),icns.length);
});
test('CI matches native architectures and isolates release permission',()=>{
  const workflow=yaml.load(fs.readFileSync(path.join(root,'.github/workflows/platform-delivery.yml'),'utf8'));
  assert.equal(workflow.permissions.contents,'read');assert.equal(workflow.jobs.release.permissions.contents,'write');
  assert.equal(workflow.jobs.release.environment,'release');assert.deepEqual(workflow.jobs.release.needs,['web','native']);
  const matrix=workflow.jobs.native.strategy.matrix.include;
  assert.equal(matrix.length,5);assert(matrix.some(x=>x.runner==='ubuntu-24.04-arm'&&x.arch==='arm64'));
  assert(matrix.some(x=>x.runner==='macos-15-intel'&&x.arch==='x64'));
  for(const job of Object.values(workflow.jobs))for(const step of job.steps)if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);
});
test('release stage fails closed on private or unexpected files',()=>{
  const input=fs.mkdtempSync(path.join(os.tmpdir(),'brain-release-in-'));
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'brain-release-out-'));
  fs.writeFileSync(path.join(input,'participant-private.json'),'{}');
  assert.throws(()=>stage(input,output),/Unexpected release asset/);
});
test('release stage permits precisely the complete target set and checksums',()=>{
  const input=fs.mkdtempSync(path.join(os.tmpdir(),'brain-release-in-'));
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'brain-release-out-'));
  const suffixes=['win-x64.exe','web.zip',...['x64','arm64'].flatMap(arch=>[`mac-${arch}.dmg`,`mac-${arch}.zip`,`linux-${arch}.AppImage`,`linux-${arch}.deb`])];
  for(const suffix of suffixes)fs.writeFileSync(path.join(input,'Brain-Studio-2.0.0-'+suffix),'synthetic build fixture '+suffix);
  const assets=stage(input,output);assert.equal(assets.length,10);
  assert.equal(fs.readdirSync(output).length,11);
  for(const asset of assets)assert.match(asset.sha256,/^[a-f0-9]{64}$/);
  assert.equal(fs.readFileSync(path.join(output,'SHA256SUMS.txt'),'utf8').trim().split('\n').length,10);
});
