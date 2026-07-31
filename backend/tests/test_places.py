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


@patch("presentation_api.places.tourAPI.get_place_detail")
def test_get_place_detail_returns_404_when_not_found(mock_get_detail):
    mock_get_detail.return_value = None

    response = client.get("/places/no-such-id")

    assert response.status_code == 404
