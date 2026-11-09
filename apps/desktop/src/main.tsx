import "@fontsource-variable/sora";
import "./styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";

const isBrowserPreview =
  import.meta.env.DEV && !("__TAURI_INTERNALS__" in window);

const prepareEnvironment = async () => {
  if (!isBrowserPreview) return;
  const { installBrowserPreview } = await import("./dev/browser-preview.js");
  await installBrowserPreview();
};

const renderApp = () => {
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void prepareEnvironment().then(renderApp);
