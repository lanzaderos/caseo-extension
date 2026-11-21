# Caseo Extension

Esqueleto de la extensión de Caseo para importar anuncios de Idealista. Usa WXT, React, TypeScript, Tailwind CSS 4 y daisyUI 5. La [issue #1](https://github.com/lanzaderos/caseo-extension/issues/1) recoge el alcance de importación e inicio de sesión.

## Desarrollo local

Con Node.js 24 y npm, instala las dependencias y arranca WXT.

```sh
npm ci
npm run dev
```

Para cargar la extensión manualmente en Chrome, ejecuta `npm run build` y selecciona `.output/chrome-mv3` desde **Cargar descomprimida** en `chrome://extensions` con el modo desarrollador activado.

## Comprobaciones

```sh
npm run format
npm run check
npm run build
```

`npm run check` comprueba el formato con Oxfmt, ejecuta Oxlint y valida los tipos de TypeScript.
