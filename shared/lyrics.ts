import {parseTimedLyrics} from './lyric-import.ts';
import type {LyricLookup,LyricAttribution} from './lyric-sources.ts';
import type {Transcript} from './types.ts';
export const lyricThemes=[
 {id:'rose',name:'Rose noir',bg:'#080809',flower:'#FF594C',stem:'#6C7EFF',line:'#FFB4A8',text:'#FFFFFF'},
 {id:'paper',name:'Paper',bg:'#F3EEE4',flower:'#E13E28',stem:'#354575',line:'#C36753',text:'#171B19'},
 {id:'midnight',name:'Midnight',bg:'#0D1B4C',flower:'#FF766B',stem:'#9FB4FF',line:'#FFD6CF',text:'#FFFFFF'},
 {id:'citrus',name:'Citrus',bg:'#0E1A12',flower:'#FFA13D',stem:'#5BCB94',line:'#FFE2B8',text:'#FFF6E8'},
 {id:'orchid',name:'Orchid',bg:'#140A1F',flower:'#E978FF',stem:'#50CDBD',line:'#F9D1FF',text:'#FFFFFF'},
 {id:'moss',name:'Moss',bg:'#133A2A',flower:'#FFB7C5',stem:'#7FD18B',line:'#FFFFFF',text:'#F6F1E7'},
 {id:'tomato',name:'Tomato',bg:'#FF3A25',flower:'#FFF1E0',stem:'#151515',line:'#6C180E',text:'#121212'},
 {id:'butter',name:'Butter',bg:'#FFE9A8',flower:'#C61938',stem:'#0F5132',line:'#97372F',text:'#1A1A1A'},
 {id:'blush',name:'Blush',bg:'#FAD4D8',flower:'#C8102E',stem:'#274690',line:'#A03D4B',text:'#1A1A1A'},
 {id:'mono',name:'Mono',bg:'#090909',flower:'#F2F2F2',stem:'#888888',line:'#BBBBBB',text:'#FFFFFF'}
] as const;
export type LyricTheme=typeof lyricThemes[number]['id'];
export const lyricMotions=['breathe','grow','typed','wind','reach','scatter','visit'] as const;
export type LyricMotion=typeof lyricMotions[number];
export type LyricSettings={songId:string;source:'auto'|'manual';theme:'auto'|LyricTheme;motion:LyricMotion;offsetMs:number;cues:Transcript[];timing:'word'|'line';lookup?:LyricLookup;attribution?:LyricAttribution};
export type LyricComposition={songId:string;durationMs:number;cues:Transcript[];theme:LyricTheme;motion:LyricMotion;timing:'word'|'line';energy:number;themeReason:string};
export const lyricDefaults:LyricSettings={songId:'',source:'auto',theme:'auto',motion:'breathe',offsetMs:0,cues:[],timing:'word'};
export const lyricLimitMs=480000;
export function checkCues(cues:Transcript[],durationMs:number){
 if(!Array.isArray(cues)||!cues.length||cues.length>2000)throw Error('Add 1–2,000 timed lyric cues.');
 let previous=-1;
 for(const c of cues){if(!Number.isInteger(c.startMs)||!Number.isInteger(c.endMs)||c.startMs<0||c.endMs<=c.startMs||c.endMs>durationMs||c.startMs<previous||typeof c.text!=='string'||!c.text.trim()||c.text.length>160||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(c.text))throw Error('Lyrics need ordered, non-empty cues with start < end inside the song.');previous=c.endMs;}
 return cues.map(c=>({...c,text:c.text.trim()}));
}
export function shiftCues(cues:Transcript[],offsetMs:number,durationMs:number){return checkCues(cues.map(c=>({...c,startMs:c.startMs+offsetMs,endMs:c.endMs+offsetMs})),durationMs);}
export function chooseTheme(energy:number):{theme:LyricTheme;reason:string}{return energy>.16?{theme:'rose',reason:'Higher measured audio energy → Rose noir. A starting palette; choose another if it suits your song better.'}:energy>.065?{theme:'midnight',reason:'Moderate measured audio energy → Midnight. A starting palette; mood is yours to decide.'}:{theme:'moss',reason:'Lower measured audio energy → Moss. A gentle starting palette; choose another to match your song.'};}
// Timestamped imports never invent word alignment. LRC and TSV entries are whole-line cues.
export const importLyrics=parseTimedLyrics;
export function lyricPages(cues:Transcript[],timing:'word'|'line'){
 if(timing==='line')return cues.map(c=>[c]);const pages:Transcript[][]=[];let page:Transcript[]=[];
 for(const c of cues){const last=page.at(-1);if(page.length&&(page.length>=6||c.startMs-last!.endMs>650||page.map(x=>x.text).join(' ').length+c.text.length>48)){pages.push(page);page=[];}page.push(c);if(/[.!?…]$/.test(c.text)){pages.push(page);page=[];}}if(page.length)pages.push(page);return pages;
}
export function pageAt(pages:Transcript[][],timeMs:number){return pages.find(p=>timeMs>=p[0].startMs&&timeMs<Math.min((p.at(-1)!.endMs+450),pages[pages.indexOf(p)+1]?.[0].startMs??Infinity));}
