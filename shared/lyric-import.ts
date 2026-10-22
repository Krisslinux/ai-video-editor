import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {checkCues} from './lyrics.ts';
import type {Transcript} from './types.ts';

export type TimedLyrics={cues:Transcript[];timing:'word'|'line'};
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
export function lyricTime(s:string):number{
 const value=s.trim();if(/^\d+(?:\.\d+)?ms$/.test(value))return Math.round(parseFloat(value));
 if(/^\d+(?:\.\d+)?s?$/.test(value))return Math.round(parseFloat(value)*1000);
 if(!/^(?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d+)?$/.test(value))throw Error('Unsupported lyric timestamp.');
 const parts=value.replace(',','.').split(':').map(Number);if(parts.at(-1)!>=60||parts.length===3&&parts[1]>=60)throw Error('Invalid lyric timestamp.');
 return Math.round(parts.reduce((n,p)=>n*60+p,0)*1000);
}
function checked(cues:Transcript[],timing:'word'|'line',durationMs:number):TimedLyrics{return {cues:checkCues(cues,durationMs),timing};}

// Preserve word/syllable boundaries in the original XML. No DTDs or external entities.
function xml(text:string):any[]{
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Lyric XML must not contain a DTD or entity declaration.');
 if(XMLValidator.validate(text)!==true)throw Error('Invalid timed lyric XML.');
 return new XMLParser({preserveOrder:true,ignoreAttributes:false,trimValues:false,parseTagValue:false,processEntities:true,maxNestedTags:32}).parse(text);
}
const tag=(n:any)=>Object.keys(n).find(k=>k!==':@'&&k!=='#text'&&!k.startsWith('?'))||'';
const local=(s:string)=>s.split(':').at(-1)!;
const attrs=(n:any)=>n[':@']||{};
const attr=(n:any,key:string):string|undefined=>Object.entries(attrs(n)).find(([k])=>local(k.replace(/^@_/,''))===key)?.[1] as string|undefined;
function rawText(nodes:any[]):string{return nodes.map(n=>n['#text']!==undefined?String(n['#text']):rawText(n[tag(n)]||[])).join('');}
export function parseTTML(text:string,durationMs:number):TimedLyrics{
 const root=xml(text);if(!root.some(n=>local(tag(n))==='tt'))throw Error('Expected a TTML document.');const lines:{line:Transcript;words:Transcript[]}[]=[];
 function walk(nodes:any[],inBody=false,parentStart=0,parentEnd=durationMs,parentTimed=false){
  for(const n of nodes){const key=tag(n);if(!key)continue;const name=local(key);if(name==='head')continue;const body=inBody||name==='body';
   const start=attr(n,'begin')===undefined?parentStart:lyricTime(attr(n,'begin')!);const end=attr(n,'end')!==undefined?lyricTime(attr(n,'end')!):attr(n,'dur')!==undefined?start+lyricTime(attr(n,'dur')!):parentEnd;
   if(name==='p'&&body){
    const words:Transcript[]=[],pieces:{text:string;startMs:number;endMs:number;boundary:boolean}[]=[];let plain='';let boundary=true;
    function spans(children:any[]){for(const c of children){if(c['#text']!==undefined){const s=String(c['#text']);plain+=s;if(/\s/.test(s))boundary=true;continue;}const k=tag(c);if(!k)continue;const role=attr(c,'role');if(role==='x-bg'||role==='x-translation'||role==='x-roman')continue;
      if(local(k)==='br'){plain+=' ';boundary=true;continue;}const inner=c[k]||[],t=rawText(inner);const begin=attr(c,'begin'),finish=attr(c,'end');
      if(begin!==undefined&&finish!==undefined&&!inner.some((x:any)=>tag(x)&&attr(x,'begin')!==undefined)){plain+=t;pieces.push({text:t,startMs:lyricTime(begin),endMs:lyricTime(finish),boundary:boundary||/^\s/.test(t)});boundary=/\s$/.test(t);}else spans(inner);
    }}spans(n[key]);
    for(const p of pieces){if(!p.text.trim())continue;const previous=words.at(-1);if(previous&&!p.boundary&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(previous.text+p.text)){previous.text+=p.text.trim();previous.endMs=p.endMs;}else words.push({startMs:p.startMs,endMs:p.endMs,text:p.text.trim()});}
    const value=clean(plain);const timed=parentTimed||attr(n,'begin')!==undefined&&(attr(n,'end')!==undefined||attr(n,'dur')!==undefined);if(value&&!words.length&&!timed)throw Error('TTML line has no supplied timing.');if(value)lines.push({line:{startMs:start,endMs:end,text:value},words});
   }else walk(n[key]||[],body,start,end,parentTimed||attr(n,'begin')!==undefined&&(attr(n,'end')!==undefined||attr(n,'dur')!==undefined));
  }
 }walk(root);
 if(!lines.length)throw Error('No timed lyrics found in TTML.');
 // Fall back to the supplied line timing when only some lines have word timestamps.
 if(lines.every(l=>l.words.length))return checked(lines.flatMap(l=>l.words),'word',durationMs);
 return checked(lines.map(l=>l.line),'line',durationMs);
}
export function parseQRC(text:string,durationMs:number):TimedLyrics{
 let content=text;if(text.trim().startsWith('<')){const root=xml(text);const find=(nodes:any[]):string=>{for(const n of nodes){const a=attr(n,'LyricContent');if(a!==undefined)return a;const nested=find(n[tag(n)]||[]);if(nested)return nested;}return '';};content=find(root);}
 const cues:Transcript[]=[];for(const line of content.split(/\r?\n/)){if(!/^\[\d+,\d+\]/.test(line))continue;const rest=line.replace(/^\[\d+,\d+\]/,'');for(const m of rest.matchAll(/([^()]+)\((\d+),(\d+)\)/g)){const value=clean(m[1]);if(value)cues.push({text:value,startMs:Number(m[2]),endMs:Number(m[2])+Number(m[3])});}}
 return checked(cues,'word',durationMs);
}
export function parseLRC(text:string,durationMs:number):TimedLyrics{
 const entries:{startMs:number;text:string}[]=[];const offset=Number(text.match(/^\[offset:([+-]?\d+)\]/im)?.[1]||0);
 for(const line of text.split(/\r?\n/)){const stamps=[...line.matchAll(/\[(\d+:\d{2}(?:\.\d{1,3})?)\]/g)];if(!stamps.length){if(!line.trim()||/^\[[a-z][\w-]*:.*\]$/i.test(line.trim()))continue;throw Error('Invalid LRC entry.');}
  const value=line.slice(stamps.at(-1)!.index!+stamps.at(-1)![0].length).trim();for(const m of stamps)entries.push({startMs:lyricTime(m[1])+offset,text:value});}
 entries.sort((a,b)=>a.startMs-b.startMs);const cues:Transcript[]=[];let word=false,lineOnly=false;
 for(let i=0;i<entries.length;i++){const e=entries[i],endMs=entries[i+1]?.startMs??durationMs;if(!e.text)continue;
  const parts=[...e.text.matchAll(/<(\d+:\d{2}(?:\.\d{1,3})?)>([^<]*)/g)];
  if(parts.length){word=true;for(let j=0;j<parts.length;j++){const value=clean(parts[j][2]);if(value)cues.push({text:value,startMs:lyricTime(parts[j][1])+offset,endMs:parts[j+1]?lyricTime(parts[j+1][1])+offset:endMs});}}
  else{lineOnly=true;cues.push({startMs:e.startMs,endMs,text:e.text});}
 }
 if(word&&lineOnly)throw Error('Mixed word and line LRC needs manual timing.');
 return checked(cues,word?'word':'line',durationMs);
}
function parseCaptions(text:string,durationMs:number):TimedLyrics{
 const cues:Transcript[]=[];for(const block of text.replace(/^\uFEFF/,'').split(/\r?\n\s*\r?\n/)){const lines=block.split(/\r?\n/),i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const m=lines[i].match(/^(\S+)\s+-->\s+(\S+)/);if(!m)throw Error('Invalid caption timestamps.');const value=clean(lines.slice(i+1).join(' ').replace(/<[^>]*>/g,''));if(value)cues.push({startMs:lyricTime(m[1]),endMs:lyricTime(m[2]),text:value});}return checked(cues,'line',durationMs);
}
export function parseTimedLyrics(text:string,durationMs:number):TimedLyrics{
 if(text.length>340000)throw Error('Lyric file must be under 340 KB.');const trimmed=text.trim();
 if(trimmed.startsWith('<'))return /QrcInfos|LyricContent/.test(trimmed)?parseQRC(trimmed,durationMs):parseTTML(trimmed,durationMs);
 if(trimmed.includes('-->'))return parseCaptions(trimmed,durationMs);
 if(trimmed.startsWith('{')||trimmed.startsWith('[')&&!/^\[(?:\d+:|[a-z][\w-]*:)/i.test(trimmed)){let parsed;try{parsed=JSON.parse(trimmed);}catch{throw Error('Invalid lyric JSON.');}return checked(Array.isArray(parsed)?parsed:parsed.cues,parsed.timing==='word'?'word':'line',durationMs);}
 if(/^\[\d+:\d+/m.test(trimmed))return parseLRC(trimmed,durationMs);
 const cues=trimmed.split(/\r?\n/).filter(l=>l.trim()).map(l=>{const m=l.match(/^(\d+(?:\.\d+)?)\s*[|\t]\s*(\d+(?:\.\d+)?)\s*[|\t]\s*(.+)$/);if(!m)throw Error('Use LRC, TTML, SRT, VTT, lyric JSON, or seconds | seconds | text.');return {startMs:Math.round(Number(m[1])*1000),endMs:Math.round(Number(m[2])*1000),text:m[3]};});return checked(cues,'line',durationMs);
}
