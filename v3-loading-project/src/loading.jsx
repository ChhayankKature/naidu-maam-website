import { createRoot } from "react-dom/client";
import LoadingSystem from "./LoadingSystem.jsx";
import loader from "./loader.js";
import { startSampleLoad } from "./sampleData.js";
import "./App.css";

// SAMPLE DATA: remove when real data is connected (see sampleData.js)
startSampleLoad(loader);

createRoot(document.getElementById("root")).render(
  <main className="boot-screen">
    <LoadingSystem />
  </main>
);
