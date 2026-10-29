import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Every page of the site is its own entry:
//   index.html     loading screen  ->  landing.html
//   landing.html   home
//   projects.html  public gallery (reads Firestore, no sign-in needed)
//   auth.html      sign in / create account
//   upload.html    upload a project (needs sign-in); admins can use it as a user too
//   admin.html     review queue and people (needs an admins/{uid} document)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: [
        "index.html", "landing.html", "projects.html",
        "auth.html", "upload.html", "admin.html",
        "globe.html", "loading.html"
      ]
    }
  }
});
