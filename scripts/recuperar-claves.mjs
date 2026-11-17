#!/usr/bin/env node
/*
  Recupera las claves de GitHub del Dashboard a partir del index.html publicado y las contraseñas ANTIGUAS
  (jefe y administrador), y las guarda en /Users/diseno/claves-biofy/dashboard-secretos.json (fuera de git).
  Uso: PW_ADMIN='…' PW_JEFE='…' node recuperar-claves.mjs
*/
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { decrypt } from './encrypt.mjs';
const h = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const C = JSON.parse(h.match(/const CLOUD=(\{.*?\});/s)[1]);
const w = C.write ? await decrypt(C.write, process.env.PW_ADMIN || '') : null;
const r = C.read ? await decrypt(C.read, process.env.PW_JEFE || '') : null;
if (!w) { console.error('La contraseña de administrador no abre el dashboard publicado'); process.exit(1); }
const out = '/Users/diseno/claves-biofy/dashboard-secretos.json';
writeFileSync(out, JSON.stringify({ owner: C.owner, repo: C.repo, branch: C.branch, dir: C.dir, read_token: r || w, write_token: w }, null, 1));
chmodSync(out, 0o600);
console.log('Claves guardadas en ' + out + (r ? '' : ' (sin la de jefe: se usa la de administrador también para leer)'));
