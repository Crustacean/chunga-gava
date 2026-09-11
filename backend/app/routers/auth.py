from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/admin", tags=["admin-auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    settings = get_settings()
    valid_user = payload.username == settings.admin_username
    valid_password = verify_password(payload.password, settings.admin_password_hash)
    if not (valid_user and valid_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=payload.username)
    return TokenResponse(access_token=token)
