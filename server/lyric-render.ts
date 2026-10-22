import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {drawLyrics} from '../shared/lyric-canvas.ts';
import {hyperframesPixels} from './hyperframes.ts';
import {lyricPages} from '../shared/lyrics.ts';
import type {Plan} from '../shared/types.ts';
const fontDir=fileURLToPath(new URL('../public/fonts/',import.meta.url));
if(!GlobalFonts.registerFromPath(path.join(fontDir,'PlayfairDisplay.ttf'),'Playfair Display')||!GlobalFonts.registerFromPath(path.join(fontDir,'DMMono-Regular.ttf'),'DM Mono'))throw Error('Lyric fonts are missing. Reinstall the complete worker source.');
export async function renderLyrics(plan:Plan,songFile:string,dir:string,signal:AbortSignal,progress:(p:number)=>void){
 const browser=process.env.LYRIC_RENDERER==='hyperframes';
 const composition=plan.lyrics!;const total=Math.round(composition.durationMs*30/1000),output=path.join(dir,'output.tmp.mp4');
 const child=spawn('ffmpeg',['-v','error','-nostdin','-y','-threads',String(Number(process.env.FFMPEG_THREADS||2)),...(browser?['-f','image2pipe','-vcodec','png']:['-f','rawvideo','-pixel_format','rgba','-video_size',`${plan.width}x${plan.height}`]),'-framerate','30','-i','pipe:0','-protocol_whitelist','file,pipe','-i',songFile,'-map','0:v:0','-map','1:a:0','-vf','setsar=1','-af',`apad,atrim=duration=${total/30},asetpts=PTS-STARTPTS`,'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-t',String(total/30),'-movflags','+faststart','-threads',String(Number(process.env.FFMPEG_THREADS||2)),output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 let error='';child.stderr.on('data',d=>error=(error+d.toString()).slice(-2000));
 const completion=new Promise<void>((resolve,reject)=>{child.once('error',()=>reject(Error('FFmpeg could not start.')));child.once('close',code=>code===0?resolve():reject(Error(signal.aborted?'Processing canceled.':'Lyric video encoding failed. '+error.replace(/(?:https?:\/\/|Bearer\s+)\S+/g,'[redacted]'))));});completion.catch(()=>{});
 const abort=()=>child.kill('SIGKILL');signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,1800000);child.stdin.on('error',()=>{});
 const canvas=createCanvas(plan.width,plan.height),ctx=canvas.getContext('2d'),pages=lyricPages(composition.cues,composition.timing);
 const pixelsIterator=browser?hyperframesPixels(plan,dir,signal)[Symbol.asyncIterator]():undefined;
 try{for(let frame=0;frame<total;frame++){if(signal.aborted)throw Error('Processing canceled.');if(child.exitCode!==null)throw Error('Lyric video encoder stopped.');let pixels:Buffer;if(pixelsIterator){const item=await pixelsIterator.next();if(item.done)throw Error('Browser renderer stopped before all frames were captured.');pixels=item.value;}else{drawLyrics(ctx as unknown as CanvasRenderingContext2D,plan.width,plan.height,composition,frame*1000/30,pages);pixels=canvas.data();}if(!child.stdin.write(pixels))await new Promise<void>((resolve,reject)=>{const cleanup=()=>{child.stdin.off('drain',drain);child.stdin.off('error',failed);child.off('close',closed);};const drain=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('Encoder input closed.'));};const closed=()=>{cleanup();reject(Error('Encoder stopped before all frames were written.'));};child.stdin.once('drain',drain);child.stdin.once('error',failed);child.once('close',closed);});if(frame%15===0){progress(frame/total);await new Promise<void>(resolve=>setImmediate(resolve));}}child.stdin.end();await completion;progress(1);return output;}catch(e){child.kill('SIGKILL');await completion.catch(()=>{});throw e;}finally{await pixelsIterator?.return?.();signal.removeEventListener('abort',abort);clearTimeout(timer);}
}
