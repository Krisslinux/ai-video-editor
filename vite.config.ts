import { defineConfig } from 'vite';
export default defineConfig({root:'.',server:{host:'0.0.0.0',port:4173,strictPort:true,allowedHosts:['terminal.local'],proxy:{'/api':'http://127.0.0.1:3001'}},build:{outDir:'dist'}});
