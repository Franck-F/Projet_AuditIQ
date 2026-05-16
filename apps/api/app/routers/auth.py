from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUser)
async def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:  # noqa: B008
    return user
