from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any
router = APIRouter(tags=["sync"])

class SyncEvent(BaseModel):
    event_id: str
    event_type: str
    occurred_at: str
    game_id: str | None = None
    payload_version: int = 1
    payload: dict[str, Any] = Field(default_factory=dict)

class SyncBatch(BaseModel):
    events: list[SyncEvent] = Field(max_length=100)

@router.post("/sync/events")
def ingest_events(batch: SyncBatch):
    # TODO: verify identity, validate game IDs, persist in transaction,
    # and enforce UNIQUE(event_id) for idempotency.
    # This starter intentionally does not trust arbitrary client profile IDs.
    return {
        "accepted_event_ids": [],
        "duplicate_event_ids": [],
        "rejected_events": [
            {"event_id": e.event_id, "code": "NOT_IMPLEMENTED"}
            for e in batch.events
        ],
        "next_cursor": None
    }
