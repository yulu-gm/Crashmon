import {pathToFileURL} from 'node:url';
import {inspectSheet} from '../tools/skills/crashmon-sprite-production/scripts/sprite-inspect.mjs';
export {readPng,inspectRect,inspectSheet} from '../tools/skills/crashmon-sprite-production/scripts/sprite-inspect.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const [path,columns='1',rows='1']=process.argv.slice(2);if(!path)throw new Error('用法：node scripts/sprite-inspect.js 图.png 列数 行数');console.log(JSON.stringify(inspectSheet(path,Number(columns),Number(rows)),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
