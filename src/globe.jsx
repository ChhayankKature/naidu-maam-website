import { createRoot } from "react-dom/client";
import NetworkGlobe from "./NetworkGlobe.jsx";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <main className="boot-screen">
    <NetworkGlobe />
  </main>
);
