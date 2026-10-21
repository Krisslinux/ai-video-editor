import {z} from 'zod';
import type {Asset,Settings,Plan,Transcript} from '../shared/types.ts';
import {isVisual} from '../shared/types.ts';
const ms=z.number().int().nonnegative();
export const planSchema=z.object({version:z.literal(1),fps:z.literal(30),width:z.number().int(),height:z.number().int(),fit:z.enum(['fit','fill']),segments:z.array(z.object({assetId:z.string(),inMs:ms,outMs:ms,gain:z.number().min(0).max(2)}).strict()).min(1).max(64),audio:z.array(z.object({assetId:z.string(),inMs:ms,outMs:ms,atMs:ms,gain:z.number().min(0).max(2),role:z.enum(['music','voiceover','sync'])}).strict()).max(24),captions:z.array(z.object({startMs:ms,endMs:ms,text:z.string().max(160)})).max(2000),summary:z.array(z.string().max(200)).max(10),warnings:z.array(z.string().max(200)).max(20),engine:z.enum(['automatic','ai'])}).strict();
export const frameMs=(ms:number)=>Math.round(ms*30/1000)*1000/30;
export function dimensions(settings:Settings,assets:Asset[]){
 if(settings.ratio==='custom')return {width:Math.round(settings.width/2)*2,height:Math.round(settings.height/2)*2};
 const main=assets.find(isVisual);const ratio=settings.ratio==='auto'?(main&&main.width&&main.height?main.width/main.height:16/9):(()=>{const [w,h]=settings.ratio.split(':').map(Number);return w/h;})();
 return ratio>=1?{width:1280,height:Math.round(1280/ratio/2)*2}:{width:Math.round(1280*ratio/2)*2,height:1280};
}
export function automaticPlan(assets:Asset[],settings:Settings,instruction='',previous?:Plan):Plan{
 let s={...settings};if(/\bportrait\b/i.test(instruction))s.ratio='9:16';if(/\blandscape\b/i.test(instruction))s.ratio='16:9';
 let target=s.targetSeconds*1000;if(/\bshorter\b/i.test(instruction)&&previous)target=Math.round(previous.segments.reduce((n,c)=>n+c.outMs-c.inMs,0)*0.7);
 if(instruction.trim()&&!/shorter|lower.*music|quiet.*music|portrait|landscape|opening|keep|assemble|combine/i.test(instruction))throw Error('Automatic assembly supports simple length, music, and ratio changes. Connect AI editing for creative instructions, or clear the description.');
 if(previous&&instruction.trim()&&/lower.*music|quiet.*music|portrait|landscape|opening|keep/i.test(instruction)&&!/shorter/i.test(instruction)){
  const kept=structuredClone(previous);Object.assign(kept,dimensions(s,assets),{fit:s.fit,engine:'automatic'});kept.captions=[];kept.warnings=[];
  if(/lower.*music|quiet.*music/i.test(instruction)){for(const a of kept.audio)if(a.role==='music')a.gain=Math.max(0,Math.round(a.gain*.4*1000)/1000);kept.summary=['Previous cuts and timing preserved.','Background music reduced.'];}
  else kept.summary=['Previous cuts and audio timing preserved.','Output framing updated to the selected screen shape.'];
  if(s.fit==='fill')kept.warnings.push('Fill uses a centered crop. Review faces and important details.');return kept;
 }
 let left=target||Infinity;const segments:Plan['segments']=[];
 for(const a of assets.filter(isVisual)){let duration=Math.round(a.durationMs*30/1000)*1000/30;if(left<1000/30&&!a.protected)continue;const length=a.protected?duration:Math.min(duration,left);if(length>=1000/30)segments.push({assetId:a.id,inMs:0,outMs:Math.round(length),gain:1});left-=length;}
 const duration=segments.reduce((n,c)=>n+c.outMs-c.inMs,0),audio:Plan['audio']=[];let voiceAt=0;
 for(const a of assets.filter(a=>a.kind==='audio')){const role=a.role==='voiceover'?'voiceover':a.role==='sync'?'sync':'music';const atMs=role==='voiceover'?voiceAt:0;const outMs=Math.min(a.durationMs,duration-atMs);if(outMs<=0)continue;audio.push({assetId:a.id,inMs:0,outMs:Math.round(outMs),atMs:Math.round(atMs),gain:role==='music'?(/lower.*music|quiet.*music/i.test(instruction)?0.06:0.18):1,role});if(role==='voiceover')voiceAt+=outMs;}
 const plan:Plan={version:1,fps:30,...dimensions(s,assets),fit:s.fit,segments,audio,captions:[],summary:[assets.some(a=>a.kind==='image')?'Images and clips assembled in upload order.':'Clips assembled in upload order.',assets.some(a=>a.kind==='image')?'Each image is held for its selected duration. Added audio is mixed into the video.':'Original sound preserved; added music fades in and out.'],warnings:[],engine:'automatic'};
 if(target&&assets.some(a=>a.protected)&&duration>target+50)plan.warnings.push('Protected clips take priority over the target length.');
 if(target&&duration<assets.filter(isVisual).reduce((n,a)=>n+a.durationMs,0))plan.warnings.push('Target length uses a sequential trim. Review the ending for cut-off speech.');
 if(assets.some(a=>a.kind==='audio'&&a.role==='auto'))plan.warnings.push('Auto audio is arranged as background music. Select Voiceover if this file is narration.');
 if(s.fit==='fill')plan.warnings.push('Fill uses a centered crop. Review the framing of faces and important details.');
 return plan;
}
export function validatePlan(raw:unknown,assets:Asset[],settings:Settings,previous?:Plan):Plan{
 const plan=planSchema.parse(raw);if(plan.width<144||plan.height<144||plan.width>1920||plan.height>1920||plan.width%2||plan.height%2)throw Error('Invalid output dimensions.');
 let total=0;const mapping:{id:string;at:number;inMs:number;outMs:number;gain:number}[]=[];
 for(const c of plan.segments){const a=assets.find(a=>a.id===c.assetId&&isVisual(a)&&a.status==='ready');if(!a||c.outMs<=c.inMs||c.outMs>a.durationMs+34||c.outMs-c.inMs<33)throw Error('The edit plan contains an invalid visual range.');if(plan.engine==='ai'&&a.analysis?.transcript?.some(t=>c.inMs>t.startMs+100&&c.inMs<t.endMs-100||c.outMs>t.startMs+100&&c.outMs<t.endMs-100))throw Error('The AI plan cuts through timestamped speech. No edit was applied; ask for a less aggressive trim.');mapping.push({id:c.assetId,at:total,...c});total+=c.outMs-c.inMs;}
 if(total>1800000)throw Error('The edit exceeds the maximum output duration.');
 for(const a of assets.filter(a=>a.protected)){
  const chosen=mapping.filter(x=>x.id===a.id);if(isVisual(a)){
   if(chosen.length!==1||chosen[0].inMs!==0||Math.abs(chosen[0].outMs-a.durationMs)>34||chosen[0].gain!==1)throw Error('A protected clip cannot be removed, trimmed, repeated, or muted.');
   if(previous){let offset=0;const old=previous.segments.find(c=>{if(c.assetId===a.id)return true;offset+=c.outMs-c.inMs;return false;});if(old&&(Math.abs(chosen[0].at-offset)>34||plan.width!==previous.width||plan.height!==previous.height||plan.fit!==previous.fit))throw Error('This change would move or reframe a protected clip. Unlock it first.');}
  }
 }
 for(const a of plan.audio){const asset=assets.find(s=>s.id===a.assetId&&s.kind==='audio'&&s.status==='ready');if(!asset||a.outMs<=a.inMs||a.outMs>asset.durationMs+1||a.atMs>=total||a.atMs+a.outMs-a.inMs>total+34)throw Error('Invalid audio placement.');if(asset.protected){const old=previous?.audio.find(x=>x.assetId===asset.id);if(old&&JSON.stringify(a)!==JSON.stringify(old))throw Error('Protected audio cannot be changed.');}}
 for(const a of assets.filter(a=>a.protected&&a.kind==='audio'))if(!plan.audio.some(x=>x.assetId===a.id))throw Error('Protected audio cannot be removed.');
 // Captions are always derived from actual transcription, never model-written dialogue.
 plan.captions=settings.captions?mapCaptions(plan,assets):[];
 if(settings.captions&&!plan.captions.length)throw Error('No timestamped speech was returned. Disable captions or check the transcription connection.');
 return plan;
}
export function mapCaptions(plan:Plan,assets:Asset[]):Transcript[]{const result:Transcript[]=[];let at=0;
 for(const c of plan.segments){const asset=assets.find(a=>a.id===c.assetId)!;for(const t of asset.analysis?.transcript||[]){if(t.endMs>c.inMs&&t.startMs<c.outMs)result.push({startMs:Math.round(at+Math.max(0,t.startMs-c.inMs)),endMs:Math.round(at+Math.min(c.outMs,t.endMs)-c.inMs),text:t.text.slice(0,160)});}at+=c.outMs-c.inMs;}
 for(const a of plan.audio.filter(x=>x.role==='voiceover'))for(const t of assets.find(x=>x.id===a.assetId)?.analysis?.transcript||[])if(t.endMs>a.inMs&&t.startMs<a.outMs)result.push({startMs:Math.round(a.atMs+Math.max(0,t.startMs-a.inMs)),endMs:Math.round(a.atMs+Math.min(a.outMs,t.endMs)-a.inMs),text:t.text.slice(0,160)});
 return result.filter(c=>c.endMs>c.startMs).sort((a,b)=>a.startMs-b.startMs);
}
