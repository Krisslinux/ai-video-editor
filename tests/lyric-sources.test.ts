import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {parseLRC,parseTTML,parseQRC,parseTimedLyrics} from '../shared/lyric-import.ts';
import {searchLyrics} from '../server/lyric-sources.ts';
import {handle} from '../server/application.ts';
import {lyricDefaults} from '../shared/lyrics.ts';
import {defaults} from '../shared/types.ts';
import {lyricProviders} from '../shared/lyric-sources.ts';
import {unseal} from '../server/web-security.ts';
import type {Runtime} from '../server/ports.ts';
import type {LyricLookup} from '../shared/lyric-sources.ts';

const ttml='<tt xmlns="http://www.w3.org/ns/ttml"><head><metadata><p begin="0" end="1">Do not render metadata</p></metadata></head><body><div><p begin="0.4" end="2"><span begin="0.4" end="0.7">Am</span><span begin="0.7" end="1.0">ber</span> <span begin="1.2" end="1.5">river</span><span ttm:role="x-bg"><span begin="0.4" end="1">Background</span></span></p></div></body></tt>';
const lrc='[ar:Synthetic artist]\n[ti:Synthetic song]\n[offset:100]\n[00:00.40][00:02.40]Amber river\n[00:01.40]\n[00:03.00]';
const qrc='<QrcInfos><Lyric_1 LyricContent="[400,1600]Amber(400,400) river(1000,600)" /></QrcInfos>';
const query:LyricLookup={title:'Amber River',artist:'Fixture artist',album:'Fixture album',provider:'auto'};
const lineRecord={trackName:query.title,artistName:query.artist,albumName:query.album,duration:4,syncedLyrics:'[00:00.40]Amber river\n[00:02.40]Opens'};
test('Source imports keep supplied TTML, QRC, enhanced LRC and caption timestamps',()=>{
 assert.deepEqual(parseTTML(ttml,4000),{timing:'word',cues:[{startMs:400,endMs:1000,text:'Amber'},{startMs:1200,endMs:1500,text:'river'}]});
 assert.deepEqual(parseQRC(qrc,4000).cues,[{startMs:400,endMs:800,text:'Amber'},{startMs:1000,endMs:1600,text:'river'}]);
 assert.deepEqual(parseLRC(lrc,4000),{timing:'line',cues:[{startMs:500,endMs:1500,text:'Amber river'},{startMs:2500,endMs:3100,text:'Amber river'}]});
 assert.deepEqual(parseLRC('[00:00.40]<00:00.40>Amber <00:01.00>river<00:01.50>\n[00:02.00]',4000).cues,[{startMs:400,endMs:1000,text:'Amber'},{startMs:1000,endMs:1500,text:'river'}]);
 assert.deepEqual(parseTimedLyrics('WEBVTT\n\n00:00.400 --> 00:01.400\nAmber river',4000).cues,[{startMs:400,endMs:1400,text:'Amber river'}]);
 assert.deepEqual(parseTimedLyrics('1\n00:00:00,400 --> 00:00:01,400\nAmber river',4000).cues,[{startMs:400,endMs:1400,text:'Amber river'}]);
 assert.equal(parseTTML('<tt><body><div><p begin="0.4" end="1.5">Amber &amp; river</p></div></body></tt>',4000).timing,'line');
 for(const bad of ['<!DOCTYPE tt [<!ENTITY x "bad">]><tt><body><p>&x;</p></body></tt>','<tt><body></tt>','<tt><body><p>Untimed text</p></body></tt>','<html><body><p>Unavailable</p></body></html>','[00:06.00]outside','[00:00.00]<00:00.00>Amber<00:02.00>\n[00:01.00]river'])assert.throws(()=>parseTimedLyrics(bad,4000));
});

