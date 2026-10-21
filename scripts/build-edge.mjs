import {build} from 'esbuild';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');const assets={};
for(const file of await readdir('dist/assets')){if(!/\.(js|css)$/.test(file))continue;assets['/assets/'+file]={body:await readFile('dist/assets/'+file,'utf8'),type:file.endsWith('.css')?'text/css':'application/javascript'};}
assets['/favicon.svg']={body:await readFile('public/favicon.svg','utf8'),type:'image/svg+xml'};
for(const file of await readdir('public/fonts')){if(!file.endsWith('.ttf'))continue;assets['/fonts/'+file]={body:(await readFile('public/fonts/'+file)).toString('base64'),type:'font/ttf',base64:true};}
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/edge.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'embedded-assets',setup(b){b.onLoad({filter:/static\.generated\.ts$/},()=>({contents:`export const html=${JSON.stringify(html)};export const assets=${JSON.stringify(assets)};`,loader:'js'}));}}]});
console.log('Worker ESM built with embedded application assets.');
