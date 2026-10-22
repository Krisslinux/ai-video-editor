import {spawn} from 'node:child_process';
const processes=[['node',['--env-file-if-exists=.env','--import','tsx','server/api.ts']],['node',['--env-file-if-exists=.env','--import','tsx','server/worker.ts']],['node',['node_modules/vite/bin/vite.js']]].map(([cmd,args])=>spawn(cmd,args,{stdio:'inherit',env:process.env}));
const stop=()=>{for(const p of processes)p.kill('SIGTERM');};
process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const p of processes)p.on('exit',code=>{if(code){stop();process.exitCode=code;}});
