// Provider capabilities are declarations, not proof of account access or prices.
export const PROVIDERS = Object.freeze({
  artcraft: Object.freeze({
    id: "artcraft", state: "credential-pending", enabled: false,
    dispatchEnabled: false, referenceUploadsEnabled: false,
    pricingVerified: false, modelsVerified: false
  }),
  sogni: Object.freeze({
    id: "sogni", state: "credentials-verified-separate-service",
    enabled: false, dispatchEnabled: false,
    referenceUploadsEnabled: false, pricingVerified: false, modelsVerified: false
  })
});
export function publicRegistry() {
  return Object.values(PROVIDERS).map(({ id, state, enabled, dispatchEnabled,
    referenceUploadsEnabled, pricingVerified, modelsVerified }) => ({
      id, state, enabled, dispatchEnabled, referenceUploadsEnabled,
      pricingVerified, modelsVerified
    }));
}
