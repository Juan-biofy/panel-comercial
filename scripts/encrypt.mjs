#!/usr/bin/env node
/*
  Cifra un texto (un token de GitHub) con una contraseña, en el formato que entiende
  el Dashboard Comercial: {"n":600000,"s":"<sal>","i":"<iv>","c":"<cifrado>"} (base64).
  PBKDF2-SHA256 (600.000 iteraciones) -> clave AES-GCM de 256 bits.

  Uso (mejor con variables de entorno, para que no quede en el historial):
      PW='contraseña' SECRET='github_pat_…' node encrypt.mjs
  o   node encrypt.mjs 'contraseña' 'github_pat_…'
  Para comprobar un cifrado:
      PW='contraseña' BLOB='{"n":…}' node encrypt.mjs --check

  Requiere Node 18 o superior. Sin dependencias.
*/
const { subtle } = globalThis.crypto;
const ITER = 600000;
const b64 = u8 => Buffer.from(u8).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));

async function keyFrom(pw, salt, n, use) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: n, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, [use]);
}

export async function encrypt(pw, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(pw, salt, ITER, 'encrypt');
  const c = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(secret)));
  return { n: ITER, s: b64(salt), i: b64(iv), c: b64(c) };
}

export async function decrypt(blob, pw) {
  try {
    const key = await keyFrom(pw, unb64(blob.s), blob.n || ITER, 'decrypt');
    return new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.i) }, key, unb64(blob.c)));
  } catch { return null; }
}

// Ejecución directa
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const out = await decrypt(JSON.parse(process.env.BLOB || args[2]), process.env.PW || args[1]);
    console.log(out ? 'OK: la contraseña abre el cifrado' : 'ERROR: la contraseña no abre el cifrado');
    process.exit(out ? 0 : 1);
  }
  const pw = process.env.PW || args[0], secret = process.env.SECRET || args[1];
  if (!pw || !secret) { console.error('Uso: PW=… SECRET=… node encrypt.mjs'); process.exit(1); }
  console.log(JSON.stringify(await encrypt(pw, secret)));
}
