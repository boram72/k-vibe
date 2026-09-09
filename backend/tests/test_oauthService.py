from unittest.mock import patch

import pytest

from business_services import oauthService


@patch("business_services.oauthService.CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
def test_is_allowed_redirect_uri():
    assert oauthService.is_allowed_redirect_uri("http://localhost:5173/auth/callback")
    assert not oauthService.is_allowed_redirect_uri("https://evil.example.com/auth/callback")


@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
def test_sign_and_verify_state_roundtrip():
    redirect_uri = "http://localhost:5173/auth/callback"
    state = oauthService._sign_state("google", redirect_uri)
    assert oauthService.verify_state("google", state) == redirect_uri


@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
def test_verify_state_rejects_tampered_signature():
    state = oauthService._sign_state("google", "http://localhost:5173/auth/callback")
    tampered = state[:-1] + ("0" if state[-1] != "0" else "1")
    with pytest.raises(oauthService.OAuthError):
        oauthService.verify_state("google", tampered)


def test_verify_state_rejects_unsupported_provider():
    with pytest.raises(oauthService.OAuthError):
        oauthService.verify_state("naver", "anything")


@patch("business_services.oauthService.CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
@patch("business_services.oauthService.BACKEND_PUBLIC_URL", "http://localhost:8000")
@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
@patch("business_services.oauthService.GOOGLE_CLIENT_ID", "test-client-id")
def test_build_authorize_redirect_google():
    url = oauthService.build_authorize_redirect("google", "http://localhost:5173/auth/callback")
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=test-client-id" in url
    assert "state=" in url


@patch("business_services.oauthService.CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
def test_build_authorize_redirect_rejects_disallowed_redirect_uri():
    with pytest.raises(oauthService.OAuthError):
        oauthService.build_authorize_redirect("google", "https://evil.example.com/callback")


@patch("business_services.oauthService.userinfo.upsert_oauth_user")
@patch("business_services.oauthService._exchange_google_code")
def test_exchange_and_upsert_derives_username_from_provider_and_id(mock_exchange, mock_upsert):
    mock_exchange.return_value = {"provider_user_id": "12345", "email": "a@example.com"}
    mock_upsert.return_value = {"username": "google_12345", "email": "a@example.com"}

    user = oauthService.exchange_and_upsert("google", "auth-code")

    mock_upsert.assert_called_once_with("google_12345", "a@example.com")
    assert user["username"] == "google_12345"
