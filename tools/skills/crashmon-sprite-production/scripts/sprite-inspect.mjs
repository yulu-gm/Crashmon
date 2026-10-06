// 只读 PNG 透明度检查，不改图像或自动缩放；支持 ImageGen 的 8-bit RGB/RGBA PNG。
import { readFileSync,realpathSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export function readPng(path) {
  const file=readFileSync(path);if(file.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('不是 PNG');
  let width,height,channels;const chunks=[];
  for(let p=8;p<file.length;){const length=file.readUInt32BE(p),type=file.toString('ascii',p+4,p+8),data=file.subarray(p+8,p+8+length);p+=length+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);channels=data[9]===6?4:data[9]===2?3:0;if(data[8]!==8||!channels||data[12])throw new Error('仅支持非交错 8-bit RGB/RGBA PNG');}
    if(type==='IDAT')chunks.push(data);if(type==='IEND')break;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=new Uint8Array(height*stride);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];if(filter>4)throw new Error('未知 PNG filter');for(let x=0;x<stride;x++){
    const i=y*stride+x,a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;
    pixels[i]=(raw[y*(stride+1)+1+x]+([0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]))&255;
  }}
  return {width,height,alpha:(x,y)=>channels===4?pixels[(y*width+x)*4+3]:255};
}

export function inspectRect(png,[x,y,w,h],threshold=24) {
  let left=Infinity,top=Infinity,right=-1,bottom=-1,count=0,border=0;
  for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)if(png.alpha(px,py)>=threshold){
    count++;left=Math.min(left,px);top=Math.min(top,py);right=Math.max(right,px);bottom=Math.max(bottom,py);
    if(px===x||px===x+w-1||py===y||py===y+h-1)border++;
  }
  return {rect:[x,y,w,h],bounds:count?[left,top,right+1,bottom+1]:null,opaquePixels:count,borderPixels:border};
}

export function inspectSheet(path,columns=1,rows=1) {
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1)throw new Error('行列数必须为正整数');
  const png=readPng(path),rects=[];
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    const x=Math.round(c*png.width/columns),y=Math.round(r*png.height/rows);
    rects.push(inspectRect(png,[x,y,Math.round((c+1)*png.width/columns)-x,Math.round((r+1)*png.height/rows)-y]));
  }
  const rowGaps=[];
  for(let r=0;r<rows;r++){
    const top=Math.round(r*png.height/rows),bottom=Math.round((r+1)*png.height/rows),gaps=[];let start=null;
    for(let x=0;x<png.width;x++){let opaque=false;for(let y=top;y<bottom;y++)if(png.alpha(x,y)>=24){opaque=true;break;}
      if(!opaque&&start===null)start=x;
      if(opaque&&start!==null){if(x-start>=3)gaps.push([start,x]);start=null;}
    }
    if(start!==null)gaps.push([start,png.width]);rowGaps.push({row:r,y:[top,bottom],emptyColumns:gaps});
  }
  return {width:png.width,height:png.height,frames:rects,rowGaps};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){
  try {const [path,columns='1',rows='1']=process.argv.slice(2);if(!path)throw new Error('用法：node scripts/sprite-inspect.js 图.png 列数 行数');textOutput(inspectSheet(path,Number(columns),Number(rows)));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
function textOutput(value){console.log(JSON.stringify(value,null,2));}
