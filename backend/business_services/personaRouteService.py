import math

EARTH_RADIUS_KM = 6371
WALKING_KMH = 4

LOCATIONS = {
    "남산타워": {
        "label": {"ko": "남산타워", "en": "N Seoul Tower"},
        "town": "서울 용산구",
        "rating": 4.4,
        "openingHour": "10:00~23:00",
        "lat": 37.5512,
        "lng": 126.9882,
        "category": "View",
        "crowdLevel": "high",
        "stayMinutes": 70,
        "description": {
            "ko": "서울 전경과 야경을 한눈에 담을 수 있는 대표 전망 명소예요.",
            "en": "An iconic Seoul viewpoint for skyline photos and night views.",
        },
        "tags": ["전망", "야경", "포토"],
    },
    "경복궁": {
        "label": {"ko": "경복궁", "en": "Gyeongbokgung Palace"},
        "town": "서울 종로구",
        "rating": 4.3,
        "openingHour": "09:00~18:00",
        "lat": 37.5796,
        "lng": 126.977,
        "category": "Culture",
        "crowdLevel": "high",
        "stayMinutes": 80,
        "description": {
            "ko": "한복 사진과 전통 궁궐 동선이 잘 어울리는 서울 대표 문화 명소예요.",
            "en": "A signature palace stop for hanbok photos and classic Seoul heritage.",
        },
        "tags": ["궁궐", "한복", "전통"],
    },
    "익선동 온천집": {
        "label": {"ko": "익선동 온천집", "en": "Oncheonjip Ikseon"},
        "town": "서울 종로구",
        "rating": 4.3,
        "openingHour": "11:30~21:30",
        "lat": 37.573,
        "lng": 126.9892,
        "category": "Food",
        "crowdLevel": "mid",
        "stayMinutes": 65,
        "description": {
            "ko": "익선동 한옥 골목의 분위기와 식사 동선을 함께 잡기 좋은 맛집 스팟이에요.",
            "en": "A dining stop tucked into Ikseon-dong hanok alleys.",
        },
        "tags": ["맛집", "한옥", "익선동"],
    },
    "성수동 대림창고": {
        "label": {"ko": "성수동 대림창고", "en": "Daelim Changgo Seongsu"},
        "town": "서울 성동구",
        "rating": 4.0,
        "openingHour": "10:00~22:00",
        "lat": 37.5419,
        "lng": 127.0545,
        "category": "Cafe",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "성수의 산업 감성과 카페 문화가 만나는 대표 포토 스팟이에요.",
            "en": "A signature Seongsu cafe and photo stop with warehouse charm.",
        },
        "tags": ["카페", "성수", "포토"],
    },
    "뚝섬한강공원": {
        "label": {"ko": "뚝섬한강공원", "en": "Ttukseom Hangang Park"},
        "town": "서울 광진구",
        "rating": 4.3,
        "openingHour": "00:00~24:00",
        "lat": 37.5297,
        "lng": 127.069,
        "category": "River",
        "crowdLevel": "mid",
        "stayMinutes": 65,
        "description": {
            "ko": "한강 피크닉과 노을 사진을 곁들이기 좋은 여유로운 마무리 코스예요.",
            "en": "A relaxed riverside stop for picnic pacing and sunset photos.",
        },
        "tags": ["한강", "피크닉", "노을"],
    },
    "체부동잔치집": {
        "label": {"ko": "체부동잔치집", "en": "Chebudong Janchi-jip"},
        "town": "서울 종로구",
        "rating": 4.5,
        "openingHour": "11:00~22:30",
        "lat": 37.5787,
        "lng": 126.9708,
        "category": "Food",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "서촌 산책 전후로 들르기 좋은 든든한 한식 맛집이에요.",
            "en": "A hearty Korean food stop near Seochon and Gyeongbokgung.",
        },
        "tags": ["한식", "서촌", "식사"],
    },
    "도산공원": {
        "label": {"ko": "도산공원", "en": "Dosan Park"},
        "town": "서울 강남구",
        "rating": 4.3,
        "openingHour": "06:00~22:00",
        "lat": 37.5247,
        "lng": 127.0355,
        "category": "Park",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "압구정·청담 동선 사이에서 쉬어가기 좋은 세련된 공원 스팟이에요.",
            "en": "A polished park stop between Apgujeong and Cheongdam routes.",
        },
        "tags": ["공원", "강남", "산책"],
    },
    "이화동 벽화마을": {
        "label": {"ko": "이화동 벽화마을", "en": "Ihwa Mural Village"},
        "town": "서울 종로구",
        "rating": 3.9,
        "openingHour": "00:00~24:00",
        "lat": 37.5804,
        "lng": 127.0074,
        "category": "Photo",
        "crowdLevel": "mid",
        "stayMinutes": 55,
        "description": {
            "ko": "언덕 골목과 벽화가 이어지는 감성 산책·사진 코스예요.",
            "en": "A hillside mural village for photo walks and neighborhood views.",
        },
        "tags": ["벽화", "산책", "포토"],
    },
    "청수당": {
        "label": {"ko": "청수당", "en": "Cheongsudang"},
        "town": "서울 종로구",
        "rating": 4.3,
        "openingHour": "10:30~21:00",
        "lat": 37.5737,
        "lng": 126.9894,
        "category": "Cafe",
        "crowdLevel": "high",
        "stayMinutes": 55,
        "description": {
            "ko": "익선동의 정원 감성과 디저트를 함께 즐길 수 있는 인기 카페예요.",
            "en": "A popular Ikseon-dong cafe with garden mood and desserts.",
        },
        "tags": ["카페", "디저트", "익선동"],
    },
    "삼청동수제비": {
        "label": {"ko": "삼청동수제비", "en": "Samcheongdong Sujebi"},
        "town": "서울 종로구",
        "rating": 4.2,
        "openingHour": "11:00~20:00",
        "lat": 37.584,
        "lng": 126.9819,
        "category": "Food",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "삼청동 골목 산책과 함께 묶기 좋은 대표 한식 식사 코스예요.",
            "en": "A classic Korean comfort-food stop near Samcheong-dong alleys.",
        },
        "tags": ["수제비", "한식", "삼청동"],
    },
    "10 꼬르소꼬모 서울": {
        "label": {"ko": "10 꼬르소꼬모 서울", "en": "10 Corso Como Seoul"},
        "town": "서울 강남구",
        "rating": 4.2,
        "openingHour": "12:00~22:00",
        "lat": 37.5249,
        "lng": 127.0411,
        "category": "Shopping",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "패션·라이프스타일 감성을 한 번에 담기 좋은 청담 쇼핑 스팟이에요.",
            "en": "A Cheongdam fashion and lifestyle stop for style-led routes.",
        },
        "tags": ["패션", "청담", "쇼핑"],
    },
    "나이키 압구정": {
        "label": {"ko": "나이키 압구정", "en": "Nike Apgujeong"},
        "town": "서울 강남구",
        "rating": 4.5,
        "openingHour": "10:30~21:30",
        "lat": 37.5272,
        "lng": 127.0389,
        "category": "Shopping",
        "crowdLevel": "mid",
        "stayMinutes": 45,
        "description": {
            "ko": "압구정 패션 동선에 넣기 좋은 스포츠·스트리트 무드의 쇼핑 스팟이에요.",
            "en": "A sport and street-style shopping stop in Apgujeong.",
        },
        "tags": ["스포츠", "패션", "압구정"],
    },
    "패션5 한남점": {
        "label": {"ko": "패션5 한남점", "en": "Passion 5 Hannam"},
        "town": "서울 용산구",
        "rating": 4.3,
        "openingHour": "07:30~22:00",
        "lat": 37.5346,
        "lng": 127.0002,
        "category": "Dessert",
        "crowdLevel": "high",
        "stayMinutes": 55,
        "description": {
            "ko": "디저트와 베이커리를 중심으로 한남동 감성을 쉬어가기 좋은 곳이에요.",
            "en": "A Hannam dessert and bakery stop with polished cafe energy.",
        },
        "tags": ["디저트", "한남", "베이커리"],
    },
    "장진우식당": {
        "label": {"ko": "장진우식당", "en": "Jang Jinwoo Restaurant"},
        "town": "서울 용산구",
        "rating": 4.1,
        "openingHour": "평일 17:00~22:00 / 주말 12:00~22:00",
        "lat": 37.5402,
        "lng": 126.9918,
        "category": "Food",
        "crowdLevel": "mid",
        "stayMinutes": 70,
        "description": {
            "ko": "한남·이태원 저녁 동선에 어울리는 분위기 있는 식사 스팟이에요.",
            "en": "A dinner-friendly stop around Hannam and Itaewon.",
        },
        "tags": ["식사", "한남", "이태원"],
    },
    "서울스카이": {
        "label": {"ko": "서울스카이", "en": "Seoul Sky"},
        "town": "서울 송파구",
        "rating": 4.5,
        "openingHour": "10:30~22:00",
        "lat": 37.5125,
        "lng": 127.1025,
        "category": "View",
        "crowdLevel": "high",
        "stayMinutes": 80,
        "description": {
            "ko": "잠실의 높은 전망과 도시 스케일을 한 번에 느낄 수 있는 코스예요.",
            "en": "A high-rise viewpoint that anchors the Jamsil skyline route.",
        },
        "tags": ["전망", "잠실", "스카이"],
    },
    "석촌호수": {
        "label": {"ko": "석촌호수", "en": "Seokchon Lake"},
        "town": "서울 송파구",
        "rating": 4.4,
        "openingHour": "00:00~24:00",
        "lat": 37.5083,
        "lng": 127.1041,
        "category": "Lake",
        "crowdLevel": "mid",
        "stayMinutes": 55,
        "description": {
            "ko": "잠실 일정 사이에 산책과 사진을 넣기 좋은 호수 둘레길이에요.",
            "en": "A lakeside walking stop that pairs naturally with Jamsil landmarks.",
        },
        "tags": ["호수", "산책", "잠실"],
    },
    "성수연방": {
        "label": {"ko": "성수연방", "en": "Seongsu Yeonbang"},
        "town": "서울 성동구",
        "rating": 4.2,
        "openingHour": "10:00~22:00",
        "lat": 37.543,
        "lng": 127.0547,
        "category": "Lifestyle",
        "crowdLevel": "mid",
        "stayMinutes": 60,
        "description": {
            "ko": "성수의 라이프스타일 매장과 카페를 한 번에 둘러보기 좋은 복합 공간이에요.",
            "en": "A Seongsu lifestyle complex for cafes, shops, and design browsing.",
        },
        "tags": ["성수", "라이프스타일", "카페"],
    },
    "반포 세빛섬": {
        "label": {"ko": "반포 세빛섬", "en": "Sebitseom Banpo"},
        "town": "서울 서초구",
        "rating": 4.2,
        "openingHour": "10:00~23:00",
        "lat": 37.5126,
        "lng": 126.9957,
        "category": "River",
        "crowdLevel": "mid",
        "stayMinutes": 65,
        "description": {
            "ko": "한강 야경과 반포 동선을 함께 잡기 좋은 수변 랜드마크예요.",
            "en": "A riverside landmark for Banpo night views and bridge routes.",
        },
        "tags": ["한강", "야경", "반포"],
    },
}

