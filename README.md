# Panel comercial · Culligan Biofy

Panel de producción y ventas (comerciales, VIP, teleoperadoras y consultores técnicos), publicado en GitHub Pages.

- La página está protegida con contraseña. Sin ella no se ve ningún dato.
- Los datos y las versiones guardadas viven en un repositorio **privado** aparte (`panel-datos`); este repositorio solo contiene la página, su código fuente y los scripts.
- Para actualizar los datos: exportar los Numbers a Excel (Archivo › Exportar a › Excel), subirlos en el panel y pulsar «Guardar».

## Qué hay aquí
| Ruta | Qué es |
|---|---|
| `index.html` | La página publicada (montada, con las claves cifradas) |
| `src/v3.html` | Código fuente de la página, sin claves |
| `src/logo-vertical-blue.svg` | Logo oficial (vertical, azul) que se incrusta al montar. `src/logo.png` es el antiguo |
| `scripts/` | Montaje, cifrado, lectura del GLOBAL y PDF del Informe Comercial (ver `scripts/LEEME.md`) |

**Nunca se suben aquí** (este repositorio es público): los Excel del mes, el GLOBAL (datos de clientes), los Informes Comerciales en PDF ni el fichero de contraseñas `secretos.json`. El `.gitignore` los deja fuera.

## Volver a montar la página
```
export PATH=$HOME/bin:$PATH
cd scripts
node build.mjs --src ../src/v3.html --logo ../src/logo-vertical-blue.svg --secrets /ruta/fuera/secretos.json --out ../index.html
```
Después: commit y push. GitHub Pages lo publica solo.
