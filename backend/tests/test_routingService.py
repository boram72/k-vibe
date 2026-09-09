from business_services import routingService

_PERSONA = {"description": {"ko": "설명", "en": "desc"}}


def _location(**overrides) -> dict:
    base = {
        "label": {"ko": "경복궁", "en": "Gyeongbokgung"},
        "town": "서울 종로구",
        "rating": 4.3,
        "openingHour": "09:00~18:00",
        "lat": 37.5796,
        "lng": 126.977,
        "category": "Culture",
        "crowdLevel": "high",
        "stayMinutes": 80,
        "description": {"ko": "설명", "en": "desc"},
        "tags": [],
    }
    base.update(overrides)
    return base


def test_build_persona_route_includes_character_image_url_when_present():
    locations = [_location(characterImageUrl="https://example.com/v.jpg")]

    result = routingService.build_persona_route("BTS뷔", _PERSONA, locations, "10:00", "ko")

    assert result["stops"][0]["characterImageUrl"] == "https://example.com/v.jpg"


def test_build_persona_route_omits_character_image_url_when_absent():
    """하드코딩 카탈로그 경로(personaCatalogInfo.LOCATIONS)는 이 필드가 아예 없다 — 응답에도 없어야 한다."""
    locations = [_location()]

    result = routingService.build_persona_route("BTS뷔", _PERSONA, locations, "10:00", "ko")

    assert "characterImageUrl" not in result["stops"][0]
