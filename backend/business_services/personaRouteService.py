from business_services import routingService
from data_repositories import locationinfo, personaCatalogInfo, personainfo


def _normalize_db_location(row: dict, fallback_name: str) -> dict | None:
    # location 테이블 실제 컬럼명(db/schema.sql) 기준 — latitude/longitude, crowd_level.
    # 예전엔 lat/lng, crowdlevel을 읽고 있어서 실제 DB row가 와도 항상 None을 반환해
    # DB 경로가 늘 하드코딩 카탈로그로 폴백되던 버그가 있었다.
    source = row or {}
    name = source.get("name") or fallback_name
    lat = source.get("latitude")
    lng = source.get("longitude")
    if lat is None or lng is None:
        return None

    label = {"ko": name, "en": source.get("name_en") or name}
    description = source.get("description") or f"{name} 방문 코스입니다."
    return {
        "label": label,
        "town": source.get("town") or "",
        "rating": float(source.get("rating") or 0),
        "openingHour": source.get("openinghour") or source.get("openingHour") or "",
        "lat": float(lat),
        "lng": float(lng),
        "category": source.get("category") or "Culture",
        "crowdLevel": source.get("crowd_level") or source.get("crowdLevel") or "mid",
        "stayMinutes": int(source.get("stayminutes") or source.get("stayMinutes") or 60),
        "description": {"ko": description, "en": description},
        "tags": source.get("tags") or [],
    }


def _db_location_place_id(route_row: dict) -> str:
    # persona.locationname은 location.place_id를 참조하는 FK 컬럼이라 실제로는
    # 정수(문자열로 직렬화된) place_id가 들어있다. 이름이 아니라 FK 값이므로
    # location 테이블을 name이 아닌 place_id로 조회해야 한다.
    value = route_row.get("locationname") or route_row.get("LOCATIONNAME") or route_row.get("locationName")
    return str(value) if value is not None else ""


def _load_persona_route_from_db(persona_id: str) -> list[dict]:
    try:
        route_rows = personainfo.get_persona_route(persona_id)
    except Exception:
        return []

    # stop마다 location을 개별 조회하면(N+1) stop 수만큼 Supabase 왕복이 직렬로 늘어나
    # 느려진다 — place_id를 모아 한 번에 배치 조회한다.
    place_ids = [pid for pid in (_db_location_place_id(row) for row in route_rows) if pid]
    try:
        locations_by_place_id = locationinfo.get_locations_by_place_ids(place_ids)
    except Exception:
        locations_by_place_id = {}

    locations: list[dict] = []
    for route_row in route_rows:
        place_id = _db_location_place_id(route_row)
        if not place_id:
            continue
        location_row = locations_by_place_id.get(place_id)
        location = _normalize_db_location(location_row or {}, place_id)
        if not location:
            continue

        # persona 테이블 행이 이 정거장 전용 스토리/이미지를 갖고 있으면 location 테이블의
        # 일반 정보 대신 우선 사용한다 (예: "V"가 방문한 경복궁"이라는 페르소나 전용 서사/사진).
        story = route_row.get("location_story")
        if story:
            location["description"] = {"ko": story, "en": story}

        pic_path = route_row.get("location_pic")
        if pic_path:
            location["characterImageUrl"] = personainfo.build_pic_url(pic_path)

        locations.append(location)
    return locations


def list_personas(locale: str) -> list[dict]:
    return personaCatalogInfo.list_personas(locale)


def generate_route(theme: str | None, detail: str | None, start_time: str, locale: str, persona_id: str | None = None) -> dict:
    resolved_persona_id = personaCatalogInfo.resolve_persona_id(theme=theme, detail=detail, persona_id=persona_id)
    persona = personaCatalogInfo.get_persona(resolved_persona_id)
    locations = _load_persona_route_from_db(resolved_persona_id) or personaCatalogInfo.get_locations_for_persona(resolved_persona_id)
    return routingService.build_persona_route(resolved_persona_id, persona, locations, start_time, locale)
