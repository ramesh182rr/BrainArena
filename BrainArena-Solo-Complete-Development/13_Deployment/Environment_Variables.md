# Environment Variable Inventory

## Backend
- `APP_ENV`
- `DATABASE_URL`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `ALLOWED_ORIGINS`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `BILLING_PROVIDER`
- `ADS_SSV_SECRET`

## Mobile public configuration
Only public, non-secret values may be embedded:
- API base URL
- public content CDN base URL
- public analytics write key only if provider documents it as public

Never embed database credentials, R2 secret key, billing service credentials, private auth signing keys or ad server secrets in the mobile app.
