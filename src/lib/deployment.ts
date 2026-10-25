// Deployment-level web addresses (tied to DNS, the native app's links and the
// sign-in allowed-redirect list), deliberately NOT Unit Setup values: they are
// needed before any lookup can run and changing them is a deployment change.
// This is the only front-end file that may hold them (guarded by a test).
export const DEPLOYMENT_ORIGIN = "https://weybridgelodge.org.uk";
/** Hosts that must stay indexable (never get the noindex tag). */
export const PRODUCTION_HOSTS = ["weybridgelodge.org.uk", "www.weybridgelodge.org.uk"] as const;
/** Host shown in "Visit <host>" in the native app. */
export const DEPLOYMENT_HOST = new URL(DEPLOYMENT_ORIGIN).host;
