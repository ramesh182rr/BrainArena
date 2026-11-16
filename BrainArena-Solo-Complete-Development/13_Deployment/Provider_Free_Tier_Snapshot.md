# Provider Free-Tier Snapshot

**Checked:** 16 November 2026. Provider terms can change; verify immediately before deployment and set billing/usage alerts.

## Render
- Free web services spin down after 15 minutes without inbound traffic and can take about a minute to wake.
- Free web service filesystem is ephemeral.
- Free Render PostgreSQL is limited and expires 30 days after creation.
- Use Render free for development/soft testing only; keep persistent relational data in Neon.
Sources:
- https://render.com/docs/free
- https://render.com/docs/faq

## Neon
Current official documentation surfaced 100 projects, 100 compute-hours per project/month, 1 GB storage per project and 5 GB public network transfer per project/month for the Free plan. Compute scales to zero after inactivity. Verify the exact dashboard limits for the account and region.
Sources:
- https://neon.com/docs/introduction/plans
- https://neon.com/blog/neon-free-plan-1-gb-per-project

## Cloudflare R2
Standard storage free allowance currently lists 10 GB-month, 1 million Class A operations and 10 million Class B operations per month, with no egress fees. Infrequent Access has different pricing and retrieval charges; use Standard for the initial asset bucket unless a measured use case says otherwise.
Source:
- https://developers.cloudflare.com/r2/pricing/

## Cost posture
The stack can support a low-cost prototype, not a promise of a permanently free production service. Costs may arise from API uptime, database usage, analytics, billing, ad mediation, domains, monitoring and build/release tooling. Add budget alerts and a monthly usage review.
