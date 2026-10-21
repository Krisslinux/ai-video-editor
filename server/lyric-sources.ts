import {lyricProviders} from '../shared/lyric-sources.ts';
import type {LyricCandidate,LyricLookup,LyricProviderId,LyricSearchResult} from '../shared/lyric-sources.ts';
import {parseTimedLyrics,parseQRC} from '../shared/lyric-import.ts';

export type LyricsKeys=Partial<Record<'betterlyrics'|'paxsenix',string>>;
const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function rankLyrics(c:LyricCandidate,q:LyricLookup,durationMs:number,metadataKnown=true):LyricCandidate{
 const title=normalize(c.title)===normalize(q.title),artist=normalize(c.artist)===normalize(q.artist);
 const delta=c.durationMs===undefined?undefined:c.durationMs-durationMs;
 const durationScore=delta===undefined?0:Math.abs(delta)<=2000?30:Math.abs(delta)<=5000?5:-50;
 const version=/\b(live|remix|acoustic|instrumental|karaoke|slowed|sped up|radio edit|extended)\b/gi;
 const modifiers=(s:string)=>[...normalize(s).matchAll(version)].map(m=>m[0]).sort().join('|');
 const versionMatch=modifiers(c.title)===modifiers(q.title);
 const score=(metadataKnown?(title?45:-30)+(artist?30:-25):10)+durationScore+(c.timing==='word'?15:c.timing==='line'?7:-20)+(q.album&&normalize(q.album)===normalize(c.album)?8:0)+(versionMatch?0:-50);
 return {...c,score,durationDeltaMs:delta,recommended:metadataKnown&&title&&artist&&versionMatch&&delta!==undefined&&Math.abs(delta)<=2000&&!!c.cues.length,
  notes:[...c.notes,...(!metadataKnown?['Provider did not return song metadata.']:[]),...(delta===undefined?['Recording duration not supplied.']:Math.abs(delta)>2000?[`Recording length differs by ${(Math.abs(delta)/1000).toFixed(1)} seconds.`]:[]),...(!versionMatch?['Different recording version.']:[])]};
}
type SourceError=Error&{status?:number};
const str=(v:unknown)=>typeof v==='string'?v:'';
const seconds=(v:unknown)=>Number.isFinite(Number(v))&&Number(v)>0?Math.round(Number(v)*1000):undefined;

