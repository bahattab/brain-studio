'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {buildIcons}=require('./build-icons.cjs');
const portable=new Set(['.txt','.html','.js','.mjs','.css','.json','.svg','.png','.ico','.jpg','.jpeg','.webp','.avif','.gif','.woff','.woff2','.ttf','.otf','.wasm']);
const forbidden=/(^|\/)(private|evidence|node_modules|\.git)(\/|$)/i;
function walk(root,base='') {
  return fs.readdirSync(path.join(root,base),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(item=>{
    const relative=base?`${base}/${item.name}`:item.name;
    if(item.isSymbolicLink())throw new Error(`Symbolic links are not portable: ${relative}`);
    if(forbidden.test(relative))return [];
    return item.isDirectory()?walk(root,relative):[relative];
  });
}
function buildWeb({root=path.resolve(__dirname,'../..'),output=path.join(root,'dist/web')}={}) {
  const app=path.join(root,'app'),resolved=path.resolve(output);
  // Never recursively delete a user path. Require a new directory for each build.
  if(fs.existsSync(resolved)&&fs.readdirSync(resolved).length)throw new Error('Web output must be empty; choose a new output directory.');
  if(resolved===app||resolved.startsWith(app+path.sep))throw new Error('Output cannot overwrite application sources');
  fs.mkdirSync(resolved,{recursive:true});
  for(const relative of walk(app)) {
    if(!portable.has(path.extname(relative).toLowerCase()))continue;
    const dest=path.join(resolved,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(app,relative),dest);
  }
  let html=fs.readFileSync(path.join(resolved,'index.html'),'utf8');
  const sourceCsp=html.match(/content="([^"]*default-src[^\"]*)"/);
  if(!sourceCsp)throw new Error('Application CSP missing');
  let csp=sourceCsp[1].replace(/connect-src\s+[^;]+/g,"connect-src 'self'");
  if(!/connect-src/.test(csp))csp+="; connect-src 'self'";
  csp=csp.replace(/worker-src\s+[^;]+;?/g,'');
  csp+="; worker-src 'self'";
  html=html.replace(sourceCsp[0],`content="${csp}"`);
  html=html.replace('</head>','  <link rel="manifest" href="./manifest.webmanifest">\n  <link rel="icon" href="./icons/icon.svg" type="image/svg+xml">\n  <meta name="theme-color" content="#112d38">\n</head>');
  // Before all application code; also supports future additional browser modules.
  html=html.replace('</head>','  <script src="./web-adapter.js"></script>\n</head>');
  fs.writeFileSync(path.join(resolved,'index.html'),html);
  fs.copyFileSync(path.join(__dirname,'web-adapter.js'),path.join(resolved,'web-adapter.js'));
  const icons=path.join(resolved,'icons');buildIcons(icons);
  for(const file of ['icon.icns','icon.ico','icon.png','icon-256.png','icon-1024.png'])fs.unlinkSync(path.join(icons,file));
  fs.writeFileSync(path.join(resolved,'manifest.webmanifest'),JSON.stringify({id:'./',name:'Brain Studio',short_name:'Brain Studio',description:'Offline personal reflection',lang:'en',start_url:'./index.html',scope:'./',display:'standalone',background_color:'#f5f7fb',theme_color:'#112d38',icons:[192,512].map(size=>({src:`./icons/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any maskable'}))},null,2)+'\n');
  const files=walk(resolved);
  const digest=crypto.createHash('sha256');for(const f of files)digest.update(f).update(fs.readFileSync(path.join(resolved,f)));
  const key='brain-studio-'+digest.digest('hex').slice(0,20);
  const sw=`'use strict';\nconst PREFIX='brain-studio:'+encodeURIComponent(self.registration.scope)+':';\nconst CACHE=PREFIX+${JSON.stringify(key)};\nconst FILES=${JSON.stringify(files.map(f=>'./'+f))};\nself.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES);})()));\nself.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));\nself.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const known=await cache.match(event.request);if(known)return known;if(event.request.mode==='navigate'){try{return await fetch(event.request);}catch{return cache.match('./index.html');}}return fetch(event.request);})());});\n`;
  fs.writeFileSync(path.join(resolved,'service-worker.js'),sw);
  fs.writeFileSync(path.join(resolved,'build-manifest.json'),JSON.stringify({cache:key,files},null,2)+'\n');
  return {output:resolved,files,cache:key};
}
if(require.main===module){try{const result=buildWeb(process.argv[2]?{output:process.argv[2]}:{});console.log(`Built web bundle: ${result.files.length} files`);}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildWeb,walk};
