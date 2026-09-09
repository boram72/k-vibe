# 사용자가 편집한 '나만의 루트'를 토대로 경로 이동시간 계산 + Persona 추천 루트 생성.
# - 각 장소의 좌표(location.latitude/longitude)를 조회하고, 없으면 kakaomap(Kakao Local API)으로 검색해 채워넣는다.
# - 좌표 간 도보 이동시간은 하버사인 공식으로 직선거리를 구해 평균 도보속도(4km/h)로 추정한다.
#   (카카오모빌리티 길찾기 API는 도보 경로를 지원하지 않아 직선거리 추정 방식을 사용)
import math

from data_repositories import locationinfo
from externelAPI_services import kakaomap

EARTH_RADIUS_KM = 6371
WALKING_KMH = 4


def _ensure_coordinates(name: str) -> dict:
    """location 테이블에서 좌표를 조회하고, 없으면 카카오 검색으로 채워 저장한다."""
    location = locationinfo.get_location(name)
    if location and location.get("latitude") is not None and location.get("longitude") is not None:
        return location

    coords = kakaomap.search_coordinates(name)
    if coords is None:
        raise ValueError(f"'{name}' 장소의 좌표를 찾을 수 없습니다.")

    # location에 신규 insert되는 경우 place_id(PK)가 반드시 있어야 한다.
    # 이 경로(나만의 루트)는 TourAPI place_id가 없으므로 name을 그대로 대체 식별자로 쓴다.
    data = {**(location or {"name": name, "place_id": name}), **coords}
    return locationinfo.upsert_location(data)


def _pick(text: dict, locale: str) -> str:
    return text["ko"] if locale == "ko" else text["en"]


def _parse_start_time(value: str) -> int:
    try:
        hours, minutes = value.split(":")
        return int(hours) * 60 + int(minutes)
    except ValueError:
        return 600


def _format_clock(total_minutes: int) -> str:
    normalized = total_minutes % (24 * 60)
    return f"{normalized // 60:02d}:{normalized % 60:02d}"


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _walking_minutes(distance_km: float) -> int:
    return math.ceil((distance_km / WALKING_KMH) * 60)


def calculate_route_time(place_ids: list[str]) -> dict:
    """장소명 리스트를 순서대로 도보 이동한다고 가정했을 때의 구간별/총 이동시간(분)을 계산한다."""
    locations = [_ensure_coordinates(name) for name in place_ids]

    segments = []
    total_minutes = 0
    for prev, curr in zip(locations, locations[1:]):
        distance_km = _haversine_km(
            prev["latitude"], prev["longitude"], curr["latitude"], curr["longitude"]
        )
        minutes = _walking_minutes(distance_km)
        segments.append({"from": prev["name"], "to": curr["name"], "minutes": minutes})
        total_minutes += minutes

    return {"totalMinutes": total_minutes, "segments": segments}


def build_persona_route(persona_id: str, persona: dict, locations: list[dict], start_time: str, locale: str) -> dict:
    cursor = _parse_start_time(start_time)
    stops = []

    for index, location in enumerate(locations):
        if index > 0:
            prev = locations[index - 1]
            cursor += _walking_minutes(_haversine_km(prev["lat"], prev["lng"], location["lat"], location["lng"]))

        stop = {
            "id": f"{persona_id}-{_pick(location['label'], 'ko')}",
            "name": _pick(location["label"], locale),
            "category": location["category"],
            "address": f"{location['town']} · ⭐{location['rating']:.1f} · {location['openingHour']}",
            "crowdLevel": location["crowdLevel"],
            "lat": location["lat"],
            "lng": location["lng"],
            "stayMinutes": location["stayMinutes"],
            "startTime": _format_clock(cursor),
            "description": _pick(location["description"], locale),
            "tags": location["tags"],
        }
        # DB(persona.location_pic)로 채워진 정거장만 갖는 선택 필드 — 프론트 RouteStop
        # 타입의 characterImageUrl?와 대응. 하드코딩 카탈로그 경로는 이 값이 없다.
        if location.get("characterImageUrl"):
            stop["characterImageUrl"] = location["characterImageUrl"]
        stops.append(stop)
        cursor += location["stayMinutes"]

    walking_total = 0
    for prev, curr in zip(stops, stops[1:]):
        walking_total += _walking_minutes(_haversine_km(prev["lat"], prev["lng"], curr["lat"], curr["lng"]))

    stay_minutes = sum(stop["stayMinutes"] for stop in stops)
    return {
        "stops": stops,
        "walkingMinutes": walking_total,
        "stayMinutes": stay_minutes,
        "totalMinutes": walking_total + stay_minutes,
        "personaId": persona_id,
        "summary": _pick(persona["description"], locale),
    }
