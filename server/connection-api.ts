import {z} from 'zod';
import type {Runtime} from './ports.ts';
import type {ConnectionTest,Capability} from '../shared/connection.ts';
import {check,id,unseal} from './web-security.ts';
const json=(data:unknown,status=200)=>Response.json(data,{status});
const parse=(r:any)=>r?JSON.parse(r.data):undefined;
const resultSchema=z.object({capability:z.enum(['editing','vision','lyrics']),status:z.enum(['passed','failed','not-configured']),detail:z.string().max(500)}).strict();
export async function latestTest(rt:Runtime,uid:string,revision?:string):Promise<ConnectionTest|undefined>{if(!revision)return;const row=await rt.db.get('SELECT * FROM connection_tests WHERE user_id=? AND revision=? ORDER BY created_at DESC LIMIT 1',uid,revision);if(!row)return;return {id:row.id,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,...parse(row)};}
export async function beginTest(rt:Runtime,uid:string,revision:string){
 const now=Date.now(),testId=id();await rt.db.run("UPDATE connection_tests SET status='error',data=json_set(data,'$.error','Test interrupted. Previous calls were not replayed.'),updated_at=? WHERE user_id=? AND status IN ('queued','running') AND updated_at<?",now,uid,now-120000);const lock=await rt.db.get('SELECT expires_at FROM locks WHERE id=?','worker');check(lock&&lock.expires_at>now,503,'Video processor unavailable. Connect the processor before testing.');
 const inserted=await rt.db.run("INSERT INTO connection_tests(id,user_id,revision,status,data,created_at,updated_at) SELECT ?,?,?,'queued',?,?,? WHERE NOT EXISTS(SELECT 1 FROM connection_tests WHERE user_id=? AND status IN ('queued','running')) AND (SELECT COUNT(*) FROM connection_tests WHERE user_id=? AND created_at>?)<12",testId,uid,revision,JSON.stringify({results:{},attempts:0,started:[]}),now,now,uid,uid,now-3600000);
 check(inserted.changes,429,'A connection test is active or the hourly test limit was reached.');return json({id:testId},202);
}
export async function claimTest(rt:Runtime){
 const {db}=rt,now=Date.now();await db.run("UPDATE connection_tests SET status='error',data=json_set(data,'$.error','Connection test interrupted. Test again explicitly; calls were not replayed.'),updated_at=? WHERE status='running' AND updated_at<?",now,now-90000);
 const row=await db.get("SELECT * FROM connection_tests WHERE status='queued' ORDER BY created_at LIMIT 1");if(!row)return null;
 const connection=await db.get('SELECT * FROM connections WHERE user_id=?',row.user_id),c=parse(connection);
 if(!c||c.revision!==row.revision){await db.run("UPDATE connection_tests SET status='error',data=json_set(data,'$.error','Settings changed. Save and test the current connection.'),updated_at=? WHERE id=?",now,row.id);return null;}
 const claimed=await db.run("UPDATE connection_tests SET status='running',updated_at=? WHERE id=? AND status='queued'",now,row.id);if(!claimed.changes)return null;
 return {connectionTest:{id:row.id,revision:row.revision},connection:{...c,token:connection.secret?await unseal(connection.secret,rt.key):''}};
}
export async function testWorker(request:Request,rt:Runtime,pathname:string,workerId:string){
 const match=pathname.match(/^\/api\/worker\/connection-tests\/([\w-]+)\/(heartbeat|begin|result|complete)$/);if(!match)return null;
 const {db}=rt,now=Date.now(),row=await db.get('SELECT * FROM connection_tests WHERE id=?',match[1]);check(row,404,'Test not found.');const lease=await db.get('SELECT * FROM locks WHERE id=?','worker');check(lease?.owner===workerId,409,'Processor lease lost.');
 const action=match[2];if(action==='heartbeat'){await db.run('UPDATE locks SET expires_at=? WHERE id=? AND owner=?',now+90000,'worker',workerId);await db.run('UPDATE connection_tests SET updated_at=? WHERE id=?',now,row.id);return json({status:row.status});}
 check(row.status==='running',409,'Test no longer active.');const c=parse(await db.get('SELECT * FROM connections WHERE user_id=?',row.user_id));check(c?.revision===row.revision,409,'Settings changed; test the current connection.');const data=parse(row);
 if(action==='begin'){const b=z.object({capability:z.enum(['editing','vision','lyrics'])}).parse(await request.json());check(!data.started.includes(b.capability)&&data.attempts<3,409,'This test request has already been attempted.');data.started.push(b.capability);data.attempts++;await db.run('UPDATE connection_tests SET data=?,updated_at=? WHERE id=?',JSON.stringify(data),now,row.id);return json({ok:true});}
 if(action==='result'){const b=resultSchema.parse(await request.json());check(b.status==='not-configured'||data.started.includes(b.capability),409,'No reserved test call.');data.results[b.capability]={status:b.status,detail:b.detail,checkedAt:now};await db.run('UPDATE connection_tests SET data=?,updated_at=? WHERE id=?',JSON.stringify(data),now,row.id);return json({ok:true});}
 await db.run("UPDATE connection_tests SET status='complete',updated_at=? WHERE id=?",now,row.id);return json({ok:true});
}
export async function requireCapability(rt:Runtime,uid:string,revision:string|undefined,capability:Capability){const test=await latestTest(rt,uid,revision);check(test?.status==='complete'&&test?.results[capability]?.status==='passed',409,capability==='lyrics'?'Test word-timed audio in AI settings before generating lyrics or captions. A chat model alone does not provide song timing.':capability==='vision'?'Test image input in AI settings before using visual AI editing.':'Save and test your API connection before AI editing.');}
