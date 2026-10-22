import express from 'express';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,stat,rm,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {handle} from './application.ts';
import {all,one,run,transaction} from './db.ts';
import {dataDir,encryptionKey,production,limits,origin} from './config.ts';
import type {Runtime} from './ports.ts';
const objectPath=(key:string)=>{if(key.split('/').some(s=>s==='..')||key.startsWith('/'))throw Error('Invalid object key');return path.join(dataDir,'objects',key);};
const rt:Runtime={db:{get:async(s,...a)=>one(s,...a),all:async(s,...a)=>all(s,...a),run:async(s,...a)=>({changes:Number(run(s,...a).changes)}),batch:async statements=>transaction(()=>{for(const s of statements)run(s.sql,...s.args);})},objects:{
 async put(key,body){const dest=objectPath(key);await mkdir(path.dirname(dest),{recursive:true});const tmp=dest+'.'+randomBytes(8).toString('hex')+'.tmp';try{await pipeline(body instanceof Uint8Array?Readable.from([body]):Readable.fromWeb(body as any),createWriteStream(tmp,{mode:0o600}));await rename(tmp,dest);}catch(e){await rm(tmp,{force:true});throw e;}},
 async get(key,range){try{const file=objectPath(key),s=await stat(file);return {size:s.size,body:Readable.toWeb(createReadStream(file,range?{start:range.offset,end:range.offset+range.length-1}:{})) as ReadableStream<Uint8Array>};}catch{return null;}},
 async delete(key){await rm(objectPath(key),{force:true});},async deletePrefix(prefix){await rm(objectPath(prefix),{recursive:true,force:true});}
},key:encryptionKey.toString('hex'),workerToken:process.env.WORKER_TOKEN||'development-worker-token',origin,production,hosted:false,limits,inviteCode:process.env.INVITE_CODE,identity:!production&&process.env.DEV_PREVIEW_AUTH==='1'?()=>({id:'preview-creator',email:'creator@preview.local'}):undefined};
if(production&&!process.env.WORKER_TOKEN)throw Error('Production requires WORKER_TOKEN.');
const app=express();app.disable('x-powered-by');
app.use('/api',async(req,res)=>{try{const requestUrl=new URL(req.originalUrl,origin);const init:any={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}const result=await handle(new Request(requestUrl,init),rt);if(!req.readableEnded)req.resume();res.status(result.status);for(const [k,v]of result.headers)res.setHeader(k,v);res.setHeader('x-content-type-options','nosniff');if(!res.hasHeader('cache-control'))res.setHeader('cache-control','no-store');if(result.body)await pipeline(Readable.fromWeb(result.body as any),res);else res.end();}catch{if(!res.headersSent)res.status(500).json({error:'Request failed.'});else res.end();}});
app.use(express.static(path.resolve('dist'),{index:false}));app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Frameflow API ready.'));server.keepAliveTimeout=65000;server.headersTimeout=66000;
