from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_returns_200_with_body(mock_get_detail):
    mock_get_detail.return_value = {
        "phone": "02-1234-5678",
        "businessHours": "09:00~18:00 (매주 화요일 휴무)",
        "overview": "설명",
        "tags": ["고궁"],
    }

    response = client.get("/places/126508")

    assert response.status_code == 200
    assert response.json() == {
        "phone": "02-1234-5678",
        "businessHours": "09:00~18:00 (매주 화요일 휴무)",
        "overview": "설명",
        "tags": ["고궁"],
    }
    mock_get_detail.assert_called_once_with("126508")


@patch("presentation_api.places.locationinfo.get_location_by_place_id")
@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_returns_404_when_not_found(mock_get_detail, mock_get_location):
    mock_get_detail.return_value = None
    mock_get_location.return_value = None

    response = client.get("/places/no-such-id")

    assert response.status_code == 404


@patch("presentation_api.places.searchGoogle.get_opening_hours")
@patch("presentation_api.places.locationinfo.get_location_by_place_id")
@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_falls_back_to_db_and_google_when_tourapi_fails(
    mock_get_detail, mock_get_location, mock_get_hours
):
    """TourAPI detailCommon2가 실패해도(현재 늘 실패) DB 캐시 + 구글 폴백으로 200을 반환해야 한다."""
    mock_get_detail.return_value = None
    mock_get_location.return_value = {
        "name": "경복궁",
        "address": "서울 종로구",
        "tags": ["고궁"],
    }
    mock_get_hours.return_value = "월-일: 09:00~18:00"

    response = client.get("/places/126508")

    assert response.status_code == 200
    assert response.json() == {
        "phone": None,
        "businessHours": "월-일: 09:00~18:00",
        "overview": None,
        "tags": ["고궁"],
    }
    mock_get_hours.assert_called_once_with(name="경복궁", address="서울 종로구")


@patch("presentation_api.places.searchGoogle.get_opening_hours")
@patch("presentation_api.places.locationinfo.get_location_by_place_id")
@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_uses_google_fallback_only_when_tourapi_missing_hours(
    mock_get_detail, mock_get_location, mock_get_hours
):
    """TourAPI가 값은 주지만 영업시간만 비어있는 경우에도 구글로 채운다."""
    mock_get_detail.return_value = {
        "phone": "02-1234-5678",
        "businessHours": None,
        "overview": "설명",
        "tags": ["고궁"],
    }
    mock_get_location.return_value = {"name": "경복궁", "address": "서울 종로구"}
    mock_get_hours.return_value = "월-일: 09:00~18:00"

    response = client.get("/places/126508")

    assert response.status_code == 200
    assert response.json()["phone"] == "02-1234-5678"
    assert response.json()["businessHours"] == "월-일: 09:00~18:00"


@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_skips_db_lookup_when_tourapi_has_hours(mock_get_detail):
    """TourAPI가 영업시간까지 정상 제공하면 DB/구글 폴백을 아예 타지 않아야 한다."""
    mock_get_detail.return_value = {
        "phone": "02-1234-5678",
        "businessHours": "09:00~18:00 (매주 화요일 휴무)",
        "overview": "설명",
        "tags": ["고궁"],
    }

    response = client.get("/places/126508")

    assert response.status_code == 200
    assert response.json()["businessHours"] == "09:00~18:00 (매주 화요일 휴무)"
