# Deployment Guide

## Environments
- Local: developer machine + local/test Neon branch.
- Staging: separate Render service and Neon project, staging R2 bucket.
- Production: separate Render service, Neon production project and R2 production bucket.

## Render
Deploy FastAPI as a web service. Configure build/start commands and environment variables. Free services can sleep after inactivity and cold-start; the client must tolerate delayed API responses. Free service filesystems are ephemeral. Do not store uploads or durable databases there.

## Neon
Use Neon PostgreSQL as persistent relational database. Create development/staging/production projects or branches with strict separation. Use pooled connections where appropriate, migrations and backup/restore planning. Free quotas and plan terms change; re-check official docs before launch.

## Cloudflare R2
Use private buckets for protected content and public delivery only for non-sensitive assets. Use signed URLs when access control is needed. Store content version and checksums. Avoid excessive small-object requests; bundle static assets where appropriate.

## Android release
- Configure application ID and signing.
- Build development client for native modules.
- Use internal testing track first.
- Validate billing, ad reward verification, privacy declarations and data safety.
- Publish privacy policy and account deletion web page.
- Roll out gradually and monitor crash-free sessions.

## iOS readiness
Keep game logic pure TypeScript, avoid Android-only APIs in domain code, isolate platform adapters, validate Expo module support and plan Apple Sign In if applicable. iOS is a later milestone, not part of initial Android release.
