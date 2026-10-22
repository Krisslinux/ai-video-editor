import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession} from '@hyperframes/engine';
import type {Plan} from '../shared/types.ts';

let bundle:Promise<string>|undefined;
function browserBundle(){return bundle??=build({entryPoints:[fileURLToPath(new URL('../web/lyric-frame.ts',import.meta.url))],bundle:true,write:false,platform:'browser',format:'iife',minify:true}).then(r=>r.outputFiles[0].text);}
export async function* hyperframesPixels(plan:Plan,dir:string,signal:AbortSignal){
 const script=await browserBundle(),key=randomBytes(18).toString('hex');
 const fonts=await Promise.all(['PlayfairDisplay.ttf','DMMono-Regular.ttf'].map(n=>readFile(fileURLToPath(new URL('../public/fonts/'+n,import.meta.url)))));
 const html=`<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:'Playfair Display';src:url('./display.ttf');font-weight:400 900}@font-face{font-family:'DM Mono';src:url('./mono.ttf')}*{margin:0;box-sizing:border-box}html,body{width:${plan.width}px;height:${plan.height}px;overflow:hidden;background:#090b08}canvas{display:block}</style></head><body><main data-composition-id="lyrics" data-width="${plan.width}" data-height="${plan.height}" data-start="0" data-duration="${Math.round(plan.lyrics!.durationMs*30/1000)/30}"><canvas></canvas></main><script src="./frame.js"></script></body></html>`;
 const resources=new Map<string,[string,string|Buffer]>([['index.html',['text/html; charset=utf-8',html]],['frame.js',['text/javascript; charset=utf-8',script]],['plan.json',['application/json',JSON.stringify(plan)]],['display.ttf',['font/ttf',fonts[0]]],['mono.ttf',['font/ttf',fonts[1]]]]);
 const server=createServer((req,res)=>{const file=req.url?.startsWith('/'+key+'/')?resources.get(req.url.slice(key.length+2)):undefined;if(!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':file[0],'cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; font-src 'self'; connect-src 'self'"});res.end(file[1]);});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
 const abort=()=>{if(session)void closeCaptureSession(session);};signal.addEventListener('abort',abort,{once:true});
 try{
  signal.throwIfAborted();const address=server.address();if(!address||typeof address==='string')throw Error('Renderer could not start.');
  session=await createCaptureSession(`http://127.0.0.1:${address.port}/${key}/index.html`,dir,{width:plan.width,height:plan.height,fps:{num:30,den:1},format:'png'},null,{enableBrowserPool:false,forceScreenshot:true,disableGpu:true,chromePath:process.env.HYPERFRAMES_BROWSER_PATH,playerReadyTimeout:30000,protocolTimeout:30000,browserTimeout:30000});
  signal.throwIfAborted();await initializeSession(session);
  for(let frame=0;frame<Math.round(plan.lyrics!.durationMs*30/1000);frame++){signal.throwIfAborted();yield (await captureFrameToBuffer(session,frame,frame/30)).buffer;}
 }finally{signal.removeEventListener('abort',abort);if(session)await closeCaptureSession(session);server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
