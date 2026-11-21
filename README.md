# Caseo Extension

Extensión de navegador para importar a Caseo el anuncio de Idealista abierto en la pestaña activa. Usa WXT, React, TypeScript, Tailwind CSS 4 y daisyUI 5, y funciona en Chrome (y navegadores Chromium) y Firefox.

## Cómo funciona

1. **Servidor.** La primera vez se indica la dirección del Caseo del usuario (cloud o self-hosted). La extensión pide permiso solo para ese dominio.
2. **Conexión.** **Iniciar sesión** abre `/extension/connect` de Caseo en una pestaña normal, así que sirve la sesión web existente o cualquier forma de acceso (enlace mágico, contraseña o passkey). Al pulsar **Conectar extensión**, la extensión recoge el token de la página, comprueba el `state` y cierra la pestaña. No hay que copiar códigos.
3. **Importación.** En una ficha de Idealista (`https://www.idealista.com/inmueble/<id>/`), **Importar anuncio** lee la página activa (permisos `activeTab` y `scripting`, solo al pulsar) y envía URL, título, precio, ubicación y superficie a Caseo. Los campos que no se encuentran se omiten. Caseo valida los datos y crea el inmueble, o lo actualiza si ese anuncio ya se había importado.

## Desarrollo local

Con Node.js 24 y npm:

```sh
npm ci
npm run dev           # Chrome con recarga en caliente
npm run dev:firefox   # Firefox
```

### Probar con un Caseo local

1. Arranca Caseo en `http://localhost:4000` (`mix phx.server` en el repositorio `lanzaderos/caseo`).
2. Compila la extensión y cárgala:
   - **Chrome:** `npm run build` y, en `chrome://extensions` con el modo desarrollador activado, **Cargar descomprimida** → `.output/chrome-mv3`.
   - **Firefox:** `npm run build:firefox` y, en `about:debugging#/runtime/this-firefox`, **Cargar complemento temporal** → `.output/firefox-mv2/manifest.json`.
3. Abre el popup, escribe `http://localhost:4000` y acepta el permiso.
4. Pulsa **Iniciar sesión**, entra en Caseo si hace falta y pulsa **Conectar extensión**. La pestaña se cierra sola.
5. Abre la ficha de un anuncio de Idealista, abre el popup y pulsa **Importar anuncio**. El enlace del resultado abre el inmueble en Caseo.

## Comprobaciones

```sh
npm run format   # aplica el formato con Oxfmt
npm run check    # formato, Oxlint, tipos de TypeScript y tests
npm run build
npm run build:firefox
```

Los tests (`npm test`) cubren la detección de fichas y la conversión de los datos de la página.
