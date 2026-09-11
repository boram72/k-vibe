from unittest.mock import MagicMock, patch

from business_services import personaRouteService


def test_normalize_db_location_reads_real_schema_columns():
    """location 테이블 실제 컬럼명(latitude/longitude/crowd_level) 기준으로 정상 변환되어야 한다.

    예전엔 lat/lng, crowdlevel을 읽어서 실제 DB row가 와도 항상 None을 반환하던 버그가 있었다.
    """
    row = {
        "name": "경복궁",
        "town": "서울 종로구",
        "rating": 4.3,
        "openinghour": "09:00~18:00",
        "latitude": 37.5796,
        "longitude": 126.977,
        "category": "Culture",
        "crowd_level": "high",
        "tags": ["궁궐", "한복"],
    }

    result = personaRouteService._normalize_db_location(row, "경복궁")

    assert result is not None
    assert result["lat"] == 37.5796
    assert result["lng"] == 126.977
    assert result["crowdLevel"] == "high"
    assert result["openingHour"] == "09:00~18:00"


def test_normalize_db_location_returns_none_without_coordinates():
    assert personaRouteService._normalize_db_location({"name": "좌표없음"}, "좌표없음") is None


@patch("business_services.personaRouteService.personainfo.build_pic_url")
@patch("business_services.personaRouteService.locationinfo.get_locations_by_place_ids")
@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_applies_location_story_and_pic(
    mock_get_route, mock_get_locations, mock_build_pic_url
):
    mock_get_route.return_value = [
        {
            "id": "V_경복궁",
            "name": "BTS뷔",
            "locationname": "3354946",
            "location_story": "V가 한복을 입고 걸었던 그 골목",
            "location_pic": "kyungbokplace_V.jpg",
        }
    ]
    mock_get_locations.return_value = {
        "3354946": {
            "name": "경복궁",
            "town": "서울 종로구",
            "rating": 4.3,
            "latitude": 37.5796,
            "longitude": 126.977,
            "category": "Culture",
            "crowd_level": "high",
            "place_id": "3354946",
            "tags": [],
        }
    }
    mock_build_pic_url.return_value = (
        "https://zchxwhmddkabhhhywkge.supabase.co/storage/v1/object/public/"
        "k-vibe_storage/kyungbokplace_V.jpg"
    )

    locations = personaRouteService._load_persona_route_from_db("BTS뷔")

    assert len(locations) == 1
    location = locations[0]
    assert location["description"] == {
        "ko": "V가 한복을 입고 걸었던 그 골목",
        "en": "V가 한복을 입고 걸었던 그 골목",
    }
    assert location["characterImageUrl"].endswith("kyungbokplace_V.jpg")
    mock_build_pic_url.assert_called_once_with("kyungbokplace_V.jpg")
    mock_get_locations.assert_called_once_with(["3354946"])


@patch("business_services.personaRouteService.locationinfo.get_locations_by_place_ids")
@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_keeps_defaults_without_story_or_pic(
    mock_get_route, mock_get_locations
):
    mock_get_route.return_value = [{"locationname": "3354946"}]
    mock_get_locations.return_value = {
        "3354946": {
            "name": "경복궁",
            "latitude": 37.5796,
            "longitude": 126.977,
            "place_id": "3354946",
        }
    }

    locations = personaRouteService._load_persona_route_from_db("BTS뷔")

    assert len(locations) == 1
    assert "characterImageUrl" not in locations[0]
    assert locations[0]["description"]["ko"] == "경복궁 방문 코스입니다."


@patch("business_services.personaRouteService.locationinfo.get_locations_by_place_ids")
@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_batches_location_lookup_for_multiple_stops(
    mock_get_route, mock_get_locations
):
    """stop이 여러 개여도 location 조회는 (N+1이 아니라) 한 번만 배치로 호출되어야 한다."""
    mock_get_route.return_value = [
        {"locationname": "1"},
        {"locationname": "2"},
        {"locationname": "3"},
    ]
    mock_get_locations.return_value = {
        "1": {"name": "A", "latitude": 1.0, "longitude": 1.0, "place_id": "1"},
        "2": {"name": "B", "latitude": 2.0, "longitude": 2.0, "place_id": "2"},
        "3": {"name": "C", "latitude": 3.0, "longitude": 3.0, "place_id": "3"},
    }

    locations = personaRouteService._load_persona_route_from_db("BTS뷔")

    assert len(locations) == 3
    mock_get_locations.assert_called_once_with(["1", "2", "3"])


