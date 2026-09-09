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
@patch("business_services.personaRouteService.locationinfo.get_location_by_place_id")
@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_applies_location_story_and_pic(
    mock_get_route, mock_get_location, mock_build_pic_url
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
    mock_get_location.return_value = {
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
    mock_get_location.assert_called_once_with("3354946")


@patch("business_services.personaRouteService.locationinfo.get_location_by_place_id")
@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_keeps_defaults_without_story_or_pic(
    mock_get_route, mock_get_location
):
    mock_get_route.return_value = [{"locationname": "3354946"}]
    mock_get_location.return_value = {
        "name": "경복궁",
        "latitude": 37.5796,
        "longitude": 126.977,
        "place_id": "3354946",
    }

    locations = personaRouteService._load_persona_route_from_db("BTS뷔")

    assert len(locations) == 1
    assert "characterImageUrl" not in locations[0]
    assert locations[0]["description"]["ko"] == "경복궁 방문 코스입니다."


@patch("business_services.personaRouteService.personainfo.get_persona_route")
def test_load_persona_route_from_db_returns_empty_when_query_fails(mock_get_route):
    mock_get_route.side_effect = RuntimeError("network down")

    assert personaRouteService._load_persona_route_from_db("BTS뷔") == []


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
