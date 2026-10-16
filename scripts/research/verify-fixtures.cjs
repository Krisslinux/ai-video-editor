// Read actual AVI chunks, headers and PCM samples; never treats these as Descript exports.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(process.argv[2]||'');if(!process.argv[2])throw Error('Fixture directory required');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
function chunks(b,start,end){const a=[];for(let p=start;p<end;){if(p+8>end)throw Error('Short chunk');const id=b.toString('ascii',p,p+4),size=b.readUInt32LE(p+4),data=p+8;if(data+size>end)throw Error('Chunk exceeds parent');a.push({id,size,data,start:p});p=data+size+(size%2);}return a;}
const results=[];
for(const clip of manifest.clips){
 const b=fs.readFileSync(path.join(dir,clip.file));if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='AVI '||b.readUInt32LE(4)+8!==b.length)throw Error('RIFF header invalid');
 const top=chunks(b,12,b.length),hd=top.find(c=>c.id==='LIST'&&b.toString('ascii',c.data,c.data+4)==='hdrl'),mov=top.find(c=>c.id==='LIST'&&b.toString('ascii',c.data,c.data+4)==='movi'),idx=top.find(c=>c.id==='idx1');
 const headers=chunks(b,hd.data+4,hd.data+hd.size),avih=headers.find(c=>c.id==='avih');
 const streams=headers.filter(c=>c.id==='LIST').map(c=>chunks(b,c.data+4,c.data+c.size));
 const vh=streams[0].find(c=>c.id==='strh'),vf=streams[0].find(c=>c.id==='strf'),af=streams[1].find(c=>c.id==='strf');
 const fps=b.readUInt32LE(vh.data+24)/b.readUInt32LE(vh.data+20),width=b.readInt32LE(vf.data+4),height=b.readInt32LE(vf.data+8),sr=b.readUInt32LE(af.data+4),align=b.readUInt16LE(af.data+12);
 if(b.readUInt32LE(vf.data+16)!==0||b.readUInt16LE(vf.data+14)!==24||align!==4||b.readUInt16LE(af.data)!==1)throw Error('Unsupported fixture encoding');
 const media=chunks(b,mov.data+4,mov.data+mov.size),video=media.filter(c=>c.id==='00db'),pcm=Buffer.concat(media.filter(c=>c.id==='01wb').map(c=>b.subarray(c.data,c.data+c.size)));
 if(video.length!==b.readUInt32LE(avih.data+16)||video.length!==clip.frames||idx.size!==media.length*16)throw Error('Frame/index count mismatch');
 for(let p=idx.data;p<idx.data+idx.size;p+=16){const q=mov.data+b.readUInt32LE(p+8);if(b.toString('ascii',p,p+4)!==b.toString('ascii',q,q+4)||b.readUInt32LE(p+12)!==b.readUInt32LE(q+4))throw Error('Index does not resolve');}
 const flashes=video.flatMap((c,i)=>{const p=c.data+(height-1-10)*width*3+10*3;return b[p]>250&&b[p+1]>250&&b[p+2]>250?[i]:[];});
 const clicks=[];let active=false;for(let s=0;s<pcm.length/align;s++){const hit=Math.abs(pcm.readInt16LE(s*align))>12000;if(hit&&!active)clicks.push(s);active=hit;}
 if(flashes.length!==clicks.length||flashes.length!==clip.markers.length)throw Error('Marker count mismatch');
 const offsets=flashes.map((frame,i)=>({frame,audio_sample:clicks[i],offset_ms:1000*(clicks[i]/sr-frame/fps)}));
 if(offsets.some((o,i)=>o.frame!==clip.markers[i].frame||o.audio_sample!==clip.markers[i].sample||Math.abs(o.offset_ms)>1e-6))throw Error('Source marker mismatch');
 results.push({file:clip.file,frames:video.length,fps,audio_samples:pcm.length/align,sample_rate:sr,duration_seconds:video.length/fps,index_entries:idx.size/16,markers:offsets});
}
for(const f of manifest.files){const b=fs.readFileSync(path.join(dir,f.name));if(b.length!==f.bytes||crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Hash mismatch '+f.name);}
const result={scope:'synthetic source files only; not Descript exports',verified:true,results,interpretation:'0 ms source marker offsets measured from uncompressed frame positions and PCM samples. Exported codecs require independent decoding and PTS/encoder-delay handling.',uncertainty:'Source sample grid 1/48000 s; source frame grid 1/30 s. Visual onset comparison after export has at least half-frame quantization (16.667 ms).'};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));