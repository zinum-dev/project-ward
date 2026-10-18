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

5) Google Authentication and access control

- In Firebase Console → Authentication → Sign-in method, enable Google.
- Add the local development host and the production host (for example, the Vercel domain) to Authorized domains.
- The bootstrap administrator is `andre.zinum@gmail.com`; this account can manage the global email-to-ward access list and is not removable from the app.
- The administrator adds each email and the ward IDs it may access. Ward IDs are the URL segments, such as `galeao`.
- Publish the restrictive `firestore.rules` rules before inviting users. The rules deny access by default and authorize each ward using `allowedUsers/{email}.wards`.

6) Data layout

All ward data is stored in Firestore below `wards/{wardId}`, where `wardId` is the password segment in the URL:

- `wards/{wardId}/familias/{familiaId}` — family document, including its nested members
- `wards/{wardId}/presencas/{YYYY-MM-DD}` — attendance document with `statusPorPessoa: Record<pessoaId, estado>`
- `wards/{wardId}/discursos/{discursoId}` — one document per talk
- `allowedUsers/{email}` — global access record with the list of permitted ward IDs

The app no longer reads or writes ward data in `localStorage`. Existing browser-local data is not migrated automatically and is ignored.

7) How the helper works
- `lib/firestore.ts` exposes:
  - `isFirestoreEnabled()` — checks env + opt-in
  - `initFirebase()` — initializes the SDK in the browser
  - Firestore read/write helpers — require a ward id and use only `wards/{wardId}/...` paths

Security notes:
- The password in the URL is only a namespace, not an authentication credential.
- Firebase web config is public. Firestore Security Rules enforce Google authentication and ward-level access; UI checks alone are not security.
- The bootstrap administrator email appears in both `lib/firebase-auth.ts` and `firestore.rules`; keep them in sync if the admin changes.

8) Monitoring & billing
- In the Firebase Console → Usage you can see read/write counts and storage used.
- When you enable Blaze (pay-as-you-go) attach a Billing Account in Google Cloud and configure budgets/alerts to avoid surprises.

