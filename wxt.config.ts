import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// Acceso al servidor de Caseo: se pide en tiempo de ejecución solo para el dominio
// que configura el usuario (cloud o self-hosted).
const caseoHosts = ["https://*/*", "http://localhost/*", "http://127.0.0.1/*"];

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser, manifestVersion }) => ({
    name: "Caseo",
    description: "Importa anuncios de Idealista a Caseo.",
    // activeTab + scripting: leer solo la pestaña activa y solo al pulsar la extensión.
    permissions: ["storage", "activeTab", "scripting"],
    ...(manifestVersion === 2
      ? { optional_permissions: caseoHosts }
      : { optional_host_permissions: caseoHosts }),
    ...(browser === "firefox" && {
      browser_specific_settings: { gecko: { id: "caseo-extension@lanzaderos" } },
    }),
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
