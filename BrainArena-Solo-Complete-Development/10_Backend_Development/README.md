# FastAPI Backend Starter

Use a modular monolith initially. Neon PostgreSQL is the persistent data store. Render hosts a stateless API service. Keep game play and generators on-device unless a particular generator requires server authority.

## Local setup
1. Create a Python virtual environment.
2. Install `requirements.txt`.
3. Copy `.env.example` to `.env`.
4. Configure a Neon development database URL.
5. Run `uvicorn app.main:app --reload`.
6. Apply Alembic migrations after the schema is reviewed.

Do not use the Render filesystem for user data. Use migrations and backups appropriate to the chosen Neon plan.
