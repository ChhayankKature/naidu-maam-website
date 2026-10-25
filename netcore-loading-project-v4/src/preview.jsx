import { useState } from "react";
import { createRoot } from "react-dom/client";
import LoadingScreen from "./App.jsx";
import loader from "./loader.js";
import { startSampleLoad } from "./sampleData.js";
import "./App.css";
import "./preview.css";

// SAMPLE DATA: remove when real data is connected (see sampleData.js)
const startDemo = () => {
  loader.reset();
  startSampleLoad(loader);
};
startDemo();

function Preview() {
  const [run, setRun] = useState(0);
  return (
    <>
      <LoadingScreen key={run} fadeOut={false} />
      <button
        id="replay"
        className="replay"
        onClick={() => {
          startDemo();
          setRun((n) => n + 1);
        }}
      >
        Replay
      </button>
    </>
  );
}

createRoot(document.getElementById("root")).render(<Preview />);
