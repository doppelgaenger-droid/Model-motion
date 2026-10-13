# Provider content policies and deployment modes

Reviewed: 2026-10-13. Research notes, not legal advice or an authorization to submit any category of content. Re-check current provider terms before enabling a model or production routing.

## Rules for the Generation Router

- Evaluate the hosting platform's Acceptable Use Policy **and** the underlying model's license/model card separately. A model offered on an inference marketplace does not imply all content is allowed.
- Use three independent flags: `inputReferenceClass`, `outputContentClass`, and `hostingMode` (`local`, `remote-self-hosted`, `managed-api`). Do not collapse nudity, sensual content and sexually explicit content into a single Boolean.
- States should be `confirmed-allowed`, `confirmed-prohibited`, and `unverified`. Treat `unverified` as not routable until reviewed.
- No external submission of private or intimate reference images without explicit, informed approval, provider retention/privacy review and necessary rights/consent. Never route nonconsensual intimate imagery or any sexualized minor content.
- Content policy denial is final for that provider. Budget increases, retries, provider fallback, or disabling a safety checker must not override policy.
- Keep audit evidence: provider, model/version, policy URL, date checked, applicable scope, category decision and human approval where required.
- Generation cost caps are separate from the policy gate: user-adjustable limits require approval before exceeding the cap.

## Provider policy matrix (reviewed 2026-10-13)

| Provider | Adult nudity | Sexually explicit content | Notes / policy evidence |
| --- | --- | --- | --- |
| Runway (hosted/API) | Prohibited | Prohibited | Policy expressly prohibits both and sometimes limits lingerie: https://runway.com/safety/usage-policy |
| Luma (hosted/API) | Prohibited | Prohibited | Terms prohibit nudity in inputs and pornographic content; moderation policy disallows NSFW: https://luma.ai/terms-and-conditions ; https://lumalabs.ai/legal/content-moderation-policy |
| fal.ai (hosting platform) | Not blanket-approved | Prohibited by AUP | AUP prohibits generating harmful or sexually explicit content; model policies also apply: https://fal.ai/legal/acceptable-use-policy |
| Google Veo / Gemini API | Unverified for precise category/surface | Do not enable absent express approval | Check applicable API terms, model safety rules, location, and data-handling terms before configuring. |
| Pika | Unverified | Unverified | Do not infer permission from a model name or accessible endpoint. |
| Kling AI | Unverified | Unverified | Obtain current API-specific terms. |
| MiniMax / Hailuo | Unverified | Unverified | Obtain current API-specific terms. |
| Replicate | Model/platform-specific; unverified | Model/platform-specific; unverified | Review current platform terms AND exact model documentation before enabling. |
| Wan 2.2 weights (self-hosted) | Model/license review required | Model/license and legal review required | Self-hosted deployment changes privacy/infrastructure, not legal obligations; https://github.com/Wan-Video/Wan2.2 |
| ComfyUI | N/A | N/A | Orchestrator, not a content-policy waiver or model; supports Wan 2.2 locally: https://blog.comfy.org/p/wan22-day-0-support-in-comfyui |

*No entries marked unverified are approvals.*

## Wan deployment architecture

Wan does **not** have to run on the user's PC. Supported design options:

1. `local`: Model Motion browser UI -> authenticated private local bridge -> local ComfyUI queue -> Wan checkpoint -> output stored locally; do not expose ComfyUI unauthenticated to the public internet. GitHub Pages cannot run Wan or safely hold provider tokens.
2. `remote-self-hosted`: UI -> authenticated backend -> private ComfyUI running on rented GPU -> output. Private in ownership does not automatically mean zero third-party retention.
3. `managed-api`: UI -> authenticated backend -> provider API -> provider queue and polling/webhooks. Governed by provider and model policies.

For local usage, confirm GPU model, VRAM, system RAM and disk before selecting Wan variant, resolution and offloading settings. A 16 GB GPU may require quantized/reduced-memory workflows and is not a blanket guarantee for large Wan models.

## Implementation status

Documentation only. This file does not claim that the policy gate, Wan adapter, local bridge or third-party policy crawler are implemented. The matrix must be verified again prior to enabling real jobs.
