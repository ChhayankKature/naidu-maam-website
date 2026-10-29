# NetCore site (loading + landing + projects + sign-in + upload + admin)

One Vite + React project, one Firebase project (`cn-mam-website`).

| Page | File | Who can use it |
|------|------|----------------|
| Loading screen | `index.html` | everyone. Follows **real** loading (Firestore projects, first covers, landing page), then opens `landing.html` |
| Landing | `landing.html` | everyone |
| Projects (gallery) | `projects.html` | **everyone, no sign-in.** Reads the approved projects from Firestore |
| Sign in / create account | `auth.html` | everyone |
| Upload a project | `upload.html` | signed-in college users **and admins**. Guests see a "sign in" prompt |
| Admin panel | `admin.html` | accounts with an `admins/{uid}` document |
| `globe.html`, `loading.html` | | the globe alone / the loading text alone (demos) |

## Run it

1. `npm install`
2. `npm run dev` and open the URL Vite prints (it starts on the loading screen).
3. `npm test` runs the form checks. `npm run build` builds every page into `dist/`.

`src/firebase.js` holds the Firebase web config. To use another web app, copy `.env.example` to `.env`.
**Check the `apiKey` first:** the built-in one is 37 characters and Firebase web keys are normally 39. If you see
"API key not valid" anywhere (loading screen, sign-in, projects), copy the key again from
Firebase console > Project settings > Your apps.

## One-time Firebase setup

1. Authentication > Sign-in method: switch on **Email/Password**. Add your site's domain under Settings > Authorized domains.
2. Create a Firestore database and enable Storage (Blaze plan).
3. **Deploy the rules (this changed, deploy again):** `firebase deploy --only firestore:rules,storage`
4. **Make the first admin by hand:** Authentication > Users > *Add user* (any email, it does not have to be a college email),
   copy its uid, then in Firestore add a document `admins/<uid>` with any field, e.g. `{ ok: true }`.

## How a project gets onto the globe

1. A signed-in person uploads on `upload.html`. It is stored as `submissionRequests/{uid}_{n}` with `status: "pending"`.
2. An admin approves it in `admin.html` > Review. That copies it to `submissions/{uid}_{n}` (the public gallery).
3. `projects.html` reads `submissions` for everyone. Each approved project is one node on the globe, grouped by its real category
   (Presentation, Game, Tools study, IPR, Certification, Story, Projects). Click a node for the cover, team, format and an
   **Open project** button (the hosted link, or the uploaded file).

Declined or pending projects never reach the gallery. Only an admin can write to `submissions`.

## Admins can use the site as a user

Sign in on `auth.html` with the admin account (any email). On `upload.html` an admin gets the normal user flow:
no college-email check, no email verification and no seat (admins never take one of the 80). The upload goes through the
same review queue, so to see it end to end you approve it yourself in the admin panel. Each admin starts with 1 upload like
everyone else; use **People > Grant upload** to give yourself more, or send an "upload another" request and accept it.
The header shows an **Admin** link on the user pages, and the admin panel has **Use as user / Gallery / Site** links.

## The loading screen (real now)

`src/startLoad.js` registers what the bar follows: the Firestore `submissions` list (weight 4), then the first 8 cover images.
The page load, web fonts and `landing.html` are tracked too. A request that fails still counts as finished, so a bad connection
never leaves it stuck (`loading.timeoutMs` is the last safety net). The same screen opens `projects.html` while the projects
load (shorter, no redirect). Appearance and timing are in `src/netcore.config.js`.
The old fake tasks are only kept in `src/sampleData.js` for the standalone previews (`preview.jsx`, `preview2.jsx`).
A copy of the project list is kept in `sessionStorage` for 2 minutes (`CACHE_MS` in `src/data/projects.js`), so
loading > landing > projects downloads it once. A newly approved project appears within that time.

## Where things are

- `src/projects/NeuralProjects.jsx`: the gallery globe. `src/data/projects.js`: the Firestore read.
- `src/upload`, `src/auth`, `src/shared`, `src/api.js`, `src/session.js`, `src/validation.js`, `src/config.js`: sign-in and upload.
  Rules and labels (domains, 80 seats, 5 MB, categories) are all in `src/config.js`.
- `src/admin`: the admin panel. `src/landing`: the landing page (text in `site.config.js`).
- `firestore.rules`, `storage.rules`: the real enforcement. Read them before changing any rule.
- `functions/`: optional extra lock on account creation (see the comments in `functions/index.js`).

## Honest limits

- This was assembled without network access, so `npm install` and `npm run build` were **not run here**. Every file parses, the
  validation tests pass (`npm test`), and the globe layout and the Firestore-to-gallery mapping were tested on their own.
  Open each page once in `npm run dev` before deploying.
- The security rules were **not run against the Firebase emulator**. The admin-as-user change touches `users` create, submission
  requests, contacts, upload requests and the storage upload rule. Test: sign in as an admin, upload, approve it, then check that a
  normal user still cannot write to `submissions` or upload with a gmail address.
- The globe shows the newest 120 projects (`MAX_NODES`) to stay smooth.
- Titles are letters only (no spaces) on upload, so the gallery shows `MyProject` as "My Project".
