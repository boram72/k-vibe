from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("business_services.snsAnalysisService._fetch_youtube_title")
@patch("business_services.snsAnalysisService._complete_with_groq", return_value="")
def test_analyze_youtube_url_returns_backend_places(mock_groq, mock_title):
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
    mock_groq.assert_called_once()


@patch("business_services.snsAnalysisService._fetch_youtube_title")
@patch("business_services.snsAnalysisService._complete_with_groq", return_value="")
def test_analyze_uses_video_id_specific_fallbacks(_, mock_title):
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
@patch("business_services.snsAnalysisService._complete_with_groq", return_value="")
def test_analyze_matches_title_keywords_before_fallback(_, mock_title):
    mock_title.return_value = "잠실 롯데타워 서울 여행 브이로그"

    response = client.post(
        "/analyze",
        json={"youtube_url": "https://www.youtube.com/watch?v=Kzn-32djk2U", "locale": "ko"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["places"][0]["name"] == "서울스카이"


def test_analyze_uses_groq_when_places_are_parseable():
    groq_payload = """
    [
      {
        "name": "성수연방",
        "category": "culture",
        "confidence": 0.91,
        "reason": "영상 제목에서 성수 여행 맥락을 추출",
        "lat": 37.543,
        "lng": 127.0547
      }
    ]
    """
    with (
        patch("business_services.snsAnalysisService._fetch_youtube_title", return_value="성수 여행 브이로그"),
        patch("business_services.snsAnalysisService._complete_with_groq", return_value=groq_payload),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "groq"
    assert body["places"][0]["name"] == "성수연방"
    assert body["places"][0]["lat"] == 37.543


def test_analyze_rejects_non_youtube_url():
    response = client.post("/analyze", json={"youtube_url": "https://example.com", "locale": "ko"})

    assert response.status_code == 400
