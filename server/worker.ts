import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {probe,sample,extractAudio,render,quality,command,audioFeatures,correlate} from './media.ts';
import {automaticPlan,validatePlan} from './plan.ts';
import {planWithAI,transcribe} from './provider.ts';
import type {Asset,Plan} from '../shared/types.ts';
const base=(process.env.WORKER_API_URL||'http://127.0.0.1:3001').replace(/\/$/,'');
const token=process.env.WORKER_TOKEN||'development-worker-token';
const root=path.resolve(process.env.WORKER_DATA_DIR||process.env.DATA_DIR||'data','worker-cache');await mkdir(root,{recursive:true,mode:0o700});
const workerId=randomUUID();let stopping=false;let current:AbortController|undefined;
async function api(endpoint:string,init:RequestInit={},signal?:AbortSignal){const timeout=AbortSignal.timeout(endpoint==='claim'?15000:120000);const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;const response=await fetch(base+'/api/worker/'+endpoint,{...init,headers:{authorization:`Bearer ${token}`,'x-worker-id':workerId,...(process.env.SITES_SERVICE_TOKEN?{'OAI-Sites-Authorization':`Bearer ${process.env.SITES_SERVICE_TOKEN}`} :{}),...init.headers},signal:requestSignal});if(!response.ok){let message='Worker request failed.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}return response;}
const post=async(endpoint:string,data:unknown,signal?:AbortSignal)=>(await api(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)},signal)).json();
async function source(jobId:string,a:Asset,signal:AbortSignal){const file=path.join(root,a.id+'.media');try{if((await stat(file)).size===a.size)return file;}catch{}const tmp=file+'.part';const response=await api(`jobs/${jobId}/source?asset=${a.id}`,{},signal);await pipeline(Readable.fromWeb(response.body as any),createWriteStream(tmp,{mode:0o600}),{signal});if((await stat(tmp)).size!==a.size)throw Error('Source download was incomplete.');await rename(tmp,file);return file;}
async function work(payload:any){const {job,connection,limits}=payload;const controller=new AbortController();current=controller;const signal=controller.signal;const endpoint=`jobs/${job.id}/`;const heartbeat=setInterval(async()=>{try{const status=await post(endpoint+'heartbeat',{});if(status.status!=='running')controller.abort();}catch{controller.abort();}},10000);let dir='';
 const checkpoint=async(stage:string,data:unknown={},progress:number|null=null)=>post(endpoint+'checkpoint',{stage,checkpoint:data,progress},signal);
 const usage=async<T>(kind:string,fn:()=>Promise<T>)=>{const call=await post(endpoint+'usage',{action:'begin',kind},signal);try{const result:any=await fn();await post(endpoint+'usage',{action:'finish',id:call.id,status:'completed',units:result?.usage?.total_tokens??result?.usage?.output_tokens??null},signal);return result as T;}catch(e){await post(endpoint+'usage',{action:'finish',id:call.id,status:'unknown'}).catch(()=>{});throw e;}};
 try{
  const assets:Asset[]=payload.assets;const files=new Map<string,string>(),frames=new Map<string,string>();
  const selected=job.kind==='probe'?assets.filter(a=>a.id===job.assetId):assets;
  for(const a of selected){const file=await source(job.id,a,signal);files.set(a.id,file);
   if(a.status!=='ready'){
    try{const info=await probe(file,signal);if(info.durationMs>limits.seconds*1000)throw Error('Source duration exceeds the project limit.');Object.assign(a,info,{status:'ready',error:undefined});if(a.hasAudio){const features=await audioFeatures(file,root,signal);a.analysis={...a.analysis,...features};}await post(endpoint+'asset',a,signal);if(a.kind==='video'){const thumb=path.join(root,a.id+'.jpg');await sample(file,thumb,signal,Math.min(.5,a.durationMs/2000));await api(endpoint+`thumb?asset=${a.id}`,{method:'PUT',body:await readFile(thumb)},signal);}}
    catch(e){await post(endpoint+'asset',{id:a.id,status:'error',error:e instanceof Error?e.message.slice(0,300):'Unsupported media.'}).catch(()=>{});throw e;}
   }
   if(a.kind==='video'){const thumb=path.join(root,a.id+'.jpg');try{await stat(thumb);}catch{await sample(file,thumb,signal,Math.min(1,a.durationMs/2000));}frames.set(a.id,thumb);}
  }
  if(job.kind==='probe'){await post(endpoint+'complete',{},signal);return;}
  if(connection){const fingerprint=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(connection).filter(([k])=>k!=='token')))).digest('hex');if(job.connectionFingerprint&&fingerprint!==job.connectionFingerprint)throw Error('AI settings changed while this job was queued. Create a new edit with the current connection.');}
  if(job.settings.captions||job.settings.mode==='ai'&&connection?.transcriptionModel){
   if(!connection||connection.protocol!=='openai'||!connection.transcriptionModel)throw Error('Configure a timestamped transcription model for captions.');
   const transcriberHash=createHash('sha256').update(connection.baseUrl+connection.transcriptionModel).digest('hex');
   for(const a of assets.filter(x=>x.hasAudio&&(x.kind==='video'||x.role==='voiceover'))){
    if((a.analysis as any)?.transcriber===transcriberHash&&a.analysis?.transcript)continue;
    await checkpoint('Transcribing');const wav=path.join(root,a.id+'.wav');await extractAudio(files.get(a.id)!,wav,signal);const transcript=await transcribe(connection,wav,signal,usage);a.analysis={...a.analysis,transcript,...{transcriber:transcriberHash}};await post(endpoint+'asset',{id:a.id,analysis:a.analysis},signal);
   }
  }
  await checkpoint(job.settings.mode==='ai'?'Planning with AI':'Editing');
  let plan:Plan=job.plan|| (job.settings.mode==='ai'?await planWithAI(connection,assets,job.settings,job.instruction,payload.revision?.plan,frames,signal,usage):automaticPlan(assets,job.settings,job.instruction,payload.revision?.plan));
  const syncAssets=assets.filter(a=>a.kind==='audio'&&a.role==='sync');
  for(const a of syncAssets){
   const reference=assets.find(x=>x.kind==='video'&&x.hasAudio);if(!reference)throw Error('Synchronization needs original audio in a video clip. Choose Voiceover or Background music for unrelated sound.');
   let refEnvelope=(reference.analysis as any)?.envelope,recordingEnvelope=(a.analysis as any)?.envelope;if(!refEnvelope)refEnvelope=(await audioFeatures(files.get(reference.id)!,root,signal)).envelope;if(!recordingEnvelope)recordingEnvelope=(await audioFeatures(files.get(a.id)!,root,signal)).envelope;
   const match=correlate(refEnvelope,recordingEnvelope);if(!match.reliable)throw Error('No reliable shared audio signal was found in the first 60 seconds (±10 seconds). Choose Voiceover or Background music to arrange unrelated audio.');
   a.analysis={...a.analysis,syncOffsetMs:match.offsetMs,syncConfidence:match.confidence};await post(endpoint+'asset',{id:a.id,analysis:a.analysis},signal);plan.audio=plan.audio.filter(x=>x.assetId!==a.id);let at=0;
   for(const s of plan.segments){if(s.assetId===reference.id){const inMs=Math.max(0,s.inMs-match.offsetMs),outMs=Math.min(a.durationMs,s.outMs-match.offsetMs),atMs=at+Math.max(0,match.offsetMs-s.inMs);if(inMs!==s.inMs-match.offsetMs||outMs!==s.outMs-match.offsetMs)throw Error('The matched recording does not cover every selected source range. Choose Voiceover or trim the clip with AI before synchronizing.');if(outMs>inMs)plan.audio.push({assetId:a.id,inMs,outMs,atMs,gain:1,role:'sync'});s.gain=0;}at+=s.outMs-s.inMs;}
   plan.summary.push(`Shared audio aligned to the first source with sound (${match.offsetMs} ms offset).`);plan.warnings.push('Audio alignment is a waveform heuristic; listen to confirm. Original sound is muted only where the matched recording is used.');
  }
  plan=validatePlan(plan,assets,job.settings,payload.revision?.plan);await checkpoint('Rendering',{plan},0);
  dir=path.join(root,job.id);await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});let last=0;let pending=Promise.resolve();
  const output=await render(plan,assets,files,dir,signal,p=>{if(Date.now()-last<1200&&p<1)return;last=Date.now();pending=pending.then(()=>checkpoint('Rendering',{plan},p)).then(()=>{});pending.catch(()=>controller.abort());});await pending;
  await checkpoint('Checking',{plan});const report=await quality(output,plan,signal);const size=(await stat(output)).size;Object.assign(report,{size});
  if(size>(limits.outputBytes||limits.fileBytes))throw Error('Rendered output exceeds the configured file-size limit.');
  await checkpoint('Saving',{plan});await api(endpoint+'output',{method:'PUT',headers:{'content-length':String(size)},body:Readable.toWeb(createReadStream(output)) as any,duplex:'half'} as any,signal);await post(endpoint+'complete',{plan,quality:report},signal);
 }catch(e){if(!signal.aborted){const text=e instanceof Error?e.message:'Processing failed.';const safe=text.startsWith('ffmpeg failed')||text.startsWith('ffprobe failed')?'Media processing failed. Check that the file plays locally, then retry.':text;await post(endpoint+'error',{error:safe.slice(0,500)}).catch(()=>{});}}
 finally{clearInterval(heartbeat);current=undefined;if(dir)await rm(dir,{recursive:true,force:true});}
}
const stop=()=>{stopping=true;current?.abort();};process.on('SIGINT',stop);process.on('SIGTERM',stop);
console.log('Frameflow media worker ready. One concurrent job.');
while(!stopping){try{const payload=await post('claim',{});if(payload.job){await work(payload);continue;}}catch{console.error('Worker cannot reach the authorized API. Retrying connection; no AI request was submitted.');}await new Promise(resolve=>setTimeout(resolve,1500));}
