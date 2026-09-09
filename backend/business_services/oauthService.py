# OAuth 로그인 중계 — Google/Kakao 인가코드를 프로필로 교환하고 user 테이블에 upsert한다.
# 프로젝트 루트의 OAUTH_INTEGRATION_REQUEST.md 스펙을 따른다: 프론트가 이미 브라우저 전체를
# 이동시키는 리다이렉트 흐름(axios 아님)으로 만들어져 있어, 백엔드가 OAuth 전체를 중계한다.
import base64
import hashlib
import hmac
import json
import secrets
from urllib.parse import urlencode, urlparse

import httpx

from config.configure import (
    BACKEND_PUBLIC_URL,
    CORS_ALLOWED_ORIGINS,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    KAKAO_CLIENT_SECRET,
    KAKAO_REST_API_KEY,
)
from data_repositories import userinfo

PROVIDERS = {"google", "kakao"}

_GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
_KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
_KAKAO_USERINFO_URL = "https://kapi.kakao.com/v2/user/me"


class OAuthError(Exception):
    """redirect_uri 검증 실패, provider 통신 실패 등 — 호출부(presentation_api/auth.py)가
    400 응답 또는 ?error=oauth_failed 리다이렉트로 처리할 사유."""


def _state_secret(provider: str) -> str:
    # state 서명 전용 비밀값을 별도 환경변수로 늘리지 않고, provider마다 이미 있는(그리고
    # 이미 유출되면 안 되는) client_secret을 재사용한다.
    secret = GOOGLE_CLIENT_SECRET if provider == "google" else KAKAO_CLIENT_SECRET
    if not secret:
        raise OAuthError(f"{provider} client secret이 설정되지 않았습니다.")
    return secret


def is_allowed_redirect_uri(redirect_uri: str) -> bool:
    """오픈 리다이렉트 방지: origin이 main.py CORS allow_origins 목록에 있는지만 검증한다
    (OAUTH_INTEGRATION_REQUEST.md 열린 질문 2)."""
    parsed = urlparse(redirect_uri)
    return f"{parsed.scheme}://{parsed.netloc}" in CORS_ALLOWED_ORIGINS


def _sign_state(provider: str, redirect_uri: str) -> str:
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps({"redirect_uri": redirect_uri, "nonce": secrets.token_urlsafe(16)}).encode()
    ).decode()
    signature = hmac.new(_state_secret(provider).encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_state(provider: str, state: str) -> str:
    """state 서명을 검증하고 원래 redirect_uri를 복원한다. 위변조/형식오류 시 OAuthError."""
    if provider not in PROVIDERS:
        raise OAuthError(f"지원하지 않는 provider입니다: {provider}")
    try:
        payload_b64, signature = state.split(".", 1)
    except ValueError as exc:
        raise OAuthError("잘못된 state 형식입니다.") from exc
    expected = hmac.new(_state_secret(provider).encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise OAuthError("state 서명이 일치하지 않습니다.")
    payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
    return payload["redirect_uri"]


def _callback_url(provider: str) -> str:
    if not BACKEND_PUBLIC_URL:
        raise OAuthError("BACKEND_PUBLIC_URL 환경변수가 설정되지 않았습니다.")
    return f"{BACKEND_PUBLIC_URL}/auth/{provider}/callback"


def build_authorize_redirect(provider: str, redirect_uri: str) -> str:
    """/auth/{provider}/start가 302로 이동시킬 provider 로그인 화면 URL을 만든다."""
    if provider not in PROVIDERS:
        raise OAuthError(f"지원하지 않는 provider입니다: {provider}")
    if not is_allowed_redirect_uri(redirect_uri):
        raise OAuthError(f"허용되지 않은 redirect_uri입니다: {redirect_uri}")

    state = _sign_state(provider, redirect_uri)
    callback_url = _callback_url(provider)

    if provider == "google":
        if not GOOGLE_CLIENT_ID:
            raise OAuthError("GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.")
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": callback_url,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return f"{_GOOGLE_AUTHORIZE_URL}?{urlencode(params)}"

    if not KAKAO_REST_API_KEY:
        raise OAuthError("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.")
    params = {
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": callback_url,
        "response_type": "code",
        "state": state,
    }
    return f"{_KAKAO_AUTHORIZE_URL}?{urlencode(params)}"


def _exchange_google_code(code: str) -> dict:
    with httpx.Client(timeout=10.0) as http_client:
        token_res = http_client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": _callback_url("google"),
                "grant_type": "authorization_code",
            },
        )
        token_res.raise_for_status()
        access_token = token_res.json()["access_token"]

        profile_res = http_client.get(_GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        profile_res.raise_for_status()
        profile = profile_res.json()

    return {"provider_user_id": profile["sub"], "email": profile.get("email")}


def _exchange_kakao_code(code: str) -> dict:
    data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": _callback_url("kakao"),
        "code": code,
    }
    if KAKAO_CLIENT_SECRET:
        data["client_secret"] = KAKAO_CLIENT_SECRET

    with httpx.Client(timeout=10.0) as http_client:
        token_res = http_client.post(_KAKAO_TOKEN_URL, data=data)
        token_res.raise_for_status()
        access_token = token_res.json()["access_token"]

        profile_res = http_client.get(_KAKAO_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        profile_res.raise_for_status()
        profile = profile_res.json()

    kakao_account = profile.get("kakao_account") or {}
    return {"provider_user_id": str(profile["id"]), "email": kakao_account.get("email")}


def exchange_and_upsert(provider: str, code: str) -> dict:
    """code로 provider 프로필을 조회하고 user 테이블에 upsert한다."""
    try:
        profile = _exchange_google_code(code) if provider == "google" else _exchange_kakao_code(code)
    except (httpx.HTTPError, KeyError) as exc:
        raise OAuthError(f"{provider} 프로필 조회에 실패했습니다.") from exc

    # route_draft_stop/saved_places 등 다른 테이블이 전부 user.username을 FK로 참조하므로,
    # ID/PW 가입 유저(사용자가 직접 정한 username)와 겹치지 않도록 provider_{provider_user_id}로
    # 고유하게 만든다(OAUTH_INTEGRATION_REQUEST.md 열린 질문 1).
    username = f"{provider}_{profile['provider_user_id']}"
    return userinfo.upsert_oauth_user(username, profile.get("email"))
