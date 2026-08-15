import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "@fontsource/josefin-sans/latin-400.css";
import "@fontsource/josefin-sans/latin-500.css";
import "@fontsource/josefin-sans/latin-600.css";
import "@fontsource/josefin-sans/latin-700.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-mono/latin-400.css";
import "@fontsource/dm-mono/latin-500.css";
// Mate Cerámico: Newsreader for prose, Instrument Sans for UI, IBM Plex Mono
// for code and metadata. See ADR 0008 — font files are the one thing a Theme
// needs outside styles.css.
import "@fontsource/newsreader/latin-300.css";
import "@fontsource/newsreader/latin-300-italic.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/instrument-sans/latin-400.css";
import "@fontsource/instrument-sans/latin-500.css";
import "@fontsource/instrument-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
