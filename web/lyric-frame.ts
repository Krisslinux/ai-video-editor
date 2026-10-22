import {drawLyrics} from '../shared/lyric-canvas.ts';
import {lyricPages} from '../shared/lyrics.ts';
import type {Plan} from '../shared/types.ts';

async function start(){
 const response=await fetch('./plan.json');if(!response.ok)throw Error('Missing lyric composition.');
 const plan:Plan=await response.json(),canvas=document.querySelector('canvas')!;
 canvas.width=plan.width;canvas.height=plan.height;
 await Promise.all([document.fonts.load('700 48px "Playfair Display"'),document.fonts.load('14px "DM Mono"')]);
 const ctx=canvas.getContext('2d');if(!ctx||!plan.lyrics)throw Error('Invalid lyric composition.');
 const composition=plan.lyrics,pages=lyricPages(composition.cues,composition.timing);
 const seek=(time:number)=>drawLyrics(ctx,plan.width,plan.height,composition,time*1000,pages);
 // HyperFrames owns the clock; no wall-clock animation or frame interpolation.
 (window as any).__hf={duration:Math.round(composition.durationMs*30/1000)/30,seek};
 seek(0);(window as any).__renderReady=true;
}
start().catch(()=>{(window as any).__renderReady=false;});
