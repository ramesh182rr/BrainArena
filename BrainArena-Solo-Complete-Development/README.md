# BrainArena Solo — Complete Development Blueprint

**Version:** 1.0.0  
**Prepared:** 16 November 2026  
**Product:** Android-first, iOS-ready puzzle gaming platform  
**Owner model:** Solo developer using Claude Code and VS Code

## What this package is
This is a detailed product, game-design, architecture, implementation and launch blueprint. It includes an original game catalogue, 30 individual game design documents, starter code, reference visuals, procedural-generation examples, QA plans, Claude Code prompts and deployment guidance.

**Important scope distinction:** This package is a development-ready specification and starter scaffold, not a finished 30-game commercial application. Every game still requires implementation, iterative playtesting, balancing, accessibility review and original asset production. The included source files demonstrate the intended architecture and selected reusable foundations; they do not pretend that all 30 complete games have already been coded.

## Product definition
BrainArena Solo is a playful puzzle gaming universe with six puzzle worlds and 30 original game concepts. Players can explore games freely, follow personalised Daily Arena sessions, and take part in optional special challenges. The app tracks in-game performance to tune recommendations and game difficulty. It is recreational entertainment, not a diagnostic or treatment product.

## Confirmed product decisions
- Audience: adults 18+
- Android-first; iOS-ready architecture
- React Native + TypeScript + Expo development builds
- Python + FastAPI backend
- Render for API hosting, Neon PostgreSQL for persistent relational data, Cloudflare R2 for object assets
- SQLite for offline-first local persistence
- Guest-first, optional account and cloud sync
- English first; localisation-ready
- 6 worlds, 30 original game concepts
- Handcrafted + procedural + hybrid level content; endless progression where quality permits
- Free exploration + personalised daily challenges
- Freemium, premium subscription later, optional rewarded ads only
- Colourful playful visual identity, primarily 2D with selected 3D environments/effects
- Portrait-first; landscape only for justified games
- No mandatory paid AI API dependency
- Original gameplay, content, art direction and level design; existing games are research references only

## Start here
1. `01_Market_Research/Market_Analysis.md`
2. `02_Product_Strategy_PRD/PRD.md`
3. `03_Game_Design_Documents/Game_Catalogue.md`
4. `08_System_Architecture/Architecture.md`
5. `11_Claude_Code_Instructions/CLAUDE.md`
6. `11_Claude_Code_Instructions/MASTER_BUILD_PROMPT.md`
7. `14_Project_Management/Roadmap.md`

## Suggested first technical milestone
Build the app shell, SQLite event store, content registry, one reusable puzzle runtime and one vertical-slice game. Do not begin by asking Claude Code to implement all 30 games at once.

## Environment safety
- Never commit secrets, signing keys, service-role keys or production credentials.
- `.env.example` contains placeholders only.
- Neon is the persistent database. Do not use Render's ephemeral filesystem for user data.
- Free Render services may sleep; the mobile app must remain useful when the API is unavailable.
- Treat free-plan quotas as changeable; verify provider pricing and terms before launch.

## Originality and IP
The reference titles in the research document are used only to identify broad puzzle-design patterns. Do not copy proprietary level layouts, story text, characters, artwork, UI composition, sounds, branding or distinctive expression. Each game GDD defines a new interaction concept. Conduct human originality and legal review before release.
