Firestore Setup

1) Create a Firebase project
   - Go to https://console.firebase.google.com/ and create a project.
   - In the project, add a Web app and copy the firebase config (apiKey, projectId, etc.).

2) Enable Firestore
   - In the Firebase console go to Build → Firestore Database and create a database in Native mode.

3) Add config to your app
   - Create `.env.local` in the project root with the following variables:

```
NEXT_PUBLIC_FIRESTORE_ENABLED=1
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

`NEXT_PUBLIC_FIRESTORE_ENABLED`, `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are required. The `NEXT_PUBLIC_` values are public client configuration, not secrets.

4) Install packages

```bash
npm install
```

5) Data layout

All ward data is stored in Firestore below `wards/{wardId}`, where `wardId` is the password segment in the URL:

- `wards/{wardId}/familias/{familiaId}` — family document, including its nested members
- `wards/{wardId}/pessoas/{pessoaId}` — normalized member document
- `wards/{wardId}/presencas/{YYYY-MM-DD}` — attendance document with `presentes: string[]`
- `wards/{wardId}/discursos/{discursoId}` — one document per talk

The app no longer reads or writes ward data in `localStorage`. Existing browser-local data is not migrated automatically and is ignored.

6) How the helper works
- `lib/firestore.ts` exposes:
  - `isFirestoreEnabled()` — checks env + opt-in
  - `initFirebase()` — initializes the SDK in the browser
  - Firestore read/write helpers — require a ward id and use only `wards/{wardId}/...` paths

Security recommendations (dev → prod):
- The password in the URL is only a namespace. It does not authenticate a user or protect a ward's data.
- Firebase web config is public. Firestore Security Rules must enforce authentication and ward-level authorization before production.
- Test mode/open rules are for local experiments only; never deploy them to production. This app does not yet implement Firebase Authentication, so production rules need an authentication flow before the data can be safely exposed.

Monitoring & billing
- In the Firebase Console → Usage you can see read/write counts and storage used.
- When you enable Blaze (pay-as-you-go) attach a Billing Account in Google Cloud and configure budgets/alerts to avoid surprises.

