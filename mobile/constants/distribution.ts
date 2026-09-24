/**
 * Build invariant: this binary is permanently bound to the server-controlled
 * Google Play catalog. There is no runtime switch or user-controlled channel.
 */
export const APP_DISTRIBUTION = "GOOGLE_PLAY" as const;
