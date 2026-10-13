# Model Motion — Sogni staged Firebase deployment

This is **not a production cutover**. Do not merge/enable paid generation until USD valuation, trusted approval and Firestore reservation are complete.

## Project selection
1. Select the **existing Firebase project** used by Model Motion. No new Firestore database or new Firebase project is needed.
2. In a trusted terminal with access to that project, run `firebase login`. The user-confirmed project ID is `model-motion` and is recorded in `.firebaserc`; still verify the selected account and project before deploying.
3. `SOGNI_API_KEY` must exist in Google Secret Manager **in that same project**. The existing gateway has a `defineSecret("SOGNI_API_KEY")` binding.
4. Existing gateway also binds `RUNPOD_API_KEY` and `FAL_KEY`; verify they exist before attempting deployment. Do not create placeholder secrets. Check `GENERATOR_OWNER_UID` and `GENERATOR_ALLOWED_ORIGIN` (owner-only checks fail closed if missing).
5. From repository root: `npm install -g firebase-tools`, then `firebase deploy --only functions:generator:generatorGateway --project model-motion` (the CLI might require `--only functions:generator:generatorGateway` with the configured codebase).
6. Read the deployed URL from Firebase Functions. The frontend Pages deployment is separate.

## Owner-only, read-only credential check
After deployment, send `POST <FUNCTION_URL>/sogni-check` with `Authorization: Bearer <FIREBASE_ID_TOKEN>` and the exact `Origin: https://doppelgaenger-droid.github.io`, if that is your configured origin. This checks Sogni `GET /v1/creative-agent/workflows?limit=1` and returns `authenticated: true`, `billingEnabled: false`, `dispatchEnabled: false` on success. Never send the Sogni API key in the request, browser bundle or screenshots.

The `/generate` route continues returning 503, and no paid Sogni submission route is exposed.

## Known gaps
- Cloud authentication and deployment have not been tested against the user's project in this PR.
- USD conversion from Sogni capacity units is unresolved; do not use guessed exchange rates.
- Provider policy and privately hosted media consent gate remain required before transmitting references.
- Legacy RunPod status path remains separate and is not a Sogni path.
- Run `node --test functions/generator/sogni.test.js` before merging.
