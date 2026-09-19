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


def test_build_persona_route_uses_real_place_id_and_address_when_present():
    """DB 경로로 매핑된 스팟(place_id/address 있음)은 그 값을 그대로 써야 한다 — 합성 id나
    '동네 · ⭐평점 · 영업시간' 표시용 문자열을 만들면 안 된다(이걸 만들면 프론트가 "내 루트"에
    추가할 때 이 합성 id로 location 테이블에 중복 행 + address에 ⭐ 문자열이 섞여 저장되는
    버그가 있었다)."""
    locations = [_location(placeId="3354946", address="서울 종로구 사직로 161")]

    result = routingService.build_persona_route("BTS뷔", _PERSONA, locations, "10:00", "ko")

    assert result["stops"][0]["id"] == "3354946"
    assert result["stops"][0]["address"] == "서울 종로구 사직로 161"


def test_build_persona_route_keeps_real_place_id_without_fabricating_address_when_address_missing():
    """place_id는 있지만 location.address 컬럼이 비어있는 실제 DB 장소는, id는 그대로 real
    place_id를 쓰되 address는 빈 문자열로 두어야 한다 — '⭐' 표시용 문자열을 만들면 실제
    place_id로 "내 루트"에 저장될 때(upsert_place) 이 진짜 location 행의 address 컬럼이
    오염된다(place_id가 실존해 persona FK가 걸려있어 나중에 삭제도 안 되는 상태로 발견됨)."""
    locations = [_location(placeId="3453656", address="")]

    result = routingService.build_persona_route("BTS뷔", _PERSONA, locations, "10:00", "ko")

    assert result["stops"][0]["id"] == "3453656"
    assert result["stops"][0]["address"] == ""


def test_build_persona_route_falls_back_to_synthetic_id_and_display_address_without_place_id():
    """하드코딩 카탈로그 폴백(personaCatalogInfo.LOCATIONS)은 place_id/address가 없으므로
    기존처럼 합성 id + 표시용 주소 문자열을 만들어야 한다(하위호환)."""
    locations = [_location()]

    result = routingService.build_persona_route("BTS뷔", _PERSONA, locations, "10:00", "ko")

    assert result["stops"][0]["id"] == "BTS뷔-경복궁"
    assert result["stops"][0]["address"] == "서울 종로구 · ⭐4.3 · 09:00~18:00"


def test_pick_returns_requested_locale_when_present():
    text = {"ko": "한국어", "en": "English", "ja": "日本語", "zh": "中文"}

    assert routingService._pick(text, "ja") == "日本語"
    assert routingService._pick(text, "zh") == "中文"


def test_pick_falls_back_to_en_then_ko_when_locale_missing():
    """location_story가 아직 ko/en만 채워진 경우, ja/zh 요청은 en으로, en도 없으면 ko로 대체된다."""
    assert routingService._pick({"ko": "한국어", "en": "English"}, "ja") == "English"
    assert routingService._pick({"ko": "한국어"}, "ja") == "한국어"
    assert routingService._pick({}, "ja") == ""
