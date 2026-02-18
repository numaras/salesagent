/**
 * GAM credentials from config and env.
 * Supports service account (JSON string) and OAuth (env GAM_OAUTH_CLIENT_ID, GAM_OAUTH_CLIENT_SECRET + refresh token).
 */

import {
  GoogleRefreshTokenCredential,
  GoogleSACredential,
  type SACredential,
} from "@guardian/google-admanager-api";
import type { GamConfig } from "./types.js";

/** Build GAM credential from config. OAuth uses env GAM_OAUTH_CLIENT_ID, GAM_OAUTH_CLIENT_SECRET. */
export function buildGamCredential(config: GamConfig): SACredential {
  const { refreshToken, serviceAccountJson } = config;

  if (refreshToken) {
    const clientId = process.env.GAM_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GAM_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "GAM OAuth requires env GAM_OAUTH_CLIENT_ID and GAM_OAUTH_CLIENT_SECRET when using refresh_token"
      );
    }
    return new GoogleRefreshTokenCredential(clientId, clientSecret, refreshToken);
  }

  if (serviceAccountJson) {
    const parsed =
      typeof serviceAccountJson === "string"
        ? (JSON.parse(serviceAccountJson) as Record<string, unknown>)
        : serviceAccountJson;
    return new GoogleSACredential(parsed);
  }

  throw new Error(
    "GAM config requires either refreshToken or serviceAccountJson"
  );
}
