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


@patch("business_services.snsAnalysisService._fetch_youtube_title")
def test_analyze_uses_video_id_specific_fallbacks(mock_title):
    mock_title.return_value = ""

    first = client.post(
        "/analyze",
        json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
    ).json()
    second = client.post(
        "/analyze",
        json={"youtube_url": "https://youtu.be/dQw4w9WgXcQ", "locale": "ko"},
    ).json()

    assert [place["name"] for place in first["places"]] != [place["name"] for place in second["places"]]


@patch("business_services.snsAnalysisService._fetch_youtube_title")
def test_analyze_matches_title_keywords_before_fallback(mock_title):
    mock_title.return_value = "잠실 롯데타워 서울 여행 브이로그"

    response = client.post(
        "/analyze",
        json={"youtube_url": "https://www.youtube.com/watch?v=Kzn-32djk2U", "locale": "ko"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["places"][0]["name"] == "서울스카이"


def test_analyze_rejects_non_youtube_url():
    response = client.post("/analyze", json={"youtube_url": "https://example.com", "locale": "ko"})

    assert response.status_code == 400
