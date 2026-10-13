# Model Motion — Sogni staged Firebase deployment

This is **not a production cutover**. Do not merge/enable paid generation until USD valuation, trusted approval and Firestore reservation are complete.

## Project selection
1. Select the **existing Firebase project** used by Model Motion. No new Firestore database or new Firebase project is needed.
2. In a trusted terminal with access to that project, run `firebase login`. The user-confirmed project ID is `model-motion` and is recorded in `.firebaserc`; still verify the selected account and project before deploying.
3. `SOGNI_API_KEY` must exist in Google Secret Manager **in that same project**. The existing gateway has a `defineSecret("SOGNI_API_KEY")` binding.
4. Gateway binds only `SOGNI_API_KEY`. Set `GENERATOR_OWNER_UID=JZK1aIhqo5Zgl0oEbdCjhlko5qC3` and `GENERATOR_ALLOWED_ORIGIN=https://doppelgaenger-droid.github.io` in the **trusted Cloud Functions runtime environment** before deployment. The runtime fails closed if either is absent. Do not put any provider API secret into frontend variables.
5. From repository root: `npm install -g firebase-tools`, then `firebase deploy --only functions:generator:generatorGateway --project model-motion`. Before deploying, confirm the existing runtime environment settings persist.
6. Read the deployed URL from Firebase Functions. The frontend Pages deployment is separate.

## Account handover (staged, not deployed)

- New intended account UID: `JZK1aIhqo5Zgl0oEbdCjhlko5qC3`.
- Firestore/Storage rules in this PR temporarily authorize both the old and new UID; this is **not yet exclusive access**.
- The app filters existing `creativeAssets` on `uploadedBy == auth.uid`, stores new file paths under `users/<uid>`, and keeps scene snapshots under `<uid>`. Updating rules alone does not migrate old records or files.
- Audit residual documents, scene snapshots and objects using privileged administrative tooling; migrate/copy with integrity checks where applicable. Only then remove legacy UID, run rules tests and deploy exclusive access.
- Deploy rules separately using `firebase deploy --only firestore:rules,storage --project model-motion` **only after** reviewing the temporary dual-UID access window.

## Owner-only, read-only credential check
After deployment, send `POST <FUNCTION_URL>/sogni-check` with `Authorization: Bearer <FIREBASE_ID_TOKEN>` and the exact `Origin: https://doppelgaenger-droid.github.io`, if that is your configured origin. This checks Sogni `GET /v1/creative-agent/workflows?limit=1` and returns `authenticated: true`, `billingEnabled: false`, `dispatchEnabled: false` on success. Never send the Sogni API key in the request, browser bundle or screenshots.

The `/generate` route continues returning 503, and no paid Sogni submission route is exposed.

## Known gaps
- Cloud authentication and deployment have not been tested against the user's project in this PR.
- USD conversion from Sogni capacity units is unresolved; do not use guessed exchange rates.
- Provider policy and privately hosted media consent gate remain required before transmitting references.
- Legacy RunPod status path remains separate and is not a Sogni path.
- Run `node --test functions/generator/sogni.test.js` before merging.
