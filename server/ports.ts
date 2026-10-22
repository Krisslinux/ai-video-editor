export interface Database {
  get(sql:string,...args:unknown[]):Promise<any>;
  all(sql:string,...args:unknown[]):Promise<any[]>;
  run(sql:string,...args:unknown[]):Promise<{changes:number}>;
  batch(statements:{sql:string;args:unknown[]}[]):Promise<void>;
}
export interface Objects {
  put(key:string,body:ReadableStream<Uint8Array>|Uint8Array,contentType?:string):Promise<void>;
  get(key:string,range?:{offset:number;length:number}):Promise<{body:ReadableStream<Uint8Array>;size:number}|null>;
  delete(key:string):Promise<void>;
  deletePrefix(prefix:string):Promise<void>;
}
export interface Runtime {lyricFetch?:typeof fetch;db:Database;objects:Objects;key:string;workerToken:string;origin:string;production:boolean;hosted:boolean;limits:{fileBytes:number;outputBytes?:number;userBytes:number;seconds:number;assets:number;jobs:number;calls:number;renders:number;retention:number};inviteCode?:string;identity?:(request:Request)=>{id:string;email:string}|null;}
