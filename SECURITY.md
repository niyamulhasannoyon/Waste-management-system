# Security Policy

## Supported Versions

Only the latest state of the `main` branch across `apps/api`, `apps/web`, `apps/mobile`, and `packages/clean_savar_core` receives security fixes.

## Reporting a Vulnerability

Do **not** open public GitHub issues for suspected security vulnerabilities, authentication bypasses, or PII exposure.

1. Contact the repository maintainers privately via GitHub Private Vulnerability Reporting (Security tab -> Report a vulnerability) or direct maintainer contact.
2. Include a clear description, affected workspace (`apps/api`, `apps/web`, `apps/mobile`), reproduction steps, and potential impact.
3. Avoid testing against live municipal deployments or accessing real citizen data.

## Production Deployment Hardening Checklist

Before deploying Clean Savar outside a local machine:

- Set `APP_ENV=production` (the API fails closed at startup if `OTP_DEV_MODE=true` or `ALLOW_INSECURE_DEV_DEFAULTS=true` in production).
- Set `AUTH_SECRET` to a cryptographically random value of at least 32 bytes (e.g., `openssl rand -hex 32`).
- Set `CORS_ALLOWED_ORIGINS` to explicit HTTPS origins (wildcard `*` is rejected by the server).
- Leave `ADMIN_BOOTSTRAP_PHONES` empty after provisioning initial administrator accounts, and never commit `.env` files.
- Configure `TRUSTED_PROXY_IPS` only with the internal IP(s) of your TLS-terminating reverse proxy so client IP rate limiting uses verified headers rather than spoofable client headers.
- Do not enable `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true` on production web builds.
