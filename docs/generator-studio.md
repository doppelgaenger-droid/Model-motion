# Generator Studio — isolated prototype

Branch: `feature/generator-studio-api`. This is a prototype, not a deployed generation service.

## Architecture
- React `GeneratorStudio` is accessible under Library Tools.
- Firebase Authentication ID token is attached to requests; backend verifies it and restricts access to a single UID.
- Existing `creativeAssets` records provide Mara and Lily identity reference choices.
- Firebase Cloud Function routes `/generate` and `/status` to a configurable RunPod endpoint.
- Server-only secrets: `RUNPOD_API_KEY`, `FAL_KEY` (fal adapter currently returns 501). Never use VITE variables for secrets.

## Configuration / deployment
1. Configure a Firebase Functions deployment with source `functions/generator` in your Firebase project (Firebase CLI and Node 22).
2. Set `GENERATOR_OWNER_UID` to the authorized Firebase Auth user UID, `GENERATOR_ALLOWED_ORIGIN` to the exact Pages origin (e.g. `https://doppelgaenger-droid.github.io`), and `RUNPOD_ENDPOINT_ID` in Cloud Functions runtime environment. These are server-side variables.
3. Set the Cloud Functions secret `RUNPOD_API_KEY` using Firebase CLI. The fal secret is reserved for future implementation.
4. Supply `VITE_GENERATOR_GATEWAY_URL` to the frontend build pointing to the deployed function URL.
5. Configure a RunPod worker that accepts `{input:{prompt,negative_prompt,aspect_ratio,reference_image,character_id}}` and returns `{imageUrl:"https://..."}` as job output. Worker compatibility is **not** established by this branch.

## Outstanding before production
- Do not treat this prototype as operational until RunPod worker, end-to-end deployment, security rules, tests and billing limits have been verified.
- URLs from existing Firebase assets may be accessible via possession of a tokenized link. Consider short-lived signed URLs/proxy for strict confidentiality.
- Generated images are currently previewed from RunPod output URLs; durable private Storage ingestion and Firestore asset creation have not been implemented.
- Add rate limiting, job quotas, model licensing review, content policy enforcement, polling and retry UX.
- Check Firebase billing plan before enabling Cloud Functions.
- The prototype intentionally leaves `main`, deployed Pages, and current character assets unchanged.
