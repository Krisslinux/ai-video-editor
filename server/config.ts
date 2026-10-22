import path from 'node:path';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
export const production=process.env.NODE_ENV==='production';
export const dataDir=path.resolve(process.env.DATA_DIR||'data');
mkdirSync(dataDir,{recursive:true,mode:0o700});
for(const dir of ['media','work','outputs'])mkdirSync(path.join(dataDir,dir),{recursive:true,mode:0o700});
const n=(name:string,fallback:number)=>{const x=Number(process.env[name]||fallback);if(!Number.isFinite(x)||x<=0)throw Error(`Invalid ${name}`);return x;};
export const limits={fileBytes:n('MAX_FILE_MB',512)*1024**2,outputBytes:n('MAX_OUTPUT_MB',512)*1024**2,userBytes:n('MAX_USER_STORAGE_MB',2048)*1024**2,seconds:n('MAX_PROJECT_SECONDS',1800),assets:n('MAX_PROJECT_ASSETS',24),jobs:n('MAX_ACTIVE_JOBS',2),calls:n('MAX_PROVIDER_CALLS',8),renders:n('MAX_RENDERS_PER_DAY',20),retention:n('RETENTION_DAYS',30),threads:n('FFMPEG_THREADS',2)};
export const origin=process.env.APP_ORIGIN||'http://localhost:4173';
if(production&&(!process.env.ENCRYPTION_KEY||!process.env.INVITE_CODE||!origin.startsWith('https://')))throw Error('Production requires ENCRYPTION_KEY, INVITE_CODE, and an HTTPS APP_ORIGIN.');
let key=process.env.ENCRYPTION_KEY;
if(!key){const file=path.join(dataDir,'development.key');if(!existsSync(file))writeFileSync(file,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});key=readFileSync(file,'utf8').trim();}
if(!/^[a-f0-9]{64}$/i.test(key))throw Error('ENCRYPTION_KEY must be 32 bytes in hexadecimal.');
export const encryptionKey=Buffer.from(key,'hex');
export const storagePath=(category:'media'|'work'|'outputs',id:string)=>{if(!/^[a-zA-Z0-9_.-]+$/.test(id))throw Error('Invalid storage ID');return path.join(dataDir,category,id);};
