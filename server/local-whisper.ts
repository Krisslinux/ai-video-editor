import {spawn} from 'node:child_process';
import {access,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {checkCues} from '../shared/lyrics.ts';
import type {Transcript} from '../shared/types.ts';

export function localWhisperFingerprint(){
 return JSON.stringify({model:process.env.WHISPER_MODEL_PATH,revision:process.env.WHISPER_MODEL_REVISION||'1',device:process.env.WHISPER_DEVICE||'cpu',compute:process.env.WHISPER_COMPUTE_TYPE||'int8'});
}
export function parseLocalWords(result:unknown,durationMs:number):Transcript[]{
 const words=(result as any)?.words;
 if(!Array.isArray(words)||!words.length||words.length>2000)throw Error('Local Whisper returned no usable word timestamps. Import timed lyrics or check the model.');
 return checkCues(words.map(w=>{
  if(typeof w.word!=='string'||!Number.isFinite(w.start)||!Number.isFinite(w.end))throw Error('Local Whisper returned invalid word timestamps.');
  return {text:w.word.trim(),startMs:Math.round(w.start*1000),endMs:Math.round(w.end*1000)};
 }),durationMs);
}
export async function transcribeLocalWords(file:string,durationMs:number,signal:AbortSignal){
 const model=process.env.WHISPER_MODEL_PATH;
 if(!model)throw Error('Local Whisper is not installed on this processor. Configure its model or enter lyrics manually.');
 try{if(!(await stat(model)).isDirectory())throw Error();await access(model+'/model.bin');}catch{throw Error('Local Whisper model files are missing. Install the model on the processor, or enter lyrics manually.');}
 signal.throwIfAborted();
 const output=await new Promise<string>((resolve,reject)=>{
  const p=spawn(process.env.WHISPER_PYTHON||'python3',[fileURLToPath(new URL('../scripts/whisper-transcribe.py',import.meta.url)),file],{stdio:['ignore','pipe','ignore'],windowsHide:true});
  let out='',done=false;
  const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);error?reject(error):resolve(out);};
  const abort=()=>{p.kill('SIGKILL');finish(Error('Transcription canceled.'));};
  const timer=setTimeout(()=>{p.kill('SIGKILL');finish(Error('Local transcription exceeded 30 minutes. Use a smaller model or a faster processor.'));},1800000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  p.stdout.on('data',d=>{out+=d.toString();if(out.length>500000){p.kill('SIGKILL');finish(Error('Local transcription output exceeded the lyric limit.'));}});
  p.once('error',()=>finish(Error('Local Whisper could not start. Install its Python dependencies on the processor.')));
  p.once('close',code=>finish(code===0?undefined:Error('Local Whisper failed. Check the model and Python installation on the processor.')));
 });
 let parsed;try{parsed=JSON.parse(output);}catch{throw Error('Local Whisper returned an invalid response.');}
 return parseLocalWords(parsed,durationMs);
}
