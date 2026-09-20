from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("presentation_api.places.locationinfo.get_locations_by_place_ids")
@patch("presentation_api.places.locationinfo.upsert_places_batch")
@patch("presentation_api.places.tourAPI.find_nearby_places")
def test_find_nearby_places_merges_location_rating(mock_find_nearby, mock_upsert, mock_get_locations):
    """8-2 — 프론트가 카드마다 GET /reviews/{placeId}를 개별 호출하지 않아도
    되도록, location.rating을 목록 응답에 병합해서 내려줘야 한다."""
    mock_find_nearby.return_value = [
        {"id": "126508", "name": "경복궁", "category": "culture", "address": "서울", "lat": 37.5, "lng": 126.9},
        {"id": "999999", "name": "리뷰없는곳", "category": "culture", "address": "서울", "lat": 37.5, "lng": 126.9},
    ]
    mock_get_locations.return_value = {
        "126508": {"place_id": "126508", "rating": 4.5},
        "999999": {"place_id": "999999", "rating": None},
    }

    response = client.get("/places", params={"lat": 37.5, "lng": 126.9})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["rating"] == 4.5
    assert body[1]["rating"] is None
    mock_get_locations.assert_called_once_with(["126508", "999999"])


@patch("presentation_api.places.locationinfo.get_locations_by_place_ids")
@patch("presentation_api.places.locationinfo.upsert_places_batch")
@patch("presentation_api.places.tourAPI.find_nearby_places")
def test_find_nearby_places_sets_rating_none_when_location_lookup_fails(
    mock_find_nearby, mock_upsert, mock_get_locations
):
    """평점 병합이 실패해도(location 테이블 조회 예외) 목록 응답 자체는 계속 200이어야 한다."""
    mock_find_nearby.return_value = [
        {"id": "126508", "name": "경복궁", "category": "culture", "address": "서울", "lat": 37.5, "lng": 126.9},
    ]
    mock_get_locations.side_effect = Exception("supabase down")

    response = client.get("/places", params={"lat": 37.5, "lng": 126.9})

    assert response.status_code == 200
    assert response.json()[0]["rating"] is None
