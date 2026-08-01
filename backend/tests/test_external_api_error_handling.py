from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("presentation_api.places.tourAPI.find_nearby_places")
def test_places_returns_503_when_tour_api_times_out(mock_find):
    mock_find.side_effect = httpx.ReadTimeout("timed out")

    response = client.get("/places", params={"lat": 37.5, "lng": 127.0})

    assert response.status_code == 503
    assert "지연" in response.json()["detail"]


@patch("presentation_api.relatedAttractions.tourAPI.find_related_attractions")
def test_related_attractions_returns_503_when_tour_api_times_out(mock_find):
    mock_find.side_effect = httpx.ConnectError("connection refused")

    response = client.get("/attractions/related", params={"lat": 37.5, "lng": 127.0})

    assert response.status_code == 503


@patch("presentation_api.places.tourAPI.get_place_detail")
def test_place_detail_returns_503_when_tour_api_times_out(mock_get_detail):
    mock_get_detail.side_effect = httpx.ReadTimeout("timed out")

    response = client.get("/places/126508")

    assert response.status_code == 503
