import { createRoot } from "react-dom/client";
import LoadingSystem from "./LoadingSystem.jsx";
import loader from "./loader.js";
import { startRealLoad } from "./startLoad.js";
import "./App.css";

// loading.html shows the loading text alone (no globe), following the same real work as index.html.
startRealLoad(loader);

createRoot(document.getElementById("root")).render(
  <main className="boot-screen">
    <LoadingSystem />
  </main>
);
