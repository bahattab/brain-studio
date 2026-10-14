'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
// The user explicitly authorized publishing this exact creator credit.
const publicCredit='Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com';
const topFiles=['README.md','LICENSE','VERIFICATION.md','package.json','package-lock.json','electron-builder.yml','.gitignore'];
const privateTerms=(process.env.BRAIN_AUDIT_PRIVATE_TERMS||'').split('|').filter(Boolean);
const directories=['app','docs','scripts','tests','installer','.github'];
const allowedExtensions=new Set(['.js','.cjs','.mjs','.py','.ps1','.html','.css','.json','.md','.yml','.yaml','.nsh','.png','.svg','.ico','.icns','.pdf','.txt']);
function sourceFiles(){const files=[];for(const file of topFiles){if(!fs.existsSync(path.join(root,file)))throw new Error('Missing source file '+file);files.push(file);}function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isSymbolicLink())throw new Error('Source symlink forbidden: '+name);if(/(^|\/)(node_modules|dist|evidence|\.private|\.unlazy|\.git)(\/|$)/i.test(name))throw new Error('Private/generated source path: '+name);if(entry.isDirectory())walk(name);else{if(!allowedExtensions.has(path.extname(entry.name)))throw new Error('Unexpected extension: '+name);files.push(name);}}}for(const dir of directories)walk(dir);return files.sort();}
function audit(){
  const files=sourceFiles(),manifest=[];
  for(const name of files){
    const bytes=fs.readFileSync(path.join(root,name));
    if(!bytes.length)throw new Error('Empty source file: '+name);
    if(!['.png','.ico','.icns','.pdf'].includes(path.extname(name))){
      // Only the exact requested creator credit is exempt. Separate names,
      // email fragments, other identities and private paths remain subject to audit.
      const text=bytes.toString('utf8').replaceAll(publicCredit,'');
      if(privateTerms.some(term=>new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','iu').test(text)))throw new Error('Private identity marker in '+name);
      if(/[A-Z]:[\\/](?:Users|My Drive)[\\/]|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text))throw new Error('Private identity/path/credential marker in '+name);
    }
    manifest.push({path:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  const onetPdf='docs/research/onet-interest-profiler-original.pdf';
  const ohbdsPdf='docs/research/ohbds-1.0-original.pdf';
  const approvedPdfs=new Set([onetPdf,ohbdsPdf]);
  for(const file of files.filter(x=>x.endsWith('.pdf')))if(!approvedPdfs.has(file))throw new Error('Unapproved document in public source: '+file);
  const fixture=JSON.parse(fs.readFileSync(path.join(root,'docs/research/onet-60-source-fixture.json'),'utf8'));
  const onetHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,onetPdf))).digest('hex');
  if(!JSON.stringify(fixture).includes(onetHash))throw new Error('O*NET PDF changed from captured source');
  const ohbdsHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,ohbdsPdf))).digest('hex');
  if(ohbdsHash!=='a9058e1c4e89fe176c72c553dee55be8f9e134687a49242428217d5e4bc1fe98')throw new Error('OHBDS PDF differs from the approved licensed source');
  const notice=fs.readFileSync(path.join(root,'app/THIRD-PARTY-NOTICES.txt'),'utf8');
  if(!notice.includes('CC BY-NC-SA')||!notice.includes('CC BY-ND 4.0')||!notice.includes('noncommercial'))throw new Error('Required third-party license boundaries are missing');
  console.log(`Public source audit passed: ${files.length} allowlisted files; both original licensed PDFs and separate content notices verified.`);
  return manifest;
}
if(require.main===module){try{const manifest=audit();if(process.argv.includes('--manifest'))process.stdout.write(JSON.stringify(manifest,null,2)+'\n');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={audit,sourceFiles};
