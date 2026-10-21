import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {command} from '../server/media.ts';
const dest=path.resolve(process.argv[2]||'test-data/fixtures');await mkdir(dest,{recursive:true});
for(const [name,color,freq]of [['clip-a','0x354f36','1000'],['clip-b','0x394b62','1400']]){
 const vf=`drawbox=x=0:y=0:w=40:h=40:color=white:t=fill:enable='eq(mod(n,30),12)',drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${name} FRAME %{n}':x=65:y=130:fontcolor=white:fontsize=25`;
 const audio=`aevalsrc='if(lt(mod(t,1),0.42)*gt(mod(t,1),0.4),0.7*sin(2*PI*${freq}*t),0)':s=48000:d=3`;
 await command('ffmpeg',['-v','error','-y','-f','lavfi','-i',`color=c=${color}:s=640x360:r=30:d=3`,'-f','lavfi','-i',audio,'-vf',vf,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-threads','2',path.join(dest,name+'.mp4')]);
}
await command('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=220:sample_rate=44100:duration=6','-af','volume=0.15','-c:a','pcm_s16le',path.join(dest,'music.wav')]);
await command('ffmpeg',['-v','error','-y','-f','lavfi','-i',"flite=text='This is the first sentence.       This is the second sentence.':voice=slt",'-ar','16000',path.join(dest,'voice.wav')]);
console.log('Synthetic fixtures generated: numbered frames, flash/click markers, speech and music.');
