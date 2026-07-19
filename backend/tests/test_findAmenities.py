from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("presentation_api.findAmenities.amenities.find_nearby_amenities")
def test_find_amenities_calls_service_with_query_params(mock_find):
    mock_find.return_value = [{"id": "1", "name": "테스트 편의점"}]

    response = client.get("/amenities", params={"lat": 37.5, "lng": 127.0, "radius": 2000})

    assert response.status_code == 200
    assert response.json() == [{"id": "1", "name": "테스트 편의점"}]
    mock_find.assert_called_once_with(latitude=37.5, longitude=127.0, radius=2000, category=None)


@patch("presentation_api.findAmenities.amenities.find_nearby_amenities")
def test_find_amenities_uses_default_radius_when_not_given(mock_find):
    mock_find.return_value = []

    client.get("/amenities", params={"lat": 37.5, "lng": 127.0})

    mock_find.assert_called_once_with(latitude=37.5, longitude=127.0, radius=1000, category=None)


@patch("presentation_api.findAmenities.amenities.find_nearby_amenities")
def test_find_amenities_forwards_category_filter(mock_find):
    mock_find.return_value = []

    client.get("/amenities", params={"lat": 37.5, "lng": 127.0, "category": "pharmacy"})

    mock_find.assert_called_once_with(latitude=37.5, longitude=127.0, radius=1000, category="pharmacy")


def test_find_amenities_requires_lat_lng():
    response = client.get("/amenities")

    assert response.status_code == 422
