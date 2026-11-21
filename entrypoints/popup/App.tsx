import { useEffect, useState, type FormEvent } from "react";

import {
  createImport,
  disconnect,
  me,
  originPattern,
  parseServerUrl,
  serverUrl,
  token,
  Unauthorized,
} from "@/utils/caseo";
import { listingId, readListingFromPage } from "@/utils/idealista";

type Tab = Browser.tabs.Tab;

type View =
  | { name: "loading" }
  | { name: "server"; error?: string }
  | { name: "login"; server: string }
  | { name: "ready"; server: string; email: string; tab?: Tab };

type Status = { kind: "idle" } | { kind: "importing" } | { kind: "error"; message: string };

async function loadView(): Promise<View> {
  const server = await serverUrl.getValue();
  if (!server) return { name: "server" };
  if (!(await token.getValue())) return { name: "login", server };

  try {
    const [{ email }, [tab]] = await Promise.all([
      me(),
      browser.tabs.query({ active: true, currentWindow: true }),
    ]);
    return { name: "ready", server, email, tab };
  } catch (error) {
    if (error instanceof Unauthorized) return { name: "login", server };
    return { name: "server", error: `No se pudo contactar con ${server}.` };
  }
}

export default function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const refresh = () => void loadView().then(setView);

  useEffect(() => {
    loadView().then(setView);
    // La conexión termina en segundo plano; si el popup sigue abierto, se actualiza.
    return token.watch(() => loadView().then(setView));
  }, []);

  return (
    <main className="w-80 bg-base-200 p-4 text-base-content">
      <section className="card card-border bg-base-100">
        <div className="card-body gap-3 p-5">
          <h1 className="card-title">Caseo</h1>
          {view.name === "loading" && <span className="loading loading-spinner loading-sm" />}
          {view.name === "server" && <ServerForm error={view.error} onSaved={refresh} />}
          {view.name === "login" && (
            <Login server={view.server} onChangeServer={() => setView({ name: "server" })} />
          )}
          {view.name === "ready" && (
            <Import email={view.email} tab={view.tab} onDisconnect={refresh} />
          )}
        </div>
      </section>
    </main>
  );
}

function ServerForm({ error, onSaved }: { error?: string; onSaved: () => void }) {
  const [message, setMessage] = useState(error);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget).get("server")?.toString() ?? "";

    try {
      const origin = parseServerUrl(input);
      // Solo se pide acceso al dominio de Caseo indicado por el usuario.
      const granted = await browser.permissions.request({ origins: [originPattern(origin)] });
      if (!granted) return setMessage("Hace falta permiso para conectar con ese servidor.");

      await serverUrl.setValue(origin);
      await token.removeValue();
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dirección no válida.");
    }
  }

  return (
    <form id="server-form" className="flex flex-col gap-2" onSubmit={submit}>
      <label className="text-sm" htmlFor="server">
        Dirección de tu Caseo
      </label>
      <input
        id="server"
        name="server"
        className="input input-sm w-full"
        placeholder="https://caseo.midominio.com"
        required
      />
      {message && <p className="text-sm text-error">{message}</p>}
      <button className="btn btn-primary btn-sm">Guardar</button>
    </form>
  );
}

function Login({ server, onChangeServer }: { server: string; onChangeServer: () => void }) {
  async function login() {
    await browser.runtime.sendMessage({ type: "connect" });
    window.close();
  }

  return (
    <>
      <p className="text-sm">Inicia sesión en {new URL(server).host} para importar anuncios.</p>
      <button id="login-button" className="btn btn-primary btn-sm" onClick={login}>
        Iniciar sesión
      </button>
      <button className="btn btn-ghost btn-xs" onClick={onChangeServer}>
        Cambiar servidor
      </button>
    </>
  );
}

function Import(props: { email: string; tab?: Tab; onDisconnect: () => void }) {
  const { email, tab, onDisconnect } = props;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const compatible = tab?.id !== undefined && listingId(tab.url) !== null;

  async function run() {
    if (tab?.id === undefined || !tab.url) return;
    setStatus({ kind: "importing" });

    try {
      const [injection] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: readListingFromPage,
      });
      if (!injection?.result) throw new Error("No se pudieron leer los datos del anuncio.");

      // Caseo abre la vista previa editable: allí se revisa, se completa y se confirma.
      await browser.tabs.create({ url: await createImport(injection.result) });
      window.close();
    } catch (error) {
      if (error instanceof Unauthorized) return onDisconnect();
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <>
      {compatible ? (
        <button
          id="import-button"
          className="btn btn-primary btn-sm"
          disabled={status.kind === "importing"}
          onClick={run}
        >
          {status.kind === "importing" && <span className="loading loading-spinner loading-xs" />}
          Importar anuncio
        </button>
      ) : (
        <p id="unsupported" className="text-sm">
          Abre la ficha de un anuncio de Idealista para importarlo.
        </p>
      )}

      {status.kind === "error" && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          <span>No se pudo importar. {status.message}</span>
        </div>
      )}

      <footer className="flex items-center justify-between gap-2 text-xs opacity-70">
        <span className="truncate">{email}</span>
        <button className="btn btn-ghost btn-xs" onClick={() => disconnect().then(onDisconnect)}>
          Desconectar
        </button>
      </footer>
    </>
  );
}