export async function searchLyrics(q:LyricLookup,durationMs:number,keys:LyricsKeys,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<LyricSearchResult>{
 const result:LyricSearchResult={candidates:[],sources:[]};
 const providers=lyricProviders.filter(p=>q.provider==='auto'?p.mode==='fetch':p.id===q.provider);
 async function source(provider:typeof lyricProviders[number]){
  const candidates:LyricCandidate[]=[];const id=provider.id;
  if(provider.mode==='import'){result.sources.push({provider:id,status:'import',message:provider.note});return;}
  if('key' in provider&&provider.key==='paxsenix'&&!keys.paxsenix){result.sources.push({provider:id,status:'key-required',message:'Add your PaxSenix key to search this source.'});return;}
  const timeout=AbortSignal.any([signal,AbortSignal.timeout(id==='binilyrics'?20000:10000)]);
  async function get(origin:string,path:string,params:Record<string,string|number|undefined>={},key?:'betterlyrics'|'paxsenix'){
   const url=new URL(path,origin);if(url.origin!==new URL(origin).origin||url.username||url.password)throw Error('Unexpected lyrics source URL.');for(const [k,v] of Object.entries(params))if(v!==undefined&&v!=='')url.searchParams.set(k,String(v));
   const headers:Record<string,string>={accept:'application/json, application/xml, text/plain','user-agent':'Frameflow/0.1 (https://github.com/Krisslinux/ai-video-editor)'};
   if(key&&keys[key])headers[key==='paxsenix'?'authorization':'x-api-key']=key==='paxsenix'?`Bearer ${keys[key]}`:keys[key]!;
   const res=await fetcher(url,{headers,signal:timeout,redirect:'error',credentials:'omit'});
   if(!res.ok){await res.body?.cancel();throw Object.assign(Error('Lyrics source unavailable.'),{status:res.status});}
   if(/text\/html/i.test(res.headers.get('content-type')||'')){await res.body?.cancel();throw Error('Source returned a web page instead of lyrics.');}
   if(Number(res.headers.get('content-length'))>1500000){await res.body?.cancel();throw Error('Lyrics response too large.');}
   const reader=res.body?.getReader();if(!reader)throw Error('Empty lyrics response.');const decoder=new TextDecoder();let body='',size=0;
   try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>1500000)throw Error('Lyrics response too large.');body+=decoder.decode(next.value,{stream:true});}body+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
   try{return JSON.parse(body);}catch{return body;}
  }
  function add(raw:unknown,meta:{title?:string;artist?:string;album?:string;durationMs?:number;known?:boolean;source?:string}={}){
   let cues:LyricCandidate['cues']=[],timing:LyricCandidate['timing']='plain',plainText='';const notes:string[]=[];
   if(typeof raw!=='string'||!raw.trim()||raw.length>340000)return;
   const looksTimed=/^\s*<|^\[\d+:|-->|^\s*[\[{]/m.test(raw);
   try{const parsed=/QrcInfos|LyricContent/.test(raw)?parseQRC(raw,durationMs):parseTimedLyrics(raw,durationMs);cues=parsed.cues;timing=parsed.timing;plainText=cues.map(c=>c.text).join(timing==='word'?' ':'\n');}
   catch{if(looksTimed){return;}else plainText=raw.trim();}
   candidates.push(rankLyrics({id:`${id}-${candidates.length}`,provider:id,title:meta.title||q.title,artist:meta.artist||q.artist,album:meta.album||'',durationMs:meta.durationMs,url:provider.url,timing,cues,plainText:plainText.slice(0,340000),score:0,recommended:false,notes:[...(meta.source?[`Supplied by ${meta.source.slice(0,80)}.`]:[]),...notes]},q,durationMs,meta.known??false));
  }
  try{
   const params={title:q.title,artist:q.artist,album:q.album,duration:durationMs/1000};
   if(id==='lrclib'){
    const data=await get('https://lrclib.net','/api/search',{track_name:q.title,artist_name:q.artist});
    for(const row of (Array.isArray(data)?data:[]).slice(0,20)){if(row.instrumental)continue;add(row.syncedLyrics||row.plainLyrics,{title:row.trackName,artist:row.artistName,album:row.albumName,durationMs:seconds(row.duration),known:true});}
   }else if(id==='unison'){
    const body=await get('https://unison.boidu.dev','/lyrics',q.videoId?{v:q.videoId}:{song:q.title,artist:q.artist,album:q.album,duration:durationMs/1000});
    if(body?.success===true){const rows=Array.isArray(body.data)?body.data:[body.data];for(const row of rows.slice(0,5))if(row)add(row.lyrics,{title:row.song,artist:row.artist,album:row.album,durationMs:seconds(row.duration),known:!!row.song&&!!row.artist});}
   }else if(id==='betterlyrics'||id==='portato'||id==='kugou'){
    const path=id==='portato'?'/qq/getLyrics':id==='kugou'?'/kugou/getLyrics':'/getLyrics';
    const body=await get('https://api.betterlyrics.org',path,{s:q.title,a:q.artist,al:q.album,d:durationMs/1000},'betterlyrics');
    add(body?.ttml||body?.lyrics);
   }else if(id==='lyricsplus'||id==='musixmatch'){
    // One documented service, no mirror rotation or forced cache refresh.
    const body=await get('https://lyricsplus.prjktla.my.id','/v1/ttml/get',{...params,source:id==='musixmatch'?'musixmatch':undefined});
    const metadata=body?.metadata||{};add(typeof body==='string'?body:body?.ttml||body?.lyrics,{title:metadata.title,artist:metadata.artist,album:metadata.album,durationMs:seconds(metadata.duration),known:!!metadata.title&&!!metadata.artist,source:metadata.source});
   }else if(id==='simpmusic'){
    const body=await get('https://api-lyrics.simpmusic.org',q.videoId?`/v1/${q.videoId}`:'/v1/search',q.videoId?{}:{q:`${q.title} ${q.artist}`,limit:5});
    if(body?.success===true)for(const row of (Array.isArray(body.data)?body.data:[]).slice(0,5))add(row.syncedLyrics||row.plainLyrics||row.plainLyric,{title:row.songTitle,artist:row.artistName,album:row.albumName,durationMs:seconds(row.duration),known:!!row.songTitle&&!!row.artistName});
   }else if(id==='binilyrics'){
    const body=await get('https://lyrics.binimum.org','/api/lookup',{track:q.title,artist:q.artist,album:q.album,duration:durationMs/1000});
    if(typeof body==='string'||body?.ttml)add(typeof body==='string'?body:body.ttml);
    else{const rows=Array.isArray(body)?body:body?.results||body?.data||[];for(const row of (Array.isArray(rows)?rows:[]).slice(0,3)){
      const location=row.lyricsUrl||row.ttmlUrl||row.url;let raw=row.ttml;
      if(!raw&&typeof location==='string'){
       const url=new URL(location);const host=url.hostname;
       if(url.protocol!=='https:'||url.username||url.password||url.port||!(['lyrics-api.binimum.org','lyrics.binimum.org','lyrics-storage.binimum.org','lrc.red'].includes(host)))throw Error('Unrecognized BiniLyrics file host. Import its timed file instead.');
       raw=await get(url.origin,url.pathname+url.search);
      }
      add(raw,{title:row.track_name||row.trackName||row.title,artist:row.artist_name||row.artistName||row.artist,album:row.album_name||row.albumName,durationMs:seconds(row.duration),known:!!(row.track_name||row.trackName||row.title)&&!!(row.artist_name||row.artistName||row.artist)});
    }}
   }else if(id.startsWith('paxsenix')){
    if(id==='paxsenix-spotify'){
     const data=await get('https://api.paxsenix.org','/spotify/search',{q:`${q.title} ${q.artist}`},'paxsenix');
     const rows:any[]=[];const collect=(v:any,depth=0)=>{if(depth>8||!v||typeof v!=='object')return;if(!Array.isArray(v)&&typeof v.id==='string'&&(v.name||v.title))rows.push(v);for(const child of Object.values(v))if(child&&typeof child==='object')collect(child,depth+1);};collect(data);
     const tracks=rows.filter(r=>normalize(str(r.name||r.title))===normalize(q.title)&&normalize(Array.isArray(r.artists)?r.artists.map((a:any)=>str(a.name)).join(', '):str(r.artistName)).includes(normalize(q.artist)));const track=tracks.find(r=>Math.abs(Number(r.duration_ms||r.durationMs||0)-durationMs)<=2000)||tracks[0];
     if(track){const body=await get('https://api.paxsenix.org','/lyrics/spotify',{id:track.id},'paxsenix');addPax(body,{title:track.name||track.title,artist:Array.isArray(track.artists)?track.artists.map((a:any)=>a.name).join(', '):track.artistName,durationMs:Number(track.duration_ms||track.durationMs)||undefined});}
    }else{const body=await get('https://api.paxsenix.org',id==='paxsenix-musixmatch'?'/lyrics/musixmatch':'/lyrics/lrcget',id==='paxsenix-musixmatch'?{t:q.title,a:q.artist,d:durationMs/1000}:{q:`${q.title} ${q.artist}`},'paxsenix');addPax(body);}
   }
   function addPax(body:any,meta:any={}){
    if(body?.isError||body?.ok===false||body?.error)return;
    const extract=(v:any,depth=0):string=>{if(depth>6||!v)return '';if(typeof v==='string')return v;for(const k of ['ttml','syncedLyrics','synced','lrc','lyrics','data','text'])if(v[k]){const value=extract(v[k],depth+1);if(value)return value;}return '';};add(extract(body),{...meta,known:!!meta.title&&!!meta.artist});
   }
   result.candidates.push(...candidates);result.sources.push({provider:id,status:candidates.length?'found':'empty',message:candidates.length?`${candidates.length} result${candidates.length===1?'':'s'}`:'No lyrics found. Try another source or recording.'});
  }catch(error){
   if(signal.aborted)throw error;if(candidates.length){result.candidates.push(...candidates);result.sources.push({provider:id,status:'found',message:`${candidates.length} results; additional recordings were unavailable.`});return;}const status=(error as SourceError).status;
   result.sources.push({provider:id,status:status===401||status===403?'key-required':'unavailable',message:status===401||status===403?'Access required or request blocked. Use your source key or import a file.':status===429?'Source rate limit reached. Try later.':status===404?'No matching lyrics found.':'Source unavailable. Try another provider or import a file.'});
  }
 }
 // Bound concurrency, request sizes and timeouts. A failed source does not erase other results.
 let cursor=0;await Promise.all(Array.from({length:Math.min(4,providers.length)},async()=>{while(cursor<providers.length){const provider=providers[cursor++];await source(provider);}}));
 result.candidates.sort((a,b)=>Number(b.recommended)-Number(a.recommended)||b.score-a.score||a.provider.localeCompare(b.provider));
 let budget=0;result.candidates=result.candidates.filter(c=>{const size=JSON.stringify(c).length;budget+=size;return budget<=1500000;}).slice(0,20);
 result.sources.sort((a,b)=>lyricProviders.findIndex(p=>p.id===a.provider)-lyricProviders.findIndex(p=>p.id===b.provider));
 return result;
}
