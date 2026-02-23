# Security Hardening Guide

This project includes built-in controls for application-layer security and provides deployment hooks for infrastructure hardening.

## Application Controls (Implemented)

- Secure session cookies with PostgreSQL-backed session storage
- OAuth/OIDC `state` protection
- Role-based admin authorization
- Admin CSRF same-origin checks
- Optional MFA gate via TOTP (`ADMIN_MFA_SECRET`)
- Auth rate limiting + lockout windows
- SSRF protection with DNS/IP validation for outbound webhook/OIDC fetches
- Encryption at rest for sensitive config fields
- Audit logging for admin mutations and auth events

## Environment Variables

- `NODE_ENV=production`
- `SESSION_SECRET=<strong-random-secret>`
- `ENCRYPTION_KEY=<32-byte-base64-or-64-hex>`
- `ADMIN_MFA_SECRET=<base32-or-raw-secret>` (optional, enables MFA challenge)
- `ADMIN_ALLOWED_IPS=203.0.113.10,198.51.100.0/24` (optional admin IP allowlist)
- `TRUST_PROXY=loopback` (or a stricter value matching your proxy topology)
- `AUTH_LOCKOUT_THRESHOLD=5`
- `AUTH_LOCKOUT_WINDOW_MS=900000`
- `AUTH_LOCKOUT_DURATION_MS=900000`

## Secret Lifecycle Operations

- Encrypt legacy plaintext secrets:
  - `DRY_RUN=true npm run db:encrypt-secrets`
  - `npm run db:encrypt-secrets`
- Rotate encryption key:
  - `DRY_RUN=true OLD_ENCRYPTION_KEY=... ENCRYPTION_KEY=... npm run db:rotate-encryption-key`
  - `OLD_ENCRYPTION_KEY=... ENCRYPTION_KEY=... npm run db:rotate-encryption-key`

## Infrastructure Controls (Deployment)

1. Place `/admin` behind an identity-aware proxy/WAF (Cloudflare Access, etc.).
2. Restrict ingress to admin paths by source IP and/or SSO policy.
3. Keep PostgreSQL private (no public listener).
4. Store runtime secrets in a managed secret store (not plaintext files).
5. Enable centralized alerting for auth failures, admin mutations, and token changes.

