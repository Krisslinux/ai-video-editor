// Dependency-free research fixture: AVI RGB24 + PCM16, not a product codec choice.
// Usage: node make-fixtures.cjs <output-dir-containing-speech-wavs>
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const out=path.resolve(process.argv[2]||''); if(!process.argv[2])throw Error('Output directory required');
const W=320,H=180,FPS=30,SR=48000,SPF=SR/FPS;
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;};
const chunk=(id,b)=>Buffer.concat([Buffer.from(id),u32(b.length),b,...(b.length%2?[Buffer.alloc(1)]:[])]);
const list=(id,a)=>chunk('LIST',Buffer.concat([Buffer.from(id),...a]));
const riff=(id,a)=>chunk('RIFF',Buffer.concat([Buffer.from(id),...a]));
function save(name,b){const p=path.join(out,name);if(fs.existsSync(p))throw Error('Refusing overwrite: '+p);fs.writeFileSync(p,b);}
function waveData(name){
 const b=fs.readFileSync(path.join(out,name+'.wav'));let fmt,data;
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Not WAV');
 for(let p=12;p+8<=b.length;){const n=b.readUInt32LE(p+4),id=b.toString('ascii',p,p+4);if(id==='fmt ')fmt=b.subarray(p+8,p+8+n);if(id==='data')data=b.subarray(p+8,p+8+n);p+=8+n+(n%2);}
 if(!fmt||!data||fmt.readUInt16LE(0)!==1||fmt.readUInt16LE(2)!==1||fmt.readUInt32LE(4)!==SR||fmt.readUInt16LE(14)!==16)throw Error('Speech must be mono PCM16 48kHz');
 return data;
}
const words=['one','two','three','four','five','six']; const speech=words.map(waveData);
const glyphs={
'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],
'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],
'9':['111','101','111','001','111'],'A':['010','101','111','101','101'],'B':['110','101','110','101','110']};
function frame(label,n,flash){
 const b=Buffer.alloc(W*H*3); for(let p=0;p<b.length;p+=3){b[p]=label==='A'?70:20;b[p+1]=label==='A'?25:70;b[p+2]=25;}
 const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){const p=((H-1-j)*W+i)*3;b[p]=b[p+1]=b[p+2]=c;}};
 rect(0,0,48,48,flash?255:0);
 let x=64;for(const ch of label+String(n).padStart(3,'0')){glyphs[ch].forEach((r,y)=>[...r].forEach((v,z)=>{if(v==='1')rect(x+z*10,60+y*10,10,10,240);}));x+=50;}
 return b;
}
const fmt=Buffer.alloc(16);fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(2,2);fmt.writeUInt32LE(SR,4);fmt.writeUInt32LE(SR*4,8);fmt.writeUInt16LE(4,12);fmt.writeUInt16LE(16,14);
function audio(seconds,cues,markers){
 const b=Buffer.alloc(seconds*SR*4),spans=[];
 cues.forEach((t,k)=>{const d=speech[k],start=Math.round(t*SR);if(start+d.length/2>seconds*SR)throw Error('Speech overflow');
 let first=null,last=null;for(let i=0;i<d.length/2;i++){const v=d.readInt16LE(i*2);b.writeInt16LE(v,(start+i)*4+2);if(Math.abs(v)>64){if(first===null)first=i;last=i;}}
 spans.push({word:words[k],scheduled_sample:start,pcm_samples:d.length/2,detected_start_sample:first===null?null:start+first,detected_end_sample:last===null?null:start+last+1,threshold:64});
 });
 markers.forEach(f=>{for(let j=0;j<48;j++)b.writeInt16LE(j%2? -24000:24000,(f*SPF+j)*4);});
 return {b,spans};
}
function avi(label,seconds,cues,markers){
 const N=seconds*FPS,{b:pcm,spans}=audio(seconds,cues,markers),vh=Buffer.alloc(56),ah=Buffer.alloc(56),avih=Buffer.alloc(56),bi=Buffer.alloc(40);
 [Math.round(1e6/FPS),W*H*3*FPS+SR*4,0,16,N,0,2,W*H*3,W,H].forEach((n,i)=>avih.writeUInt32LE(n,i*4));
 vh.write('vids');vh.write('DIB ',4);vh.writeUInt32LE(1,20);vh.writeUInt32LE(FPS,24);vh.writeUInt32LE(N,32);vh.writeUInt32LE(W*H*3,36);vh.writeUInt32LE(0xffffffff,40);vh.writeInt16LE(W,52);vh.writeInt16LE(H,54);
 bi.writeUInt32LE(40,0);bi.writeInt32LE(W,4);bi.writeInt32LE(H,8);bi.writeUInt16LE(1,12);bi.writeUInt16LE(24,14);bi.writeUInt32LE(W*H*3,20);
 ah.write('auds');ah.writeUInt32LE(4,20);ah.writeUInt32LE(SR*4,24);ah.writeUInt32LE(seconds*SR,32);ah.writeUInt32LE(SPF*4,36);ah.writeUInt32LE(0xffffffff,40);ah.writeUInt32LE(4,44);
 const hd=list('hdrl',[chunk('avih',avih),list('strl',[chunk('strh',vh),chunk('strf',bi)]),list('strl',[chunk('strh',ah),chunk('strf',fmt)])]);
 const chunks=[],index=[];let offset=4;
 for(let f=0;f<N;f++)for(const [id,data] of [['00db',frame(label,f,markers.includes(f))],['01wb',pcm.subarray(f*SPF*4,(f+1)*SPF*4)]]){
  const c=chunk(id,data);chunks.push(c);index.push(Buffer.concat([Buffer.from(id),u32(16),u32(offset),u32(data.length)]));offset+=c.length;
 }
 save('clip-'+label+'.avi',riff('AVI ',[hd,list('movi',chunks),chunk('idx1',Buffer.concat(index))]));
 save('clip-'+label+'-audio.wav',riff('WAVE',[chunk('fmt ',fmt),chunk('data',pcm)]));
 return {file:'clip-'+label+'.avi',seconds,frames:N,frame_rate:{num:FPS,den:1},width:W,height:H,video:'uncompressed RGB24 DIB bottom-up',sample_rate:SR,channels:2,audio:'PCM signed 16-bit LE',left:'click markers only',right:'speech only',markers:markers.map(f=>({frame:f,sample:f*SPF,seconds:f/FPS})),speech:spans,silent_gaps:spans.slice(1).map((s,i)=>({from_sample:spans[i].detected_end_sample,to_sample:s.detected_start_sample,duration_seconds:(s.detected_start_sample-spans[i].detected_end_sample)/SR}))};
}
const clips=[avi('A',12,[0.5,2,4.5,6.5,8.5,10],[3,180,345]),avi('B',8,[0.5,1.5,2.5,4.5,5.5,6.5],[3,120,225])];
const music=Buffer.alloc(20*SR*4);for(let i=0;i<20*SR;i++){const gain=Math.min(1,i/SR,(20*SR-1-i)/SR);const v=Math.round(gain*1100*(Math.sin(2*Math.PI*220*i/SR)+0.5*Math.sin(2*Math.PI*330*i/SR)));music.writeInt16LE(v,i*4);music.writeInt16LE(v,i*4+2);}
save('music.wav',riff('WAVE',[chunk('fmt ',fmt),chunk('data',music)]));
const files=fs.readdirSync(out).filter(n=>/\.(avi|wav)$/.test(n)).map(name=>{const b=fs.readFileSync(path.join(out,name));return {name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};});
save('manifest.json',Buffer.from(JSON.stringify({kind:'synthetic-source-fixtures',not_descript_exports:true,clips,music:{file:'music.wav',seconds:20,sample_rate:SR,channels:2},files,limitations:['Descript AVI import compatibility is untested.','Detected speech boundaries use PCM amplitude threshold, not phoneme alignment.','A/V export and caption error require independent decoding after Descript tests.']},null,2)));
console.log(JSON.stringify({created:clips.map(c=>c.file).concat('music.wav','manifest.json'),output:out}));