function mockSources(seen:{url:string;headers:Headers}[]):typeof fetch{return async(input,init)=>{
 const url=new URL(String(input)),headers=new Headers(init?.headers);seen.push({url:url.href,headers});assert.equal(init?.redirect,'error');assert.equal(headers.has('cookie'),false);
 const json=(d:unknown,status=200)=>Response.json(d,{status});
 if(url.host==='lrclib.net')return json([{...lineRecord,trackName:'Amber River (Live)',duration:40},{...lineRecord,duration:9},lineRecord]);
 if(url.host==='unison.boidu.dev')return json({success:true,data:{song:query.title,artist:query.artist,album:query.album,duration:4,format:'ttml',lyrics:ttml}});
 if(url.host==='api.betterlyrics.org'){if(url.pathname==='/getLyrics'&&!headers.has('x-api-key'))return json({error:'key required'},401);return json(url.pathname.startsWith('/qq')?{lyrics:qrc}:url.pathname.startsWith('/kugou')?{lyrics:lineRecord.syncedLyrics}:{ttml});}
 if(url.host==='lyricsplus.prjktla.my.id')return new Response(ttml,{headers:{'content-type':'application/xml'}});
 if(url.host==='api-lyrics.simpmusic.org')return json({success:true,data:[{songTitle:query.title,artistName:query.artist,albumName:query.album,duration:4,plainLyrics:'Amber river\nOpens'}]});
 if(url.host==='lyrics.binimum.org')return url.pathname==='/api/lookup'?json({results:[{track_name:query.title,artist_name:query.artist,duration:4,lyricsUrl:'https://lyrics-storage.binimum.org/fixture.ttml'}]}):new Response(ttml);
 if(url.host==='lyrics-storage.binimum.org')return new Response(ttml);
 if(url.host==='api.paxsenix.org'){assert.equal(headers.get('authorization'),'Bearer pax-fixture-only');if(url.pathname==='/spotify/search')return json({tracks:{items:[{id:'fixture-track',name:query.title,artists:[{name:query.artist}],duration_ms:4000}]}});return json({data:{lyrics:lineRecord.syncedLyrics}});}
 throw Error('Unexpected fixture URL: '+url.href);
};}
test('All screenshot providers are listed; auto search ranks recording match before timing detail',async()=>{
 assert.equal(lyricProviders.length,16);const seen:{url:string;headers:Headers}[]=[];
 const found=await searchLyrics(query,4000,{},new AbortController().signal,mockSources(seen));
 assert.equal(found.sources.length,12);assert.equal(found.sources.filter(s=>s.status==='key-required').length,4);
 assert.equal(found.candidates[0].provider,'unison');assert.equal(found.candidates[0].timing,'word');assert.equal(found.candidates[0].recommended,true);
 assert.ok(found.candidates.find(c=>c.provider==='lrclib'&&c.durationMs===4000)!.recommended);
 assert.ok(found.candidates.filter(c=>c.durationMs===9000||c.title.includes('Live')).every(c=>!c.recommended));
 assert.equal(found.candidates.find(c=>c.provider==='simpmusic')!.timing,'plain');
 assert.ok(found.candidates.filter(c=>c.provider==='lyricsplus'||c.provider==='portato').every(c=>!c.recommended),'Unverified metadata must not become an exact match');
 assert.ok(seen.every(s=>!s.headers.has('authorization')),'AI credentials are never part of public searches');
 const withKeys=await searchLyrics(query,4000,{paxsenix:'pax-fixture-only',betterlyrics:'better-fixture-only'},new AbortController().signal,mockSources(seen));
 assert.ok(withKeys.candidates.some(c=>c.provider==='paxsenix-spotify'));
 assert.ok(seen.filter(s=>s.headers.has('authorization')).every(s=>new URL(s.url).host==='api.paxsenix.org'));
 assert.ok(seen.filter(s=>s.headers.has('x-api-key')).every(s=>new URL(s.url).host==='api.betterlyrics.org'));
 assert.equal(new URL(seen.find(s=>new URL(s.url).pathname==='/kugou/getLyrics')!.url).searchParams.get('d'),'4');
});
test('Source errors, unsafe file hosts and untimed text never manufacture sync',async()=>{
 for(const status of [401,403,429,503]){const r=await searchLyrics({...query,provider:'lrclib'},4000,{},new AbortController().signal,async()=>Response.json({error:'fixture'}, {status}));assert.equal(r.candidates.length,0);assert.equal(r.sources[0].status,status===401||status===403?'key-required':'unavailable');}
 const seen:string[]=[];const unsafe=await searchLyrics({...query,provider:'binilyrics'},4000,{},new AbortController().signal,async(input)=>{seen.push(String(input));return Response.json({results:[{title:query.title,artist:query.artist,lyricsUrl:'http://169.254.169.254/latest/meta-data'}]});});assert.equal(seen.length,1);assert.equal(unsafe.candidates.length,0);
 const html=await searchLyrics({...query,provider:'lyricsplus'},4000,{},new AbortController().signal,async()=>new Response('<html><body><p>Blocked</p></body></html>',{headers:{'content-type':'text/html'}}));assert.equal(html.candidates.length,0);assert.equal(html.sources[0].status,'unavailable');
 const networkPath:string[]=[];await searchLyrics({...query,provider:'binilyrics'},4000,{},new AbortController().signal,async input=>{networkPath.push(String(input));return Response.json({results:[{lyricsUrl:'https://lyrics.binimum.org//169.254.169.254/latest'}]});});assert.equal(networkPath.length,1,'An allowed hostname cannot smuggle a network-path redirect');
 const partial=await searchLyrics({...query,provider:'binilyrics'},4000,{},new AbortController().signal,async input=>{const url=new URL(String(input));if(url.pathname==='/api/lookup')return Response.json({results:[{title:query.title,artist:query.artist,ttml},{title:query.title,artist:query.artist,lyricsUrl:'https://lyrics-storage.binimum.org/missing.ttml'}]});return new Response('Unavailable',{status:503});});assert.equal(partial.candidates.length,1);assert.equal(partial.sources[0].status,'found');
 const invalid=await searchLyrics({...query,provider:'lrclib'},4000,{},new AbortController().signal,async()=>Response.json([{...lineRecord,syncedLyrics:'[00:10.00]Outside'}]));assert.equal(invalid.candidates.length,0);
 const manual=await searchLyrics({...query,provider:'genius'},4000,{},new AbortController().signal,async()=>{throw Error('Must not fetch');});assert.equal(manual.sources[0].status,'import');
});

