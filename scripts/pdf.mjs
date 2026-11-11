#!/usr/bin/env node
/*
  Convierte el HTML del Informe Comercial en PDF, con los mismos ajustes del informe de octubre:
  A4 apaisado, fondos impresos, escala 0,72, márgenes 12 mm arriba/abajo y 10 mm a los lados.

  Uso:
      node pdf.mjs Informe_comercial_1-23_oct.html Informe_comercial_1-23_oct.pdf [--png]

  --png  guarda además una imagen de cada página (pagina-1.png …) para revisarlas.

  Requiere: npm install playwright  y  npx playwright install chromium
  (o un Chromium ya instalado con Playwright).
*/
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [inp, out] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!inp || !out) { console.error('Uso: node pdf.mjs informe.html informe.pdf [--png]'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(pathToFileURL(resolve(inp)).href, { waitUntil: 'load' });
await page.waitForTimeout(500);               // deja terminar el JavaScript que dibuja tablas y gráficos
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: out, format: 'A4', landscape: true, printBackground: true, scale: 0.72,
  margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
});
await browser.close();
console.log('PDF guardado en', out);

if (process.argv.includes('--png')) {
  // vista previa por página con pdftoppm, si está instalado (poppler-utils)
  const { execFileSync } = await import('node:child_process');
  try { execFileSync('pdftoppm', ['-r', '80', '-png', out, 'pagina']); console.log('Páginas guardadas como pagina-N.png'); }
  catch { console.warn('No se pudieron generar las imágenes (instala poppler-utils para pdftoppm).'); }
}
