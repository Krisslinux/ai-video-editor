import {handle} from './application.ts';
import type {Runtime} from './ports.ts';
import {html,assets} from './static.generated.ts';
export default {async fetch(request:Request,env:any):Promise<Response>{
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/')){const file=assets[url.pathname];return new Response(file?.body||html,{headers:{'content-type':file?.type||'text/html; charset=utf-8','x-content-type-options':'nosniff','cache-control':file?'public, max-age=86400':'no-store'}});}
 const limits={fileBytes:512*1024**2,outputBytes:96*1024**2,userBytes:2048*1024**2,seconds:1800,assets:24,jobs:2,calls:8,renders:20,retention:30};
 const rt:Runtime={db:{get:(s,...a)=>env.DB.prepare(s).bind(...a).first(),all:async(s,...a)=>(await env.DB.prepare(s).bind(...a).all()).results,run:async(s,...a)=>({changes:(await env.DB.prepare(s).bind(...a).run()).meta.changes}),batch:async ss=>{await env.DB.batch(ss.map(x=>env.DB.prepare(x.sql).bind(...x.args)));}},objects:{
  put:async(k,b,type)=>{await env.BUCKET.put(k,b,{httpMetadata:{contentType:type||'application/octet-stream'}});},get:async(k,range)=>{const o=await env.BUCKET.get(k,range?{range}:undefined);return o?{body:o.body,size:o.size}:null;},delete:async k=>{await env.BUCKET.delete(k);},deletePrefix:async prefix=>{let cursor:string|undefined;do{const list=await env.BUCKET.list({prefix,cursor});if(list.objects.length)await env.BUCKET.delete(list.objects.map((o:any)=>o.key));cursor=list.truncated?list.cursor:undefined;}while(cursor);}
 },key:env.ENCRYPTION_KEY,workerToken:env.WORKER_TOKEN,origin:url.origin,production:true,hosted:true,limits,identity:r=>{const id=r.headers.get('oai-authenticated-user-id'),email=r.headers.get('oai-authenticated-user-email');return id?{id,email:email||`${id}@site.local`}:null;}};
 if(!rt.key||!rt.workerToken)return Response.json({error:'The operator has not finished secure server configuration.'},{status:503});
 const result=await handle(request,rt);result.headers.set('x-content-type-options','nosniff');result.headers.set('cache-control','no-store');return result;
}};
