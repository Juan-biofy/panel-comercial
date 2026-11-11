#!/usr/bin/env node
/*
  Monta el index.html publicable del Dashboard Comercial a partir del código fuente (v3.html):
    1. sustituye cada «__LOGO__» por el logo en base64;
    2. sustituye «const CLOUD=/*__CLOUD__*\/null;» por la configuración de GitHub con los
       tokens cifrados con las contraseñas.

  Uso:
      node build.mjs --src v3.html --logo logo.png --secrets secretos.json --out index.html
      node build.mjs --src v3.html --logo logo.png --local --out index.html   (sin nube: versiones en el navegador)

  secretos.json (guárdalo FUERA del repositorio y no lo compartas):
      {
        "owner": "Juan-biofy", "repo": "panel-datos", "branch": "main", "dir": "versiones",
        "pw_jefe":  "contraseña de jefes (lectura + guardar)",
        "pw_admin": "contraseña de administrador",
        "read_token":  "github_pat_… (solo lectura del repo de datos)",
        "write_token": "github_pat_… (lectura y escritura del repo de datos)"
      }

  Qué abre cada contraseña:
      read   = pw_jefe  -> read_token    (ver)
      jsave  = pw_jefe  -> write_token   (jefes pueden guardar versiones)
      write  = pw_admin -> write_token   (administrador: guardar, renombrar, borrar)
  (Para que los jefes NO puedan guardar, quita «jsave».)

  Después: copia index.html al repositorio público panel-comercial, commit y push.
  Requiere Node 18 o superior. Sin dependencias.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { encrypt, decrypt } from './encrypt.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const src = arg('src', 'v3.html'), out = arg('out', 'index.html'), logo = arg('logo');

let html = readFileSync(src, 'utf8');
const MARK = 'const CLOUD=/*__CLOUD__*/null;';
if (!html.includes(MARK)) { console.error('No encuentro «' + MARK + '» en ' + src); process.exit(1); }

if (logo) html = html.split('__LOGO__').join(readFileSync(logo).toString('base64'));
else if (html.includes('__LOGO__')) console.warn('Aviso: no has pasado --logo; el logo saldrá roto.');

let cloud = null;
if (!flag('local')) {
  const S = JSON.parse(readFileSync(arg('secrets', 'secretos.json'), 'utf8'));
  for (const k of ['owner', 'repo', 'pw_jefe', 'pw_admin', 'read_token', 'write_token'])
    if (!S[k]) { console.error('Falta «' + k + '» en el fichero de secretos'); process.exit(1); }
  cloud = {
    owner: S.owner, repo: S.repo, branch: S.branch || 'main', dir: S.dir || 'versiones',
    read: await encrypt(S.pw_jefe, S.read_token),
    jsave: await encrypt(S.pw_jefe, S.write_token),
    write: await encrypt(S.pw_admin, S.write_token),
  };
  // comprobación: cada contraseña abre lo que debe
  const ok = (await decrypt(cloud.read, S.pw_jefe)) === S.read_token
    && (await decrypt(cloud.jsave, S.pw_jefe)) === S.write_token
    && (await decrypt(cloud.write, S.pw_admin)) === S.write_token
    && (await decrypt(cloud.write, S.pw_jefe)) === null;
  if (!ok) { console.error('La comprobación del cifrado ha fallado'); process.exit(1); }
}
html = html.replace(MARK, 'const CLOUD=' + JSON.stringify(cloud) + ';');
writeFileSync(out, html);
console.log(`Hecho: ${out} (${cloud ? 'modo nube: ' + cloud.owner + '/' + cloud.repo : 'modo local'})`);