PERSONAS = {
    "BTS뷔": {
        "label": {"ko": "BTS뷔", "en": "BTS V"},
        "badge": "V",
        "profileImg": "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcSVGz6JfFl0_D1sD_25wk6lOy1prLYqWgs4FAAwMI3ku4UQeioKWq8ncDWmFf3mkHevabw3qu7GWtnA8uU",
        "theme": "kpop",
        "description": {
            "ko": "전망, 궁궐, 익선동·성수 감성을 잇는 서울 하루 성지순례 코스.",
            "en": "A Seoul day route linking views, palace scenery, Ikseon-dong, and Seongsu.",
        },
        "locations": ["남산타워", "경복궁", "익선동 온천집", "성수동 대림창고", "뚝섬한강공원"],
    },
    "아이유": {
        "label": {"ko": "아이유", "en": "IU"},
        "badge": "IU",
        "profileImg": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFBRYXIQjeINFYnz5HUcwDGXcthsJQGrZuSzEgZ3NyJaX-4aCiiWz1HZwRUz0EP68jOn4xQXoxhUFBhAmrHlsMx8cGHYJnZMSdARrH0GM&s=10",
        "theme": "mood",
        "description": {
            "ko": "서촌 한식, 감성 카페, 벽화마을과 삼청동을 연결한 차분한 감성 코스.",
            "en": "A mellow Seoul route through Seochon food, cafes, murals, and Samcheong-dong.",
        },
        "locations": ["체부동잔치집", "도산공원", "이화동 벽화마을", "청수당", "삼청동수제비"],
    },
    "제니": {
        "label": {"ko": "제니", "en": "Jennie"},
        "badge": "JEN",
        "profileImg": "https://i.namu.wiki/i/enCUBDXgjFR3bLBFx9M3hpGtEq1AYjNPU75fDxYtkEHPoZG1MTORb7haPMG0lZKHMQpHF7CFm3K8krWZTTA5zw.webp",
        "theme": "creator",
        "description": {
            "ko": "청담·압구정 쇼핑, 도산공원, 한남 디저트와 식사를 잇는 스타일 코스.",
            "en": "A style-led route through Cheongdam, Apgujeong, Dosan Park, Hannam dessert, and dinner.",
        },
        "locations": ["10 꼬르소꼬모 서울", "나이키 압구정", "도산공원", "패션5 한남점", "장진우식당"],
    },
    "장원영": {
        "label": {"ko": "장원영", "en": "Jang Wonyoung"},
        "badge": "WY",
        "profileImg": "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQd_jr6bqPrC7F-u59fAzuyur7EOtQjIS2TQE4uQwDZi9TK1g5NVocxR8FeOl1bAHHWBSAsxYmdF2FmNUY",
        "theme": "kpop",
        "description": {
            "ko": "잠실 전망과 호수, 성수 라이프스타일, 반포 야경을 잇는 화사한 도시 코스.",
            "en": "A bright city route through Jamsil views, Seongsu lifestyle spots, and Banpo night scenery.",
        },
        "locations": ["서울스카이", "석촌호수", "성수연방", "반포 세빛섬"],
    },
}

