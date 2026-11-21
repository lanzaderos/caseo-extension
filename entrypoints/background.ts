import { pendingState, serverUrl, token } from "@/utils/caseo";

/**
 * Conexión con Caseo sin copiar códigos: se abre `/extension/connect` en una
 * pestaña normal (así sirve la sesión web y cualquier forma de acceso). Cuando
 * el usuario confirma, la página incluye el token en `#extension-token`; aquí
 * se lee, se comprueba el `state` y se cierra la pestaña.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if ((message as { type?: string })?.type === "connect") return startConnect();
  });

  browser.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (change.status !== "complete" || !tab.url) return;

    const [server, state] = await Promise.all([serverUrl.getValue(), pendingState.getValue()]);
    if (!server || !state || !tab.url.startsWith(`${server}/extension/connect`)) return;

    const [injection] = await browser.scripting
      .executeScript({
        target: { tabId },
        func: () => {
          const element = document.getElementById("extension-token");
          return element ? { token: element.dataset.token, state: element.dataset.state } : null;
        },
      })
      .catch(() => [undefined]);

    const result = injection?.result;
    if (!result?.token || result.state !== state) return;

    await token.setValue(result.token);
    await pendingState.removeValue();
    setTimeout(() => browser.tabs.remove(tabId).catch(() => undefined), 1500);
  });
});

async function startConnect() {
  const server = await serverUrl.getValue();
  if (!server) return;

  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const state = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );

  await pendingState.setValue(state);
  await browser.tabs.create({ url: `${server}/extension/connect?state=${state}` });
}
