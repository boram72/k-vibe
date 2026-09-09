# presentation_api 창구 역할이지만, OAuth는 axios 응답이 아니라 브라우저 전체가 이동하는
# 302 리다이렉트로 응답한다는 점이 다른 라우터와 다르다(프로젝트 루트 OAUTH_INTEGRATION_REQUEST.md).
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from business_services import oauthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/{provider}/start")
def start(provider: str, redirect_uri: str):
    try:
        authorize_url = oauthService.build_authorize_redirect(provider, redirect_uri)
    except oauthService.OAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedirectResponse(authorize_url)


@router.get("/{provider}/callback")
def callback(provider: str, code: str | None = None, state: str | None = None):
    try:
        redirect_uri = oauthService.verify_state(provider, state or "")
    except oauthService.OAuthError as exc:
        # state를 신뢰할 수 없어 redirect_uri 자체를 모르는 상황(위변조/형식오류)이라
        # 프론트로 되돌려보내지 않고 에러 응답으로 끝낸다.
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not code:
        # 사용자가 provider 로그인 화면에서 거부한 경우 등 — 스펙대로 error=oauth_failed로 복귀.
        return RedirectResponse(f"{redirect_uri}?error=oauth_failed")

    try:
        user = oauthService.exchange_and_upsert(provider, code)
    except oauthService.OAuthError:
        return RedirectResponse(f"{redirect_uri}?error=oauth_failed")

    params = {"username": user["username"], "email": user.get("email") or ""}
    return RedirectResponse(f"{redirect_uri}?{urlencode(params)}")