DETAIL_TO_PERSONA = {
    "bts": "BTS뷔",
    "blackpink": "제니",
    "newjeans": "장원영",
    "aespa": "장원영",
    "cafe": "아이유",
    "photo": "제니",
    "healing": "아이유",
    "food": "아이유",
    "reels": "제니",
    "fashion": "제니",
    "design": "제니",
    "night_shot": "장원영",
}

THEME_TO_PERSONA = {
    "kpop": "BTS뷔",
    "mood": "아이유",
    "creator": "제니",
    "drama": "BTS뷔",
    "foodie": "아이유",
    "history": "BTS뷔",
}


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


def _persona_for(theme: str, detail: str) -> str:
    return DETAIL_TO_PERSONA.get(detail) or THEME_TO_PERSONA.get(theme, "BTS뷔")


def list_personas(locale: str) -> list[dict]:
    return [
        {
            "id": persona_id,
            "label": _pick(persona["label"], locale),
            "description": _pick(persona["description"], locale),
            "badge": persona["badge"],
            "profileImg": persona["profileImg"],
            "routeCnt": len(persona["locations"]),
        }
        for persona_id, persona in PERSONAS.items()
    ]


def generate_route(theme: str | None, detail: str | None, start_time: str, locale: str, persona_id: str | None = None) -> dict:
    persona_id = persona_id if persona_id in PERSONAS else _persona_for(theme or "", detail or "")
    persona = PERSONAS[persona_id]
    locations = [LOCATIONS[name] for name in persona["locations"] if name in LOCATIONS]
    cursor = _parse_start_time(start_time)
    stops = []

    for index, location in enumerate(locations):
        if index > 0:
            prev = locations[index - 1]
            cursor += _walking_minutes(_haversine_km(prev["lat"], prev["lng"], location["lat"], location["lng"]))

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

    walking_minutes = 0
    for prev, curr in zip(stops, stops[1:]):
        walking_minutes += _walking_minutes(_haversine_km(prev["lat"], prev["lng"], curr["lat"], curr["lng"]))

    stay_minutes = sum(stop["stayMinutes"] for stop in stops)
    return {
        "stops": stops,
        "walkingMinutes": walking_minutes,
        "stayMinutes": stay_minutes,
        "totalMinutes": walking_minutes + stay_minutes,
        "personaId": persona_id,
        "summary": _pick(persona["description"], locale),
    }
