from business_services import routingService
from data_repositories import locationinfo, personaCatalogInfo, personainfo


def _normalize_db_location(row: dict, fallback_name: str) -> dict | None:
    source = row or {}
    name = source.get("name") or fallback_name
    lat = source.get("lat")
    lng = source.get("lng")
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
        "crowdLevel": source.get("crowdlevel") or source.get("crowdLevel") or "mid",
        "stayMinutes": int(source.get("stayminutes") or source.get("stayMinutes") or 60),
        "description": {"ko": description, "en": description},
        "tags": source.get("tags") or [],
    }


def _db_location_name(route_row: dict) -> str:
    return route_row.get("locationname") or route_row.get("LOCATIONNAME") or route_row.get("locationName") or ""


def _load_persona_route_from_db(persona_id: str) -> list[dict]:
    try:
        route_rows = personainfo.get_persona_route(persona_id)
    except Exception:
        return []

    locations: list[dict] = []
    for route_row in route_rows:
        location_name = _db_location_name(route_row)
        if not location_name:
            continue
        try:
            location_row = locationinfo.get_location(location_name)
        except Exception:
            location_row = None
        location = _normalize_db_location(location_row or {}, location_name)
        if location:
            locations.append(location)
    return locations


def list_personas(locale: str) -> list[dict]:
    return personaCatalogInfo.list_personas(locale)


def generate_route(theme: str | None, detail: str | None, start_time: str, locale: str, persona_id: str | None = None) -> dict:
    resolved_persona_id = personaCatalogInfo.resolve_persona_id(theme=theme, detail=detail, persona_id=persona_id)
    persona = personaCatalogInfo.get_persona(resolved_persona_id)
    locations = _load_persona_route_from_db(resolved_persona_id) or personaCatalogInfo.get_locations_for_persona(resolved_persona_id)
    return routingService.build_persona_route(resolved_persona_id, persona, locations, start_time, locale)
