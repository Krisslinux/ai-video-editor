import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import {once} from 'node:events';import {planWithAI} from '../server/provider.ts';
import {automaticPlan,validatePlan,dimensions,mapCaptions} from '../server/plan.ts';
import {correlate} from '../server/media.ts';
import {publicAddress} from '../server/provider.ts';
import {defaults} from '../shared/types.ts';import type {Asset} from '../shared/types.ts';
const asset=(id:string,kind:'video'|'audio'='video'):Asset=>({id,projectId:'p',name:id,kind,role:'auto',size:10,offset:10,status:'ready',durationMs:3000,width:640,height:360,hasAudio:true,protected:false,createdAt:0});
test('Plans use only owned media and reject invalid or protected edits',()=>{const a=asset('a'),b=asset('b');let plan=automaticPlan([a,b],defaults);assert.equal(validatePlan(plan,[a,b],defaults).segments.length,2);assert.throws(()=>validatePlan({...plan,segments:[{assetId:'other',inMs:0,outMs:1000,gain:1}]},[a,b],defaults));a.protected=true;assert.throws(()=>validatePlan({...plan,segments:[{assetId:'a',inMs:0,outMs:1000,gain:1}]},[a,b],defaults));const previous=plan;plan={...plan,segments:[plan.segments[1],plan.segments[0]]};assert.throws(()=>validatePlan(plan,[a,b],defaults,previous),/move or reframe/);});
test('Ratios preserve shape and captions follow cuts and voice placement',()=>{const a=asset('a');a.analysis={transcript:[{startMs:1000,endMs:2000,text:'Actual speech'}]};const plan=automaticPlan([a],{...defaults,ratio:'9:16'});plan.segments[0].inMs=500;assert.deepEqual(dimensions({...defaults,ratio:'9:16'},[a]),{width:720,height:1280});assert.deepEqual(mapCaptions(plan,[a]),[{startMs:500,endMs:1500,text:'Actual speech'}]);});
test('Private, metadata, reserved, and mapped addresses cannot be AI endpoints',()=>{for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.4.2','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);});
test('Unknown creative instructions are never presented as an AI edit',()=>{assert.throws(()=>automaticPlan([asset('a')],defaults,'create an emotional montage'),/Connect AI/);});
test('Image-only and mixed visual plans honor duration, orientation, and protection',()=>{
 const photo:Asset={...asset('photo'),kind:'image',durationMs:1500,width:360,height:640,hasAudio:false};const clip=asset('clip');
 const images=automaticPlan([photo],defaults);assert.deepEqual(images.segments.map(s=>[s.assetId,s.outMs]),[['photo',1500]]);assert.equal(images.width,720);assert.equal(images.height,1280);assert.equal(validatePlan(images,[photo],defaults).segments.length,1);
 const mixed=automaticPlan([photo,clip],defaults);assert.deepEqual(mixed.segments.map(s=>s.assetId),['photo','clip']);
 photo.protected=true;assert.throws(()=>validatePlan({...images,segments:[{assetId:'photo',inMs:0,outMs:500,gain:1}]},[photo],defaults),/protected/);assert.throws(()=>validatePlan({...images,segments:[{assetId:'photo',inMs:0,outMs:4000,gain:1}]},[photo],defaults),/range/);
});

test('Shared-signal alignment rejects silence and measures an introduced offset',()=>{let seed=3;const ref=Array.from({length:800},()=>{seed=(seed*16807)%2147483647;return seed/2147483647;});const recording=[...Array(8).fill(0),...ref];const result=correlate(ref,recording);assert.equal(result.reliable,true);assert.equal(result.offsetMs,-160);assert.ok(result.confidence>.99);assert.equal(correlate(Array(800).fill(0),Array(800).fill(0)).reliable,false);});
test('Explicit local mock verifies OpenAI and Anthropic adapter contracts, not live AI',async()=>{
 const a=asset('a');const fixture=automaticPlan([a],defaults);const seen:string[]=[];
 const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);assert.equal(data.model,'fixture-only');seen.push(req.url!);res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/v1/messages'?{content:[{type:'text',text:JSON.stringify(fixture)}]}:{choices:[{message:{content:JSON.stringify(fixture)}}]}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as any).port;process.env.LOCAL_AI_ORIGIN=`http://127.0.0.1:${port}`;
 try{for(const protocol of ['openai','anthropic'] as const){const plan=await planWithAI({protocol,baseUrl:`${process.env.LOCAL_AI_ORIGIN}/v1`,model:'fixture-only',vision:false,transcriptionModel:'',token:'',hasKey:false,configured:true,maxCalls:1},[a],defaults,'',undefined,new Map(),new AbortController().signal,async(_kind,fn)=>fn());assert.equal(validatePlan(plan,[a],defaults).engine,'ai');}assert.deepEqual(seen,['/v1/chat/completions','/v1/messages']);}finally{delete process.env.LOCAL_AI_ORIGIN;server.closeAllConnections();server.close();}
});
