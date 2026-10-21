import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {command,probe} from '../server/media.ts';
import {defaults} from '../shared/types.ts';
import {lyricDefaults} from '../shared/lyrics.ts';
const root=path.resolve('test-data/lyrics-'+Date.now());await mkdir(root,{recursive:true});
const words=[{start:.4,end:.8,word:'Grow'},{start:1.4,end:1.8,word:'with'},{start:2.4,end:2.8,word:'music'}];
let transcriptions=0,themes=0,missingWords=false,brokenTheme=false;
const checks={editing:0,vision:0,audio:0};
const provider=http.createServer(async(req,res)=>{let body='';for await(const b of req)body+=b;res.setHeader('content-type','application/json');assert.ok(req.headers.authorization==='Bearer fixture-token'||req.headers['x-api-key']==='fixture-token','Saved user token is required for every provider call');
 if(req.url==='/v1/audio/transcriptions'){assert.match(body,/name="timestamp_granularities\[\]"\r\n\r\nword/);assert.match(body,/verbose_json/);const isCheck=body.includes('filename="connection-check.wav"');if(isCheck)checks.audio++;else transcriptions++;const testWords=[{word:'Amber',start:.1,end:.4},{word:'river',start:.5,end:.8},{word:'opens',start:.9,end:1.2}];res.end(JSON.stringify(missingWords?{segments:[{start:0,end:1,text:'No word times'}]}:{words:isCheck?testWords:words}));
 }else{const data=JSON.parse(body);const content=data.messages[0].content,prompt=typeof content==='string'?content:content.find((x:any)=>x.type==='text').text;let text:string;
 if(prompt.startsWith('You edit uploaded videos')){checks.editing++;const skeleton=prompt.match(/schema: (\{[^\n]+\})\.\nUse/);assert.ok(skeleton,'Edit schema must be present');text=JSON.stringify(JSON.parse(skeleton[1]));}else if(prompt.startsWith('What single color')){checks.vision++;text='red';}else{themes++;if(brokenTheme){res.writeHead(503);res.end(JSON.stringify({error:{message:'Synthetic unavailable theme fixture'}}));return;}assert.match(prompt,/have not heard the song/);text=JSON.stringify({theme:'moss',reason:'Synthetic fixture palette for contract testing only.'});}res.end(JSON.stringify(req.url==='/v1/messages'?{content:[{type:'text',text}]}:{choices:[{message:{content:text}}]}));}
});provider.listen(0,'127.0.0.1');await once(provider,'listening');
const providerOrigin=`http://127.0.0.1:${(provider.address() as any).port}`,base='http://127.0.0.1:3102';
const env={...process.env,DATA_DIR:root,PORT:'3102',APP_ORIGIN:base,DEV_PREVIEW_AUTH:'0',WORKER_API_URL:base,WORKER_TOKEN:'lyrics-fixture-only',LOCAL_AI_ORIGIN:providerOrigin};
const start=(file:string)=>spawn(process.execPath,['--import','tsx',file],{env,stdio:['ignore','inherit','inherit']});const api=start('server/api.ts');let worker:ReturnType<typeof start>|undefined;let cookie='';
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const req=async(p:string,init:RequestInit={},session=cookie)=>fetch(base+'/api'+p,{cache:'no-store',signal:AbortSignal.timeout(20000),...init,headers:{cookie:session,...(typeof init.body==='string'?{'content-type':'application/json'}:{}),...init.headers}});
const json=async(p:string,init:RequestInit={})=>{const r=await req(p,init),data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;};const post=(p:string,data:unknown={})=>json(p,{method:'POST',body:JSON.stringify(data)});const patch=(p:string,data:unknown)=>json(p,{method:'PATCH',body:JSON.stringify(data)});
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await pause(100);}
 const login=await req('/auth/register',{method:'POST',body:JSON.stringify({email:'lyric-fixture@example.test',password:'synthetic-fixture-only'})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
 const pid=(await post('/projects',{name:'Synthetic lyrics test — not a real song',kind:'lyrics'})).id;
 assert.ok((await json('/projects/'+pid)).settings.lyrics);
 const forbidden=await req(`/projects/${pid}/uploads`,{method:'POST',headers:{'tus-resumable':'1.0.0','upload-length':'10','upload-metadata':`filename ${Buffer.from('clip.mp4').toString('base64')},kind ${Buffer.from('video').toString('base64')}`}});assert.equal(forbidden.status,400);

 const source=path.join(root,'clicks.wav');await command('ffmpeg',['-v','error','-y','-f','lavfi','-i',"aevalsrc='if(lt(mod(t,1),0.42)*gte(mod(t,1),0.4),0.7*sin(2*PI*1000*t),0)':s=48000:d=3",'-c:a','pcm_s16le',source]);const bytes=await readFile(source);
 const created=await req(`/projects/${pid}/uploads`,{method:'POST',headers:{'tus-resumable':'1.0.0','upload-length':String(bytes.length),'upload-metadata':`filename ${Buffer.from('clicks.wav').toString('base64')},kind ${Buffer.from('audio').toString('base64')}`}});assert.equal(created.status,201);const loc=created.headers.get('location')!.replace('/api',''),sid=loc.split('/').pop()!;assert.equal((await req(loc,{method:'PATCH',headers:{'tus-resumable':'1.0.0','content-type':'application/offset+octet-stream','upload-offset':'0'},body:bytes})).status,204);
 worker=start('server/worker.ts');const wait=async(predicate:(p:any)=>boolean)=>{for(let i=0;i<600;i++){const p=await json('/projects/'+pid);if(predicate(p))return p;if(p.job?.status==='error')throw Error(p.job.error);await pause(200);}throw Error('Lyric worker timeout.');};await wait(p=>p.assets[0].status==='ready');
 let settings={...defaults,ratio:'custom' as const,width:640,height:360,lyrics:{...lyricDefaults,songId:sid}};await patch('/projects/'+pid,{settings});
 await json('/connection',{method:'PUT',body:JSON.stringify({protocol:'openai',baseUrl:providerOrigin+'/v1',model:'fixture-only',transcriptionModel:'fixture-words',vision:false,token:'fixture-token',maxCalls:8})});
 const saved=await json('/connection');assert.equal(saved.hasKey,true);assert.equal(saved.token,undefined);assert.equal(saved.test,undefined);assert.equal(themes,0);assert.equal(transcriptions,0);
 assert.equal((await req('/connection/test',{method:'POST',body:'{}'})).status,410);
 await post(`/projects/${pid}/create`,{analyzeOnly:true});let p=await wait(p=>p.job?.status==='ready');assert.equal(p.revisions.length,0);assert.equal(p.providerCalls,2);
 const analyzed=await json(`/projects/${pid}/lyrics?song=${sid}`);assert.deepEqual(analyzed.cues,words.map(w=>({startMs:w.start*1000,endMs:w.end*1000,text:w.word})));assert.equal(analyzed.suggestion.theme,'moss');
 await post(`/projects/${pid}/create`,{analyzeOnly:true});p=await wait(p=>p.job?.status==='ready');assert.equal(transcriptions,1);assert.equal(themes,1);assert.equal(p.providerCalls,2);
 await post(`/projects/${pid}/create`);p=await wait(p=>p.revisions.length===1&&p.job.status==='ready');assert.equal(p.providerCalls,2);const revision=p.revisions[0];assert.equal(revision.plan.lyrics.theme,'moss');assert.equal(revision.plan.audio[0].gain,1);
 const output=path.join(root,'lyrics.mp4');await writeFile(output,Buffer.from(await (await req(`/projects/${pid}/revisions/${revision.id}/download`)).arrayBuffer()));const info=await probe(output);assert.equal(info.frames,90);assert.equal(info.width,640);assert.ok(Math.abs(info.durationMs-3000)<=34);
 // Detect the first text appearance inside the text band, excluding corner marks and flowers.
 const band=path.join(root,'band.gray');await command('ffmpeg',['-v','error','-y','-i',output,'-vf','crop=600:60:20:130,format=gray','-f','rawvideo',band]);const gray=await readFile(band),counts:number[]=[];for(let frame=0;frame<90;frame++){let count=0;for(let i=frame*36000;i<(frame+1)*36000;i++)if(gray[i]>200)count++;counts.push(count);}const firstText=counts.findIndex(n=>n>30);assert.equal(firstText,12,JSON.stringify(counts));assert.ok(counts[42]>counts[41]+10);assert.ok(counts[72]>counts[71]+10);
 const pcmFile=path.join(root,'audio.f32');await command('ffmpeg',['-v','error','-y','-i',output,'-vn','-ac','1','-ar','48000','-c:a','pcm_f32le','-f','f32le',pcmFile]);const pcm=await readFile(pcmFile);const samples=new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4);const onsetErrors=words.map(w=>{let onset=-1;for(let i=Math.floor((w.start-.04)*48000);i<Math.floor((w.start+.04)*48000);i++)if(Math.abs(samples[i])>.08){onset=i;break;}assert.ok(onset>=0);return (onset/48000-w.start)*1000;});assert.ok(onsetErrors.every(e=>Math.abs(e)<1000/30),JSON.stringify(onsetErrors));
 // Corrected/imported cues render without any provider connection. Offset remains explicit.
 await json('/connection',{method:'DELETE'});settings={...settings,lyrics:{...settings.lyrics,source:'manual',timing:'word',theme:'mono',offsetMs:100,cues:analyzed.cues}} as any;await patch('/projects/'+pid,{settings});await post(`/projects/${pid}/create`);p=await wait(p=>p.revisions.length===2&&p.job.status==='ready');assert.equal(p.revisions[0].plan.lyrics.cues[0].startMs,500);assert.equal(transcriptions,1);
 const invalid={...settings,lyrics:{...settings.lyrics,offsetMs:-1000}};await patch('/projects/'+pid,{settings:invalid});assert.equal((await req(`/projects/${pid}/create`,{method:'POST',body:'{}'})).status,400);
 const stranger=await req('/auth/register',{method:'POST',body:JSON.stringify({email:'lyric-other@example.test',password:'synthetic-fixture-only'})},'');const strangerCookie=stranger.headers.get('set-cookie')!.split(';')[0];assert.equal((await req(`/projects/${pid}/lyrics?song=${sid}`,{},strangerCookie)).status,404);
 // Anthropic chat and OpenAI audio may share a custom provider's URL/token; each is tested.
 await json('/connection',{method:'PUT',body:JSON.stringify({protocol:'anthropic',baseUrl:providerOrigin+'/v1',model:'claude-sonnet-4-6',transcriptionModel:'fixture-words',vision:true,token:'fixture-token',maxCalls:8})});
 assert.equal((await json('/connection')).test,undefined);
 // The saved token also drives a real edit plan and native MP4, using Anthropic chat.
 const editProject=await post('/projects',{name:'API-driven synthetic image edit'});const image=await readFile(path.resolve('test-data/fixtures/photo-red.jpg'));const uploaded=await req(`/projects/${editProject.id}/uploads`,{method:'POST',headers:{'tus-resumable':'1.0.0','upload-length':String(image.length),'upload-metadata':`filename ${Buffer.from('photo-red.jpg').toString('base64')},kind ${Buffer.from('image').toString('base64')}`}});const editLoc=uploaded.headers.get('location')!.replace('/api','');assert.equal((await req(editLoc,{method:'PATCH',headers:{'tus-resumable':'1.0.0','content-type':'application/offset+octet-stream','upload-offset':'0'},body:image})).status,204);
 let edit;for(let i=0;i<200;i++){edit=await json('/projects/'+editProject.id);if(edit.assets[0].status==='ready')break;await pause(100);}await patch('/projects/'+editProject.id,{settings:{...edit.settings,ratio:'custom',width:640,height:360}});await post(`/projects/${editProject.id}/create`,{instruction:'A conservative test edit'});for(let i=0;i<500;i++){edit=await json('/projects/'+editProject.id);if(edit.job.status==='error')throw Error(edit.job.error);if(edit.job.status==='ready')break;await pause(100);}assert.equal(edit.revisions[0].plan.engine,'ai');assert.equal(edit.providerCalls,1);assert.equal(edit.revisions[0].quality.frames,90);
 // Work starts directly; an unusable result reports a recoverable job error.
 missingWords=true;await json('/connection',{method:'PUT',body:JSON.stringify({protocol:'openai',baseUrl:providerOrigin+'/v1',model:'fixture-only',transcriptionModel:'missing-words-fixture',vision:false,token:'fixture-token',maxCalls:8})});
 await patch('/projects/'+pid,{settings:{...settings,lyrics:{...lyricDefaults,songId:sid,theme:'mono'}}});
 await post(`/projects/${pid}/create`,{analyzeOnly:true});p=await wait(p=>p.job?.status==='error');assert.match(p.job.error,/no word timestamps/);assert.equal(transcriptions,2);
 // Existing timed lyrics can still export with that unavailable transcription source.
 await post(`/projects/${pid}/create`);p=await wait(p=>p.revisions.length===3&&p.job.status==='ready');assert.equal(transcriptions,2);
 // Theme failures preserve transcription, permit export, and are not replayed on export.
 missingWords=false;brokenTheme=true;
 await json('/connection',{method:'PUT',body:JSON.stringify({protocol:'anthropic',baseUrl:providerOrigin+'/v1',model:'theme-error-fixture',transcriptionModel:'fixture-words',vision:false,token:'fixture-token',maxCalls:8})});
 await patch('/projects/'+pid,{settings:{...defaults,ratio:'custom',width:640,height:360,lyrics:{...lyricDefaults,songId:sid}}});
 await post(`/projects/${pid}/create`,{analyzeOnly:true});p=await wait(p=>p.job.status==='ready');
 const recovered=await json(`/projects/${pid}/lyrics?song=${sid}`);assert.equal(recovered.cues.length,3);assert.match(recovered.notice,/choose a palette manually/);
 const themeAttempts=themes,transcriptionAttempts=transcriptions,callsBeforeExport=p.providerCalls;
 await post(`/projects/${pid}/create`);p=await wait(p=>p.revisions.length===4&&p.job.status==='ready');assert.equal(themes,themeAttempts);assert.equal(transcriptions,transcriptionAttempts);assert.equal(p.providerCalls,callsBeforeExport);brokenTheme=false;
 let localWhisperVerified=false;
 if(process.env.WHISPER_MODEL_PATH){
  const beforeAudioChecks=checks.audio;
  await json('/connection',{method:'PUT',body:JSON.stringify({protocol:'anthropic',baseUrl:providerOrigin+'/v1',model:'claude-sonnet-4-6',transcriptionEngine:'faster-whisper',transcriptionModel:'',vision:false,token:'fixture-token',maxCalls:8})});
  assert.equal(checks.audio,beforeAudioChecks);await json('/connection',{method:'DELETE'}); // Local tools also work without a model-provider account.
  const localProject=await post('/projects',{name:'Real local Whisper spoken fixture',kind:'lyrics'});
  const spoken=await readFile(path.resolve('public/connection-check.wav'));
  const upload=await req(`/projects/${localProject.id}/uploads`,{method:'POST',headers:{'tus-resumable':'1.0.0','upload-length':String(spoken.length),'upload-metadata':`filename ${Buffer.from('spoken-fixture.wav').toString('base64')},kind ${Buffer.from('audio').toString('base64')}`}});
  const loc=upload.headers.get('location')!.replace('/api',''),aid=loc.split('/').pop();await req(loc,{method:'PATCH',headers:{'tus-resumable':'1.0.0','content-type':'application/offset+octet-stream','upload-offset':'0'},body:spoken});
  for(let i=0;i<200;i++){const lp=await json('/projects/'+localProject.id);if(lp.assets[0].status==='ready')break;await pause(100);}
  await patch('/projects/'+localProject.id,{settings:{...defaults,ratio:'custom',width:640,height:360,lyrics:{...lyricDefaults,songId:aid,theme:'mono'}}});
  await post(`/projects/${localProject.id}/create`,{analyzeOnly:true});let localDone=false;
  for(let i=0;i<600;i++){const lp=await json('/projects/'+localProject.id);if(lp.job?.status==='error')throw Error(lp.job.error);if(lp.job?.status==='ready'){assert.equal(lp.providerCalls,0);localDone=true;break;}await pause(200);}assert.ok(localDone);
  const result=await json(`/projects/${localProject.id}/lyrics?song=${aid}`);assert.match(result.cues.map((c:any)=>c.text).join(' '),/Amber River opens/i);assert.equal(checks.audio,beforeAudioChecks);localWhisperVerified=true;
 }
 const report={passed:true,localWhisperVerified,source:'Synthetic clicks and explicitly labeled local provider mocks; not singing recognition evidence.',frames:info.frames,firstTextFrame:firstText,wordHighlightFrames:[12,42,72],audioOnsetErrorMs:onsetErrors,providerCalls:2,checks,verified:['audio-only upload','word timestamp contract','theme contract','analysis before render','durable reuse without repeat provider calls','real native lyric MP4','original song volume/speed','manual correction without provider','global offset','invalid offset rejection','cross-user lyric isolation','unusable transcription reports a recoverable job error','saved token required on every provider request','API-driven edit plan and native MP4 through Anthropic protocol','save without processor checks or sample requests','direct generation without preflight','theme failure preserves lyrics and allows export','failed theme request not repeated on export','cached lyrics export independently of current provider access','local Whisper without API credentials']};await writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,report:path.join(root,'report.json')}));
}finally{worker?.kill('SIGTERM');api.kill('SIGTERM');provider.closeAllConnections();provider.close();}
