from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _kakao_coords(query: str):
    return {"성수연방": {"latitude": 37.543, "longitude": 127.0547}}.get(query)


@patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value="")
@patch("ai_services.gemini_client.analyze_video", return_value="")
@patch("externelAPI_services.youtube.fetch_youtube_title")
@patch("ai_services.groq_client.complete", return_value="")
def test_analyze_fails_when_no_places_extracted(_, mock_title, mock_analyze_video, ___):
    # 2026-09: 예전엔 여기서 규칙기반 워커로 폴백해 200 + 서울 고정 후보를
    # 돌려줬다(예: 제주 여행 영상인데 서울 장소가 나오는 등 실제 영상 내용과
    # 무관한 가짜 성공). 이제는 모든 AI 경로가 실패하면 502로 진짜 실패를
    # 알린다 — 프론트가 "분석 실패, 다시 시도해주세요"를 보여주게 하기 위함.
    mock_title.return_value = "성수 카페 브이로그"

    response = client.post(
        "/analyze",
        json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
    )

    assert response.status_code == 502
    mock_analyze_video.assert_called_once()


def test_analyze_uses_groq_when_transcript_places_are_parseable():
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="성수 여행 브이로그"),
        patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value="오늘은 성수연방에 다녀왔어요"),
        patch("ai_services.groq_client.complete", return_value='["성수연방"]'),
        patch("externelAPI_services.kakaomap.search_coordinates", side_effect=_kakao_coords),
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
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="성수 여행 브이로그"),
        patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value="오늘은 성수연방에 다녀왔어요"),
        patch("ai_services.groq_client.complete", return_value=""),
        patch("ai_services.gemini_client.complete", return_value='["성수연방"]'),
        patch("ai_services.openai_client.complete", return_value=""),
        patch("externelAPI_services.kakaomap.search_coordinates", side_effect=_kakao_coords),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "gemini"
    assert body["places"][0]["name"] == "성수연방"


def test_analyze_falls_back_to_openai_when_groq_and_gemini_are_empty():
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="성수 여행 브이로그"),
        patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value="오늘은 성수연방에 다녀왔어요"),
        patch("ai_services.groq_client.complete", return_value=""),
        patch("ai_services.gemini_client.complete", return_value=""),
        patch("ai_services.openai_client.complete", return_value='["성수연방"]'),
        patch("externelAPI_services.kakaomap.search_coordinates", side_effect=_kakao_coords),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "openai"
    assert body["places"][0]["name"] == "성수연방"


def test_analyze_falls_back_to_video_analysis_when_transcript_has_no_places():
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="부산 여행 브이로그"),
        patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value=""),
        patch("ai_services.groq_client.complete", return_value=""),
        patch("ai_services.gemini_client.complete", return_value=""),
        patch("ai_services.openai_client.complete", return_value=""),
        patch("ai_services.gemini_client.analyze_video", return_value='["성수연방"]'),
        patch("externelAPI_services.kakaomap.search_coordinates", side_effect=_kakao_coords),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "gemini"
    assert body["places"][0]["name"] == "성수연방"


def test_analyze_fails_when_geocoding_fails():
    with (
        patch("externelAPI_services.youtube.fetch_youtube_title", return_value="성수 카페 브이로그"),
        patch("externelAPI_services.youtube.fetch_youtube_transcript", return_value="오늘은 어딘가에 다녀왔어요"),
        patch("ai_services.groq_client.complete", return_value='["존재하지않는장소"]'),
        patch("ai_services.gemini_client.complete", return_value=""),
        patch("ai_services.gemini_client.analyze_video", return_value=""),
        patch("externelAPI_services.kakaomap.search_coordinates", return_value=None),
    ):
        response = client.post(
            "/analyze",
            json={"youtube_url": "https://www.youtube.com/watch?v=BKorP55Aqvg", "locale": "ko"},
        )

    assert response.status_code == 502


def test_analyze_rejects_non_youtube_url():
    response = client.post("/analyze", json={"youtube_url": "https://example.com", "locale": "ko"})

    assert response.status_code == 400
