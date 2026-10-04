import { cp,mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
await mkdir('.next/standalone/.next',{recursive:true});
await cp('public','.next/standalone/public',{recursive:true});
await cp('.next/static','.next/standalone/.next/static',{recursive:true});
const child=spawn(process.execPath,['.next/standalone/server.js'],{stdio:'inherit',env:{...process.env,HOSTNAME:process.env.FRONTEND_HOSTNAME||'0.0.0.0'}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
