# Scripts del Dashboard Comercial y del Informe Comercial

Cuatro scripts. Se rehicieron el 11 nov 2026 y se probaron así:

- **global_ventas.py:** con el GLOBAL de octubre reproduce las cifras del informe del 1–23 oct.
- **build.mjs y encrypt.mjs:** el propio dashboard descifra los tokens que generan.
- **pdf.mjs:** genera un A4 apaisado con saltos de página.

| Script | Para qué | Requisitos |
| --- | --- | --- |
| `build.mjs` | Monta el `index.html` publicable a partir de `v3.html`: pone el logo y la configuración de GitHub con los tokens cifrados | Node 18+ |
| `encrypt.mjs` | Cifra un token con una contraseña (lo usa `build.mjs`; también sirve suelto y para comprobar un cifrado) | Node 18+ |
| `global_ventas.py` | Lee el GLOBAL (.xlsm) y saca por comercial: producida, confirmadas, nulas, retrocesos, por confirmar, neta y abonada. Avisa de duplicados y de retrocesos con signo cambiado | Python 3 + `pip install openpyxl` |
| `pdf.mjs` | Convierte el HTML del Informe Comercial en PDF (A4 apaisado, escala 0,72, márgenes 12/10 mm) | Node 18+ + `npm install playwright` + `npx playwright install chromium` |

## Publicar el dashboard

1. Crea `secretos.json` fuera del repositorio, con el formato que se explica al principio de `build.mjs`.
2. Ejecuta:
   ```
   node build.mjs --src v3.html --logo logo.png --secrets secretos.json --out index.html
   ```
3. Copia `index.html` al repositorio `Juan-biofy/panel-comercial`, haz commit y push. GitHub Pages lo publica solo.

Para cambiar una contraseña o renovar un token, cambia `secretos.json` y repite los pasos 2 y 3. Las versiones guardadas no se pierden.

## Generar el Informe Comercial

1. Saca las cifras de ventas del GLOBAL:
   ```
   python3 global_ventas.py "10. GLOBAL OCTUBRE.xlsm" ventas.json --hasta 23 --csv ventas.csv
   ```
2. Junta esas cifras con las visitas del CRM y con los nulos y demos del Excel de comerciales. Rellena el HTML del informe y escribe las interpretaciones.
3. Genera el PDF y revisa las imágenes de cada página:
   ```
   node pdf.mjs Informe_comercial_1-23_oct.html Informe_comercial_1-23_oct.pdf --png
   ```

El GLOBAL tiene datos de clientes. Los scripts no los copian a la salida, pero el `.xlsm` no debe subirse a ningún repositorio.
