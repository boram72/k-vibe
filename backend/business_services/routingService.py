import math

EARTH_RADIUS_KM = 6371
WALKING_KMH = 4


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


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def walking_minutes(distance_km: float) -> int:
    return math.ceil((distance_km / WALKING_KMH) * 60)


def build_persona_route(persona_id: str, persona: dict, locations: list[dict], start_time: str, locale: str) -> dict:
    cursor = _parse_start_time(start_time)
    stops = []

    for index, location in enumerate(locations):
        if index > 0:
            prev = locations[index - 1]
            cursor += walking_minutes(haversine_km(prev["lat"], prev["lng"], location["lat"], location["lng"]))

        stops.append(
            {
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
        )
        cursor += location["stayMinutes"]

    walking_total = 0
    for prev, curr in zip(stops, stops[1:]):
        walking_total += walking_minutes(haversine_km(prev["lat"], prev["lng"], curr["lat"], curr["lng"]))

    stay_minutes = sum(stop["stayMinutes"] for stop in stops)
    return {
        "stops": stops,
        "walkingMinutes": walking_total,
        "stayMinutes": stay_minutes,
        "totalMinutes": walking_total + stay_minutes,
        "personaId": persona_id,
        "summary": _pick(persona["description"], locale),
    }
