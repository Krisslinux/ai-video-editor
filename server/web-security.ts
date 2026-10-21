export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function check(value:unknown,status:number,message:string):asserts value{if(!value)throw new HttpError(status,message);}
export const id=()=>crypto.randomUUID();
export const bytes=(s:string)=>new TextEncoder().encode(s);
export const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),n=>n.toString(16).padStart(2,'0')).join('');
export const unhex=(s:string)=>new Uint8Array(s.match(/.{2}/g)!.map(x=>parseInt(x,16)));
export const digest=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',bytes(s)));
export async function passwordHash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer)){const key=await crypto.subtle.importKey('raw',bytes(password),'PBKDF2',false,['deriveBits']);return `${salt}:${hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:bytes(salt)},key,256))}`;}
export async function seal(value:string,key:string){const iv=crypto.getRandomValues(new Uint8Array(12));const k=await crypto.subtle.importKey('raw',unhex(key),'AES-GCM',false,['encrypt']);return `${hex(iv.buffer)}:${hex(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,bytes(value)))}`;}
export async function unseal(value:string,key:string){const [iv,data]=value.split(':');const k=await crypto.subtle.importKey('raw',unhex(key),'AES-GCM',false,['decrypt']);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv)},k,unhex(data)));}