test('Project lookup enforces ownership, encrypts separate keys, caches results and accepts saved provenance',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const name of ['0000_web_foundation','0001_connection_tests','0002_lyric_credentials'])sql.exec(await readFile(`drizzle/${name}.sql`,'utf8'));
 const store=new Map<string,Uint8Array>(),seen:{url:string;headers:Headers}[]=[];
 const runtime:Runtime={db:{get:async(s,...a)=>sql.prepare(s).get(...a as any[]),all:async(s,...a)=>sql.prepare(s).all(...a as any[]),run:async(s,...a)=>({changes:Number(sql.prepare(s).run(...a as any[]).changes)}),batch:async()=>{}},objects:{put:async(k,b)=>{assert.ok(b instanceof Uint8Array);store.set(k,b);},get:async k=>{const b=store.get(k);return b?{body:new Response(new Uint8Array(b)).body!,size:b.length}:null;},delete:async k=>{store.delete(k);},deletePrefix:async prefix=>{for(const k of store.keys())if(k.startsWith(prefix))store.delete(k);}},key:'a'.repeat(64),workerToken:'fixture-worker',origin:'https://fixture.test',production:true,hosted:true,limits:{fileBytes:100000,userBytes:10000000,seconds:480,assets:20,jobs:2,calls:10,renders:20,retention:30},identity:r=>{const user=r.headers.get('x-fixture-user');return user?{id:user,email:user+'@fixture.test'}:null;},lyricFetch:mockSources(seen)};
 const call=(path:string,method='GET',data?:unknown,user='owner',origin='https://fixture.test')=>handle(new Request('https://fixture.test/api'+path,{method,headers:{'x-fixture-user':user,origin,'content-type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})}),runtime);
 const created=await (await call('/projects','POST',{kind:'lyrics'})).json() as any;const project=created.id;
 sql.prepare('INSERT INTO assets(id,project_id,data) VALUES(?,?,?)').run('song',project,JSON.stringify({id:'song',projectId:project,kind:'audio',status:'ready',durationMs:4000}));
 const body={...query,songId:'song',provider:'lrclib'};
 assert.equal((await call(`/projects/${project}/lyrics/search`,'POST',body,'intruder')).status,404);assert.equal(seen.length,0);
 assert.equal((await call(`/projects/${project}/lyrics/search`,'POST',{...body,songId:'other'})).status,404);
 assert.equal((await call(`/projects/${project}/lyrics/search`,'POST',body,'owner','https://other.test')).status,403);
 assert.equal((await call('/lyrics/keys','PUT',{provider:'paxsenix',token:'pax-fixture-only'})).status,200);assert.equal(seen.length,0,'Saving a key makes no provider or test call');
 const encrypted=sql.prepare('SELECT secret FROM lyric_credentials WHERE user_id=?').get('owner') as any;assert.ok(!encrypted.secret.includes('pax-fixture-only'));assert.equal(await unseal(encrypted.secret,runtime.key),'pax-fixture-only');
 assert.deepEqual(await (await call('/lyrics/keys')).json(),{configured:['paxsenix']});assert.deepEqual(await (await call('/lyrics/keys','GET',undefined,'intruder')).json(),{configured:[]});
 const first=await call(`/projects/${project}/lyrics/search`,'POST',body);assert.equal(first.status,200);const data=await first.json() as any;assert.equal(data.candidates[0].recommended,true);const count=seen.length;
 assert.deepEqual(await (await call(`/projects/${project}/lyrics/search`,'POST',body)).json(),data);assert.equal(seen.length,count,'Same private query uses cached results');
 const c=data.candidates[0];const attribution={provider:c.provider,title:c.title,artist:c.artist,album:c.album,durationMs:c.durationMs,url:c.url};
 assert.equal((await call(`/projects/${project}`,'PATCH',{settings:{...defaults,lyrics:{...lyricDefaults,songId:'song',source:'manual',cues:c.cues,timing:c.timing,lookup:{...query,provider:'lrclib'},attribution}}})).status,200);
 const saved=await (await call(`/projects/${project}`)).json() as any;assert.deepEqual(saved.settings.lyrics.attribution,attribution);assert.deepEqual(saved.settings.lyrics.cues,c.cues);
 assert.equal((await call('/lyrics/keys','DELETE',{provider:'paxsenix'})).status,200);assert.deepEqual(await (await call('/lyrics/keys')).json(),{configured:[]});sql.close();
});
