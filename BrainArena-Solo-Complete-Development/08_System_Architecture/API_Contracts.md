# API Contracts — v1

Base path: `/v1`. All endpoints require TLS. Authenticated endpoints accept a verified bearer token. Guest sync uses a scoped guest credential or signed device/profile token; do not trust a raw client-supplied profile ID.

## Endpoints
- `GET /health` — liveness, no secrets.
- `GET /catalogue` — worlds, games and content versions.
- `GET /catalogue/games/{game_id}` — game metadata and generator configuration.
- `POST /sync/events` — idempotent event batch ingestion.
- `GET /sync/changes?cursor=...` — server changes since cursor.
- `GET /arena/daily` — generate or retrieve current daily plan.
- `POST /profiles/guest` — create guest profile token.
- `POST /profiles/link` — link guest profile to authenticated account.
- `GET /profiles/me` — current profile and preferences.
- `PATCH /profiles/me` — update allowed preferences.
- `GET /progress/summary` — derived progress.
- `POST /billing/verify` — verify purchase with provider adapter.
- `POST /ads/reward/verify` — validate rewarded ad server-side callback/SSV.
- `DELETE /profiles/me` — deletion workflow; require re-auth where appropriate.

## Sync event request
```json
{
  "events": [{
    "event_id": "uuid",
    "event_type": "level_completed",
    "occurred_at": "2026-11-16T12:00:00Z",
    "game_id": "W3-G01",
    "game_version": "1.0.0",
    "payload_version": 1,
    "payload": {
      "seed": "hex-or-string",
      "generator_version": "1",
      "difficulty": "standard",
      "score": 840,
      "completed": true,
      "moves": 12,
      "hints_used": 0
    }
  }]
}
```

Response returns `accepted_event_ids`, `duplicate_event_ids`, `rejected_events` with stable error codes and `next_cursor`.

## Error format
```json
{
  "error": {
    "code": "INVALID_EVENT_PAYLOAD",
    "message": "The event payload is invalid.",
    "request_id": "opaque-id"
  }
}
```

## API rules
- Reject unknown fields on sensitive schemas.
- Cap event batch size and payload bytes.
- Idempotency is mandatory.
- Validate game IDs against published catalogue.
- Client score is untrusted; where feasible, validate score/result against game rules or signed deterministic result metadata.
- Do not expose internal admin endpoints publicly.
