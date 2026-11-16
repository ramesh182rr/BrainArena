from fastapi import APIRouter
router = APIRouter(tags=["catalogue"])

@router.get("/catalogue")
def catalogue():
    # Replace with versioned content repository; do not hardcode full catalogue here.
    return {"version": "0.1.0", "worlds": [], "games": []}
