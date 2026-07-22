from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("business_services.snsAnalysisService._fetch_youtube_title")
def test_analyze_youtube_url_returns_backend_places(mock_title):
    mock_title.return_value = "성수 카페 브이로그"

    response = client.post(
        "/analyze",
        json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["videoId"] == "BKorP55Aqvg"
    assert body["source"] == "worker"
    assert body["places"][0]["name"] == "성수 카페거리"


def test_analyze_rejects_non_youtube_url():
    response = client.post("/analyze", json={"youtube_url": "https://example.com", "locale": "ko"})

    assert response.status_code == 400
