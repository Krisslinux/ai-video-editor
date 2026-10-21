import {lyricThemes,lyricPages,pageAt} from './lyrics.ts';
import type {LyricComposition} from './lyrics.ts';
import type {Transcript} from './types.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
type Ctx=CanvasRenderingContext2D;
// Stateless audio-time rendering: seeking, browser preview and native export use the same clock.
export function drawLyrics(ctx:Ctx,width:number,height:number,composition:LyricComposition,timeMs:number,pages:Transcript[][]=lyricPages(composition.cues,composition.timing),reduced=false){
 const palette=lyricThemes.find(t=>t.id===composition.theme)!;ctx.save();ctx.fillStyle=palette.bg;ctx.fillRect(0,0,width,height);
 const page=pageAt(pages,timeMs);const short=Math.min(width,height);const motion=composition.motion;
 // Quiet framing; the song stays visually empty during instrumental passages.
 ctx.strokeStyle=palette.stem;ctx.globalAlpha=.28;ctx.lineWidth=Math.max(1,short*.0012);
 const margin=short*.065;ctx.beginPath();ctx.moveTo(margin,margin+short*.035);ctx.lineTo(margin,margin);ctx.lineTo(margin+short*.035,margin);ctx.moveTo(width-margin-short*.035,height-margin);ctx.lineTo(width-margin,height-margin);ctx.lineTo(width-margin,height-margin-short*.035);ctx.stroke();ctx.globalAlpha=1;
 if(!page){ctx.restore();return;}
 const first=page[0].startMs,last=page.at(-1)!.endMs;const fade=clamp((last+450-timeMs)/300);const age=Math.max(0,timeMs-first);const entry=reduced?1:ease(age/420);
 const words=composition.timing==='word'?page:page[0].text.split(/\s+/).map(text=>({...page[0],text}));
 let font=short*(width<height?.105:.11);let lines:{cue:Transcript;width:number}[][]=[];
 const maxWidth=width*.80;
 for(let tries=0;tries<8;tries++){
  ctx.font=`700 ${font}px "Playfair Display"`;lines=[[]];let lineWidth=0;
  for(const cue of words){const w=ctx.measureText(cue.text).width;if(lineWidth+w>maxWidth&&lines.at(-1)!.length){lines.push([]);lineWidth=0;}lines.at(-1)!.push({cue,width:w});lineWidth+=w+font*.25;}
  if(lines.length<=3&&lines.every(line=>line.every(w=>w.width<=maxWidth)))break;font*=.83;
 }
 const lineHeight=font*1.22;const baseY=height*.52-(lines.length-1)*lineHeight/2;
 ctx.textBaseline='alphabetic';
 for(let row=0;row<lines.length;row++){
  const line=lines[row];const fullWidth=line.reduce((s,w)=>s+w.width,0)+(line.length-1)*font*.25;let x=(width-fullWidth)/2;
  for(let i=0;i<line.length;i++){
   const {cue,width:w}=line[i];const active=timeMs>=cue.startMs&&timeMs<cue.endMs;const sung=timeMs>=cue.startMs;const localAge=Math.max(0,timeMs-cue.startMs);const reveal=motion==='typed'?(sung?1:0):1;
   let dy=0,dx=0,scale=1;
   if(!reduced){if(motion==='breathe')scale=1+(active?.018*Math.sin(clamp(localAge/600)*Math.PI):0);if(motion==='wind')dy=Math.sin(timeMs/1100+i*.7+row)*font*.035;if(motion==='grow'||motion==='reach')dy=(1-entry)*font*(motion==='reach'?.5:.25);if(motion==='scatter'){dy=(1-entry)*(i%2?1:-1)*font*.5;dx=(1-entry)*(i-line.length/2)*font*.25;}}
   const y=baseY+row*lineHeight+dy;ctx.globalAlpha=fade*reveal*(sung?1:.32);ctx.fillStyle=palette.text;ctx.save();ctx.translate(x+w/2+dx,y);ctx.scale(scale,scale);ctx.fillText(cue.text,-w/2,0);ctx.restore();ctx.globalAlpha=1;
   if(sung&&reveal){const bloom=reduced?1:ease(localAge/(motion==='grow'?850:500));const stemHeight=font*(.75+((i+row)%3)*.16)*bloom;const sx=x+w*.5+dx,sy=y+font*.12;const sway=reduced?0:Math.sin(timeMs/1500+i*1.3)*font*.09;const tx=sx+sway,ty=sy+stemHeight;
    ctx.globalAlpha=fade*.86;ctx.lineWidth=Math.max(1.5,short*.003);ctx.strokeStyle=palette.stem;ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+font*.12,sy+stemHeight*.3,tx-font*.08,ty-stemHeight*.25,tx,ty);ctx.stroke();
    ctx.fillStyle=palette.stem;ctx.beginPath();ctx.ellipse(sx+font*.09,sy+stemHeight*.48,font*.12*bloom,font*.04*bloom,-.65,0,Math.PI*2);ctx.fill();
    const radius=font*.085*bloom;ctx.fillStyle=palette.flower;for(let petal=0;petal<5;petal++){const angle=petal*Math.PI*2/5+(motion==='visit'&&!reduced?timeMs/11000:0);ctx.beginPath();ctx.ellipse(tx+Math.cos(angle)*radius,ty+Math.sin(angle)*radius,radius*.9,radius*.55,angle,0,Math.PI*2);ctx.fill();}ctx.fillStyle=palette.line;ctx.beginPath();ctx.arc(tx,ty,radius*.42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   }
   x+=w+font*.25;
  }
 }
 ctx.restore();
}
