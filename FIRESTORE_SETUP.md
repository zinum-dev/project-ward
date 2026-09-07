Firestore setup

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

Only `NEXT_PUBLIC_FIRESTORE_ENABLED`, `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are strictly required for the helper to activate.

4) Install packages

```bash
npm install
```

5) How the helper works
- `lib/firestore.ts` exposes:
  - `isFirestoreEnabled()` — checks env + opt-in
  - `initFirebase()` — initializes the SDK in the browser
  - `carregarPresencaFirestore()` — loads presence stored as one document per date in collection `presencas` with field `presentes: string[]` and converts to the existing `Presenca[]` shape
  - `salvarPresencaFirestore(presencas)` — writes grouped docs per date from `Presenca[]`

Additional collections and shapes used by helpers:

- `presencas` (one doc per date, doc id = `YYYY-MM-DD`)
   - fields: `presentes: string[]` (array of `pessoaId`), `updatedAt: timestamp`

- `familias` (one doc per family, doc id = `familia.id`)
   - document shape: the `Familia` object as in code (includes `membros: Pessoa[]`)

- `discursos` (one doc per discurso, doc id = `dis-<timestamp>`)
   - fields: `data: string` (YYYY-MM-DD), `pessoaId: string`, `tema: string`, `nome?: string`, `updatedAt: timestamp`

Security recommendations (dev → prod):
- During development use the default test mode or open rules, but do not deploy to production with permissive rules.
- Example minimal rules for prototyping (allow reads publicly, writes only authenticated):

```js
service cloud.firestore {
   match /databases/{database}/documents {
      match /presencas/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
      }
      match /familias/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
      }
      match /discursos/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
      }
   }
}
```

Monitoring & billing
- In the Firebase Console → Usage you can see read/write counts and storage used.
- When you enable Blaze (pay-as-you-go) attach a Billing Account in Google Cloud and configure budgets/alerts to avoid surprises.

6) Next steps I can implement for you
- Wire the pages (`app/ward/[password]/presenca/page.tsx`) to use the Firestore helper instead of `localStorage` when enabled.
- Add a feature flag toggle in the UI to switch between `localStorage` and Firestore at runtime.

If you want, I can now:
- wire the `presenca` page to use Firestore and run tests (you'll need to run `npm install` locally and provide the `.env.local` values), or
- just leave the helper and instructions and you run `npm install` and create the Firebase project yourself.
