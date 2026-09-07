from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("externelAPI_services.youtube.fetch_youtube_title")
@patch("ai_services.groq_client.complete", return_value="")
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


@patch("externelAPI_services.youtube.fetch_youtube_title")
@patch("ai_services.groq_client.complete", return_value="")
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


@patch("externelAPI_services.youtube.fetch_youtube_title")
@patch("ai_services.groq_client.complete", return_value="")
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
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="성수 여행 브이로그"),
        patch("ai_services.groq_client.complete", return_value=groq_payload),
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


def test_analyze_falls_back_to_gemini_when_groq_is_empty():
    gemini_payload = """
    [
      {
        "name": "낙산공원",
        "category": "nature",
        "confidence": 0.8,
        "reason": "영상 제목에서 낙산 야경 언급",
        "lat": 37.5807,
        "lng": 127.0086
      }
    ]
    """
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="낙산공원 야경 브이로그"),
        patch("ai_services.groq_client.complete", return_value=""),
        patch("ai_services.gemini_client.complete", return_value=gemini_payload),
        patch("ai_services.openai_client.complete", return_value=""),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "gemini"
    assert body["places"][0]["name"] == "낙산공원"


def test_analyze_falls_back_to_openai_when_groq_and_gemini_are_empty():
    openai_payload = """
    [
      {
        "name": "을지로 노가리골목",
        "category": "restaurant",
        "confidence": 0.75,
        "reason": "영상 제목에서 을지로 노포 탐방 언급",
        "lat": 37.5663,
        "lng": 126.9915
      }
    ]
    """
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="을지로 노포 탐방 브이로그"),
        patch("ai_services.groq_client.complete", return_value=""),
        patch("ai_services.gemini_client.complete", return_value=""),
        patch("ai_services.openai_client.complete", return_value=openai_payload),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "openai"
    assert body["places"][0]["name"] == "을지로 노가리골목"


def test_analyze_rejects_non_youtube_url():
    response = client.post("/analyze", json={"youtube_url": "https://example.com", "locale": "ko"})

    assert response.status_code == 400
