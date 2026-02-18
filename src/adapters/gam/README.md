# GAM (Google Ad Manager) Adapter

TypeScript adapter for Google Ad Manager using `@guardian/google-admanager-api`.

## Environment variables (for OAuth)

When using **refresh token** auth, set:

- **`GAM_OAUTH_CLIENT_ID`** – OAuth2 client ID (from Google Cloud Console).
- **`GAM_OAUTH_CLIENT_SECRET`** – OAuth2 client secret.

Config (from tenant/DB or test) must then supply `refreshToken`. For **service account** auth, config supplies `serviceAccountJson` (or path via `serviceAccountKeyFile`); OAuth env vars are not required.

## Integration tests

Optional env-gated integration tests live in `tests/ts/adapters/gam/gamIntegration.test.ts`. They are skipped unless:

- **`GAM_INTEGRATION=1`**
- **`GAM_NETWORK_CODE`** – your GAM network code (numeric string).

To run against real GAM, also set one of:

- **`GAM_REFRESH_TOKEN`** and ensure `GAM_OAUTH_CLIENT_ID` / `GAM_OAUTH_CLIENT_SECRET` are set, or  
- **`GAM_SERVICE_ACCOUNT_JSON`** – full JSON key string.

Optional for create flow:

- **`GAM_ADVERTISER_ID`**, **`GAM_TRAFFICKER_ID`** – for order creation.

Example:

```bash
GAM_INTEGRATION=1 GAM_NETWORK_CODE=12345678 GAM_OAUTH_CLIENT_ID=... GAM_OAUTH_CLIENT_SECRET=... GAM_REFRESH_TOKEN=... npm test -- tests/ts/adapters/gam/gamIntegration.test.ts
```