@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_returns_empty_when_query_fails(mock_get_route):
    mock_get_route.side_effect = RuntimeError("network down")

    assert personaRouteService._load_persona_route_from_db("BTS뷔") == []


@patch("business_services.personaRouteService.personaCatalogInfo.get_persona_labels")
@patch("business_services.personaRouteService.locationinfo.get_locations_by_place_ids")
@patch("business_services.personaRouteService.personainfo.get_all_persona_stops")
def test_get_persona_places_joins_persona_and_location_with_star_label_tag(
    mock_get_stops, mock_get_locations, mock_get_labels
):
    """place.tags에는 star-filter.tsx가 매칭에 쓰는 로컬라이즈 label이 그대로 담겨야 한다."""
    mock_get_stops.return_value = [
        {"name": "BTS뷔", "locationname": "3354946"},
        {"name": "아이유", "locationname": "402994"},
    ]
    mock_get_locations.return_value = {
        "3354946": {
            "name": "경복궁", "latitude": 37.5796, "longitude": 126.977,
            "category": "culture", "address": "서울 종로구", "image_url": "http://img/1.jpg",
        },
        "402994": {
            "name": "삼청동수제비", "latitude": 37.5846, "longitude": 126.9819,
            "category": "food", "address": "서울 종로구", "image_url": "http://img/2.jpg",
        },
    }
    mock_get_labels.return_value = {"BTS뷔": "BTS뷔", "아이유": "IU"}

    places = personaRouteService.get_persona_places("en")

    assert len(places) == 2
    mock_get_labels.assert_called_once_with("en")
    assert places[0] == {
        "id": "3354946", "name": "경복궁", "category": "culture", "address": "서울 종로구",
        "lat": 37.5796, "lng": 126.977, "imageUrl": "http://img/1.jpg", "tags": ["BTS뷔"],
    }
    assert places[1]["tags"] == ["IU"]


@patch("business_services.personaRouteService.locationinfo.get_locations_by_place_ids")
@patch("business_services.personaRouteService.personainfo.get_all_persona_stops")
def test_get_persona_places_skips_stops_without_matching_location(mock_get_stops, mock_get_locations):
    mock_get_stops.return_value = [{"name": "BTS뷔", "locationname": "missing"}]
    mock_get_locations.return_value = {}

    assert personaRouteService.get_persona_places("ko") == []


@patch("business_services.personaRouteService.personainfo.get_all_persona_stops")
def test_get_persona_places_returns_empty_when_query_fails(mock_get_stops):
    mock_get_stops.side_effect = RuntimeError("network down")

    assert personaRouteService.get_persona_places("ko") == []


def test_build_pic_url_returns_none_without_path():
    from data_repositories import personainfo

    assert personainfo.build_pic_url(None) is None
    assert personainfo.build_pic_url("") is None


@patch("data_repositories.personainfo.get_supabase_client")
def test_build_pic_url_builds_public_url_from_bucket(mock_get_client):
    from data_repositories import personainfo

    mock_client = MagicMock()
    mock_client.storage.from_.return_value.get_public_url.return_value = (
        "https://example.supabase.co/storage/v1/object/public/k-vibe_storage/kyungbokplace_V.jpg"
    )
    mock_get_client.return_value = mock_client

    url = personainfo.build_pic_url("kyungbokplace_V.jpg")

    assert url.endswith("kyungbokplace_V.jpg")
    mock_client.storage.from_.assert_called_once_with("k-vibe_storage")
    mock_client.storage.from_.return_value.get_public_url.assert_called_once_with("kyungbokplace_V.jpg")
