'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), head = Buffer.alloc(4), tail = Buffer.alloc(4);
  head.writeUInt32BE(data.length); tail.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([head, name, data, tail]);
}
// Geometric source shared by SVG and deterministic PNG rendering; no host fonts.
const circles = [[88,96,16],[88,160,16],[168,96,16],[168,160,16],[128,128,20]];
const lines = [[88,96,128,128],[88,160,128,128],[168,96,128,128],[168,160,128,128]];
function insideLine(x,y,[ax,ay,bx,by]) {
  const t = Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
  return (x-ax-t*(bx-ax))**2+(y-ay-t*(by-ay))**2 <= 4**2;
}
function png(size) {
  const rows = Buffer.alloc(size*(1+size*4));
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const px=(x+.5)*256/size,py=(y+.5)*256/size;
    const foreground=circles.some(([cx,cy,r])=>(px-cx)**2+(py-cy)**2<=r*r)||lines.some(line=>insideLine(px,py,line));
    const offset=y*(size*4+1)+1+x*4;
    rows.set(foreground?[183,239,219,255]:[17,45,56,255],offset);
  }
  const head=Buffer.alloc(13);head.writeUInt32BE(size,0);head.writeUInt32BE(size,4);head[8]=8;head[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function buildIcons(output=path.resolve(__dirname,'../../installer/assets')) {
  fs.mkdirSync(output,{recursive:true});
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="#112d38"/><g stroke="#b7efdb" stroke-width="8">${lines.map(([a,b,c,d])=>`<path d="M${a} ${b}L${c} ${d}"/>`).join('')}</g><g fill="#b7efdb">${circles.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>\n`;
  fs.writeFileSync(path.join(output,'icon.svg'),svg);
  for(const size of [192,256,512,1024])fs.writeFileSync(path.join(output,`icon-${size}.png`),png(size));
  fs.writeFileSync(path.join(output,'icon.png'),png(512));
  const image=png(256),ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico[8]=0;ico[9]=0;ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(image.length,14);ico.writeUInt32LE(22,18);
  fs.writeFileSync(path.join(output,'icon.ico'),Buffer.concat([ico,image]));
  const entries=[[256,'ic08'],[512,'ic09'],[1024,'ic10']].map(([size,type])=>{const data=png(size),header=Buffer.alloc(8);header.write(type);header.writeUInt32BE(data.length+8,4);return Buffer.concat([header,data]);});
  const header=Buffer.alloc(8);header.write('icns');header.writeUInt32BE(8+entries.reduce((n,b)=>n+b.length,0),4);
  fs.writeFileSync(path.join(output,'icon.icns'),Buffer.concat([header,...entries]));
}
if(require.main===module)buildIcons();
module.exports={buildIcons,png,crc32};
