from unittest.mock import patch

from fastapi.testclient import TestClient

from business_services import oauthService
from main import app

client = TestClient(app)


@patch("business_services.oauthService.CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
def test_auth_start_rejects_disallowed_redirect_uri():
    response = client.get(
        "/auth/google/start",
        params={"redirect_uri": "https://evil.example.com/callback"},
        follow_redirects=False,
    )
    assert response.status_code == 400


@patch("business_services.oauthService.CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
@patch("business_services.oauthService.BACKEND_PUBLIC_URL", "http://localhost:8000")
@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
@patch("business_services.oauthService.GOOGLE_CLIENT_ID", "test-client-id")
def test_auth_start_redirects_to_google():
    response = client.get(
        "/auth/google/start",
        params={"redirect_uri": "http://localhost:5173/auth/callback"},
        follow_redirects=False,
    )
    assert response.status_code in (302, 307)
    assert response.headers["location"].startswith("https://accounts.google.com/")


def test_auth_callback_rejects_invalid_state():
    response = client.get(
        "/auth/google/callback",
        params={"code": "abc", "state": "invalid"},
        follow_redirects=False,
    )
    assert response.status_code == 400


@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
def test_auth_callback_redirects_with_error_when_code_missing():
    state = oauthService._sign_state("google", "http://localhost:5173/auth/callback")

    response = client.get(
        "/auth/google/callback",
        params={"state": state},
        follow_redirects=False,
    )

    assert response.status_code in (302, 307)
    assert response.headers["location"] == "http://localhost:5173/auth/callback?error=oauth_failed"


@patch("business_services.oauthService.exchange_and_upsert")
@patch("business_services.oauthService.GOOGLE_CLIENT_SECRET", "test-secret")
def test_auth_callback_redirects_with_user_on_success(mock_exchange_and_upsert):
    state = oauthService._sign_state("google", "http://localhost:5173/auth/callback")
    mock_exchange_and_upsert.return_value = {"username": "google_12345", "email": "a@example.com"}

    response = client.get(
        "/auth/google/callback",
        params={"code": "auth-code", "state": state},
        follow_redirects=False,
    )

    assert response.status_code in (302, 307)
    assert response.headers["location"] == (
        "http://localhost:5173/auth/callback?username=google_12345&email=a%40example.com"
    )
