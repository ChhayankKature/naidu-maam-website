import { createRoot } from "react-dom/client";
// Same bundled fonts as the other pages (the admin page no longer loads them from Google Fonts).
import "@fontsource/michroma/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./admin.css";
import AdminPage from "./AdminPage.jsx";

createRoot(document.getElementById("root")).render(<AdminPage />);
